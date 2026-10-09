import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
export function useDashboardMetrics(networkSlug = null) {
  const [data,setData]=useState({clicks:null,sessions:null,conversions:null,revenue:null});
  const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const reload=useCallback(async()=>{if(!supabase){setLoading(false);setError('Connect Supabase to load live metrics.');return;}setLoading(true);setError('');try{const {data:rows,error}=await supabase.rpc('dashboard_metrics',{p_network_slug:networkSlug});if(error)throw error;const r=rows?.[0]||{};setData({clicks:Number(r.clicks||0),sessions:Number(r.sessions||0),conversions:Number(r.conversions||0),revenue:r.revenue==null?null:Number(r.revenue)});}catch(e){setError(e.message||'Unable to load dashboard metrics.')}finally{setLoading(false)}},[networkSlug]);
  useEffect(()=>{reload()},[reload]); return {data,loading,error,reload};
}
