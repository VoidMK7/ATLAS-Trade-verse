"use client";

import { useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, BriefcaseBusiness, ChevronDown,
  CircleHelp, Command, Globe2, LayoutDashboard, LockKeyhole, Menu, Newspaper,
  Search, Settings2, ShieldCheck, Sparkles, TrendingUp, WalletCards, X,
  MousePointerClick, Clock3, Radio, SlidersHorizontal
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

const series = [
  { time: "09:00", value: 100 }, { time: "10:00", value: 103 },
  { time: "11:00", value: 101 }, { time: "12:00", value: 108 },
  { time: "13:00", value: 106 }, { time: "14:00", value: 113 },
  { time: "15:00", value: 110 }, { time: "16:00", value: 118 }
];

const news = [
  { tag: "MACRO", tone: "violet", title: "Markets dashboard is running in demo mode", desc: "Connect a licensed provider to replace illustrative data with live market coverage.", time: "Setup required" },
  { tag: "FX", tone: "blue", title: "Economic calendar connector not configured", desc: "Add an approved data source to ingest scheduled releases and reported results.", time: "Not connected" },
  { tag: "CRYPTO", tone: "teal", title: "Digital asset feed awaiting configuration", desc: "Choose a source and verify its coverage, update frequency, and redistribution rights.", time: "Not connected" }
];

const nav = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Market intelligence", icon: Globe2 },
  { label: "News & events", icon: Newspaper },
  { label: "CPA campaigns", icon: MousePointerClick },
  { label: "Tracking links", icon: Activity },
  { label: "Integrations", icon: BriefcaseBusiness }
];

export default function Dashboard() {
  const [active, setActive] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showAlerts, setShowAlerts] = useState(false);

  const sidebar = (
    <>
      <div className="brand">
        <div className="brand-mark"><Globe2 size={21} /></div>
        <div><strong>ATLAS</strong><span>PRIVATE INTELLIGENCE</span></div>
        <button className="icon-btn mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18}/></button>
      </div>
      <div className="workspace"><div className="workspace-avatar">A</div><div><strong>Owner workspace</strong><span>Private environment</span></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="nav-list">
        {nav.map(item => {
          const Icon = item.icon;
          return <button key={item.label} className={`nav-item ${active === item.label ? "active" : ""}`} onClick={() => { setActive(item.label); setMobileOpen(false); }}>
            <Icon size={17}/><span>{item.label}</span>{item.label === "News & events" && <i className="nav-dot"/>}
          </button>;
        })}
      </nav>
      <div className="nav-label lower-label">PREFERENCES</div>
      <button className={`nav-item ${active === "Access & security" ? "active" : ""}`} onClick={() => setActive("Access & security")}><ShieldCheck size={17}/><span>Access & security</span></button>
      <button className={`nav-item ${active === "Settings" ? "active" : ""}`} onClick={() => setActive("Settings")}><Settings2 size={17}/><span>Settings</span></button>
      <div className="sidebar-bottom">
        <div className="private-card"><div className="private-icon"><LockKeyhole size={17}/></div><div><strong>Private workspace</strong><span>Invite-only access</span></div><span className="green-dot"/></div>
        <div className="user-row"><div className="user-avatar">O</div><div><strong>Workspace owner</strong><span>Owner role · Demo</span></div><button className="icon-btn" aria-label="Help"><CircleHelp size={17}/></button></div>
      </div>
    </>
  );

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>{sidebar}</aside>
      {mobileOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)}/>}
      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-btn mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{active}</strong></div></div>
          <div className="top-actions">
            <label className="searchbox"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search markets, assets, campaigns..." /><kbd>⌘ K</kbd></label>
            <button className="icon-btn alert-button" onClick={() => setShowAlerts(!showAlerts)} aria-label="Notifications"><Bell size={18}/><i/></button>
            <div className="top-avatar">O</div>
          </div>
          {showAlerts && <div className="alert-popover"><strong>System notifications</strong><p>Market feeds are not connected yet.</p><p>CPA integrations require configuration.</p></div>}
        </header>

        <div className="content">
          <div className="welcome-row">
            <div><div className="eyebrow"><span className="live-dot"/> PRIVATE INTELLIGENCE TERMINAL</div><h1>{active === "Overview" ? "Command center" : active}</h1><p className="subtitle">Your unified view of global markets and campaign performance.</p></div>
            <div className="welcome-actions"><span className="date-pill"><Clock3 size={14}/> Demo environment</span><button className="primary-btn" onClick={() => setActive("Integrations")}><Sparkles size={16}/> Configure data</button></div>
          </div>

          {active !== "Overview" && <div className="section-notice"><Sparkles size={18}/><div><strong>{active} workspace</strong><p>This is the UI foundation. Connect providers and implement the relevant service before relying on live or private data.</p></div></div>}

          <div className="metrics-grid">
            <Metric label="GLOBAL MARKETS" value="—" note="Awaiting provider" icon={<Globe2 size={18}/>} tone="blue"/>
            <Metric label="NEWS EVENTS" value="—" note="No feed connected" icon={<Newspaper size={18}/>} tone="violet"/>
            <Metric label="TRACKED CLICKS" value="—" note="Tracker not deployed" icon={<MousePointerClick size={18}/>} tone="teal"/>
            <Metric label="CONFIRMED REVENUE" value="—" note="Network integration needed" icon={<WalletCards size={18}/>} tone="amber"/>
          </div>

          <div className="primary-grid">
            <section className="panel chart-panel">
              <div className="panel-head"><div><div className="panel-kicker">MARKET PULSE <span className="demo-tag">ILLUSTRATIVE</span></div><h2>Global market overview</h2><p>Placeholder series · not a live quote</p></div><button className="subtle-btn" onClick={() => setActive("Market intelligence")}><SlidersHorizontal size={15}/> Explore</button></div>
              <div className="chart-legend"><span><i className="legend-dot cyan"/> Composite index (sample)</span><span>Intraday</span></div>
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={series} margin={{top: 10, right: 4, left: -22, bottom: 0}}><defs><linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#42d9e8" stopOpacity={0.23}/><stop offset="100%" stopColor="#42d9e8" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#1d2b3d" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="time" tick={{fill:"#71839a",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#71839a",fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"#0c1624",border:"1px solid #27374b",borderRadius:10,color:"#e9f4ff"}}/><Area type="monotone" dataKey="value" stroke="#42d9e8" strokeWidth={2.3} fill="url(#pulseFill)" activeDot={{r:4,fill:"#42d9e8"}}/></AreaChart></ResponsiveContainer></div>
              <div className="chart-foot"><span><i className="legend-dot cyan"/> Sample data only</span><span>Connect a market-data provider for real quotes</span></div>
            </section>
            <section className="panel globe-panel">
              <div className="panel-head"><div><div className="panel-kicker">GLOBAL ACTIVITY</div><h2>Market map</h2></div><span className="tiny-status"><span className="muted-dot"/> Offline</span></div>
              <div className="globe-stage"><div className="orbital orbital-one"/><div className="orbital orbital-two"/><div className="globe"><div className="globe-grid"/><div className="globe-shine"/></div><div className="orbit-point point-a"/><div className="orbit-point point-b"/><div className="orbit-point point-c"/><div className="globe-label label-a">NEW YORK <b>—</b></div><div className="globe-label label-b">LONDON <b>—</b></div><div className="globe-label label-c">TOKYO <b>—</b></div></div>
              <div className="globe-footer"><span><i className="legend-dot cyan"/> Market coverage</span><span>Illustrative globe · no live activity</span></div>
            </section>
          </div>

          <div className="lower-grid">
            <section className="panel news-panel">
              <div className="panel-head"><div><div className="panel-kicker">INTELLIGENCE FEED</div><h2>News & events</h2></div><button className="text-btn" onClick={() => setActive("News & events")}>View feed <ArrowUpRight size={14}/></button></div>
              <div className="news-list">{news.filter(n => (n.title+" "+n.desc+" "+n.tag).toLowerCase().includes(query.toLowerCase())).map((n,i) => <article className="news-item" key={n.title}><div className={`news-mark ${n.tone}`}>{i===0?<Radio size={17}/>:i===1?<Activity size={17}/>:<Globe2 size={17}/>}</div><div className="news-body"><div className="news-meta"><span className={`tag ${n.tone}`}>{n.tag}</span><span>{n.time}</span></div><h3>{n.title}</h3><p>{n.desc}</p></div><ArrowUpRight className="news-arrow" size={15}/></article>)}</div>
            </section>
            <section className="panel connections-panel">
              <div className="panel-head"><div><div className="panel-kicker">DATA SOURCES</div><h2>Connections</h2></div><button className="icon-btn" aria-label="Configure connections" onClick={() => setActive("Integrations")}><Settings2 size={17}/></button></div>
              <Connection name="Market data" desc="Prices & instruments" icon={<TrendingUp size={17}/>} />
              <Connection name="Financial news" desc="News & economic events" icon={<Newspaper size={17}/>} />
              <Connection name="CPA networks" desc="Offers & conversions" icon={<MousePointerClick size={17}/>} />
              <div className="connect-note"><LockKeyhole size={15}/><span>Provider credentials are not configured. Add secrets server-side only.</span></div>
              <button className="connect-btn" onClick={() => setActive("Integrations")}>Manage integrations <ArrowUpRight size={15}/></button>
            </section>
          </div>
          <footer><span>ATLAS INTELLIGENCE <i>•</i> PRIVATE WORKSPACE</span><span><span className="muted-dot"/> Prototype mode · Not connected to live data</span></footer>
        </div>
      </section>
    </main>
  );
}

function Metric({label,value,note,icon,tone}:{label:string;value:string;note:string;icon:React.ReactNode;tone:string}) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><div className={`metric-icon ${tone}`}>{icon}</div></div><div className="metric-value">{value}</div><div className="metric-note"><span className="muted-dot"/>{note}</div></div>;
}
function Connection({name,desc,icon}:{name:string;desc:string;icon:React.ReactNode}) {
  return <div className="connection-row"><div className="connection-icon">{icon}</div><div className="connection-copy"><strong>{name}</strong><span>{desc}</span></div><span className="pending-pill"><i/> Pending</span></div>;
}
