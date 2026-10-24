// market-data: read-only proxy for PUBLIC reference data used to draw charts, order books and recent trades.
//   Binance: /klines, /depth, /trades, /ticker/24hr      Stooq (stocks, gold, silver, oil): /stooq?s=aapl.us&i=d|w|5|15|30|60
// Display data only, never used to fill orders. verify_jwt=false (public data); only an allow-list of paths is forwarded.
const BASE = "https://data-api.binance.vision/api/v3";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "apikey, authorization, content-type", "access-control-allow-methods": "GET, OPTIONS" };
const JSONH = { ...CORS, "content-type": "application/json" };
const INTERVALS = new Set(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"]);
const SYM = /^[A-Z0-9]{5,15}$/;

function validate(path: string): string | null {
  let u: URL; try { u = new URL(path, "https://x.invalid"); } catch { return null; }
  const q = u.searchParams; const limit = q.get("limit");
  if (limit !== null && !(/^\d{1,4}$/.test(limit) && +limit >= 1 && +limit <= 1000)) return null;
  switch (u.pathname) {
    case "/klines": return SYM.test(q.get("symbol") ?? "") && INTERVALS.has(q.get("interval") ?? "") ? `/klines?symbol=${q.get("symbol")}&interval=${q.get("interval")}&limit=${limit ?? 300}` : null;
    case "/depth": case "/trades": return SYM.test(q.get("symbol") ?? "") ? `${u.pathname}?symbol=${q.get("symbol")}&limit=${limit ?? 20}` : null;
    case "/ticker/24hr": {
      try { const a = JSON.parse(q.get("symbols") ?? ""); if (!Array.isArray(a) || a.length < 1 || a.length > 50 || !a.every((x) => typeof x === "string" && SYM.test(x))) return null; return `/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(a))}`; } catch { return null; }
    }
    default: return null;
  }
}

// Stooq history -> { candles: [[ms,o,h,l,c,v], ...] } (timestamps treated as UTC)
async function stooq(path: string): Promise<Response> {
  const u = new URL(path, "https://x.invalid"); const s = u.searchParams.get("s") ?? "", i = u.searchParams.get("i") ?? "d";
  if (!/^[a-z0-9.\-]{1,12}$/.test(s) || !["d", "w", "5", "15", "30", "60"].includes(i)) return new Response(JSON.stringify({ error: "unsupported request" }), { status: 400, headers: JSONH });
  const r = await fetch(`https://stooq.com/q/d/l/?s=${s}&i=${i}`, { headers: { "user-agent": "Mozilla/5.0 NovaTrade-data" }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) return new Response(JSON.stringify({ error: "upstream unavailable" }), { status: 502, headers: JSONH });
  const lines = (await r.text()).trim().split(/\r?\n/);
  const head = (lines.shift() ?? "").toLowerCase().split(",");
  const iD = head.indexOf("date"), iT = head.indexOf("time"), iO = head.indexOf("open"), iH = head.indexOf("high"), iL = head.indexOf("low"), iC = head.indexOf("close"), iV = head.indexOf("volume");
  if (iD < 0 || iO < 0 || iC < 0) return new Response(JSON.stringify({ error: "no data for this instrument" }), { status: 404, headers: JSONH });
  const candles = lines.map((ln) => { const f = ln.split(","); const t = Date.parse(`${f[iD]}T${iT >= 0 ? f[iT] : "00:00:00"}Z`); return [t, +f[iO], +f[iH], +f[iL], +f[iC], iV >= 0 ? +f[iV] || 0 : 0]; })
    .filter((c) => Number.isFinite(c[0]) && c.slice(1, 5).every(Number.isFinite)).slice(-1000);
  return new Response(JSON.stringify({ candles }), { headers: { ...JSONH, "cache-control": "public, max-age=30" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET") return new Response("method not allowed", { status: 405, headers: CORS });
  const p = new URL(req.url).searchParams.get("p") ?? "";
  try {
    if (p.startsWith("/stooq")) return await stooq(p);
    const target = validate(p);
    if (!target) return new Response(JSON.stringify({ error: "unsupported request" }), { status: 400, headers: JSONH });
    const r = await fetch(BASE + target, { signal: AbortSignal.timeout(8000) });
    return new Response(await r.text(), { status: r.ok ? 200 : 502, headers: { ...JSONH, "cache-control": "public, max-age=2" } });
  } catch {
    return new Response(JSON.stringify({ error: "upstream unavailable" }), { status: 502, headers: JSONH });
  }
});
