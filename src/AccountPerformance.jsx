import React from 'react';
const money = n => n == null ? '—' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
export default function AccountPerformance({ metrics }) {
  if (!metrics) return <div className="muted small">No attributed activity yet</div>;
  return <div className="performance"><div><b>{metrics.clicks.toLocaleString()}</b> clicks <span>·</span> <b>{metrics.sessions.toLocaleString()}</b> sessions</div><div><b>{metrics.conversions.toLocaleString()}</b> conversions <span>·</span> <b>{money(metrics.revenue)}</b> revenue</div></div>;
}
