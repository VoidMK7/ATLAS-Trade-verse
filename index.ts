import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, x-postback-key', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const cap = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
const pick = (key: string, query: URLSearchParams, body: Record<string, unknown>) => body[key] !== undefined ? body[key] : query.get(key);
const amount = (v: unknown) => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
function deviceFrom(ua: string) { if (/bot|crawler|spider|preview/i.test(ua)) return 'bot'; if (/ipad|tablet|kindle/i.test(ua)) return 'tablet'; if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile'; if (!ua) return 'unknown'; return 'desktop'; }
function browserFrom(ua: string) { if (/edg\//i.test(ua)) return 'Edge'; if (/opr\//i.test(ua)) return 'Opera'; if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return 'Chrome'; if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return 'Safari'; if (/firefox\//i.test(ua)) return 'Firefox'; return 'Other'; }
function safeDestination(value: unknown) { try { const u = new URL(String(value || '')); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!['GET','POST'].includes(req.method)) return json({ error: 'Method not allowed' }, 405);
  try {
    const url = new URL(req.url); let body: Record<string, unknown> = {};
    if (req.method === 'POST') { try { body = await req.json(); if (!body || typeof body !== 'object' || Array.isArray(body)) body = {}; } catch { body = {}; } }
    const code = cap(pick('code', url.searchParams, body), 64);
    if (!code) return json({ error: 'A tracking code is required' }, 400);
    const supabaseUrl = Deno.env.get('SUPABASE_URL'); const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Tracking service is not configured');
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: link, error: linkError } = await db.from('tracking_links').select('id,owner_id,name,code,destination_url,status,campaign_id,campaign_name,offer_id,offer_name,network_slug,account_id,account_label,postback_key,members').eq('code',code).maybeSingle();
    if (linkError) throw linkError;
    if (!link) return json({ error: 'Unknown or deleted tracking link' }, 404);
    const format = cap(pick('format',url.searchParams,body),16).toLowerCase(); const wantsJson = format === 'json';
    const destination = safeDestination(link.destination_url);
    const requestedType = cap(pick('event_type',url.searchParams,body),32).toLowerCase();
    const allowed = new Set(['click','landing_view','session_start','session_end','conversion','postback']);
    const eventType = allowed.has(requestedType) ? requestedType : 'click';
    if (link.status !== 'active') {
      if (!wantsJson && destination) return Response.redirect(destination,302);
      return json({ recorded:false, reason:'This link is paused.' },200);
    }
    if (!destination && eventType === 'click' && !wantsJson) return json({ error:'This tracking link has no valid HTTP/HTTPS destination.' },500);
    const key = cap(pick('postback_key',url.searchParams,body) ?? req.headers.get('x-postback-key'),256);
    if (eventType === 'conversion' || eventType === 'postback') {
      if (!key || key !== link.postback_key) return json({ error:'Invalid postback key for this link' },403);
    }
    const sessionId = cap(pick('sid',url.searchParams,body),64) || `s_${crypto.randomUUID().replaceAll('-','')}`;
    const dedupeKey = `${link.id}:${sessionId}:${eventType}:${eventType==='session_end'?'end':'start'}`;
    const { data: existing, error: dupError } = await db.from('tracking_events').select('id').eq('dedupe_key',dedupeKey).maybeSingle();
    if (dupError) throw dupError;
    if (existing) {
      if (eventType==='click' && !wantsJson && destination) return Response.redirect(destination,302);
      return json({ recorded:false, duplicate:true, session_id:sessionId, event_type:eventType },200);
    }
    const headers = req.headers; let country = ''; let countrySource = 'unavailable';
    for (const h of ['cf-ipcountry','x-vercel-ip-country','x-country-code']) { const v = cap(headers.get(h),2).toUpperCase(); if (v && v !== 'XX' && /^[A-Z]{2}$/.test(v)) { country=v; countrySource=h; break; } }
    if (!country) { const explicit=cap(pick('country',url.searchParams,body),2).toUpperCase(); if (/^[A-Z]{2}$/.test(explicit) && explicit!=='XX') { country=explicit; countrySource='referring_page'; } }
    const ua = cap(headers.get('user-agent'),500); const referrer = cap(pick('referrer',url.searchParams,body) || headers.get('referer'),400) || null;
    const eventRow = { link_id:link.id,campaign_id:link.campaign_id,campaign_name:link.campaign_name,offer_id:link.offer_id,offer_name:link.offer_name,network_slug:link.network_slug,account_id:link.account_id,account_label:link.account_label,event_type:eventType,session_id:sessionId,owner_id:link.owner_id,members:link.members||[],country,country_source:countrySource,device:deviceFrom(ua),browser:browserFrom(ua),referrer,source:(eventType==='conversion'||eventType==='postback')?'postback':'first_party',observed:true,notes:country?'': 'Country could not be derived for this request.',dedupe_key:dedupeKey };
    const { data: event, error: eventError } = await db.from('tracking_events').insert(eventRow).select('id').single();
    if (eventError) { if (eventError.code==='23505') return json({ recorded:false,duplicate:true,session_id:sessionId,event_type:eventType },200); throw eventError; }
    let conversionId: string | null = null;
    if (eventType==='conversion'||eventType==='postback') {
      const statusRaw=cap(pick('status',url.searchParams,body),20).toLowerCase(); const status=['approved','rejected'].includes(statusRaw)?statusRaw:'pending';
      const currencyRaw=cap(pick('currency',url.searchParams,body),3).toUpperCase(); const currency=/^[A-Z]{3}$/.test(currencyRaw)?currencyRaw:'USD';
      const conversion = { link_id:link.id,event_id:event.id,campaign_id:link.campaign_id,campaign_name:link.campaign_name,offer_id:link.offer_id,offer_name:link.offer_name,network_slug:link.network_slug,account_id:link.account_id,account_label:link.account_label,session_id:sessionId,owner_id:link.owner_id,members:link.members||[],status,revenue:amount(pick('revenue',url.searchParams,body)),payout:amount(pick('payout',url.searchParams,body)),cost:amount(pick('cost',url.searchParams,body)),currency,country,provider:cap(pick('provider',url.searchParams,body),100)||link.network_slug,source:'postback',dedupe_key:`${dedupeKey}:conversion` };
      const { data: conv, error: convError } = await db.from('conversions').insert(conversion).select('id').single();
      if (convError) { if (convError.code!=='23505') { await db.from('tracking_events').delete().eq('id',event.id); throw convError; } } else conversionId=conv.id;
    }
    if (wantsJson) return json({ recorded:true,duplicate:false,session_id:sessionId,event_type:eventType,country_code:country||null,country_source:countrySource,conversion_id:conversionId,note:'Recorded from this request only. Activity that happens after the visitor leaves the tracked link is not observable here.' },201);
    if (eventType==='click' && destination) return Response.redirect(destination,302);
    return json({ recorded:true,duplicate:false,session_id:sessionId,event_type:eventType,country_code:country||null,country_source:countrySource,conversion_id:conversionId },201);
  } catch (e) { return json({ error: e instanceof Error ? e.message : 'Unexpected tracking error' },500); }
});
