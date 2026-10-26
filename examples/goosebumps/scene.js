/* ================= GOOSEBUMPS: the skin in cross-section, one follicle, its tiny muscle and the nerve that pulls it ================= */
const win_=(t,a,b,c,d)=>ss(seg(t,a,b))*(1-ss(seg(t,c,d)));
const SC={skin:[0,27.4],cat:[27.4,36.2],human:[36.2,41.4],stem:[41.4,51.6],song:[51.6,60]};
const inSc=(k,t)=>t>=SC[k][0]&&t<SC[k][1];
let CAM={z:1,x:90,y:160,sx:0,sy:0};
function camM(){const C=CAM;return[C.z,0,0,C.z,LW/2+C.sx-C.x*C.z,LH/2+C.sy-C.y*C.z]}
let OVTEXT=[],POPS=[];
// follicles across the section; the middle one is the star
FOLL.length=0;for(const x of [-36,10,60,108,150,196,240])FOLL.push({x,ang:0.34,len:x===60?84:78,main:x===60});
const MAIN=FOLL.find(f=>f.main);
// a follicle drawn straight: the hair leaves the skin along the same line the follicle runs, so when the muscle stands it up the whole thing rotates
function follicle(F,t,PXl){const sx=F.x,sy=SK.SURF-bumpAt(F.x,t)*0.6,dx=Math.sin(F.ang),dy=Math.cos(F.ang),bx=sx+dx*F.len,by=sy+dy*F.len*0.98,w=4.2,nx=dy,ny=-dx;
  ctx.beginPath();ctx.moveTo(sx-w*nx,sy-w*ny);ctx.lineTo(bx-w*0.8*nx-dx*6,by-w*0.8*ny-dy*6);ctx.quadraticCurveTo(bx+dx*3,by+dy*3,bx+w*0.8*nx-dx*6,by+w*0.8*ny-dy*6);ctx.lineTo(sx+w*nx,sy+w*ny);ctx.closePath();
  ctx.fillStyle=cr(0.2);ctx.fill();ctx.strokeStyle=cr(0.72);ctx.lineWidth=PXl*1.1;ctx.stroke();
  // oil gland on the muscle side, above where the muscle joins
  const gx=lerp(sx,bx,0.26)+nx*7,gy=lerp(sy,by,0.26)+ny*7;for(let k=0;k<4;k++){const a=k*1.6+0.4;ctx.beginPath();ctx.arc(gx+Math.cos(a)*2.4,gy+Math.sin(a)*2.4,3,0,TAU);ctx.fillStyle=cr(0.74);ctx.fill();ctx.strokeStyle=cr(0.35);ctx.lineWidth=PXl*0.8;ctx.stroke()}
  ctx.beginPath();ctx.ellipse(bx,by-2,6,7.5,-F.ang,0,TAU);const gb=ctx.createRadialGradient(bx-2,by-4,1,bx,by-2,8);gb.addColorStop(0,cr(0.85));gb.addColorStop(1,cr(0.5));ctx.fillStyle=gb;ctx.fill();ctx.strokeStyle=cr(0.9);ctx.lineWidth=PXl;ctx.stroke();
  ctx.beginPath();ctx.ellipse(bx,by,2.6,3.2,-F.ang,0,TAU);ctx.fillStyle=cr(0.28);ctx.fill();
  // the shaft: from the bulb, out through the skin, on along the same line, drooping a little at the tip
  const N=28,pts=[],H=F.hair||70;for(let i=0;i<=N;i++){const u=i/N;let x,y;if(u<0.45){const k=u/0.45;x=lerp(bx-dx*4,sx,k);y=lerp(by-dy*4,sy,k)}else{const k=(u-0.45)/0.55;x=sx-dx*k*H-F.ang*20*k*k+Math.sin(t*1.1+F.x)*3*k*k;y=sy-dy*k*H+F.ang*14*k*k}pts.push([x,y,lerp(2.2,0.7,u)])}
  ctx.beginPath();pts.forEach((p,i)=>{const q=pts[Math.min(N,i+1)],o=pts[Math.max(0,i-1)],ex=q[0]-o[0],ey=q[1]-o[1],d=Math.hypot(ex,ey)||1;i?ctx.lineTo(p[0]-ey/d*p[2],p[1]+ex/d*p[2]):ctx.moveTo(p[0]-ey/d*p[2],p[1]+ex/d*p[2])});
  for(let i=N;i>=0;i--){const p=pts[i],q=pts[Math.min(N,i+1)],o=pts[Math.max(0,i-1)],ex=q[0]-o[0],ey=q[1]-o[1],d=Math.hypot(ex,ey)||1;ctx.lineTo(p[0]+ey/d*p[2],p[1]-ex/d*p[2])}ctx.closePath();ctx.fillStyle=cr(0.88);ctx.fill();ctx.strokeStyle=C_INK;ctx.lineWidth=PXl*0.9;ctx.stroke()}

const BASE=mkChains();
// how hard the goosebump muscles are pulling right now (0..1)
function pull(t){return Math.max(win_(t,2.6,3.4,5.0,5.8),win_(t,19.2,20.0,26.4,27.2),win_(t,37.0,37.6,40.8,41.2),win_(t,52.4,53.2,58,59))}
// one pulse down the nerve before each pull
const PULSES=[];for(let k=0;k<5;k++)PULSES.push(15.0+k*0.85);for(const h of [18.6,18.9])PULSES.push(h);for(let k=0;k<10;k++)PULSES.push(42.2+k*0.55);for(const h of [51.8,52.1,52.4])PULSES.push(h);
function bumpAt(x,t){let b=0;const p=pull(t);for(const F of FOLL){const cx=F.x+5;b+=p*6*Math.exp(-(((x-cx)/9)**2))}return b}
function chainsNow(t){const C={};for(const k of ['T','M','Mp','Bt'])C[k]=BASE[k].map(p=>{const b=bumpAt(p.x,t)*(k==='Bt'?0.55:1);return{...p,y:(p.hy??p.y)-b}});return C}
// the arrector pili: from the side of the follicle up to just under the epidermis
function muscleEnds(F,t){const p=pull(t),u=0.56,sx=F.x,sy=SK.SURF,dx=Math.sin(F.ang),dy=Math.cos(F.ang),bx=sx+dx*F.len,by=sy+dy*F.len*0.98;
  const a=[lerp(sx,bx,u)+dy*4,lerp(sy,by,u)-dx*4],top=[F.x+30-p*4,SK.SURF+13-p*3];return[a,top]}
function muscle(F,t,PXl,glow){const p=pull(t),[a,b]=muscleEnds(F,t),dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy),ang=Math.atan2(dy,dx),w=3+p*2;
  ctx.save();ctx.translate(a[0],a[1]);ctx.rotate(ang);ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(L*0.3,-w*1.4,L*0.7,-w*1.4,L,0);ctx.bezierCurveTo(L*0.7,w*1.4,L*0.3,w*1.4,0,0);ctx.closePath();
  ctx.fillStyle=cr(0.5+0.4*p+0.3*glow);ctx.fill();ctx.strokeStyle=cr(1);ctx.lineWidth=PXl*1.1;ctx.stroke();
  ctx.strokeStyle=C_INK;ctx.lineWidth=PXl*0.6;for(let k=1;k<6;k++){const x=L*k/6;ctx.beginPath();ctx.moveTo(x-1.5,-w*0.6);ctx.lineTo(x+1.5,w*0.6);ctx.stroke()}ctx.restore()}
// the sympathetic nerve fibre, up from below to the muscle
function nervePts(F){const [a,b]=muscleEnds(F,0);const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;return[[mx+70,SK.SURF+150],[mx+52,SK.SURF+110],[mx+30,SK.SURF+70],[mx+8,my+12],[mx,my]]}
function along(P,u){let L=0;const sg=[];for(let i=0;i<P.length-1;i++){const d=Math.hypot(P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]);sg.push(d);L+=d}let k=clamp(u,0,1)*L;for(let i=0;i<sg.length;i++){if(k<=sg[i]){const f=k/sg[i];return[lerp(P[i][0],P[i+1][0],f),lerp(P[i][1],P[i+1][1],f)]}k-=sg[i]}return P[P.length-1]}
function nerve(t,a,PXl){if(a<=0)return;const P=nervePts(MAIN);ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=cr(0.95);ctx.lineWidth=PXl*1.4;ctx.setLineDash([3*PXl,1.6*PXl]);ctx.beginPath();P.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.setLineDash([]);
  for(const h of PULSES){const u=seg(t,h-0.7,h);if(u>0&&u<1){const [x,y]=along(P,u);ctx.fillStyle=cr(1);ctx.beginPath();ctx.arc(x,y,2.4,0,TAU);ctx.fill();ctx.strokeStyle=C_INK;ctx.lineWidth=PXl*0.8;ctx.stroke()}}ctx.restore()}
function glowNow(t){let g=0;for(const h of PULSES){const d=t-h;if(d>=0&&d<0.3)g=Math.max(g,1-d/0.3)}return g}
// stem cells at the bulge of the follicle, where the muscle attaches
function stemCells(t,a,PXl){if(a<=0)return;const [m]=muscleEnds(MAIN,t);ctx.save();ctx.globalAlpha=a;const wake=ss(seg(t,44.4,46.4));
  for(let i=0;i<7;i++){const ang=i*0.9,x=m[0]-6+Math.cos(ang)*3.4,y=m[1]-4+i*1.8+Math.sin(ang)*1.2,r=1.9+0.5*wake*Math.max(0,Math.sin(t*6+i));
    ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=cr(0.35+0.6*wake);ctx.fill();ctx.strokeStyle=cr(1);ctx.lineWidth=PXl*0.7;ctx.stroke()}ctx.restore()}
// a cold breeze over the skin
function breeze(t,a){if(a<=0)return;ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=cr(0.8);ctx.lineWidth=0.9;for(let k=0;k<6;k++){const y=30+k*11,off=((t*40+k*37)%240)-60;ctx.beginPath();for(let x=0;x<=40;x+=2)ctx.lineTo(off+x,y+Math.sin((x+t*30)*0.25)*2);ctx.stroke()}ctx.restore()}
const SNOW=[];for(let i=0;i<60;i++)SNOW.push({x:rnd(-60,240),y:rnd(0,200),v:rnd(8,16),ph:rnd(0,6)});
function snow(t,a){if(a<=0)return;ctx.fillStyle=cr(0.95);for(const f of SNOW){const y=(f.y+t*f.v)%200-20,x=f.x+Math.sin(t+f.ph)*3;ctx.globalAlpha=a;ctx.fillRect(x,y,1.2,1.2)}ctx.globalAlpha=1}
const NOTES=[];for(let i=0;i<10;i++)NOTES.push({x:rnd(-20,200),ph:rnd(0,1),v:rnd(0.15,0.3),s:rnd(0.8,1.3)});
function notes(t,a){if(a<=0)return;ctx.save();for(const n of NOTES){const u=(n.ph+t*n.v)%1,y=lerp(110,10,u),x=n.x+Math.sin(u*8+n.ph*6)*6;ctx.globalAlpha=a*Math.sin(u*Math.PI);drawNote(x,y,n.s)}ctx.restore()}
function drawNote(x,y,s){ctx.fillStyle=C_CREAM;ctx.strokeStyle=C_CREAM;ctx.lineWidth=1.1;ctx.beginPath();ctx.ellipse(x,y,2.6*s,1.9*s,-0.4,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(x+2.4*s,y);ctx.lineTo(x+2.4*s,y-9*s);ctx.quadraticCurveTo(x+5*s,y-7*s,x+6*s,y-4*s);ctx.stroke()}
function inset(x,y,r,a,draw){if(a<=0.01)return;ctx.save();ctx.globalAlpha=a;ctx.beginPath();ctx.arc(x,y,r*(0.7+0.3*a),0,TAU);ctx.fillStyle=C_INK;ctx.fill();ctx.strokeStyle=C_CREAM;ctx.lineWidth=1.2;ctx.stroke();ctx.save();ctx.beginPath();ctx.arc(x,y,r-1,0,TAU);ctx.clip();draw(x,y,r);ctx.restore();ctx.restore()}

/* ---------- the skin scenes ---------- */
function skinCam(t){// wide, then into the one follicle, then out again
  const zin=win_(t,6.0,7.6,26.4,27.4);return{z:lerp(0.9,1.7,zin),x:lerp(90,MAIN.x+10,zin),y:lerp(150,138,zin),sx:0,sy:lerp(-10,-14,zin)}}
function drawSection(t,opt){const p=pull(t);for(const F of FOLL)F.ang=lerp(0.34,0.04,p);const ch=chainsNow(t),PXl=1/CAM.z;
  drawSkin(t,ch,{phase:0,inDermis:()=>{for(const F of FOLL)if(opt.allMuscles||F.main)muscle(F,t,PXl,F.main?glowNow(t):0);if(opt.stem)stemCells(t,opt.stem,PXl);nerve(t,opt.nerve||0,PXl)}},PXl);
  // air trapped (or not) above the skin
  if(opt.air){ctx.fillStyle=cr(0.9);for(let i=0;i<40;i++){const x=-40+i*7,u=((t*0.3+i*0.37)%1),y=SK.SURF-6-u*(opt.air>0?60:90);ctx.globalAlpha=Math.abs(opt.air)*(1-u);ctx.fillRect(x+Math.sin(u*7+i)*3,y,1.2,1.2)}ctx.globalAlpha=1}}
function skin(t){CAM=skinCam(t);ctx.setTransform(...camM());
  // sky above the skin
  ctx.fillStyle=C_INK;ctx.fillRect(-200,-200,600,300);
  drawSection(t,{allMuscles:t<6||t>26,nerve:win_(t,14.0,14.8,27,28)});
  ctx.setTransform(1,0,0,1,0,0);breeze(t,win_(t,0.4,1.0,5.8,6.4));
  // the three triggers
  const ic=[[44,62,'cold',0.6],[90,52,'fear',1.4],[136,62,'song',2.2]];
  for(const [x,y,k,t0] of ic)inset(x,y,15,win_(t,t0,t0+0.5,5.6,6.2),(cx,cy)=>{
    if(k==='cold'){ctx.strokeStyle=C_CREAM;ctx.lineWidth=1.3;for(let i=0;i<3;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(cx-Math.cos(a)*8,cy-Math.sin(a)*8);ctx.lineTo(cx+Math.cos(a)*8,cy+Math.sin(a)*8);ctx.stroke()}}
    else if(k==='fear'){ctx.fillStyle=C_CREAM;for(const sd of [-1,1]){ctx.beginPath();ctx.ellipse(cx+sd*4.5,cy-1,3.4,4.4,0,0,TAU);ctx.fill()}ctx.fillStyle=C_INK;for(const sd of [-1,1]){ctx.beginPath();ctx.arc(cx+sd*4.5,cy-1,1.1,0,TAU);ctx.fill()}ctx.strokeStyle=C_CREAM;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(cx,cy+7,2,2.6,0,0,TAU);ctx.stroke()}
    else drawNote(cx-3,cy+4,1.3)})}

/* ---------- a cat, side view, whose fur stands up ---------- */
const FUR=[];{for(let i=0;i<120;i++){const u=i/120;FUR.push({u,len:rnd(0.8,1.2),ph:rnd(0,6)})}}
function catOutline(arch){// a closed loop around the body, head on the right
  const P=[];const cx=84,cy=150-arch*12;
  for(let i=0;i<=40;i++){const a=Math.PI+i/40*Math.PI;P.push([cx+Math.cos(a)*38,cy+Math.sin(a)*(18+arch*8)])}// back (top arc)
  for(let i=0;i<=40;i++){const a=i/40*Math.PI;P.push([cx+38-i/40*76,cy+Math.sin(a)*8+12])}// belly
  return P}
function cat(t,raise,arch,afraid){const P=catOutline(arch),cx=84,cy=150-arch*12;
  // legs
  ctx.strokeStyle=cr(0.85);ctx.lineWidth=4;ctx.lineCap='round';for(const lx of [56,70,98,112]){ctx.beginPath();ctx.moveTo(lx,cy+14);ctx.lineTo(lx+(lx<84?-2:2)*arch,184);ctx.stroke()}
  // tail: up and bushy when scared
  ctx.lineWidth=4+raise*4;ctx.beginPath();ctx.moveTo(48,cy-4);ctx.quadraticCurveTo(26,cy-20-arch*20,32,cy-44-arch*14);ctx.stroke();
  // fur: short strokes standing out from the body; the more raised, the longer and straighter
  ctx.fillStyle=cr(0.75);ctx.beginPath();P.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();
  ctx.strokeStyle=cr(0.95);ctx.lineWidth=0.9;for(const f of FUR){const k=f.u*(P.length-1),i=Math.floor(k),q=P[i],r=P[Math.min(P.length-1,i+1)];const tx=r[0]-q[0],ty=r[1]-q[1],d=Math.hypot(tx,ty)||1,nx=ty/d,ny=-tx/d;
    const L=(2+raise*5)*f.len,lean=(1-raise)*0.9;const ex=q[0]+(nx*(1-lean)+tx/d*lean)*L,ey=q[1]+(ny*(1-lean)+ty/d*lean)*L;ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(ex+Math.sin(t*3+f.ph)*0.3,ey);ctx.stroke()}
  // trapped warm air among the fur
  if(raise>0.3&&!afraid){ctx.fillStyle=cr(1);for(let i=0;i<30;i++){const k=(i/30)*0.5,j=Math.floor(k*(P.length-1)),q=P[j];ctx.globalAlpha=(raise-0.3)*1.4*(0.5+0.5*Math.sin(t*3+i));ctx.fillRect(q[0]+Math.sin(i)*2,q[1]-2-raise*3+Math.cos(i*1.7)*1.5,1.2,1.2)}ctx.globalAlpha=1}
  // head
  const hx=126,hy=cy-8;ctx.beginPath();ctx.arc(hx,hy,14,0,TAU);ctx.fillStyle=cr(0.75);ctx.fill();ctx.strokeStyle=cr(0.95);ctx.lineWidth=1;ctx.stroke();
  for(const sd of [-1,1]){ctx.beginPath();ctx.moveTo(hx+sd*4-6,hy-10);ctx.lineTo(hx+sd*7-2+(afraid?sd*3:0),hy-22+(afraid?4:0));ctx.lineTo(hx+sd*10+2,hy-8);ctx.closePath();ctx.fill();ctx.stroke()}
  ctx.fillStyle=C_INK;for(const sd of [-1,1]){ctx.beginPath();ctx.ellipse(hx+sd*5+2,hy-1,afraid?2.6:2.2,afraid?3.2:1.2,0,0,TAU);ctx.fill()}
  ctx.beginPath();ctx.moveTo(hx+2,hy+4);ctx.lineTo(hx+4,hy+6);ctx.lineTo(hx,hy+6);ctx.closePath();ctx.fill();
  ctx.strokeStyle=cr(0.95);ctx.lineWidth=0.7;for(const sd of [-1,1])for(const k of [-1,1]){ctx.beginPath();ctx.moveTo(hx+2+sd*4,hy+6);ctx.lineTo(hx+2+sd*16,hy+6+k*3);ctx.stroke()}
  if(afraid){ctx.strokeStyle=C_INK;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(hx-3,hy+9);for(let i=0;i<4;i++)ctx.lineTo(hx-3+i*2+2,hy+9+(i%2?-1.5:1.5));ctx.stroke()}}
function catSc(t){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=cr(0.08);ctx.fillRect(0,184,LW,140);ctx.strokeStyle=cr(0.45);ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(0,184);ctx.lineTo(LW,184);ctx.stroke();
  const cold=win_(t,27.4,28,32.0,32.6),scared=ss(seg(t,32.4,33.4));snow(t,cold*0.8);
  const raise=Math.max(ss(seg(t,28.6,29.6))*(1-ss(seg(t,31.6,32.4))),scared);cat(t,raise,scared,scared>0.5);
  if(scared>0.2){const s_=scared;ctx.strokeStyle=C_CREAM;ctx.lineWidth=1.2;ctx.globalAlpha=s_;for(const [x,y,a] of [[150,96,-0.6],[158,108,0],[150,120,0.6]]){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*7,y+Math.sin(a)*7);ctx.stroke()}ctx.globalAlpha=1}}
function human(t){// the section again, wide: a few thin hairs, and the warm air drifts straight off
  CAM={z:0.9,x:90,y:150,sx:0,sy:-10};ctx.setTransform(...camM());ctx.fillStyle=C_INK;ctx.fillRect(-200,-200,600,300);
  drawSection(t,{allMuscles:true,air:-1});ctx.setTransform(1,0,0,1,0,0);snow(t,0.5)}
function stem(t){// back in on the follicle: a long cold spell, the nerve keeps firing, the stem cells wake, the hair grows
  CAM={z:1.9,x:MAIN.x+14,y:150,sx:0,sy:-14};ctx.setTransform(...camM());ctx.fillStyle=C_INK;ctx.fillRect(-200,-200,600,300);
  const grow=ss(seg(t,46.6,50.6));MAIN.len=84+grow*4;drawSection(t,{nerve:1,stem:ss(seg(t,42.0,43.0))});
  // a new hair shaft pushing up from the bulb
  if(grow>0){const F=MAIN,bx=F.x+Math.sin(F.ang)*F.len,by=SK.SURF+Math.cos(F.ang)*F.len*0.98;ctx.strokeStyle=cr(1);ctx.lineWidth=1.6/CAM.z*1.6;ctx.beginPath();ctx.moveTo(bx-2,by-3);ctx.lineTo(lerp(bx-2,F.x+2,grow*0.9),lerp(by-3,SK.SURF+2,grow*0.9));ctx.stroke()}
  ctx.setTransform(1,0,0,1,0,0);snow(t,0.6);
  // a small mouse in the corner: this was found in mice
  inset(146,56,16,win_(t,42.0,42.6,51,51.5),(cx,cy)=>{ctx.fillStyle=C_CREAM;ctx.beginPath();ctx.ellipse(cx,cy+3,8,5,0,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(cx+7,cy,3.6,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(cx+6,cy-4,2.4,0,TAU);ctx.fill();
    ctx.fillStyle=C_INK;ctx.fillRect(cx+8.4,cy-0.8,1,1);ctx.strokeStyle=C_CREAM;ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(cx-8,cy+4);ctx.quadraticCurveTo(cx-13,cy+1,cx-12,cy-4);ctx.stroke()})}
function song(t){CAM={z:0.9,x:90,y:150,sx:0,sy:-10};ctx.setTransform(...camM());ctx.fillStyle=C_INK;ctx.fillRect(-200,-200,600,300);
  for(const F of FOLL)F.len=F.main?84:78;drawSection(t,{allMuscles:true});ctx.setTransform(1,0,0,1,0,0);notes(t,win_(t,51.8,52.4,58.6,59.4))}
function cam(t){return CAM}
function physics(t,dt){
  for(const h of PULSES)if(t-dt<h-0.7&&t>=h-0.7)EV.push(['pulse',t]);
  for(const [a] of [[2.6],[19.2],[37.0],[52.4]])if(t-dt<a&&t>=a)EV.push(['rise',t]);
  for(const [a] of [[0.6],[1.4],[2.2],[42.0]])if(t-dt<a&&t>=a)EV.push(['pop',t]);
  if(t-dt<32.4&&t>=32.4)EV.push(['hiss',t]);if(t-dt<28.6&&t>=28.6)EV.push(['fluff',t]);if(t-dt<46.6&&t>=46.6)EV.push(['grow',t]);
}
function drawWorld(t){
  OVTEXT=[];CAM={z:1,x:90,y:160,sx:0,sy:0};ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=C_INK;ctx.fillRect(0,0,LW,LH);PX=0.5;
  if(inSc('skin',t))skin(t);else if(inSc('cat',t))catSc(t);else if(inSc('human',t))human(t);else if(inSc('stem',t))stem(t);else song(t);
  ctx.setTransform(1,0,0,1,0,0);
  const g=ctx.createRadialGradient(LW/2,LH*0.36,LH*0.2,LW/2,LH*0.36,LH*0.7);g.addColorStop(0,'rgba(6,6,9,0)');g.addColorStop(1,'rgba(6,6,9,0.55)');ctx.fillStyle=g;ctx.fillRect(0,0,LW,LH);
  let dip=0;for(const k of Object.keys(SC)){const b=SC[k][0];if(b>0)dip=Math.max(dip,1-Math.abs(t-b)/0.3)}if(t<0.8)dip=Math.max(dip,1-t/0.8);if(t>58.6)dip=Math.max(dip,ss(seg(t,58.6,59.8)));
  if(dip>0){ctx.fillStyle=`rgba(6,6,9,${clamp(dip,0,1)})`;ctx.fillRect(0,0,LW,LH);if(dip>0.5)OVTEXT=[]}
}
