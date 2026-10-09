import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ExternalLink, RefreshCw, BarChart3 } from "lucide-react";

const ASSETS = [
 {symbol:"BTC",name:"Bitcoin",group:"Crypto",id:"bitcoin",source:"CoinGecko",url:"https://www.coingecko.com/en/coins/bitcoin"},
 {symbol:"ETH",name:"Ethereum",group:"Crypto",id:"ethereum",source:"CoinGecko",url:"https://www.coingecko.com/en/coins/ethereum"},
 {symbol:"SOL",name:"Solana",group:"Crypto",id:"solana",source:"CoinGecko",url:"https://www.coingecko.com/en/coins/solana"},
 {symbol:"BNB",name:"BNB",group:"Crypto",id:"binancecoin",source:"CoinGecko",url:"https://www.coingecko.com/en/coins/bnb"},
 {symbol:"XRP",name:"XRP",group:"Crypto",id:"ripple",source:"CoinGecko",url:"https://www.coingecko.com/en/coins/xrp"},
 {symbol:"TON",name:"Toncoin",group:"Crypto",id:"the-open-network",source:"CoinGecko",url:"https://www.coingecko.com/en/coins/the-open-network"},
 {symbol:"EURUSD",name:"Euro / US Dollar",group:"Forex",source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/EURUSD=X/"},
 {symbol:"GBPUSD",name:"British Pound / US Dollar",group:"Forex",source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/GBPUSD=X/"},
 {symbol:"USDJPY",name:"US Dollar / Japanese Yen",group:"Forex",source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/JPY=X/"},
 {symbol:"USDNGN",name:"US Dollar / Nigerian Naira",group:"Forex",source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/NGN=X/"},
 {symbol:"GOLD",name:"Gold Futures",group:"Commodities",source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/GC=F/"},
 {symbol:"WTI",name:"WTI Crude Oil",group:"Commodities",source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/CL=F/"},
 {symbol:"BRENT",name:"Brent Crude Oil",group:"Commodities",source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/BZ=F/"},
 {symbol:"SPX",name:"S&P 500",group:"Indices",source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/%5EGSPC/"},
 {symbol:"NDX",name:"Nasdaq 100",group:"Indices",source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/%5ENDX/"},
 {symbol:"DAX",name:"DAX",group:"Indices",source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/%5EGDAXI/"},
 {symbol:"AAPL",name:"Apple",group:"Stocks",source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/AAPL/"},
 {symbol:"MSFT",name:"Microsoft",group:"Stocks",source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/MSFT/"},
 {symbol:"NVDA",name:"NVIDIA",group:"Stocks",source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/NVDA/"}
];
const GROUPS=["All","Forex","Crypto","Commodities","Indices","Stocks"];
const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(n):"—";
const usd=n=>Number.isFinite(n)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:n<1?5:2}).format(n):"Unavailable";
function Chart({points}) {
 if(points.length<2)return <div className="tv-empty">No verified historical series available.</div>;
 const v=points.map(p=>p[1]), lo=Math.min(...v), hi=Math.max(...v), span=hi-lo||1;
 const coords=v.map((n,i)=>`${i/(v.length-1)*100},${36-(n-lo)/span*30}`).join(" ");
 return <svg className="tv-chart" viewBox="0 0 100 40" preserveAspectRatio="none" aria-label="Historical price chart"><polyline points={coords} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/></svg>;
}
export default function MarketTerminal(){
 const [group,setGroup]=useState("All"),[symbol,setSymbol]=useState("BTC"),[quotes,setQuotes]=useState({}),[readAt,setReadAt]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[range,setRange]=useState(7),[points,setPoints]=useState([]),[chartBusy,setChartBusy]=useState(false),[chartError,setChartError]=useState("");
 const shown=useMemo(()=>ASSETS.filter(a=>group==="All"||a.group===group),[group]), asset=ASSETS.find(a=>a.symbol===symbol)||ASSETS[0], quote=quotes[symbol];
 const refresh=useCallback(async()=>{setBusy(true);setError("");try{const list=ASSETS.filter(a=>a.id),url="https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids="+list.map(a=>a.id).join(",")+"&price_change_percentage=24h";const r=await fetch(url);if(!r.ok)throw Error("CoinGecko HTTP "+r.status);const data=await r.json(),next={...quotes};for(const row of data){const a=list.find(x=>x.id===row.id);if(a&&Number.isFinite(row.current_price))next[a.symbol]={price:row.current_price,change:row.price_change_percentage_24h,source:a.source,url:a.url,readAt:new Date().toISOString()};}setQuotes(next);setReadAt(new Date().toISOString());}catch(e){setError("Crypto source unavailable: "+e.message+". Network, CORS or provider rate limits may block this read.");}finally{setBusy(false);}},[quotes]);
 useEffect(()=>{refresh();const t=setInterval(refresh,60000);return()=>clearInterval(t);},[refresh]);
 useEffect(()=>{let cancelled=false;async function load(){setChartBusy(true);setChartError("");setPoints([]);if(!asset.id){setChartError("Historical feed adapter is not configured for this instrument. No chart values are fabricated.");setChartBusy(false);return;}try{const r=await fetch(`https://api.coingecko.com/api/v3/coins/${asset.id}/market_chart?vs_currency=usd&days=${range}`);if(!r.ok)throw Error("CoinGecko HTTP "+r.status);const d=await r.json(),clean=(d.prices||[]).filter(p=>Array.isArray(p)&&Number.isFinite(p[1])&&p[1]>0);if(clean.length<2)throw Error("Fewer than two valid price points");if(!cancelled)setPoints(clean);}catch(e){if(!cancelled)setChartError(e.message);}finally{if(!cancelled)setChartBusy(false);}}load();return()=>{cancelled=true;};},[asset,range]);
 return <div className="market-terminal">
  <div className="tv-hero"><div><div className="eyebrow">MARKET INTELLIGENCE / SOURCE-VERIFIED READ</div><h2>Trading terminal<span className="title-period">.</span></h2><p>Public-source quotes with timestamps. Missing feeds stay unavailable.</p></div><button className="secondary" disabled={busy} onClick={refresh}><RefreshCw size={15}/>{busy?"Refreshing…":"Refresh quotes"}</button></div>
  <div className="tv-status"><span className={readAt?"tv-dot":"tv-dot off"}/>{readAt?"Last successful crypto read: "+new Date(readAt).toLocaleString():"Waiting for first successful read"} · refresh every 60 seconds</div>
  {error&&<div className="tv-warning"><AlertTriangle size={16}/>{error}</div>}
  <div className="tv-groups">{GROUPS.map(g=><button key={g} className={group===g?"selected":""} onClick={()=>setGroup(g)}>{g}</button>)}</div>
  <div className="tv-layout"><section className="panel tv-board"><div className="panel-heading"><div><div className="eyebrow">INSTRUMENTS</div><h3>Market board</h3></div><span className="muted small">{shown.length} instruments</span></div><div className="tv-list">{shown.map(a=>{const q=quotes[a.symbol];return <button key={a.symbol} className={"tv-row "+(symbol===a.symbol?"chosen":"")} onClick={()=>setSymbol(a.symbol)}><span className="tv-icon">{a.symbol.slice(0,2)}</span><span className="tv-name"><b>{a.symbol}</b><small>{a.name}</small></span><span className="tv-price">{a.id?usd(q?.price):"Unavailable"}<small>{q?"Source: "+q.source:a.source+" feed not connected"}</small></span><span className={"tv-change "+((q?.change||0)>0?"up":(q?.change||0)<0?"down":"")}>{Number.isFinite(q?.change)?(q.change>0?"+":"")+fmt(q.change)+"%":"—"}</span></button>})}</div></section>
  <section className="panel tv-detail"><div className="tv-detail-top"><div><div className="eyebrow">{asset.group.toUpperCase()} / SELECTED</div><h3>{asset.name} <span>{asset.symbol}</span></h3><div className="tv-big-price">{quote?usd(quote.price):"Price unavailable"}</div><div className={"tv-change "+((quote?.change||0)>0?"up":(quote?.change||0)<0?"down":"")}>{Number.isFinite(quote?.change)?(quote.change>0?"+":"")+fmt(quote.change)+"% over 24h":"24h change unavailable"}</div></div><a className="secondary tv-source" href={quote?.url||asset.url} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Source</a></div>
  <div className="tv-chart-heading"><span><BarChart3 size={15}/> Historical price</span><div>{[{v:1,t:"1D"},{v:7,t:"7D"},{v:30,t:"30D"},{v:90,t:"90D"}].map(r=><button key={r.v} className={range===r.v?"selected":""} onClick={()=>setRange(r.v)}>{r.t}</button>)}</div></div>
  <div className="tv-chart-area">{chartBusy?<div className="tv-empty">Retrieving series…</div>:chartError?<div className="tv-empty tv-error"><AlertTriangle size={15}/>{chartError}</div>:<><Chart points={points}/><div className="tv-chart-stats"><span>Start <b>{usd(points[0]?.[1])}</b></span><span>Latest <b>{usd(points[points.length-1]?.[1])}</b></span><span>Points <b>{points.length}</b></span></div></>}</div>
  <div className="tv-provenance"><Activity size={16}/><div><b>{quote?.source||asset.source}</b><p>{quote?.readAt?"Quote read "+new Date(quote.readAt).toLocaleString()+".":"No current quote retrieved."} Provider values are shown only when successfully returned.</p><a href={quote?.url||asset.url} target="_blank" rel="noreferrer">Open original source <ExternalLink size={12}/></a></div></div><p className="tv-disclaimer">Market information only — not a broker or order-entry system. Public data can be delayed, rate-limited or unavailable.</p>
  </section></div>
  <section className="panel tv-news"><div className="panel-heading"><div><div className="eyebrow">NEWS & EVENTS</div><h3>Sourced market news</h3><p className="muted">News backend is not connected yet; no headlines are invented.</p></div></div><div className="tv-empty">News, economic calendar and AI analysis require the next backend implementation milestone.</div></section>
 </div>;
}
