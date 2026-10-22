/* ============ 3D engine: raw WebGL (no dependencies). Scenes: coins, candle field, allocation ring ============ */
const _v={sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}};
const M4={
 id:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o},
 persp(f,a,n,fa){const t=1/Math.tan(f/2),o=new Float32Array(16);o[0]=t/a;o[5]=t;o[10]=(fa+n)/(n-fa);o[11]=-1;o[14]=2*fa*n/(n-fa);return o},
 look(e,c,u){const z=_v.norm(_v.sub(e,c)),x=_v.norm(_v.cross(u,z)),y=_v.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-_v.dot(x,e),-_v.dot(y,e),-_v.dot(z,e),1])},
 T(x,y,z){const m=M4.id();m[12]=x;m[13]=y;m[14]=z;return m},S(x,y,z){const m=M4.id();m[0]=x;m[5]=y;m[10]=z;return m},
 RY(a){const c=Math.cos(a),s=Math.sin(a),m=M4.id();m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m},
 RX(a){const c=Math.cos(a),s=Math.sin(a),m=M4.id();m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m},
 RZ(a){const c=Math.cos(a),s=Math.sin(a),m=M4.id();m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m},
};
const VS=`attribute vec3 aP;attribute vec3 aN;attribute vec2 aT;uniform mat4 uVP,uM,uR;varying vec3 vN,vW;varying vec2 vT;void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=(uR*vec4(aN,0.)).xyz;vT=aT;gl_Position=uVP*w;}`;
const FS=`precision mediump float;varying vec3 vN,vW;varying vec2 vT;uniform vec3 uCol,uEye,uL;uniform float uSpec,uEmis,uAlpha,uTex;uniform sampler2D uTx;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=normalize(uL);vec3 base=uCol;if(uTex>.5)base=texture2D(uTx,vT).rgb;
float d=max(dot(n,L),0.)*.78+.22;vec3 V=normalize(uEye-vW);vec3 H=normalize(L+V);float s=pow(max(dot(n,H),0.),40.)*uSpec;
float rim=pow(1.-max(dot(n,V),0.),3.)*.5;vec3 c=base*d+vec3(1.,.86,.5)*s+vec3(1.,.26,.2)*rim*.55+base*uEmis;
float fog=clamp((length(uEye-vW)-9.)/26.,0.,1.);c=mix(c,vec3(.035,.02,.022),fog);gl_FragColor=vec4(c,uAlpha);}`;
const PVS=`attribute vec3 aP;attribute vec2 aS;uniform mat4 uVP;uniform float uT,uPx;varying float vS;void main(){vec3 p=aP;p.y+=sin(uT*.45+aS.y*6.283)*.28;p.x+=cos(uT*.3+aS.y*9.)*.18;vec4 c=uVP*vec4(p,1.);gl_Position=c;gl_PointSize=max(1.,aS.x*uPx/c.w);vS=aS.y;}`;
const PFS=`precision mediump float;varying float vS;void main(){vec2 d=gl_PointCoord-.5;float r=length(d);if(r>.5)discard;float a=smoothstep(.5,0.,r);vec3 col=mix(vec3(1.,.24,.24),vec3(1.,.78,.17),fract(vS*7.));gl_FragColor=vec4(col,a*.9);}`;
function glProg(gl,vs,fs){const mk=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o};
  const p=gl.createProgram();gl.attachShader(p,mk(gl.VERTEX_SHADER,vs));gl.attachShader(p,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  p.u={};p.a={};const nu=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<nu;i++){const n=gl.getActiveUniform(p,i).name;p.u[n]=gl.getUniformLocation(p,n)}
  const na=gl.getProgramParameter(p,gl.ACTIVE_ATTRIBUTES);for(let i=0;i<na;i++){const n=gl.getActiveAttrib(p,i).name;p.a[n]=gl.getAttribLocation(p,n)}return p}
/* geometry builders */
function cubeG(){const P=[],N=[],T=[],I=[];const F=[[[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],[[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]],[[1,0,0],[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]],[[-1,0,0],[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]],[[0,1,0],[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]],[[0,-1,0],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]]];
  F.forEach(([n,vs],f)=>{vs.forEach((v,i)=>{P.push(v[0]*.5,v[1]*.5,v[2]*.5);N.push(...n);T.push(i===1||i===2?1:0,i>=2?1:0)});const b=f*4;I.push(b,b+1,b+2,b,b+2,b+3)});return{P,N,T,I}}
function cylG(n=56,h=.2){const side={P:[],N:[],T:[],I:[]},cap={P:[0,0,0],N:[0,0,1],T:[.5,.5],I:[]};
  for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a);side.P.push(c,s,-h/2,c,s,h/2);side.N.push(c,s,0,c,s,0);side.T.push(i/n,0,i/n,1);if(i<n){const b=i*2;side.I.push(b,b+1,b+3,b,b+3,b+2)}
    cap.P.push(c,s,0);cap.N.push(0,0,1);cap.T.push(.5+.5*c,.5-.5*s);if(i<n)cap.I.push(0,i+1,i+2)}return{side,cap}}
function arcG(a0,a1,r0,r1,h,steps=Math.max(2,Math.ceil((a1-a0)/.12))){const P=[],N=[],T=[],I=[];const q=(a,b,c,d,n)=>{const i=P.length/3;[a,b,c,d].forEach(v=>{P.push(...v);N.push(...n);T.push(0,0)});I.push(i,i+1,i+2,i,i+2,i+3)};
  for(let j=0;j<steps;j++){const A=a0+(a1-a0)*j/steps,B=a0+(a1-a0)*(j+1)/steps,cA=Math.cos(A),sA=Math.sin(A),cB=Math.cos(B),sB=Math.sin(B);
    q([r0*cA,h,r0*sA],[r1*cA,h,r1*sA],[r1*cB,h,r1*sB],[r0*cB,h,r0*sB],[0,1,0]);q([r0*cA,0,r0*sA],[r0*cB,0,r0*sB],[r1*cB,0,r1*sB],[r1*cA,0,r1*sA],[0,-1,0]);
    const mm=(A+B)/2;q([r1*cA,0,r1*sA],[r1*cB,0,r1*sB],[r1*cB,h,r1*sB],[r1*cA,h,r1*sA],[Math.cos(mm),0,Math.sin(mm)]);q([r0*cB,0,r0*sB],[r0*cA,0,r0*sA],[r0*cA,h,r0*sA],[r0*cB,h,r0*sB],[-Math.cos(mm),0,-Math.sin(mm)])}
  q([r0*Math.cos(a0),0,r0*Math.sin(a0)],[r1*Math.cos(a0),0,r1*Math.sin(a0)],[r1*Math.cos(a0),h,r1*Math.sin(a0)],[r0*Math.cos(a0),h,r0*Math.sin(a0)],[Math.sin(a0),0,-Math.cos(a0)]);
  q([r1*Math.cos(a1),0,r1*Math.sin(a1)],[r0*Math.cos(a1),0,r0*Math.sin(a1)],[r0*Math.cos(a1),h,r0*Math.sin(a1)],[r1*Math.cos(a1),h,r1*Math.sin(a1)],[-Math.sin(a1),0,Math.cos(a1)]);return{P,N,T,I}}
function coinTex(label){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),g=x.createRadialGradient(100,90,10,128,128,130);g.addColorStop(0,'#fff0a8');g.addColorStop(.45,'#ffc72c');g.addColorStop(1,'#d9780a');x.fillStyle=g;x.fillRect(0,0,256,256);
  x.strokeStyle='#8a2410';x.lineWidth=10;x.beginPath();x.arc(128,128,116,0,7);x.stroke();x.lineWidth=3;x.strokeStyle='#ffe58a';x.beginPath();x.arc(128,128,100,0,7);x.stroke();
  x.fillStyle='#7a1410';x.font='800 '+(label.length>3?64:label.length>2?84:110)+'px Sora,Inter,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(label,128,136);return c}
const Views3D=[];const killViews=()=>{while(Views3D.length)Views3D.pop().destroy()};
class GLView{
  constructor(host,setup){this.host=host;this.dead=false;this.vis=true;this.px=0;this.py=0;this.t0=performance.now();this.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.cv=document.createElement('canvas');this.cv.setAttribute('aria-hidden','true');host.append(this.cv);
    let gl=null;try{gl=this.cv.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:false,powerPreference:'low-power'})}catch{}
    if(!gl){this.fallback();return}this.gl=gl;
    try{this.prog=glProg(gl,VS,FS);this.pp=glProg(gl,PVS,PFS)}catch(e){console.warn('3D disabled:',e.message);this.fallback();return}
    this.cv.addEventListener('webglcontextlost',e=>{e.preventDefault();this.fallback()});
    this.scene=setup(this);Views3D.push(this);
    this.ro=new ResizeObserver(()=>{this.size();if(this.reduce)this.frame(1.6)});this.ro.observe(host);
    this.io=new IntersectionObserver(es=>{this.vis=es[0].isIntersecting});this.io.observe(host);
    this.mv=e=>{const r=host.getBoundingClientRect();this.px=((e.clientX-r.left)/r.width-.5)*2;this.py=((e.clientY-r.top)/r.height-.5)*2};host.addEventListener('pointermove',this.mv);
    this.size();this.loop=ts=>{if(this.dead)return;this.raf=requestAnimationFrame(this.loop);if(this.vis&&!document.hidden)this.frame((ts-this.t0)/1000)};
    if(this.reduce)this.frame(1.6);else this.raf=requestAnimationFrame(this.loop)}
  fallback(){this.dead=true;this.host.classList.add('nogl');this.cv&&this.cv.remove()}
  size(){const d=Math.min(devicePixelRatio||1,1.75),w=Math.max(2,Math.round(this.host.clientWidth*d)),h=Math.max(2,Math.round(this.host.clientHeight*d));if(this.cv.width!==w||this.cv.height!==h){this.cv.width=w;this.cv.height=h}}
  frame(t){try{this.scene.draw(t)}catch(e){console.warn('3D frame failed',e);this.fallback()}}
  geo(g){const gl=this.gl,b=(d,t)=>{const o=gl.createBuffer();gl.bindBuffer(t,o);gl.bufferData(t,d,gl.STATIC_DRAW);return o};
    return{p:b(new Float32Array(g.P),gl.ARRAY_BUFFER),n:b(new Float32Array(g.N),gl.ARRAY_BUFFER),t:b(new Float32Array(g.T),gl.ARRAY_BUFFER),i:b(new Uint16Array(g.I),gl.ELEMENT_ARRAY_BUFFER),c:g.I.length}}
  tex(canvas){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
  pts(n,spread=[7,4,4],size=[2,6]){const a=new Float32Array(n*5);for(let i=0;i<n;i++){a[i*5]=(Math.random()-.5)*spread[0]*2;a[i*5+1]=(Math.random()-.3)*spread[1]*2;a[i*5+2]=(Math.random()-.5)*spread[2]*2;a[i*5+3]=size[0]+Math.random()*(size[1]-size[0]);a[i*5+4]=Math.random()}
    const gl=this.gl,b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW);return{b,n}}
  begin(eye,tgt,fov=.9){const gl=this.gl,w=this.cv.width,h=this.cv.height;gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
    this.VP=M4.mul(M4.persp(fov,w/h,.1,80),M4.look(eye,tgt,[0,1,0]));this.eye=eye;const p=this.prog;gl.useProgram(p);gl.uniformMatrix4fv(p.u.uVP,false,this.VP);gl.uniform3fv(p.u.uEye,eye);gl.uniform3fv(p.u.uL,[.45,.85,.55]);gl.uniform1i(p.u.uTx,0)}
  mesh(g,o){const gl=this.gl,p=this.prog;gl.useProgram(p);gl.uniformMatrix4fv(p.u.uM,false,o.m);gl.uniformMatrix4fv(p.u.uR,false,o.r||M4.id());gl.uniform3fv(p.u.uCol,o.col||[1,1,1]);gl.uniform1f(p.u.uSpec,o.spec||0);gl.uniform1f(p.u.uEmis,o.emis||0);gl.uniform1f(p.u.uAlpha,o.a==null?1:o.a);gl.uniform1f(p.u.uTex,o.tex?1:0);
    if(o.tex){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,o.tex)}
    if(o.a!=null&&o.a<1){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false)}else{gl.disable(gl.BLEND);gl.depthMask(true)}
    [['p','aP',3],['n','aN',3],['t','aT',2]].forEach(([k,a,s])=>{gl.bindBuffer(gl.ARRAY_BUFFER,g[k]);gl.enableVertexAttribArray(p.a[a]);gl.vertexAttribPointer(p.a[a],s,gl.FLOAT,false,0,0)});
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,g.i);gl.drawElements(gl.TRIANGLES,g.c,gl.UNSIGNED_SHORT,0);gl.depthMask(true)}
  points(P,t){const gl=this.gl,p=this.pp;gl.useProgram(p);gl.uniformMatrix4fv(p.u.uVP,false,this.VP);gl.uniform1f(p.u.uT,t);gl.uniform1f(p.u.uPx,this.cv.height*.45);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
    gl.bindBuffer(gl.ARRAY_BUFFER,P.b);gl.enableVertexAttribArray(p.a.aP);gl.vertexAttribPointer(p.a.aP,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(p.a.aS);gl.vertexAttribPointer(p.a.aS,2,gl.FLOAT,false,20,12);gl.drawArrays(gl.POINTS,0,P.n);gl.depthMask(true);gl.disable(gl.BLEND)}
  destroy(){this.dead=true;cancelAnimationFrame(this.raf);this.ro&&this.ro.disconnect();this.io&&this.io.disconnect();this.host&&this.mv&&this.host.removeEventListener('pointermove',this.mv);try{const e=this.gl&&this.gl.getExtension('WEBGL_lose_context');e&&e.loseContext()}catch{}this.cv&&this.cv.remove()}
}
const GOLD=[1,.78,.17],RED=[1,.27,.25],DEEP=[.55,.1,.1];
/* scene: spinning gold coins (login, swap, wallet). layout 'single' | 'pair' | 'hero' */
function sceneCoins(host,{labels=['A'],layout='single',particles=70,offsetX=0}={}){return new GLView(host,v=>{
  const cyl=cylG(56,.22),side=v.geo(cyl.side),cap=v.geo(cyl.cap),texs=labels.map(l=>v.tex(coinTex(l))),P=v.pts(particles,[7,3.5,3],[2,6]);
  const coin=(ti,x,y,z,s,ang,tilt)=>{const R=M4.mul(M4.RX(tilt),M4.RY(ang)),B=M4.mul(M4.T(x,y,z),M4.mul(R,M4.S(s,s,s)));
    v.mesh(side,{m:B,r:R,col:[.95,.62,.1],spec:.9,emis:.06});
    v.mesh(cap,{m:M4.mul(B,M4.T(0,0,.11)),r:R,tex:texs[ti%texs.length],spec:.7});
    const Rb=M4.mul(R,M4.RY(Math.PI));v.mesh(cap,{m:M4.mul(M4.mul(M4.T(x,y,z),M4.mul(Rb,M4.S(s,s,s))),M4.T(0,0,.11)),r:Rb,tex:texs[(ti+1)%texs.length],spec:.7})};
  return{draw(t){const ex=Math.sin(t*.25)*.5+v.px*.8,ey=v.py*-.5;v.begin([ex,ey+.3,5.6],[offsetX*.3,0,0]);
    if(layout==='pair'){const a=t*.9;for(let i=0;i<2;i++){const p=a+i*Math.PI;coin(i,Math.cos(p)*1.5,Math.sin(t*1.3+i)*.12,Math.sin(p)*1.2,.9,t*1.4+i,.35)}}
    else if(layout==='hero'){coin(0,offsetX,Math.sin(t*.9)*.12,0,1.45,t*.9,.3+Math.sin(t*.5)*.12);for(let i=0;i<4;i++){const a=t*.45+i*1.57;coin(i+1,offsetX+Math.cos(a)*2.6,Math.sin(a*1.5)*.7,Math.sin(a)*1.6-.4,.42,t*1.7+i,.4)}}
    else coin(0,offsetX,Math.sin(t)*.1,0,1.3,t*1.0,.28);v.points(P,t)}}})}
/* scene: 3D candlestick field from real candles */
function sceneCandles(host,getData){return new GLView(host,v=>{const cube=v.geo(cubeG()),P=v.pts(60,[6,3,3],[2,5]);
  return{draw(t){const d=getData()||[],N=Math.min(d.length,64),sl=d.slice(-N),a=Math.sin(t*.16)*.5+v.px*.35;v.begin([Math.sin(a)*8.5,3.5-v.py*.8,Math.cos(a)*8.5],[0,1.3,0]);
    v.mesh(cube,{m:M4.mul(M4.T(0,-.05,0),M4.S(26,.06,12)),col:[.09,.05,.055],spec:.35});
    for(let i=-6;i<=6;i++){v.mesh(cube,{m:M4.mul(M4.T(i*2,-.01,0),M4.S(.02,.01,12)),col:[.5,.15,.1],emis:.5});v.mesh(cube,{m:M4.mul(M4.T(0,-.01,i),M4.S(26,.01,.02)),col:[.5,.15,.1],emis:.5})}
    if(N>2){const hi=Math.max(...sl.map(x=>x.h)),lo=Math.min(...sl.map(x=>x.l)),r=(hi-lo)||1,Y=p=>(p-lo)/r*3.4,vm=Math.max(...sl.map(x=>x.v))||1,w=.3;
      sl.forEach((c,i)=>{const x=(i-N/2)*w,up=c.c>=c.o,col=up?GOLD:RED,b0=Y(Math.min(c.o,c.c)),b1=Y(Math.max(c.o,c.c)),bh=Math.max(.04,b1-b0),last=i===N-1;
        v.mesh(cube,{m:M4.mul(M4.T(x,(Y(c.l)+Y(c.h))/2,0),M4.S(.03,Math.max(.03,Y(c.h)-Y(c.l)),.03)),col:[.9,.85,.8],spec:.3});
        v.mesh(cube,{m:M4.mul(M4.T(x,b0+bh/2,0),M4.S(w*.62,bh,w*.62)),col,spec:.6,emis:last?.25+.2*Math.sin(t*4):.05});
        v.mesh(cube,{m:M4.mul(M4.T(x,c.v/vm*.7/2,-1.6),M4.S(w*.6,Math.max(.02,c.v/vm*.7),w*.6)),col:[.55,.33,.08],a:.55,emis:.2})})}
    v.points(P,t)}}})}
/* scene: extruded 3D allocation ring */
function sceneRing(host,getItems){const PAL=[[1,.78,.17],[1,.27,.25],[1,.62,.11],[.84,.16,.16],[1,.88,.4],[.7,.09,.12],[1,.48,.33],[.55,.11,.11]];
  return new GLView(host,v=>{let key='',segs=[];const P=v.pts(40,[3,2,2],[2,5]);
    const build=()=>{const items=(getItems()||[]).filter(i=>i.v>0),k=JSON.stringify(items.map(i=>Math.round(i.v*100)));if(k===key)return;key=k;const tot=items.reduce((a,i)=>a+i.v,0);let a=-Math.PI/2;
      segs=items.map((it,n)=>{const s=it.v/tot*Math.PI*2,g=arcG(a+.012,a+s-.012,.95,1.55,.28+it.v/tot*.9);a+=s;return{g:v.geo(g),col:PAL[n%PAL.length]}})};
    return{draw(t){build();const ang=t*.25+v.px*.5;v.begin([0,4.3-v.py*.6,4.6],[0,.2,0],.8);const R=M4.RY(ang);
      if(!segs.length)v.mesh(v.__ph||(v.__ph=v.geo(arcG(0,Math.PI*2,.95,1.55,.2))),{m:R,r:R,col:[.2,.12,.12],spec:.2});
      segs.forEach(s=>v.mesh(s.g,{m:R,r:R,col:s.col,spec:.55,emis:.06}));v.points(P,t)}}})}
const palCss=['#ffc72c','#ff4540','#ff9f1c','#d62929','#ffe066','#b3171f','#ff7b54','#8c1c1c'];
