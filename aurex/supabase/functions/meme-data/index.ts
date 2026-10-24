// meme-data: read-only on-chain token discovery for the Memecoins page (no keys needed).
// Sources: GeckoTerminal public API (trending / new pools per network) and DexScreener public API (search, boosted tokens, token lookup).
// Optional: set GMGN_API_KEY later to add a GMGN adapter (see README, "Memecoins"); nothing here trades or holds funds.
// GET /meme-data?a=trending|new|hot|search|token  &chain=all|solana|base|ethereum|bsc|arbitrum  &q=  &addr=
import { createClient } from "npm:@supabase/supabase-js@2";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "apikey, authorization, content-type", "access-control-allow-methods": "GET, OPTIONS" };
const J = (b: unknown, status = 200, maxAge = 0) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "content-type": "application/json", ...(maxAge ? { "cache-control": `private, max-age=${maxAge}` } : {}) } });
const CHAINS: Record<string, { gt: string; ds: string; label: string }> = {
  solana: { gt: "solana", ds: "solana", label: "Solana" }, base: { gt: "base", ds: "base", label: "Base" },
  ethereum: { gt: "eth", ds: "ethereum", label: "Ethereum" }, bsc: { gt: "bsc", ds: "bsc", label: "BNB Chain" }, arbitrum: { gt: "arbitrum", ds: "arbitrum", label: "Arbitrum" },
};
const memo = new Map<string, { exp: number; v: unknown }>();
async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const h = memo.get(key); if (h && h.exp > Date.now()) return h.v as T;
  const v = await fn(); memo.set(key, { exp: Date.now() + ttl * 1000, v }); if (memo.size > 300) for (const [k, x] of memo) if (x.exp < Date.now()) memo.delete(k);
  return v;
}
async function get(url: string, hdr: Record<string, string> = {}) {
  const r = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { accept: "application/json", ...hdr } });
  if (r.status === 429) throw new Error("rate limit reached at the data provider, retry in a minute");
  if (!r.ok) throw new Error(`provider HTTP ${r.status}`);
  return r.json();
}
const n = (x: unknown) => { const v = Number(x); return Number.isFinite(v) ? v : null; };
const GT_HDR = { accept: "application/json;version=20230302" };

function fromGecko(j: any, chain: string) {
  const tok = new Map<string, any>((j.included ?? []).filter((i: any) => i.type === "token").map((i: any) => [i.id, i.attributes]));
  return (j.data ?? []).map((p: any) => {
    const a = p.attributes ?? {}, t = tok.get(p.relationships?.base_token?.data?.id) ?? {};
    const addr = t.address ?? String(p.relationships?.base_token?.data?.id ?? "").split("_").pop();
    return { chain, address: addr, pair: a.address, symbol: t.symbol ?? String(a.name ?? "").split(" / ")[0], name: t.name ?? null, img: t.image_url && t.image_url !== "missing.png" ? t.image_url : null,
      price: n(a.base_token_price_usd), m5: n(a.price_change_percentage?.m5), h1: n(a.price_change_percentage?.h1), h6: n(a.price_change_percentage?.h6), h24: n(a.price_change_percentage?.h24),
      vol24: n(a.volume_usd?.h24), liq: n(a.reserve_in_usd), mcap: n(a.market_cap_usd) ?? n(a.fdv_usd), buys: n(a.transactions?.h24?.buys), sells: n(a.transactions?.h24?.sells),
      created: a.pool_created_at ? Date.parse(a.pool_created_at) : null, dex: String(p.relationships?.dex?.data?.id ?? "").replace(/_/g, " ") || null,
      url: a.address ? `https://www.geckoterminal.com/${CHAINS[chain].gt}/pools/${a.address}` : null, src: "geckoterminal" };
  }).filter((r: any) => r.address && r.price !== null);
}
function fromDex(pairs: any[]) {
  const seen = new Set<string>();
  return (pairs ?? []).map((p) => {
    const e = Object.entries(CHAINS).find(([, c]) => c.ds === p.chainId); if (!e) return null;
    return { chain: e[0], address: p.baseToken?.address, pair: p.pairAddress, symbol: p.baseToken?.symbol, name: p.baseToken?.name, img: p.info?.imageUrl ?? null, price: n(p.priceUsd),
      m5: n(p.priceChange?.m5), h1: n(p.priceChange?.h1), h6: n(p.priceChange?.h6), h24: n(p.priceChange?.h24), vol24: n(p.volume?.h24), liq: n(p.liquidity?.usd), mcap: n(p.marketCap) ?? n(p.fdv),
      buys: n(p.txns?.h24?.buys), sells: n(p.txns?.h24?.sells), created: n(p.pairCreatedAt), dex: p.dexId ?? null, url: p.url ?? null, src: "dexscreener" };
  }).filter((r): r is NonNullable<typeof r> => !!r && !!r.address && r.price !== null && r.price > 0 && !seen.has(r.chain + r.address) && (seen.add(r.chain + r.address), true))
    .sort((a, b) => (b.liq ?? 0) - (a.liq ?? 0));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url), a = url.searchParams.get("a") ?? "trending", chain = (url.searchParams.get("chain") ?? "all").toLowerCase();
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: { user } } = token ? await sb.auth.getUser(token) : { data: { user: null } };
  if (!user) return J({ error: "Sign in first." }, 401);
  if (chain !== "all" && !CHAINS[chain]) return J({ error: "unknown chain" }, 400);
  const chains = chain === "all" ? ["solana", "base", "ethereum", "bsc"] : [chain];
  try {
    if (a === "trending" || a === "new") {
      const path = a === "trending" ? "trending_pools?include=base_token&duration=1h" : "new_pools?include=base_token";
      const parts = await Promise.all(chains.map((c) => cached(`${a}:${c}`, 60, async () => fromGecko(await get(`https://api.geckoterminal.com/api/v2/networks/${CHAINS[c].gt}/${path}`, GT_HDR), c)).catch(() => null)));
      const ok = parts.filter((x) => x !== null) as any[][];
      if (!ok.length) return J({ error: "GeckoTerminal is not reachable right now" }, 502);
      let rows = ok.flat(); if (a === "trending") rows = rows.sort((x, y) => (y.vol24 ?? 0) - (x.vol24 ?? 0)); else rows = rows.sort((x, y) => (y.created ?? 0) - (x.created ?? 0));
      return J({ rows: rows.slice(0, 60), partial: ok.length < chains.length, ts: Date.now() }, 200, 20);
    }
    if (a === "hot") {
      const rows = await cached("hot:" + chain, 120, async () => {
        const boosts = await get("https://api.dexscreener.com/token-boosts/top/v1") as any[];
        const by = new Map<string, string[]>();
        for (const b of boosts) { const c = Object.values(CHAINS).find((x) => x.ds === b.chainId); if (!c || (chain !== "all" && CHAINS[chain].ds !== b.chainId)) continue; (by.get(b.chainId) ?? by.set(b.chainId, []).get(b.chainId)!).push(b.tokenAddress); }
        const got = await Promise.all([...by].map(([ch, addrs]) => get(`https://api.dexscreener.com/tokens/v1/${ch}/${addrs.slice(0, 30).join(",")}`).catch(() => [])));
        return fromDex(got.flat()).slice(0, 40);
      });
      return J({ rows, ts: Date.now() }, 200, 60);
    }
    if (a === "search") {
      const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80); if (q.length < 2) return J({ rows: [] });
      const rows = await cached("s:" + q.toLowerCase(), 60, async () => fromDex((await get(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`)).pairs).filter((r) => chain === "all" || r.chain === chain).slice(0, 40));
      return J({ rows }, 200, 30);
    }
    if (a === "token") {
      const addr = (url.searchParams.get("addr") ?? "").trim(); if (!/^[A-Za-z0-9]{20,64}$/.test(addr) || chain === "all") return J({ error: "chain and a valid token address are required" }, 400);
      const rows = await cached(`t:${chain}:${addr}`, 30, async () => fromDex(await get(`https://api.dexscreener.com/tokens/v1/${CHAINS[chain].ds}/${addr}`)));
      return J({ rows }, 200, 15);
    }
    return J({ error: "unknown action" }, 400);
  } catch (e) { return J({ error: e instanceof Error ? e.message : "failed" }, 502); }
});
