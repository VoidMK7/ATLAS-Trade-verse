// demo-session: gives a signed-in user a session for their personal DEMO account (virtual 100,000 USDT, same app, separate data).
// The demo account is a real Supabase user flagged is_demo (cannot withdraw); its password is random and only stored in
// public.demo_accounts (service role only). The caller proves who they are with their normal access token.
import { createClient } from "npm:@supabase/supabase-js@2";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "apikey, authorization, content-type", "access-control-allow-methods": "POST, OPTIONS" };
const J = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return J({ error: "method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
  const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  if (!user) return J({ error: "Sign in first." }, 401);
  const { data: me } = await admin.from("profiles").select("is_demo").eq("id", user.id).maybeSingle();
  if (me?.is_demo) return J({ error: "You are already in the demo account." }, 400);
  try {
    const email = `demo-${user.id}@demo.invalid`;
    let { data: acc } = await admin.from("demo_accounts").select("demo_user,secret").eq("owner", user.id).maybeSingle();
    if (!acc) {
      const secret = crypto.randomUUID() + crypto.randomUUID();
      const cu = await admin.auth.admin.createUser({ email, password: secret, email_confirm: true, user_metadata: { demo: true } });
      if (cu.error || !cu.data.user) throw new Error(cu.error?.message ?? "could not create the demo account");
      const ins = await admin.from("demo_accounts").insert({ owner: user.id, demo_user: cu.data.user.id, secret });
      if (ins.error) throw ins.error;
      const pr = await admin.rpc("demo_provision", { p_demo: cu.data.user.id });
      if (pr.error) throw pr.error;
      acc = { demo_user: cu.data.user.id, secret };
    }
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
    const { data: s, error } = await anon.auth.signInWithPassword({ email, password: acc.secret });
    if (error || !s.session) throw new Error(error?.message ?? "demo sign-in failed");
    return J({ access_token: s.session.access_token, refresh_token: s.session.refresh_token, expires_in: s.session.expires_in, user_id: acc.demo_user });
  } catch (e) {
    return J({ error: e instanceof Error ? e.message : "demo account unavailable" }, 500);
  }
});
