/* ============ pro chart terminal: chart types, overlays, sub-panes, drawing tools (canvas, mouse + touch) ============ */
const bollinger=(c,n=20,k=2)=>{const m=sma(c,n);return{mid:m,up:m.map((v,i)=>v==null?null:v+k*stdev(c.slice(i-n+1,i+1))),lo:m.map((v,i)=>v==null?null:v-k*stdev(c.slice(i-n+1,i+1)))}};
function stoch(d,n=14){const k=d.map((x,i)=>{if(i<n-1)return null;const w=d.slice(i-n+1,i+1),hh=Math.max(...w.map(q=>q.h)),ll=Math.min(...w.map(q=>q.l));return hh===ll?50:(x.c-ll)/(hh-ll)*100});
  const ks=k.map((_,i)=>i<n+1||k.slice(i-2,i+1).some(v=>v==null)?null:(k[i]+k[i-1]+k[i-2])/3);return{k:ks,d:ks.map((_,i)=>i<n+3||ks.slice(i-2,i+1).some(v=>v==null)?null:(ks[i]+ks[i-1]+ks[i-2])/3)}}
function vwapOf(d,intraday){let pv=0,vv=0,day=-1;return d.map(x=>{const dd=Math.floor(x.t/864e5);if(intraday&&dd!==day){day=dd;pv=0;vv=0}const tp=(x.h+x.l+x.c)/3,v=x.v||0;pv+=tp*v;vv+=v;return vv>0?pv/vv:null})}
function heikin(d){const o=[];d.forEach((x,i)=>{const c=(x.o+x.h+x.l+x.c)/4,op=i?(o[i-1].o+o[i-1].c)/2:(x.o+x.c)/2;o.push({t:x.t,o:op,c,h:Math.max(x.h,op,c),l:Math.min(x.l,op,c),v:x.v})});return o}
const TOOLS=[['cursor','Cursor','M5 3l12 7-5 1.5L9.5 17z'],['trend','Trend line','M4 18L18 6M4 18h.01M18 6h.01'],['ray','Ray','M4 18L20 4'],['hline','Horizontal line','M3 12h18'],['vline','Vertical line','M12 3v18'],['rect','Rectangle','M5 6h14v12H5z'],['fib','Fibonacci retracement','M4 5h16M4 10h16M4 15h16M4 20h16'],['measure','Measure','M4 17l16-10M7 15l1.5-3M11 13l1.5-3M15 11l1.5-3'],['text','Text note','M6 6h12M12 6v12']];
const CTYPES=[['candle','Candles'],['hollow','Hollow candles'],['ha','Heikin Ashi'],['bars','OHLC bars'],['line','Line'],['area','Area']];
const CIND=[['ma','MA 20/50'],['ema','EMA 21'],['bb','Bollinger 20,2'],['vwap','VWAP'],['vol','Volume'],['rsi','RSI 14'],['macd','MACD'],['stoch','Stochastic']];
const FIBS=[0,.236,.382,.5,.618,.786,1];
class ProChart{
  constructor(box,o={}){this.box=box;this.o={type:'candle',ma:true,ema:false,bb:false,vwap:false,vol:true,rsi:false,macd:false,stoch:false,tf:'1h',sym:'',...(LS.get('novatrade.chart',{})||{}),...o};
    this.data=[];this.count=100;this.off=0;this.hover=null;this.hy=null;this.ptr=new Map();this.tool='cursor';this.magnet=true;this.dr=[];this.sel=null;this.pend=null;this.geo={};
    box.classList.add('pc');box.innerHTML=`<div class="pc-bar"></div><div class="pc-wrap"></div>`;this.bar=box.firstChild;this.wrap=box.lastChild;this.cv=document.createElement('canvas');this.wrap.append(this.cv);this.cv.tabIndex=0;
    this.cv.setAttribute('role','img');this.cv.setAttribute('aria-label','Price chart with drawing tools. Drag to pan, scroll or pinch to zoom.');
    this.paintBar();this.bind();this.ro=new ResizeObserver(()=>this.draw());this.ro.observe(this.wrap);this.fsh=()=>{this.draw()};document.addEventListener('fullscreenchange',this.fsh)}
  persist(){const{type,ma,ema,bb,vwap,vol,rsi,macd,stoch}=this.o;LS.set('novatrade.chart',{type,ma,ema,bb,vwap,vol,rsi,macd,stoch})}
  loadDr(sym){this.o.sym=sym;this.dr=LS.get('novatrade.draw.'+sym,[])||[];this.sel=null;this.pend=null}
  saveDr(){LS.set('novatrade.draw.'+this.o.sym,this.dr)}
  paintBar(){const b=this.bar,ic2=d=>`<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d?`<path d="${d}"/>`:''}</svg>`;
    b.innerHTML=`<div class="pc-g" role="toolbar" aria-label="Drawing tools">${TOOLS.map(t=>`<button type="button" data-tool="${t[0]}" class="${this.tool===t[0]?'on':''}" title="${t[1]}" aria-label="${t[1]}">${ic2(t[2])}</button>`).join('')}<button type="button" data-a="magnet" class="${this.magnet?'on':''}" title="Snap to candle prices">🧲</button><button type="button" data-a="del" title="Delete selected drawing (Del)">⌫</button><button type="button" data-a="clear" title="Remove all drawings on this chart">🗑</button></div>
    <div class="pc-g nov"><select data-a="type" aria-label="Chart type">${CTYPES.map(t=>`<option value="${t[0]}" ${this.o.type===t[0]?'selected':''}>${t[1]}</option>`).join('')}</select><details class="pc-ind"><summary>Indicators</summary><div>${CIND.map(t=>`<label><input type="checkbox" data-i="${t[0]}" ${this.o[t[0]]?'checked':''}> ${t[1]}</label>`).join('')}</div></details><button type="button" data-a="fs" title="Full screen">⛶</button><button type="button" data-a="png" title="Save chart as image">⤓</button></div>`;
    b.onclick=e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.tool){this.setTool(t.dataset.tool);return}const a=t.dataset.a;
      if(a==='magnet'){this.magnet=!this.magnet;t.classList.toggle('on',this.magnet)}else if(a==='del')this.delSel();else if(a==='clear'){if(this.dr.length&&confirm('Remove all drawings on this chart?')){this.dr=[];this.sel=null;this.saveDr();this.draw()}}
      else if(a==='fs'){const el=this.box;document.fullscreenElement?document.exitFullscreen():(el.requestFullscreen?el.requestFullscreen():null)}else if(a==='png')this.png()};
    b.onchange=e=>{const t=e.target;if(t.dataset.a==='type'){this.o.type=t.value}else if(t.dataset.i){this.o[t.dataset.i]=t.checked;this.calc()}else return;this.persist();this.draw()}}
  setTool(t){this.tool=t;this.pend=null;this.tmp=null;$$('[data-tool]',this.bar).forEach(x=>x.classList.toggle('on',x.dataset.tool===t));this.cv.style.cursor=t==='cursor'?'crosshair':'cell';this.draw()}
  delSel(){if(this.sel==null)return;this.dr=this.dr.filter(d=>d.id!==this.sel);this.sel=null;this.saveDr();this.draw()}
  png(){const a=document.createElement('a');a.download=`${(this.o.sym||'chart').replace('/','-')}-${this.o.tf}.png`;a.href=this.cv.toDataURL('image/png');a.click()}
  /* ---- coordinates ---- */
  gi(t){const d=this.data,n=d.length;if(!n)return 0;const st=TF[this.o.tf]||6e4;if(t>=d[n-1].t)return n-1+(t-d[n-1].t)/st;if(t<=d[0].t)return(t-d[0].t)/st;let lo=0,hi=n-1;while(hi-lo>1){const m=(lo+hi)>>1;d[m].t<=t?lo=m:hi=m}return lo+(t-d[lo].t)/((d[hi].t-d[lo].t)||1)}
  tOf(gi){const d=this.data,n=d.length,st=TF[this.o.tf]||6e4;if(gi>=n-1)return d[n-1].t+(gi-(n-1))*st;if(gi<=0)return d[0].t+gi*st;const lo=Math.floor(gi);return d[lo].t+(gi-lo)*(d[lo+1].t-d[lo].t)}
  px(t){return(this.gi(t)-this.g.st+.5)*this.g.bw}py(v){const g=this.g;return(g.hi-v)/(g.hi-g.lo)*(g.mh-g.volH-4)+4}
  pt(x,y){const g=this.g,gi=x/g.bw-.5+g.st;let p=g.hi-(y-4)/(g.mh-g.volH-4)*(g.hi-g.lo);
    if(this.magnet){const i=Math.round(gi),b=this.data[i];if(b){const c=[b.o,b.h,b.l,b.c].map(v=>[Math.abs(this.py(v)-y),v]).sort((a,c)=>a[0]-c[0])[0];if(c[0]<14)p=c[1]}}return{t:this.tOf(gi),p}}
  /* ---- data ---- */
  set(d){this.data=d;this.calc();this.draw()}update(){this.calc();this.draw()}
  calc(){const d=this.data,c=d.map(x=>x.c),intr=(TF[this.o.tf]||0)<864e5;this.disp=this.o.type==='ha'?heikin(d):d;
    this.ind={ma20:sma(c,20),ma50:sma(c,50),ema21:this.o.ema?ema(c,21):[],bb:this.o.bb?bollinger(c):null,vwap:this.o.vwap?vwapOf(d,intr):[],rsi:this.o.rsi?rsi(c):[],macd:this.o.macd?macd(c):null,st:this.o.stoch?stoch(d):null}}
  destroy(){this.ro.disconnect();document.removeEventListener('fullscreenchange',this.fsh);this.saveDr()}
  zoom(n){this.count=Math.max(15,Math.min(Math.min(400,this.data.length||400),n));this.draw()}
  dist(){const a=[...this.ptr.values()];return a.length===2?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0}
  /* ---- hit testing ---- */
  segDist(x,y,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/l)):0;return Math.hypot(x-(x1+t*dx),y-(y1+t*dy))}
  hit(x,y){const g=this.g;for(let i=this.dr.length-1;i>=0;i--){const d=this.dr[i],ax=this.px(d.a.t),ay=this.py(d.a.p),bx=d.b?this.px(d.b.t):ax,by=d.b?this.py(d.b.p):ay;let h=false;
      if(d.type==='hline')h=Math.abs(y-ay)<7;else if(d.type==='vline')h=Math.abs(x-ax)<7;else if(d.type==='text')h=Math.abs(x-ax)<60&&Math.abs(y-ay)<12;
      else if(d.type==='rect'||d.type==='fib'){const x0=Math.min(ax,bx),x1=d.type==='fib'?g.pw:Math.max(ax,bx),y0=Math.min(ay,by),y1=Math.max(ay,by);h=x>=x0-6&&x<=x1+6&&y>=y0-6&&y<=y1+6&&(d.type==='fib'||Math.min(Math.abs(x-x0),Math.abs(x-x1),Math.abs(y-y0),Math.abs(y-y1))<7||true)}
      else h=this.segDist(x,y,ax,ay,d.type==='ray'?ax+(bx-ax)*1e3:bx,d.type==='ray'?ay+(by-ay)*1e3:by)<8;if(h)return d}return null}
  /* ---- input ---- */
  bind(){const c=this.cv,rel=e=>{const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
    c.addEventListener('pointerdown',e=>{if(!this.g)return;c.setPointerCapture(e.pointerId);const p=rel(e);this.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});this.pd=this.dist();this.pc=this.count;this.moved=0;this.down=p;
      if(this.tool!=='cursor'&&p.x<this.g.pw&&p.y<this.g.mh){const q=this.pt(p.x,p.y),T=this.tool;
        if(T==='hline'||T==='vline'||T==='text'){let txt;if(T==='text'){txt=prompt('Note text','');if(!txt)return}this.add({type:T,a:q,text:txt});return}
        if(this.pend){this.pend.b=q;this.finish()}else{this.pend={type:T,a:q,b:q};this.tmp=this.pend;this.pstart=p}return}
      if(this.tool==='cursor'){const h=this.hit(p.x,p.y);this.sel=h?h.id:null;this.dragD=h?{d:h,ax:this.pt(p.x,p.y),a0:{...h.a},b0:h.b?{...h.b}:null}:null;this.draw()}});
    c.addEventListener('pointermove',e=>{const p=rel(e),pr=this.ptr.get(e.pointerId);if(!this.g)return;
      if(this.pend){this.pend.b=this.pt(Math.min(p.x,this.g.pw-1),Math.min(p.y,this.g.mh)) ;this.hover=p.x;this.hy=p.y;this.draw();return}
      if(!pr){if(e.pointerType==='mouse'){this.hover=p.x;this.hy=p.y;this.draw()}return}
      if(this.dragD){const q=this.pt(p.x,p.y),a=this.dragD.ax,dt=q.t-a.t,dp=q.p-a.p,d=this.dragD.d;d.a={t:this.dragD.a0.t+dt,p:this.dragD.a0.p+dp};if(d.b)d.b={t:this.dragD.b0.t+dt,p:this.dragD.b0.p+dp};this.moved=9;this.draw();return}
      if(this.ptr.size===2){this.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});const d=this.dist();if(this.pd)this.zoom(this.pc*this.pd/d);return}
      const bw=this.g.bw,dx=e.clientX-pr.x;this.moved+=Math.abs(dx);if(Math.abs(dx)>=bw*.5||this.moved>4){this.off=Math.max(-20,Math.min(this.data.length-10,this.off+dx/bw));pr.x=e.clientX;this.hover=e.pointerType==='mouse'?p.x:null;this.hy=p.y;this.draw()}});
    const up=e=>{const p=rel(e);if(this.pend&&this.pstart){if(Math.hypot(p.x-this.pstart.x,p.y-this.pstart.y)>10){this.pend.b=this.pt(Math.min(p.x,this.g.pw-1),Math.min(p.y,this.g.mh));this.finish()}this.pstart=null}
      else if(this.dragD){if(this.moved>=9)this.saveDr();this.dragD=null}
      else if(this.ptr.get(e.pointerId)&&this.moved<5&&e.pointerType!=='mouse'){this.hover=p.x;this.hy=p.y;this.draw()}this.ptr.delete(e.pointerId)};
    c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);c.addEventListener('pointerleave',()=>{if(!this.pend){this.hover=null;this.draw()}});
    c.addEventListener('wheel',e=>{e.preventDefault();this.zoom(this.count*(e.deltaY>0?1.12:.89))},{passive:false});
    c.addEventListener('dblclick',()=>{this.off=0;this.count=100;this.draw()});
    c.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')this.off=Math.min(this.data.length-10,this.off+5);else if(e.key==='ArrowRight')this.off=Math.max(-20,this.off-5);else if(e.key==='+')this.zoom(this.count*.85);else if(e.key==='-')this.zoom(this.count*1.18);else if(e.key==='Delete'||e.key==='Backspace')this.delSel();else if(e.key==='Escape'){this.pend=null;this.tmp=null;this.setTool('cursor')}else return;e.preventDefault();this.draw()})}
  add(d){d.id=Date.now()+Math.random();this.dr.push(d);this.sel=d.id;this.pend=null;this.tmp=null;this.pstart=null;this.saveDr();this.setTool('cursor')}
  finish(){const d=this.pend;if(d&&Math.abs(d.a.t-d.b.t)+Math.abs(d.a.p-d.b.p)>0)this.add({type:d.type,a:d.a,b:d.b});else{this.pend=null;this.tmp=null}}
  /* ---- rendering ---- */
  draw(){if(!this.data.length||!this.cv.isConnected)return;const r=this.wrap.getBoundingClientRect();if(r.width<10||r.height<10)return;this.cv.style.width=r.width+'px';this.cv.style.height=r.height+'px';const[x,W,H]=fit(this.cv);x.clearRect(0,0,W,H);x.font='11px Inter,system-ui';
    const O=this.o,axis=64,pw=W-axis,n=Math.round(this.count),end=Math.min(this.data.length+20,this.data.length-Math.round(this.off)),st=end-n,subsList=['rsi','macd','stoch'].filter(k=>O[k]),sh=subsList.length?Math.min(90,H*.16):0,mh=H-20-sh*subsList.length,bw=pw/n,D=this.disp;
    const a=Math.max(0,st),b=Math.min(D.length,end),vis=D.slice(a,b);if(!vis.length)return;
    let hi=Math.max(...vis.map(d=>d.h)),lo=Math.min(...vis.map(d=>d.l));if(O.bb&&this.ind.bb){for(let i=a;i<b;i++){const u=this.ind.bb.up[i],l=this.ind.bb.lo[i];if(u!=null){hi=Math.max(hi,u);lo=Math.min(lo,l)}}}
    const pad=(hi-lo)*.08||hi*.01;hi+=pad;lo-=pad;const volH=O.vol?mh*.16:0;this.g={st,n,pw,mh,bw,hi,lo,volH,W,H};this.geo=this.g;
    const Y=v=>(hi-v)/(hi-lo)*(mh-volH-4)+4,X=i=>(i-st)*bw+bw/2,intr=(TF[O.tf]||0)<864e5;
    x.strokeStyle=CC.grid;x.fillStyle=CC.txt;x.lineWidth=1;x.textAlign='left';
    for(let i=0;i<=5;i++){const v=lo+(hi-lo)*i/5,y=Y(v);x.beginPath();x.moveTo(0,y);x.lineTo(pw,y);x.stroke();x.fillText(fmtPrice(v),pw+6,y+4)}
    const ts=Math.max(1,Math.round(n/6));x.textAlign='center';for(let i=Math.ceil(a/ts)*ts;i<b;i+=ts){const d=new Date(D[i].t);x.fillText(intr?d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([], {month:'short',day:'numeric'}),X(i),H-6)}
    x.save();x.beginPath();x.rect(0,0,pw,H);x.clip();
    const vmax=Math.max(...vis.map(d=>d.v||0))||1;
    if(O.type==='line'||O.type==='area'){x.beginPath();vis.forEach((d,j)=>{const px=X(a+j),py=Y(d.c);j?x.lineTo(px,py):x.moveTo(px,py)});x.strokeStyle=CC.acc;x.lineWidth=2;x.stroke();x.lineWidth=1;
      if(O.type==='area'){x.lineTo(X(a+vis.length-1),mh-volH);x.lineTo(X(a),mh-volH);x.closePath();const g=x.createLinearGradient(0,0,0,mh);g.addColorStop(0,CC.acc+'55');g.addColorStop(1,'transparent');x.fillStyle=g;x.fill()}}
    vis.forEach((d,j)=>{const i=a+j,up=d.c>=d.o,col=up?CC.up:CC.down,cx=X(i);if(O.vol){const v=this.data[i].v||0;x.globalAlpha=.3;x.fillStyle=col;x.fillRect(cx-bw*.35,mh-v/vmax*volH,bw*.7,v/vmax*volH);x.globalAlpha=1}
      if(O.type==='line'||O.type==='area')return;x.strokeStyle=col;x.fillStyle=col;
      if(O.type==='bars'){x.beginPath();x.moveTo(cx,Y(d.h));x.lineTo(cx,Y(d.l));x.moveTo(cx-bw*.35,Y(d.o));x.lineTo(cx,Y(d.o));x.moveTo(cx,Y(d.c));x.lineTo(cx+bw*.35,Y(d.c));x.stroke();return}
      x.beginPath();x.moveTo(cx,Y(d.h));x.lineTo(cx,Y(d.l));x.stroke();const t=Y(Math.max(d.o,d.c)),bb=Y(Math.min(d.o,d.c)),w=Math.max(1,bw*.7);
      if(O.type==='hollow'&&up){x.strokeRect(cx-w/2,t,w,Math.max(1,bb-t))}else x.fillRect(cx-w/2,t,w,Math.max(1,bb-t))});
    const line=(arr,col,Yf,py=0,w=1.4)=>{x.strokeStyle=col;x.lineWidth=w;x.beginPath();let s=0;for(let i=a;i<b;i++){const v=arr[i];if(v==null){s=0;continue}const px=X(i),y=Yf(v)+py;s?x.lineTo(px,y):x.moveTo(px,y);s=1}x.stroke();x.lineWidth=1};
    let lx=8;const lab=(t,c)=>{x.textAlign='left';x.fillStyle=c;x.fillText(t,lx,28);lx+=x.measureText(t).width+10};
    if(O.ma){line(this.ind.ma20,CC.ma1,Y);line(this.ind.ma50,CC.ma2,Y);lab('MA20',CC.ma1);lab('MA50',CC.ma2)}
    if(O.ema){line(this.ind.ema21,'#6ee7ff',Y);lab('EMA21','#6ee7ff')}
    if(O.vwap){line(this.ind.vwap,'#c792ff',Y);lab('VWAP','#c792ff')}
    if(O.bb&&this.ind.bb){const B=this.ind.bb;x.globalAlpha=.08;x.fillStyle='#8ab4ff';x.beginPath();let s=0;for(let i=a;i<b;i++){if(B.up[i]==null)continue;s?x.lineTo(X(i),Y(B.up[i])):x.moveTo(X(i),Y(B.up[i]));s=1}for(let i=b-1;i>=a;i--){if(B.lo[i]!=null)x.lineTo(X(i),Y(B.lo[i]))}x.closePath();x.fill();x.globalAlpha=1;line(B.up,'#8ab4ff',Y,0,1);line(B.lo,'#8ab4ff',Y,0,1);line(B.mid,'#8ab4ff88',Y,0,1);lab('BB 20,2','#8ab4ff')}
    const last=this.data[this.data.length-1];if(this.off<=0){const y=Y(last.c);x.setLineDash([4,4]);x.strokeStyle=last.c>=last.o?CC.up:CC.down;x.beginPath();x.moveTo(0,y);x.lineTo(pw,y);x.stroke();x.setLineDash([])}
    /* drawings */
    const all=this.tmp?[...this.dr,{...this.tmp,tmp:1,id:-1}]:this.dr;all.forEach(d=>this.paintDr(x,d,pw,mh,Y));
    x.restore();
    this.dr.filter(d=>d.type==='hline').forEach(d=>{const y=this.py(d.a.p);if(y<0||y>mh)return;x.fillStyle='#ffc72c';x.fillRect(pw,y-9,axis,18);x.fillStyle='#1a0a05';x.textAlign='left';x.fillText(fmtPrice(d.a.p),pw+6,y+4)});
    if(this.off<=0){const y=Y(last.c);x.fillStyle=last.c>=last.o?CC.up:CC.down;x.fillRect(pw,y-9,axis,18);x.fillStyle='#1a0a05';x.textAlign='left';x.fillText(fmtPrice(last.c),pw+6,y+4)}
    /* sub panes */
    let py=mh;const pane=(title,fn)=>{x.strokeStyle=CC.grid;x.strokeRect(0,py,pw,sh-4);x.save();x.beginPath();x.rect(0,py,pw,sh-4);x.clip();fn(py);x.restore();x.fillStyle=CC.txt;x.textAlign='left';x.fillText(title,8,py+12);py+=sh};
    if(O.rsi)pane('RSI 14',p=>{const f=v=>(100-v)/100*(sh-8)+2;[30,70].forEach(l=>{x.beginPath();x.moveTo(0,p+f(l));x.lineTo(pw,p+f(l));x.stroke()});line(this.ind.rsi,CC.rsi,f,p)});
    if(O.macd&&this.ind.macd)pane('MACD 12,26,9',p=>{const m=this.ind.macd,mx=Math.max(...vis.map((_,j)=>Math.abs(m.h[a+j]||0)),1e-9)*1.6,f=v=>(1-v/mx)/2*(sh-8)+2;
      vis.forEach((_,j)=>{const h=m.h[a+j];if(h==null)return;x.fillStyle=h>=0?CC.up:CC.down;x.globalAlpha=.55;const y0=f(0),y1=f(h);x.fillRect(X(a+j)-bw*.3,p+Math.min(y0,y1),bw*.6,Math.abs(y1-y0)||1);x.globalAlpha=1});line(m.m,CC.ma1,f,p);line(m.s,CC.ma2,f,p)});
    if(O.stoch&&this.ind.st)pane('Stoch 14,3,3',p=>{const f=v=>(100-v)/100*(sh-8)+2;[20,80].forEach(l=>{x.beginPath();x.moveTo(0,p+f(l));x.lineTo(pw,p+f(l));x.stroke()});line(this.ind.st.k,CC.ma1,f,p);line(this.ind.st.d,CC.ma2,f,p)});
    /* crosshair + legend */
    const hv=this.hover!=null&&this.hover<pw?Math.min(b-1,Math.max(a,Math.floor(this.hover/bw+st))):null,d=hv!=null?this.data[hv]:last;
    if(hv!=null){const cx=X(hv);x.strokeStyle='#7a6462';x.setLineDash([3,3]);x.beginPath();x.moveTo(cx,0);x.lineTo(cx,H-18);if(this.hy!=null&&this.hy<mh){x.moveTo(0,this.hy);x.lineTo(pw,this.hy)}x.stroke();x.setLineDash([]);
      if(this.hy!=null&&this.hy<mh){const pv=hi-(this.hy-4)/(mh-volH-4)*(hi-lo);x.fillStyle='#3a2a2a';x.fillRect(pw,this.hy-9,axis,18);x.fillStyle='#fff';x.textAlign='left';x.fillText(fmtPrice(pv),pw+6,this.hy+4)}
      const dtx=new Date(d.t).toLocaleString([], {dateStyle:'short',timeStyle:intr?'short':undefined});const tw=x.measureText(dtx).width+10;x.fillStyle='#3a2a2a';x.fillRect(Math.min(pw-tw,Math.max(0,cx-tw/2)),H-18,tw,16);x.fillStyle='#fff';x.textAlign='center';x.fillText(dtx,Math.min(pw-tw/2,Math.max(tw/2,cx)),H-6)}
    const chg=(d.c/d.o-1)*100;x.textAlign='left';x.font='11.5px Inter,system-ui';x.fillStyle=CC.txt;const lg=`O ${fmtPrice(d.o)}  H ${fmtPrice(d.h)}  L ${fmtPrice(d.l)}  C ${fmtPrice(d.c)}`;x.fillText(lg,8,14);const w1=x.measureText(lg).width;x.fillStyle=chg>=0?CC.up:CC.down;x.fillText((chg>=0?'+':'')+chg.toFixed(2)+'%',16+w1,14);x.fillStyle=CC.txt;x.font='11px Inter,system-ui';
    if(this.pend)x.fillText(this.pstart?'Release to place':'Tap the second point',8,mh-8);
  }
  paintDr(x,d,pw,mh,Y){const ax=this.px(d.a.t),ay=this.py(d.a.p),b=d.b||d.a,bx=this.px(b.t),by=this.py(b.p),sel=d.id===this.sel,col=d.tmp?'#ffffffaa':sel?'#fff':'#ffc72c';x.save();x.strokeStyle=col;x.fillStyle=col;x.lineWidth=sel?2:1.4;
    const tag=(txt,xx,yy,bg='#2a1a14')=>{const w=x.measureText(txt).width+10;x.fillStyle=bg;x.fillRect(xx,yy-9,w,18);x.fillStyle='#fff';x.textAlign='left';x.fillText(txt,xx+5,yy+4)};
    switch(d.type){
      case'trend':x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();break;
      case'ray':{const k=1e3;x.beginPath();x.moveTo(ax,ay);x.lineTo(ax+(bx-ax)*k,ay+(by-ay)*k);x.stroke();break}
      case'hline':x.beginPath();x.moveTo(0,ay);x.lineTo(pw,ay);x.stroke();break;
      case'vline':x.beginPath();x.moveTo(ax,0);x.lineTo(ax,this.g.H);x.stroke();break;
      case'rect':x.globalAlpha=.12;x.fillRect(Math.min(ax,bx),Math.min(ay,by),Math.abs(bx-ax),Math.abs(by-ay));x.globalAlpha=1;x.strokeRect(Math.min(ax,bx),Math.min(ay,by),Math.abs(bx-ax),Math.abs(by-ay));break;
      case'fib':{const x0=Math.min(ax,bx);FIBS.forEach((f,i)=>{const p=d.b.p+(d.a.p-d.b.p)*f,y=this.py(p);x.globalAlpha=.9;x.strokeStyle=['#ff4d4f','#ff9f1c','#ffc72c','#fff','#8ab4ff','#c792ff','#ffc72c'][i];x.setLineDash(i&&i<6?[4,3]:[]);x.beginPath();x.moveTo(x0,y);x.lineTo(pw,y);x.stroke();x.setLineDash([]);x.fillStyle=x.strokeStyle;x.textAlign='left';x.fillText(`${(f*100).toFixed(1)}%  ${fmtPrice(p)}`,x0+4,y-3)});x.globalAlpha=.5;x.strokeStyle=col;x.setLineDash([3,3]);x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();break}
      case'measure':{x.setLineDash([5,4]);x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();x.setLineDash([]);const dp=d.b.p-d.a.p,bars=Math.round(this.gi(d.b.t)-this.gi(d.a.t)),txt=`${dp>=0?'+':''}${fmtPrice(dp)} (${(dp/d.a.p*100).toFixed(2)}%) · ${Math.abs(bars)} bars`;tag(txt,Math.min(pw-x.measureText(txt).width-12,Math.max(2,bx+6)),by+(dp>=0?-14:14),dp>=0?'#1f6b3a':'#7a2327');break}
      case'text':tag(d.text||'Note',ax+4,ay-12,'#2a1a14');break}
    if(sel){x.fillStyle='#fff';[[ax,ay],d.b?[bx,by]:null].filter(Boolean).forEach(([hx,hy])=>{x.beginPath();x.arc(hx,hy,4,0,7);x.fill()})}x.restore()}
}
