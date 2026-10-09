import React, { useState } from 'react';
import { ExternalLink, RotateCw, X, ShieldCheck } from 'lucide-react';
export default function NetworkConsoleDialog({ network, onClose, onRecord }) {
  const [url, setUrl] = useState(network?.login_url || network?.official_url || '');
  const [frameKey, setFrameKey] = useState(0);
  if (!network) return null;
  const safeUrl = (() => { try { const u = new URL(url); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } })();
  return <div className="overlay" role="dialog" aria-modal="true" aria-label={`${network.name} console`}><section className="console modal"><header className="modal-head"><div><div className="eyebrow">NETWORK CONSOLE</div><h2>Sign in to {network.name}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18}/></button></header>
    <div className="urlbar"><span className="secure-dot"/><input value={url} onChange={e=>setUrl(e.target.value)} aria-label="Provider URL"/><button className="secondary" onClick={()=>setFrameKey(k=>k+1)}><RotateCw size={14}/> Reload</button><button className="secondary" onClick={()=>safeUrl && window.open(safeUrl,'_blank','popup,width=480,height=760,noopener,noreferrer')}><ExternalLink size={14}/> Panel window</button></div>
    <div className="frame-wrap">{safeUrl ? <iframe key={frameKey} title={`${network.name} sign-in`} src={safeUrl} referrerPolicy="no-referrer" sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"/> : <div className="empty-frame">Enter a valid provider URL to open its official site.</div>}</div>
    <div className="security-note"><ShieldCheck size={19}/><div><b>Your credentials stay with the provider.</b><p>Type your password only on the provider's own site. TradeVerse Elite does not collect or store it. Some networks block embedded sign-in or third-party cookies; if the frame is blank or loops, use <b>Panel window</b>.</p></div></div>
    <div className="recorder-cta"><div><b>Finished signing in?</b><p className="muted small">Confirm below to record account metadata only. This does not import provider statistics.</p></div><button className="primary" onClick={()=>onRecord(network)}>Record account</button></div>
  </section></div>;
}
