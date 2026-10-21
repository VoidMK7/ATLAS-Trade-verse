#!/usr/bin/env node
/* TEST-ONLY server: serves the built site with the production security headers from vercel.json and implements the subset of the
   Supabase REST/Auth API the app uses, executing everything against a LOCAL Postgres that has the real schema, RLS policies and 002 migration.
   It is a test double so the real UI can be driven against the real SQL. It is not part of the product. */
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFile}=require('child_process');
const ROOT=path.resolve(__dirname,'../..'),PORT=+process.env.PORT||5173;
const PG=['-h',process.env.PGHOST||'/tmp','-p',process.env.PGPORT||'54329','-U','postgres','-d',process.env.PGDB||'t'];
const ANON='test-anon-key';
const vj=JSON.parse(fs.readFileSync(path.join(ROOT,'vercel.json'),'utf8'));
const secHeaders=Object.fromEntries(vj.headers[0].headers.map(h=>[h.key,h.value]));
const lit=v=>v==null?'null':typeof v==='number'||typeof v==='boolean'?String(v):"'"+String(v).replace(/'/g,"''")+"'";
const ident=s=>{if(!/^[a-z_][a-z0-9_]*$/.test(s))throw Object.assign(new Error('bad identifier '+s),{status:400});return s};
const sqlVal=v=>Array.isArray(v)?(v.length?'array['+v.map(sqlVal).join(',')+']':"'{}'"):v&&typeof v==='object'?lit(JSON.stringify(v))+'::jsonb':lit(v);
function psql(sql){return new Promise((res,rej)=>execFile('psql',['-X','-q','-A','-t','-v','ON_ERROR_STOP=1',...PG,'-c',sql],{maxBuffer:64e6},(e,out,err)=>{
  if(e){const m=/ERROR:\s+([\s\S]*?)(?:\n(?:DETAIL|HINT|CONTEXT|LINE|QUERY):|$)/.exec(err||''),h=/HINT:\s+(.*)/.exec(err||'');
    const message=(m&&m[1].trim())||String(err).trim(),priv=/permission denied|row-level security/.test(message);
    return rej(Object.assign(new Error(message),{status:priv?403:/does not exist/.test(message)?404:400,body:{code:priv?'42501':'P0001',message,hint:h?h[1].trim():null,details:null}}))}
  res(out.trim())}))}
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const mint=(u,aal='aal1')=>`${b64({alg:'none',typ:'JWT'})}.${b64({sub:u.id,email:u.email,role:'authenticated',aal,exp:Math.floor(Date.now()/1000)+3600})}.sig`;
const claims=req=>{const t=(req.headers.authorization||'').replace(/^Bearer /,'');if(!t||t===ANON)return{role:'anon'};try{const p=JSON.parse(Buffer.from(t.split('.')[1],'base64url'));return p}catch{return{role:'anon'}}};
const wrap=(c,q)=>`set local role ${c.role==='authenticated'?'authenticated':'anon'}; set local request.jwt.claims = ${lit(JSON.stringify(c))}; set local request.jwt.claim.sub = ${lit(c.sub||'')}; set local request.jwt.claim.role = ${lit(c.role||'anon')}; ${q}`;
// psql -c with several statements prints only the last result, which is what we want.
const splitTop=s=>{const o=[];let d=0,c='';for(const ch of s){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&!d){o.push(c);c=''}else c+=ch}if(c)o.push(c);return o};
function filters(sp){const w=[];for(const[k,v]of sp){if(['select','order','limit','offset'].includes(k))continue;const m=/^(not\.)?(eq|neq|gt|gte|lt|lte|like|ilike|in|is)\.(.*)$/.exec(v);if(!m)continue;const col='t.'+ident(k),neg=m[1]?'not ':'';let x;
  const op={eq:'=',neq:'<>',gt:'>',gte:'>=',lt:'<',lte:'<=',like:'like',ilike:'ilike'}[m[2]];
  if(m[2]==='in')x=`${col} in (${m[3].replace(/^\(|\)$/g,'').split(',').map(s=>lit(s.replace(/^"|"$/g,''))).join(',')})`;else if(m[2]==='is')x=`${col} is ${m[3]==='null'?'null':m[3]}`;else x=`${col} ${op} ${lit(m[3])}`;w.push(neg?`not (${x})`:x)}return w.length?' where '+w.join(' and '):''}
function selectCols(sel){return splitTop(sel||'*').map(tok=>{tok=tok.trim();const m=/^([a-z_]+)\((.*)\)$/.exec(tok);if(m){const rel=ident(m[1]);return `(select row_to_json(e) from (select ${m[2]} from public.${rel} e0 where e0.id=t.${rel.replace(/s$/,'')}_id) e) as ${rel}`}return tok==='*'?'t.*':'t.'+ident(tok)}).join(',')}
const fnMeta={};async function loadFns(){const o=await psql("select json_agg(json_build_object('n',proname,'set',proretset,'void',prorettype='void'::regtype)) from pg_proc where pronamespace='public'::regnamespace");for(const f of JSON.parse(o))fnMeta[f.n]=f}
const users=new Map(),refresh=new Map(); // email -> {id,email,password}
async function readBody(req){const c=[];for await(const x of req)c.push(x);const t=Buffer.concat(c).toString();try{return t?JSON.parse(t):{}}catch{return{}}}
const send=(res,code,body,h={})=>{const s=body===undefined?'':typeof body==='string'?body:JSON.stringify(body);res.writeHead(code,{'Content-Type':'application/json',...h});res.end(s)};

async function api(req,res,u){
  const sp=u.searchParams,p=u.pathname.replace(/^\/sb/,''),body=['POST','PUT','PATCH'].includes(req.method)?await readBody(req):{};
  if(p.startsWith('/auth/v1/')){
    const a=p.slice(9);
    if(a==='token'){const gt=sp.get('grant_type');
      if(gt==='password'){const x=users.get((body.email||'').toLowerCase());if(!x||x.password!==body.password)return send(res,400,{error:'invalid_grant',error_description:'Invalid login credentials'});
        const rt=crypto.randomUUID();refresh.set(rt,x);return send(res,200,{access_token:mint(x),refresh_token:rt,expires_in:3600,token_type:'bearer',user:{id:x.id,email:x.email}})}
      if(gt==='refresh_token'){const x=refresh.get(body.refresh_token);if(!x)return send(res,400,{error:'invalid_grant',error_description:'Invalid Refresh Token'});return send(res,200,{access_token:mint(x),refresh_token:body.refresh_token,expires_in:3600,token_type:'bearer',user:{id:x.id,email:x.email}})}}
    if(a==='signup'){const em=(body.email||'').toLowerCase();if(!/^\S+@\S+\.\S+$/.test(em)||(body.password||'').length<6)return send(res,422,{code:422,msg:'Password should be at least 6 characters.'});
      if(users.has(em))return send(res,422,{code:422,msg:'User already registered'});const id=crypto.randomUUID();await psql(`insert into auth.users(id,email) values(${lit(id)},${lit(em)})`);const x={id,email:em,password:body.password};users.set(em,x);const rt=crypto.randomUUID();refresh.set(rt,x);
      return send(res,200,{access_token:mint(x),refresh_token:rt,expires_in:3600,token_type:'bearer',user:{id,email:em}})}
    if(a==='user'&&req.method==='GET'){const c=claims(req);if(c.role!=='authenticated')return send(res,401,{code:401,msg:'Invalid token'});return send(res,200,{id:c.sub,email:c.email,factors:[]})}
    if(a.startsWith('logout'))return send(res,204);if(a.startsWith('recover'))return send(res,200,{});
    return send(res,404,{msg:'not mocked: '+a})}
  if(p.startsWith('/rest/v1/rpc/')){const fn=ident(p.slice(13)),m=fnMeta[fn];if(!m)return send(res,404,{code:'PGRST202',message:`Could not find the function public.${fn}`,hint:null,details:null});
    const c=claims(req),args=Object.entries(body).map(([k,v])=>`${ident(k)} => ${sqlVal(v)}`).join(', '),call=`public.${fn}(${args})`;
    const q=m.set?`select coalesce(json_agg(r),'[]'::json) from ${call} r`:m.void?`select ${call}`:`select to_json(${call})`;
    const out=await psql(wrap(c,q));return m.void?send(res,204):send(res,200,out||'null')}
  if(p.startsWith('/rest/v1/')){const table=ident(p.slice(9)),c=claims(req);
    if(req.method==='GET'){const w=filters(sp),order=(sp.get('order')||'').split(',').filter(Boolean).map(o=>{const[col,...r]=o.split('.');return 't.'+ident(col)+(r.includes('desc')?' desc':'')}).join(','),
      sql=`select coalesce(json_agg(r),'[]'::json) from (select ${selectCols(sp.get('select'))} from public.${table} t${w}${order?' order by '+order:''}${sp.get('limit')?' limit '+(+sp.get('limit')|0):''}${sp.get('offset')?' offset '+(+sp.get('offset')|0):''}) r`;
      const out=await psql(wrap(c,sql)),h={};if(/count=exact/.test(req.headers.prefer||'')){const n=+(await psql(wrap(c,`select count(*) from public.${table} t${w}`)));h['Content-Range']=`0-${Math.max(0,n-1)}/${n}`}return send(res,200,out,h)}
    if(req.method==='POST'){const rows=Array.isArray(body)?body:[body],cols=Object.keys(rows[0]).map(ident);
      const sql=`with i as (insert into public.${table}(${cols.join(',')}) values ${rows.map(r=>'('+cols.map(k=>sqlVal(r[k])).join(',')+')').join(',')} returning *) select coalesce(json_agg(i),'[]'::json) from i`;return send(res,201,await psql(wrap(c,sql)))}
    if(req.method==='DELETE'){const sql=`with d as (delete from public.${table} t${filters(sp)} returning *) select coalesce(json_agg(d),'[]'::json) from d`;return send(res,200,await psql(wrap(c,sql)))}
    if(req.method==='PATCH'){const sets=Object.entries(body).map(([k,v])=>`${ident(k)}=${sqlVal(v)}`).join(',');return send(res,200,await psql(wrap(c,`with d as (update public.${table} t set ${sets}${filters(sp)} returning *) select coalesce(json_agg(d),'[]'::json) from d`)))}}
  send(res,404,{message:'not mocked'})}

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://x');
  if(u.pathname==='/__test/sql'&&req.method==='POST'){const{sql}=await readBody(req);return send(res,200,{out:await psql(sql)})}
  if(u.pathname==='/__test/user'&&req.method==='POST'){const{email,password,admin}=await readBody(req);const em=email.toLowerCase();let x=users.get(em);if(!x){const id=crypto.randomUUID();await psql(`insert into auth.users(id,email) values(${lit(id)},${lit(em)})`);x={id,email:em,password};users.set(em,x)}
    if(admin)await psql(`insert into public.user_roles values(${lit(x.id)},'admin') on conflict do nothing`);return send(res,200,{id:x.id})}
  if(u.pathname.startsWith('/sb/')){try{return await api(req,res,u)}catch(e){return send(res,e.status||500,e.body||{message:e.message})}}
  let f=u.pathname==='/'?'/index.html':u.pathname;
  if(f==='/config.js'){res.writeHead(200,{'Content-Type':MIME['.js'],...secHeaders});return res.end(`window.APP_CONFIG={url:location.origin+'/sb',key:'${ANON}'};`)}
  const fp=path.join(ROOT,path.normalize(f));if(!fp.startsWith(ROOT)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){res.writeHead(404,secHeaders);return res.end('not found')}
  res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream',...secHeaders,'Cache-Control':'no-store'});fs.createReadStream(fp).pipe(res)}catch(e){send(res,500,{message:String(e.message||e)})}
}).listen(PORT,'127.0.0.1',async()=>{await loadFns();console.log('e2e server on http://127.0.0.1:'+PORT)});
