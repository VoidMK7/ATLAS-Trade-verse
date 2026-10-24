// stocks-data: server-side proxy for Finnhub + Alpha Vantage so the API keys never reach the browser.
// Secrets (Supabase > Edge Functions > Secrets):  FINNHUB_API_KEY, ALPHAVANTAGE_API_KEY   (either one alone also works)
// Caller must be signed in (Bearer access token) so the free-tier quotas are not open to the whole internet.
// GET /stocks-data?a=status | quotes&s=AAPL,MSFT | profile&s=AAPL | candles&s=AAPL&r=1D|1W|1M|1Y | movers | news[&s=AAPL] | search&q=app | market
import { createClient } from "npm:@supabase/supabase-js@2";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "apikey, authorization, content-type", "access-control-allow-methods": "GET, POST, OPTIONS" };
const J = (b: unknown, status = 200, maxAge = 0) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "content-type": "application/json", ...(maxAge ? { "cache-control": `private, max-age=${maxAge}` } : {}) } });
const FK = Deno.env.get("FINNHUB_API_KEY") ?? "", AK = Deno.env.get("ALPHAVANTAGE_API_KEY") ?? "";
const SYM = /^[A-Z0-9.\-]{1,12}$/;
const memo = new Map<string, { exp: number; v: unknown }>();
async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const h = memo.get(key); if (h && h.exp > Date.now()) return h.v as T;
  const v = await fn(); memo.set(key, { exp: Date.now() + ttl * 1000, v }); if (memo.size > 400) for (const [k, x] of memo) if (x.exp < Date.now()) memo.delete(k);
  return v;
}
class Upstream extends Error { status: number; constructor(m: string, status = 502) { super(m); this.status = status; } }
async function get(url: string): Promise<any> {
  const r = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { accept: "application/json" } });
  if (r.status === 429) throw new Upstream("rate limit reached at the data provider", 429);
  if (!r.ok) throw new Upstream(`provider HTTP ${r.status}`, r.status === 403 ? 403 : 502);
  return r.json();
}
const fh = (path: string, q: Record<string, string | number>) => {
  if (!FK) throw new Upstream("Finnhub key is not configured", 503);
  return get(`https://finnhub.io/api/v1${path}?${new URLSearchParams({ ...Object.fromEntries(Object.entries(q).map(([k, v]) => [k, String(v)])), token: FK })}`);
};
const av = async (q: Record<string, string>) => {
  if (!AK) throw new Upstream("Alpha Vantage key is not configured", 503);
  const j = await get(`https://www.alphavantage.co/query?${new URLSearchParams({ ...q, apikey: AK })}`);
  const note = j?.Note ?? j?.Information ?? j?.["Error Message"];
  if (note) throw new Upstream(String(note).slice(0, 160), /rate|limit|call frequency|premium/i.test(String(note)) ? 429 : 502);
  return j;
};
const RANGE: Record<string, { days: number; res: string }> = { "1D": { days: 3, res: "5" }, "1W": { days: 9, res: "30" }, "1M": { days: 35, res: "60" }, "1Y": { days: 370, res: "D" } };

async function candles(sym: string, r: string) {
  const cfg = RANGE[r] ?? RANGE["1M"]; const now = Math.floor(Date.now() / 1000);
  if (FK) {
    try {
      const j = await fh("/stock/candle", { symbol: sym, resolution: cfg.res, from: now - cfg.days * 86400, to: now });
      if (j?.s === "ok" && Array.isArray(j.t) && j.t.length) return { source: "finnhub", res: cfg.res, candles: j.t.map((t: number, i: number) => ({ t: t * 1000, o: j.o[i], h: j.h[i], l: j.l[i], c: j.c[i], v: j.v[i] })) };
    } catch (_e) { /* free plans do not include candles for many symbols: fall through to Alpha Vantage */ }
  }
  if (AK) {
    const j = await av({ function: "TIME_SERIES_DAILY", symbol: sym, outputsize: r === "1Y" ? "full" : "compact" });
    const ts = j["Time Series (Daily)"]; if (!ts) throw new Upstream("no history returned for " + sym);
    const keep = Math.max(5, Math.round(cfg.days * 0.7));
    const rows = Object.entries(ts as Record<string, Record<string, string>>).map(([d, x]) => ({ t: Date.parse(d + "T14:30:00Z"), o: +x["1. open"], h: +x["2. high"], l: +x["3. low"], c: +x["4. close"], v: +x["5. volume"] })).sort((a, b) => a.t - b.t);
    return { source: "alphavantage", res: "D", candles: rows.slice(-Math.max(keep, 30)) };
  }
  throw new Upstream("no stock data provider is configured", 503);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url), a = url.searchParams.get("a") ?? "";
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: { user } } = token ? await sb.auth.getUser(token) : { data: { user: null } };
  if (!user) return J({ error: "Sign in first." }, 401);
  const sym = (url.searchParams.get("s") ?? "").toUpperCase().trim();
  try {
    if (a === "status") return J({ finnhub: !!FK, alphavantage: !!AK });
    if (a === "quotes") {
      const list = sym.split(",").map((x) => x.trim()).filter((x) => SYM.test(x)).slice(0, 25);
      if (!list.length) return J({ error: "no valid symbols" }, 400);
      const out = await Promise.all(list.map((s) => cached("q:" + s, 20, async () => {
        const q = await fh("/quote", { symbol: s });
        return q?.c > 0 ? { symbol: s, price: q.c, change: q.d, changePct: q.dp, high: q.h, low: q.l, open: q.o, prevClose: q.pc, ts: q.t * 1000 } : { symbol: s, price: null };
      }).catch((e) => ({ symbol: s, price: null, error: e instanceof Error ? e.message : "failed" }))));
      return J({ quotes: out }, 200, 10);
    }
    if (a === "profile") {
      if (!SYM.test(sym)) return J({ error: "bad symbol" }, 400);
      const v = await cached("p:" + sym, 6 * 3600, async () => {
        const [p, m] = await Promise.all([fh("/stock/profile2", { symbol: sym }).catch(() => ({})), fh("/stock/metric", { symbol: sym, metric: "all" }).then((x) => x?.metric ?? {}).catch(() => ({}))]);
        let ov: any = {}; if (AK && !p?.name) ov = await av({ function: "OVERVIEW", symbol: sym }).catch(() => ({}));
        return { symbol: sym, name: p.name ?? ov.Name ?? null, logo: p.logo ?? null, industry: p.finnhubIndustry ?? ov.Industry ?? null, exchange: p.exchange ?? ov.Exchange ?? null, web: p.weburl ?? null,
          marketCapUsd: p.marketCapitalization ? p.marketCapitalization * 1e6 : ov.MarketCapitalization ? +ov.MarketCapitalization : null, about: ov.Description ?? null,
          pe: m.peBasicExclExtraTTM ?? (ov.PERatio ? +ov.PERatio : null), high52: m["52WeekHigh"] ?? (ov["52WeekHigh"] ? +ov["52WeekHigh"] : null), low52: m["52WeekLow"] ?? (ov["52WeekLow"] ? +ov["52WeekLow"] : null), divYield: m.dividendYieldIndicatedAnnual ?? null, beta: m.beta ?? null };
      });
      return J(v, 200, 300);
    }
    if (a === "candles") {
      if (!SYM.test(sym)) return J({ error: "bad symbol" }, 400);
      const r = url.searchParams.get("r") ?? "1M";
      return J(await cached(`c:${sym}:${r}`, r === "1D" ? 60 : 900, () => candles(sym, r)), 200, 30);
    }
    if (a === "movers") {
      if (!AK) throw new Upstream("Alpha Vantage key is not configured", 503);
      const v = await cached("movers", 900, async () => {
        const j = await av({ function: "TOP_GAINERS_LOSERS" });
        const m = (x: any[]) => (x ?? []).slice(0, 15).map((r) => ({ symbol: r.ticker, price: +r.price, change: +r.change_amount, changePct: parseFloat(String(r.change_percentage)), volume: +r.volume }));
        return { updated: j.last_updated ?? null, gainers: m(j.top_gainers), losers: m(j.top_losers), active: m(j.most_actively_traded) };
      });
      return J(v, 200, 120);
    }
    if (a === "news") {
      const v = await cached("n:" + (sym || "*"), 600, async () => {
        if (FK) {
          const to = new Date().toISOString().slice(0, 10), from = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
          const j = SYM.test(sym) ? await fh("/company-news", { symbol: sym, from, to }) : await fh("/news", { category: "general" });
          return { news: (j as any[]).slice(0, 20).map((n) => ({ title: n.headline, url: n.url, source: n.source, ts: n.datetime * 1000, image: n.image || null, summary: n.summary || null })) };
        }
        const j = await av({ function: "NEWS_SENTIMENT", ...(SYM.test(sym) ? { tickers: sym } : { topics: "financial_markets" }), limit: "20" });
        return { news: (j.feed ?? []).map((n: any) => ({ title: n.title, url: n.url, source: n.source, ts: Date.parse(n.time_published.replace(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)$/, "$1-$2-$3T$4:$5:$6Z")), image: n.banner_image || null, summary: n.summary || null, sentiment: n.overall_sentiment_label })) };
      });
      return J(v, 200, 120);
    }
    if (a === "search") {
      const q = (url.searchParams.get("q") ?? "").trim().slice(0, 40); if (q.length < 1) return J({ results: [] });
      const v = await cached("s:" + q.toLowerCase(), 3600, async () => {
        if (FK) { const j = await fh("/search", { q }); return { results: (j.result ?? []).filter((x: any) => x.type === "Common Stock" && !String(x.symbol).includes(".")).slice(0, 12).map((x: any) => ({ symbol: x.symbol, name: x.description })) }; }
        const j = await av({ function: "SYMBOL_SEARCH", keywords: q });
        return { results: (j.bestMatches ?? []).filter((x: any) => x["4. region"] === "United States").slice(0, 12).map((x: any) => ({ symbol: x["1. symbol"], name: x["2. name"] })) };
      });
      return J(v, 200, 300);
    }
    if (a === "market") {
      if (!FK) throw new Upstream("Finnhub key is not configured", 503);
      const v = await cached("mkt", 60, () => fh("/stock/market-status", { exchange: "US" }));
      return J({ open: !!v.isOpen, session: v.session ?? null, holiday: v.holiday ?? null, ts: (v.t ?? 0) * 1000 }, 200, 30);
    }
    return J({ error: "unknown action" }, 400);
  } catch (e) {
    if (e instanceof Upstream) return J({ error: e.message }, e.status === 503 ? 503 : e.status === 429 ? 429 : 502);
    return J({ error: e instanceof Error ? e.message : "failed" }, 500);
  }
});
