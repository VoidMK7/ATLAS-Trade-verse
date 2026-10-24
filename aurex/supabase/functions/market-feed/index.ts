// market-feed: every ~15 s pulls public prices (crypto/meme/gold-token from Binance; stocks, gold, silver, oil from Stooq),
// writes market_prices + price_ticks (one tick per minute), then runs the engine
// (limit-order matching, price alerts, AI agents, rental expiry, portfolio snapshots).
// verify_jwt=false; the caller must send `x-feed-secret` equal to the value stored in public.feed_secret (see 003_schedule.sql).
import { createClient } from "npm:@supabase/supabase-js@2";

const BIN = "https://data-api.binance.vision/api/v3/ticker/24hr";
const STOOQ = "https://stooq.com/q/l/";
type Row = { symbol: string; base: string; price: number; open24h: number; high: number; low: number; volume: number; change24h: number; updated_at: string; quote_ts?: string | null };
const num = (x: unknown) => Number(x);

Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const got = req.headers.get("x-feed-secret");
  const { data: sec } = got ? await sb.from("feed_secret").select("secret").limit(1).maybeSingle() : { data: null };
  if (!got || !sec || sec.secret !== got) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });

  const notes: Record<string, string> = {};
  try {
    // tolerate running before migration 004 (columns missing): treat every coin as a Binance crypto
    let coins: Array<{ symbol: string; kind: string; source: string; src_symbol: string | null }> | null = null;
    const c1 = await sb.from("coins").select("symbol,kind,source,src_symbol").eq("enabled", true);
    if (!c1.error) coins = c1.data;
    else {
      const c2 = await sb.from("coins").select("symbol").eq("enabled", true);
      if (c2.error) throw c2.error;
      coins = (c2.data ?? []).map((c) => ({ symbol: c.symbol as string, kind: "crypto", source: "binance", src_symbol: null }));
    }
    const now = new Date().toISOString();
    const rows: Row[] = [];

    // ---- Binance (crypto, memecoins, PAXG gold token): one request for all tickers, filtered here
    const bin = (coins ?? []).filter((c) => c.source === "binance" && c.symbol !== "USDT");
    if (bin.length) {
      try {
        const r = await fetch(BIN, { signal: AbortSignal.timeout(12000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const all = await r.json() as Array<Record<string, string>>;
        const by = new Map(all.map((t) => [t.symbol, t]));
        for (const c of bin) {
          const t = by.get(`${c.symbol}USDT`);
          if (!t) { notes[c.symbol] = "not listed"; continue; }
          const p = num(t.lastPrice);
          if (Number.isFinite(p) && p > 0) rows.push({ symbol: `${c.symbol}/USDT`, base: c.symbol, price: p, open24h: num(t.openPrice), high: num(t.highPrice), low: num(t.lowPrice), volume: num(t.volume), change24h: num(t.priceChangePercent), updated_at: now });
        }
      } catch (e) { notes.binance = e instanceof Error ? e.message : String(e); }
    }

    // ---- Stooq (stocks + spot gold/silver/oil): delayed quotes; a quote only counts as fresh when its timestamp changed
    const stq = (coins ?? []).filter((c) => c.source === "stooq" && c.src_symbol);
    if (stq.length) {
      try {
        const q = `${STOOQ}?s=${stq.map((c) => c.src_symbol!.toLowerCase()).join("+")}&f=sd2t2ohlcv&h&e=csv`;
        const r = await fetch(q, { headers: { "user-agent": "Mozilla/5.0 NovaTrade-feed" }, signal: AbortSignal.timeout(12000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const lines = (await r.text()).trim().split(/\r?\n/).slice(1);
        const bySrc = new Map(stq.map((c) => [c.src_symbol!.toLowerCase(), c]));
        const { data: prev } = await sb.from("market_prices").select("symbol,quote_ts,updated_at").in("symbol", stq.map((c) => `${c.symbol}/USDT`));
        const pv = new Map((prev ?? []).map((p) => [p.symbol as string, p]));
        for (const ln of lines) {
          const [s, d, t, o, h, l, cl, v] = ln.split(",");
          const c = bySrc.get((s ?? "").toLowerCase());
          const p = num(cl);
          if (!c || !Number.isFinite(p) || p <= 0) continue;
          const sym = `${c.symbol}/USDT`, qts = `${d} ${t}`, old = pv.get(sym);
          const open = num(o);
          rows.push({ symbol: sym, base: c.symbol, price: p, open24h: Number.isFinite(open) ? open : p, high: num(h) || p, low: num(l) || p, volume: num(v) || 0,
            change24h: Number.isFinite(open) && open > 0 ? (p / open - 1) * 100 : 0, quote_ts: qts,
            updated_at: old && old.quote_ts === qts ? (old.updated_at as string) : now });
        }
        if (!lines.length) notes.stooq = "no quotes returned";
      } catch (e) { notes.stooq = e instanceof Error ? e.message : String(e); }
    }

    // ---- Finnhub (optional, preferred for US stocks when the FINNHUB_API_KEY secret is set; replaces the Stooq quote for those symbols)
    const fk = Deno.env.get("FINNHUB_API_KEY");
    const fh = (coins ?? []).filter((c) => c.kind === "stock");
    if (fk && fh.length) {
      try {
        const { data: prev } = await sb.from("market_prices").select("symbol,quote_ts,updated_at").in("symbol", fh.map((c) => `${c.symbol}/USDT`));
        const pv = new Map((prev ?? []).map((p) => [p.symbol as string, p]));
        let ok = 0;
        await Promise.all(fh.map(async (c) => {
          try {
            const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(c.symbol)}&token=${fk}`, { signal: AbortSignal.timeout(8000) });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const q = await r.json() as { c: number; o: number; h: number; l: number; pc: number; t: number };
            if (!(q.c > 0) || !(q.t > 0)) return;
            const sym = `${c.symbol}/USDT`, qts = new Date(q.t * 1000).toISOString(), old = pv.get(sym);
            const row: Row = { symbol: sym, base: c.symbol, price: q.c, open24h: q.pc > 0 ? q.pc : q.o || q.c, high: q.h || q.c, low: q.l || q.c, volume: 0,
              change24h: q.pc > 0 ? (q.c / q.pc - 1) * 100 : 0, quote_ts: qts, updated_at: old && old.quote_ts === qts ? (old.updated_at as string) : now };
            const i = rows.findIndex((x) => x.symbol === sym);
            if (i >= 0) { row.volume = rows[i].volume; rows[i] = row; } else rows.push(row);
            ok++;
          } catch (e) { notes[`finnhub ${c.symbol}`] = e instanceof Error ? e.message : String(e); }
        }));
        if (!ok) notes.finnhub = "no quotes returned (Stooq values kept)";
      } catch (e) { notes.finnhub = e instanceof Error ? e.message : String(e); }
    }

    if (!rows.length) throw new Error("no usable prices from any source: " + JSON.stringify(notes));
    const up = await sb.from("market_prices").upsert(rows, { onConflict: "symbol" });
    if (up.error) throw up.error;

    // one tick per minute per instrument (agents read the last 20 ticks); skip instruments whose quote did not move
    const { data: lastTick } = await sb.from("price_ticks").select("ts").order("ts", { ascending: false }).limit(1).maybeSingle();
    let ticks = 0;
    if (!lastTick || Date.now() - new Date(lastTick.ts as string).getTime() >= 55000) {
      const fresh = rows.filter((r) => r.updated_at === now);
      if (fresh.length) { const tk = await sb.from("price_ticks").insert(fresh.map((r) => ({ symbol: r.symbol, ts: now, price: r.price }))); if (tk.error) throw tk.error; ticks = fresh.length; }
    }

    const eng = await sb.rpc("run_engine");
    if (eng.error) throw eng.error;
    await sb.from("system_status").upsert({ provider: "market-feed", status: Object.keys(notes).length ? "degraded" : "ok", detail: `${rows.length} prices, ${ticks} ticks` + (Object.keys(notes).length ? ` · ${JSON.stringify(notes)}` : ""), checked_at: new Date().toISOString() }, { onConflict: "provider" });
    return new Response(JSON.stringify({ ok: true, prices: rows.length, ticks, notes, engine: eng.data }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    await sb.from("system_status").upsert({ provider: "market-feed", status: "error", detail: msg, checked_at: new Date().toISOString() }, { onConflict: "provider" });
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 502, headers: { "content-type": "application/json" } });
  }
});
