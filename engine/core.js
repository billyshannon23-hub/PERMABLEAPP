/* ============ ENGINE CORE ============
   Canvas setup (180x320 logical units, drawn at 2x), seeded random, easing helpers,
   Permeable soft bodies, the macro skin cross-section, and colour helpers.
   Shared by every video. Do not edit per video. */
'use strict';
const LW=180,LH=320,TAU=Math.PI*2,FPS=24,SUB=3,DT=1/(FPS*SUB);
const cv=document.getElementById('c'),ctx=cv.getContext('2d',{willReadFrequently:true});
const SS=2;{const o=ctx.setTransform.bind(ctx);ctx.setTransform=(a,b,c,d,e,f)=>o(a*SS,b*SS,c*SS,d*SS,e*SS,f*SS);ctx.setTransform(1,0,0,1,0,0)}
let seed=777;function R(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
const rnd=(a,b)=>a+R()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,ss=x=>{x=clamp(x,0,1);return x*x*(3-2*x)},seg=(t,a,b)=>clamp((t-a)/(b-a),0,1);
const EV=[];

/* ---------- Permeable soft bodies, as in the game ---------- */
function mkBody(x,y,R0,lseg=2.0){const n=Math.max(10,Math.round(TAU*R0/lseg)),pts=[];for(let i=0;i<n;i++){const a=i/n*TAU;pts.push({x:x+Math.cos(a)*R0,y:y+Math.sin(a)*R0,vx:0,vy:0,ox:0,oy:0})}
  return{pts,A0:Math.PI*R0*R0,L:TAU*R0/n,lseg,cx:x,cy:y,R:R0,vx:0,vy:0,press:1,tight:0,seed:rnd(0,100)}}
function bodyArea(P){let a=0;const n=P.length;for(let i=0;i<n;i++){const p=P[i],q=P[(i+1)%n];a+=p.x*q.y-q.x*p.y}return a/2}
function bodyStats(b){let x=0,y=0,vx=0,vy=0;const P=b.pts,n=P.length;for(const p of P){x+=p.x;y+=p.y;vx+=p.vx;vy+=p.vy}b.cx=x/n;b.cy=y/n;b.vx=vx/n;b.vy=vy/n;b.A=Math.abs(bodyArea(P));b.R=Math.sqrt(b.A/Math.PI)}
function stepBody(b,dt,drag,iters=3,rad=0.035){
  const P=b.pts,n=P.length,dr=Math.exp(-drag*dt);
  for(const p of P){p.ox=p.x;p.oy=p.y;p.vx*=dr;p.vy*=dr;p.x+=p.vx*dt;p.y+=p.vy*dt}
  const L=b.L*(1-b.tight*0.12);
  for(let it=0;it<iters;it++){
    for(let i=0;i<n;i++){const a=P[i],c=P[(i+1)%n],dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy)||0.001,df=(d-L)/d*0.45;a.x+=dx*df;a.y+=dy*df;c.x-=dx*df;c.y-=dy*df}
    let A=bodyArea(P);if(A<0){P.reverse();A=-A}
    const s=clamp((b.A0*b.press*(1-b.tight*0.18)-A)/(n*L)*0.9,-L*0.6,L*0.6);
    let cx=0,cy=0;for(const p of P){cx+=p.x;cy+=p.y}cx/=n;cy/=n;const Rr=Math.sqrt(b.A0*b.press/Math.PI);
    for(let i=0;i<n;i++){const pr=P[(i+n-1)%n],nx=P[(i+1)%n],p=P[i];let ox=nx.y-pr.y,oy=-(nx.x-pr.x);const ol=Math.hypot(ox,oy)||1;p.x+=ox/ol*s;p.y+=oy/ol*s;
      const rx=p.x-cx,ry=p.y-cy,rd=Math.hypot(rx,ry)||1,k=(rd-Rr)/rd*rad;p.x-=rx*k;p.y-=ry*k}
  }
  for(const p of P){p.vx=clamp((p.x-p.ox)/dt,-300,300);p.vy=clamp((p.y-p.oy)/dt,-300,300)}
  bodyStats(b);
}
function resample(b){const P=b.pts,n=P.length;let per=0;const sg=[];for(let i=0;i<n;i++){const a=P[i],c=P[(i+1)%n],d=Math.hypot(c.x-a.x,c.y-a.y);sg.push(d);per+=d}
  const m=clamp(Math.round(per/b.lseg),10,140),step=per/m,out=[];let i=0,acc=0;
  for(let k=0;k<m;k++){const target=k*step;while(i<n-1&&acc+sg[i]<target){acc+=sg[i];i++}const a=P[i],c=P[(i+1)%n],t=sg[i]?(target-acc)/sg[i]:0;out.push({x:lerp(a.x,c.x,t),y:lerp(a.y,c.y,t),vx:lerp(a.vx,c.vx,t),vy:lerp(a.vy,c.vy,t),ox:0,oy:0})}
  b.pts=out;b.L=Math.sqrt(b.A0/Math.PI)*TAU/m}
/* two membranes become one: cut both open where they touch, stitch the ends together */
function splice(A,B){if(bodyArea(A.pts)<0)A.pts.reverse();if(bodyArea(B.pts)<0)B.pts.reverse();let bi=0,bj=0,bd=1e9;
  for(let i=0;i<A.pts.length;i++)for(let j=0;j<B.pts.length;j++){const d=(A.pts[i].x-B.pts[j].x)**2+(A.pts[i].y-B.pts[j].y)**2;if(d<bd){bd=d;bi=i;bj=j}}
  const a=A.pts,b=B.pts;A.pts=a.slice(0,bi+1).concat(b.slice(bj),b.slice(0,bj),a.slice(bi+1));A.A0+=B.A0;A.L=Math.sqrt(A.A0/Math.PI)*TAU/A.pts.length;bodyStats(A);resample(A)}
function collide(A,B,ma,mb){const dx=B.cx-A.cx,dy=B.cy-A.cy,rr=A.R+B.R+2;if(Math.abs(dx)>rr||Math.abs(dy)>rr||dx*dx+dy*dy>rr*rr)return;
  const side=(X,Y,mx,my)=>{let sx=0,sy=0,c=0;for(const p of X.pts){const ex=p.x-Y.cx,ey=p.y-Y.cy,e=Math.hypot(ex,ey)||0.01,Rq=Y.R*1.02;if(e<Rq){const k=(Rq-e)/e;p.x+=ex*k*mx;p.y+=ey*k*mx;sx-=ex*k;sy-=ey*k;c++}}
    if(c){const f=my/X.pts.length*1.2;for(const q of Y.pts){q.x+=sx*f;q.y+=sy*f}Y.cx+=sx*f;Y.cy+=sy*f}};side(A,B,ma,mb);side(B,A,mb,ma)}
function pushBody(b,ax,ay){for(const p of b.pts){p.vx+=ax;p.vy+=ay}}
function steerTo(b,x,y,spd,k,dt){const dx=x-b.cx,dy=y-b.cy,d=Math.hypot(dx,dy)||1,v=Math.min(spd,d*1.2);const tx=dx/d*v,ty=dy/d*v;for(const p of b.pts){p.vx+=(tx-p.vx)*k*dt;p.vy+=(ty-p.vy)*k*dt}}



const C_CREAM='rgb(232,226,206)',C_INK='rgb(6,6,9)',C_RED='rgb(200,38,46)';const cr=v=>{v=clamp(v,0,1);return`rgb(${Math.round(232*v)},${Math.round(226*v)},${Math.round(206*v)})`};let PX=1,TT=0;
/* ---------- macro skin: a tissue cross-section, not cells ---------- */
const SK={SURF:100,EPI:11};
// an organic mottle for the dermis, generated once
const NZ=document.createElement('canvas');NZ.width=260;NZ.height=220;{const x=NZ.getContext('2d'),im=x.createImageData(260,220),d=im.data;const W=[];for(let k=0;k<9;k++)W.push({f:0.04+R()*0.22,a:R()*TAU,p:R()*TAU,w:1/(1+k*0.6)});
  for(let j=0;j<220;j++)for(let i=0;i<260;i++){let v=0,s=0;for(const w of W){v+=Math.sin((i*Math.cos(w.a)+j*Math.sin(w.a))*w.f+w.p)*w.w;s+=w.w}v=0.5+0.5*v/s;const fib=0.5+0.5*Math.sin(i*0.9+Math.sin(j*0.21)*3+j*0.15);v=v*0.8+fib*0.2;
    const l=0.17+v*0.13,o=(j*260+i)*4;d[o]=232*l;d[o+1]=226*l;d[o+2]=206*l;d[o+3]=255}x.putImageData(im,0,0)}
const FAT=[];for(let i=0;i<34;i++)FAT.push({x:-50+(i%12)*24+((i/12|0)%2)*12+R()*5,y:SK.SURF+128+(i/12|0)*20+R()*5,r:9+R()*4});
const FOLL=[{x:30,ang:0.28,len:86},{x:150,ang:-0.26,len:90},{x:-14,ang:0.2,len:80},{x:196,ang:-0.2,len:84}];
const VES=[{x:122,y:SK.SURF+66,rx:9,ry:5.5},{x:58,y:SK.SURF+84,rx:6,ry:4}];
const GLAND={x:66,y:SK.SURF+108,duct:[]};{let x=GLAND.x,y=GLAND.y-6;for(let k=0;k<=24;k++){GLAND.duct.push([x+Math.sin(k*0.9)*2.2,y]);y-=(GLAND.y-6-SK.SURF)/24;x-=0.5}}
function chainY(C,x){if(x<=C[0].x)return C[0].y;for(let i=0;i<C.length-1;i++){const a=C[i],b=C[i+1];if(x>=a.x&&x<=b.x){const k=(x-a.x)/((b.x-a.x)||1);return a.y+(b.y-a.y)*k}}return C[C.length-1].y}
function band(top,bot){ctx.beginPath();top.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));for(let i=bot.length-1;i>=0;i--)ctx.lineTo(bot[i].x,bot[i].y);ctx.closePath()}
function bandFill(top,bot,l0,l1,PXl){const y0=Math.min(...top.map(p=>p.y)),y1=Math.max(...bot.map(p=>p.y));const g=ctx.createLinearGradient(0,y0,0,y1+0.01);g.addColorStop(0,cr(l0));g.addColorStop(1,cr(l1));band(top,bot);ctx.fillStyle=g;ctx.fill()}
function layerLines(top,bot,n,phase,col,PXl){ctx.strokeStyle=col;ctx.lineWidth=PXl*0.9;ctx.setLineDash([3*PXl,2*PXl]);for(let k=0;k<n;k++){const f=((k+1)/(n+1)+phase)%1;ctx.beginPath();top.forEach((p,i)=>{const q=bot[Math.min(i,bot.length-1)],y=lerp(p.y,q.y,f);i?ctx.lineTo(p.x,y):ctx.moveTo(p.x,y)});ctx.stroke()}ctx.setLineDash([])}
function follicle(F,t,PXl){const sx=F.x,sy=SK.SURF,bx=sx+Math.sin(F.ang)*F.len,by=sy+Math.cos(F.ang)*F.len*0.98;
  // sheath, oil gland, bulb
  ctx.beginPath();const w=4.2;ctx.moveTo(sx-w,sy);ctx.lineTo(bx-w*0.8,by-6);ctx.quadraticCurveTo(bx,by+3,bx+w*0.8,by-6);ctx.lineTo(sx+w,sy);ctx.closePath();ctx.fillStyle=cr(0.2);ctx.fill();ctx.strokeStyle=cr(0.72);ctx.lineWidth=PXl*1.1;ctx.stroke();
  const gx=lerp(sx,bx,0.32)+(F.ang>0?-7:7),gy=lerp(sy,by,0.32);for(let k=0;k<4;k++){const a=k*1.6+0.4;ctx.beginPath();ctx.arc(gx+Math.cos(a)*2.6,gy+Math.sin(a)*2.6,3.2,0,TAU);ctx.fillStyle=cr(0.74);ctx.fill();ctx.strokeStyle=cr(0.35);ctx.lineWidth=PXl*0.8;ctx.stroke()}
  ctx.beginPath();ctx.ellipse(bx,by-2,6,7.5,-F.ang,0,TAU);const gb=ctx.createRadialGradient(bx-2,by-4,1,bx,by-2,8);gb.addColorStop(0,cr(0.85));gb.addColorStop(1,cr(0.5));ctx.fillStyle=gb;ctx.fill();ctx.strokeStyle=cr(0.9);ctx.lineWidth=PXl;ctx.stroke();
  ctx.beginPath();ctx.ellipse(bx,by,2.6,3.2,-F.ang,0,TAU);ctx.fillStyle=cr(0.28);ctx.fill();
  // the shaft
  const N=26,pts=[];for(let i=0;i<=N;i++){const u=i/N;let x,y;if(u<0.5){const k=u/0.5;x=lerp(bx,sx,k);y=lerp(by-5,sy,k)}else{const k=(u-0.5)/0.5;x=sx+Math.sin(F.ang)*k*18+F.ang*64*k*k+Math.sin(t*1.1+F.x)*5*k*k;y=sy-k*70}pts.push([x,y,lerp(2.2,0.7,u)])}
  ctx.beginPath();pts.forEach((p,i)=>{const q=pts[Math.min(N,i+1)],o=pts[Math.max(0,i-1)],dx=q[0]-o[0],dy=q[1]-o[1],d=Math.hypot(dx,dy)||1;i?ctx.lineTo(p[0]-dy/d*p[2],p[1]+dx/d*p[2]):ctx.moveTo(p[0]-dy/d*p[2],p[1]+dx/d*p[2])});
  for(let i=N;i>=0;i--){const p=pts[i],q=pts[Math.min(N,i+1)],o=pts[Math.max(0,i-1)],dx=q[0]-o[0],dy=q[1]-o[1],d=Math.hypot(dx,dy)||1;ctx.lineTo(p[0]+dy/d*p[2],p[1]-dx/d*p[2])}ctx.closePath();ctx.fillStyle=cr(0.88);ctx.fill();ctx.strokeStyle=C_INK;ctx.lineWidth=PXl*0.9;ctx.stroke()}
/* draw the whole section. ch = {T,M,Mp,Bt}: surface, roof underside, floor top, base. o: options */
function drawSkin(t,ch,o,PXl){
  const {T,M,Mp,Bt}=ch;
  // dermis: everything below the base line
  ctx.save();ctx.beginPath();Bt.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineTo(400,400);ctx.lineTo(-300,400);ctx.closePath();ctx.clip();
  ctx.imageSmoothingEnabled=true;ctx.drawImage(NZ,-50,SK.SURF-2,260,220);ctx.imageSmoothingEnabled=false;
  // fat lobules below
  for(const f of FAT){const g=ctx.createRadialGradient(f.x-f.r*0.3,f.y-f.r*0.3,1,f.x,f.y,f.r);g.addColorStop(0,cr(0.95));g.addColorStop(1,cr(0.78));ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,TAU);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=cr(0.3);ctx.lineWidth=PXl*1.2;ctx.stroke()}
  // capillary loops reaching up into the ridges
  ctx.strokeStyle=cr(0.25);ctx.lineWidth=PXl*1.4;for(let x=-40;x<=220;x+=9){const y=chainY(Bt,x+4.5);ctx.beginPath();ctx.moveTo(x+2.5,y+9);ctx.quadraticCurveTo(x+4.5,y-1,x+6.5,y+9);ctx.stroke()}
  for(const v of VES){ctx.beginPath();ctx.ellipse(v.x,v.y,v.rx,v.ry,0,0,TAU);ctx.fillStyle=cr(0.16);ctx.fill();ctx.strokeStyle=cr(0.85);ctx.lineWidth=PXl*1.3;ctx.stroke();for(let k=0;k<3;k++){const a=t*0.6+k*2.1;ctx.beginPath();ctx.ellipse(v.x+Math.cos(a)*v.rx*0.45,v.y+Math.sin(a)*v.ry*0.4,2,1.3,a,0,TAU);ctx.fillStyle=cr(0.72);ctx.fill()}}
  // sweat gland: a coiled tube with its duct
  ctx.strokeStyle=cr(0.8);ctx.lineWidth=PXl*1.6;ctx.beginPath();GLAND.duct.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();
  for(let k=0;k<9;k++){const a=k*2.3;ctx.beginPath();ctx.arc(GLAND.x+Math.cos(a)*4,GLAND.y+Math.sin(a)*3,2.4,0,TAU);ctx.fillStyle=cr(0.7);ctx.fill();ctx.strokeStyle=cr(0.3);ctx.lineWidth=PXl*0.8;ctx.stroke()}
  if(o.inDermis)o.inDermis();
  ctx.restore();
  for(const F of FOLL)follicle(F,t,PXl);
  // epidermis: the floor band and the roof band, drawn as one when glued
  bandFill(Mp,Bt,0.98,0.9,PXl);layerLines(Mp,Bt,2,o.phase||0,cr(0.62),PXl);
  if(o.inGap)o.inGap();
  const segs=o.roofSegs||[[0,T.length-1]];
  if(o.newSurf){const [i0,i1]=o.newSurf;const S2=Mp.slice(i0,i1+1);ctx.strokeStyle=cr(0.95);ctx.lineWidth=PXl*1.5;ctx.beginPath();S2.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke()}
  if(!o.roofGone)for(const [i0,i1] of segs){const T0=T,M0=M;{const T=T0.slice(i0,i1+1),M=M0.slice(i0,i1+1);bandFill(T,M,(1-(o.dry||0)*0.35)*(o.roofFade??1),(0.98-(o.dry||0)*0.35)*(o.roofFade??1),PXl);layerLines(T,M,2,o.phase||0,cr(0.55-(o.dry||0)*0.25),PXl);
    // the dead outer layer: bright, flaking
    ctx.strokeStyle=cr(1-(o.dry||0)*0.4);ctx.lineWidth=PXl*1.6;ctx.beginPath();T.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    ctx.strokeStyle=cr(0.75);ctx.lineWidth=PXl;for(let i=1;i<T.length-1;i+=3){const p=T[i],q=T[i+1];ctx.beginPath();ctx.moveTo(p.x,p.y+1.2);ctx.lineTo(q.x,q.y+0.8);ctx.stroke()}
    if((o.dry||0)>0.3){ctx.strokeStyle=C_INK;ctx.lineWidth=PXl*1.2;for(let k=0;k<7;k++){const i=Math.floor(T.length*0.2+k*T.length*0.1),p=T[i],q=M[i];if(!p||!q)continue;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(lerp(p.x,q.x,0.7)+1,lerp(p.y,q.y,0.7));ctx.stroke()}}}}
  if(o.roofGone){ctx.strokeStyle=cr(0.95);ctx.lineWidth=PXl*1.4;ctx.beginPath();Mp.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke()}
  ctx.strokeStyle=cr(0.42);ctx.lineWidth=PXl*1.1;ctx.beginPath();Bt.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
}
function mkChains(){const T=[],M=[],Mp=[],Bt=[];for(let x=-46;x<=226;x+=3){const bump=Math.sin(x*0.13)*0.7+Math.sin(x*0.05+1)*0.8;const ridge=Math.sin(x*TAU/9)*2.2+Math.sin(x*0.07)*1;
  T.push({x,y:SK.SURF+bump,px:x,py:SK.SURF+bump,hx:x,hy:SK.SURF+bump});M.push({x,y:SK.SURF+5.5+bump,px:x,py:SK.SURF+5.5+bump,hx:x,hy:SK.SURF+5.5+bump});Mp.push({x,y:SK.SURF+5.5+bump,px:x,py:SK.SURF+5.5+bump,hx:x,hy:SK.SURF+5.5+bump});Bt.push({x,y:SK.SURF+SK.EPI+ridge,hx:x,hy:SK.SURF+SK.EPI+ridge})}return{T,M,Mp,Bt}}
/* ---------- drawing ---------- */



function bodyPath(b,grow=0){const P=b.pts,n=P.length;ctx.beginPath();const g=p=>{if(!grow)return p;const dx=p.x-b.cx,dy=p.y-b.cy,d=Math.hypot(dx,dy)||1;return{x:p.x+dx/d*grow,y:p.y+dy/d*grow}};
  let a=g(P[n-1]),c=g(P[0]);ctx.moveTo((a.x+c.x)/2,(a.y+c.y)/2);for(let i=0;i<n;i++){const p=g(P[i]),q=g(P[(i+1)%n]);ctx.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2)}ctx.closePath()}
function fillBody(b,l,edge,lite){const g=ctx.createRadialGradient(b.cx-b.R*0.3,b.cy-b.R*0.35,b.R*0.1,b.cx,b.cy,b.R*1.15);
  g.addColorStop(0,cr(Math.min(1,l/100+0.12)));g.addColorStop(0.55,cr(l/100));g.addColorStop(1,cr(Math.max(0.03,l/100-(lite?0.12:0.28))));bodyPath(b);ctx.fillStyle=g;ctx.fill()}
function nucleus(u,l,edge){const r=u.r*(1+u.sing*0.15);ctx.beginPath();for(let i=0;i<=12;i++){const a=i/12*TAU,rr=r*(1+0.16*Math.sin(i*2.3+u.sd)+0.08*Math.sin(TT*3+i*1.7+u.sd));i?ctx.lineTo(u.x+Math.cos(a)*rr,u.y+Math.sin(a)*rr):ctx.moveTo(u.x+rr,u.y)}ctx.closePath();ctx.fillStyle=cr(l/100);ctx.fill();if(edge){ctx.strokeStyle=edge;ctx.lineWidth=PX*1.2;ctx.stroke()}}
function halo(x,y,r,a){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(232,226,206,${a})`);g.addColorStop(1,'rgba(232,226,206,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill()}


