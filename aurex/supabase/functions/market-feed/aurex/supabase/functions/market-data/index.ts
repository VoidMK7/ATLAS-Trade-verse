// market-data: read-only proxy for PUBLIC Binance reference data (klines, depth, trades, 24h ticker).
// Used by the browser only when it cannot reach data-api.binance.vision directly. Display data only, never used to fill orders.
// Deploy with verify_jwt=false (public market data); only an allow-list of paths is forwarded.
const BASE = "https://data-api.binance.vision/api/v3";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "apikey, authorization, content-type", "access-control-allow-methods": "GET, OPTIONS" };
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET") return new Response("method not allowed", { status: 405, headers: CORS });
  const target = validate(new URL(req.url).searchParams.get("p") ?? "");
  if (!target) return new Response(JSON.stringify({ error: "unsupported request" }), { status: 400, headers: { ...CORS, "content-type": "application/json" } });
  try {
    const r = await fetch(BASE + target, { signal: AbortSignal.timeout(8000) });
    return new Response(await r.text(), { status: r.ok ? 200 : 502, headers: { ...CORS, "content-type": "application/json", "cache-control": "public, max-age=2" } });
  } catch {
    return new Response(JSON.stringify({ error: "upstream unavailable" }), { status: 502, headers: { ...CORS, "content-type": "application/json" } });
  }
});
