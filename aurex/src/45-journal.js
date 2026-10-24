/* ============ bot journal: every step a bot takes, written by the server engine (agent_log) ============ */
const JEV={signal:['info','Signal'],buy:['up','Buy'],sell:['down','Sell'],skip:['review','Skipped'],risk:['failed','Risk'],start:['active','Started'],stop:['review','Stopped'],pause:['review','Paused'],resume:['active','Resumed'],halt:['failed','Halted'],check:['info','Check'],error:['failed','Error'],expire:['review','Expired']};
function journal(box,agentIds,o={}){
  if(!box)return;const ids=[].concat(agentIds||[]).filter(Boolean);let rows=[],ev='all',ag=ids[0]||'all',off=false;
  box.innerHTML=`<div class="card"><h3>Bot journal <span class="mut" style="font-weight:400;font-size:12px">every step the bot takes, newest first</span></h3>
    <div class="row" style="margin-bottom:8px;gap:8px"><select id="jf" aria-label="Filter journal events"><option value="all">All events</option>${Object.entries(JEV).map(([k,x])=>`<option value="${k}">${x[1]}</option>`).join('')}</select>${ids.length>1?`<select id="ja" aria-label="Filter by bot"><option value="all">All bots</option>${ids.map((x,i)=>`<option value="${x}">${esc((o.names&&o.names[x])||'Bot '+(i+1))}</option>`).join('')}</select>`:''}<button class="btn sm" id="jd">Download CSV</button></div>
    <div id="jl" style="max-height:420px;overflow:auto">${skeleton(3)}</div></div>`;
  const paint=()=>{const r=rows.filter(x=>(ev==='all'||x.event===ev)&&(ag==='all'||x.agent_id===ag));const el=$('#jl',box);if(!el)return;
    el.innerHTML=r.length?r.map(x=>{const m=JEV[x.event]||['info',x.event];const det=x.detail&&Object.keys(x.detail).length?`<details><summary class="mut" style="cursor:pointer">details</summary><pre class="mono mut" style="white-space:pre-wrap;margin:4px 0 0;font-size:11px">${esc(JSON.stringify(x.detail,null,1))}</pre></details>`:'';
      return `<div class="jr"><span class="mut num">${dt(x.ts)}</span><span class="badge ${m[0]==='up'?'active':m[0]==='down'?'failed':m[0]}">${esc(m[1])}</span><span><b>${esc(x.symbol||'')}</b> ${esc(x.message||'')}${det}</span></div>`}).join(''):empty('No journal entries yet','Entries appear as soon as a bot is started and the engine evaluates it (about every minute while the market feed is scheduled).')};
  const load=async()=>{try{if(!ids.length){rows=[];paint();return}rows=await sel('agent_log',`agent_id=in.(${ids.join(',')})&select=*&order=ts.desc&limit=300`);off=false}catch(e){off=true;const el=$('#jl',box);if(el)el.innerHTML=`<div class="banner warn">The bot journal is not installed on this project yet. Run the setup SQL that includes migration 004 (see README).</div>`;return}paint()};
  box.onchange=e=>{if(e.target.id==='jf'){ev=e.target.value;paint()}if(e.target.id==='ja'){ag=e.target.value;paint()}};
  box.onclick=e=>{if(e.target.id==='jd'){if(!rows.length)return toast('No entries to export');download('bot-journal.csv',csv(['ts','agent_id','event','symbol','message'],rows))}};
  load();onData(['agent_log'],load,8000);
}
