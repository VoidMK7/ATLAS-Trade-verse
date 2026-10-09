import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// All totals are produced inside Postgres RPCs; the browser never downloads rows to sum them.
export function useAccountMetrics(networkSlug = null) {
  const [metrics, setMetrics] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Connect Supabase to load live metrics.'); return; }
    setLoading(true); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('account_metrics', { p_network_slug: networkSlug });
      if (rpcError) throw rpcError;
      setMetrics(new Map((data || []).map(row => [row.account_id || 'unassigned', {
        clicks: Number(row.clicks || 0), sessions: Number(row.sessions || 0), conversions: Number(row.conversions || 0),
        revenue: row.revenue == null ? null : Number(row.revenue), payout: row.payout == null ? null : Number(row.payout), cost: row.cost == null ? null : Number(row.cost)
      }])));
    } catch (e) { setError(e.message || 'Unable to load account metrics.'); }
    finally { setLoading(false); }
  }, [networkSlug]);
  useEffect(() => { reload(); }, [reload]);
  return { metrics, loading, error, reload };
}
