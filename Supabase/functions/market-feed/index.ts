// market-feed: pulls public spot prices, writes market_prices + price_ticks, then runs the engine
// (limit-order matching, price alerts, AI agents, rental expiry, portfolio snapshots).
// Deploy with verify_jwt=false; the request must carry the shared secret in `x-feed-secret`.
// Secrets: FEED_SECRET (you choose it). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const API = "https://data-api.binance.vision/api/v3/ticker/24hr";

Deno.serve(async (req) => {
  const secret = Deno.env.get("FEED_SECRET");
  if (!secret || req.headers.get("x-feed-secret") !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const { data: coins, error: ce } = await sb.from("coins").select("symbol").eq("enabled", true);
    if (ce) throw ce;
    const bases = (coins ?? []).map((c) => c.symbol as string).filter((s) => s !== "USDT");
    if (!bases.length) throw new Error("no enabled coins");
    const symbols = JSON.stringify(bases.map((b) => `${b}USDT`));
    const r = await fetch(`${API}?symbols=${encodeURIComponent(symbols)}`);
    if (!r.ok) throw new Error(`price source HTTP ${r.status}`);
    const rows = await r.json() as Array<Record<string, string>>;
    const now = new Date().toISOString();
    const prices = rows
      .map((t) => ({
        symbol: `${t.symbol.slice(0, -4)}/USDT`, base: t.symbol.slice(0, -4), price: +t.lastPrice,
        open24h: +t.openPrice, high: +t.highPrice, low: +t.lowPrice, volume: +t.volume,
        change24h: +t.priceChangePercent, updated_at: now,
      }))
      .filter((p) => Number.isFinite(p.price) && p.price > 0);
    if (!prices.length) throw new Error("price source returned no usable prices");
    const up = await sb.from("market_prices").upsert(prices, { onConflict: "symbol" });
    if (up.error) throw up.error;
    const tk = await sb.from("price_ticks").insert(prices.map((p) => ({ symbol: p.symbol, ts: now, price: p.price })));
    if (tk.error) throw tk.error;
    const eng = await sb.rpc("run_engine");
    if (eng.error) throw eng.error;
    return new Response(JSON.stringify({ ok: true, prices: prices.length, engine: eng.data }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    await sb.from("system_status").upsert({ provider: "market-feed", status: "error", detail: msg, checked_at: new Date().toISOString() }, { onConflict: "provider" });
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 502, headers: { "content-type": "application/json" } });
  }
});
