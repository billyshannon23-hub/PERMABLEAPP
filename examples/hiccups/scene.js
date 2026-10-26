/* ================= HICCUPS: Charles Osborne, who hiccuped for 68 years. Starring the series character. ================= */
const win_=(t,a,b,c,d)=>ss(seg(t,a,b))*(1-ss(seg(t,c,d)));
// scene windows (scene time)
const SC={farm:[0,11.0],years:[11.0,14.4],chest:[14.4,41.2],count:[41.2,46.4],life:[46.4,51.6],stop:[51.6,55.4],doc:[55.4,62]};
const inSc=(k,t)=>t>=SC[k][0]&&t<SC[k][1];
// every hiccup, in scene time. "fast" ones are the 68-year time-lapse
const HICS=[];
[9.8,10.7].forEach(h=>HICS.push({t:h}));
for(let h=11.35;h<14.1;h+=0.34)HICS.push({t:h,fast:1});
[21.7,23.5,26.3,28.5,31.4,33.6,36.0,38.2,40.4,41.9,43.4,44.9,46.1,47.5,49.1,50.7,52.3].forEach(h=>HICS.push({t:h}));
HICS.forEach(h=>EV.push(['hic',h.t,h.fast?1:0]));
// how hard the body is twitching right now, and how long since the last hiccup
function jolt(t){let j=0;for(const h of HICS){const d=t-h.t;if(d>=0&&d<0.5)j=Math.max(j,Math.exp(-d/(h.fast?0.04:0.08)))}return j}
function sinceHic(t){let best=99;for(const h of HICS){const d=t-h.t;if(d>=0&&d<best)best=d}return best}
const lastHic=t=>{let b=null;for(const h of HICS)if(h.t<=t)b=h;return b};

/* ---------- the character layer: drawn on its own canvas, then given a thin cream rim so ink lines read on the ink background ---------- */
const LAY=document.createElement('canvas');LAY.width=cv.width;LAY.height=cv.height;const lg=LAY.getContext('2d');
const TIN=document.createElement('canvas');TIN.width=cv.width;TIN.height=cv.height;const tg=TIN.getContext('2d');
let CAM={z:1,x:90,y:160,sx:0,sy:0};
function camM(){const C=CAM;return[C.z,0,0,C.z,LW/2+C.sx-C.x*C.z,LH/2+C.sy-C.y*C.z]}
function charLayer(draw,rim=3){lg.setTransform(1,0,0,1,0,0);lg.clearRect(0,0,LAY.width,LAY.height);const m=camM();lg.setTransform(m[0]*SS,0,0,m[3]*SS,m[4]*SS,m[5]*SS);draw(lg);lg.setTransform(1,0,0,1,0,0);
  tg.setTransform(1,0,0,1,0,0);tg.clearRect(0,0,TIN.width,TIN.height);tg.globalCompositeOperation='source-over';tg.drawImage(LAY,0,0);tg.globalCompositeOperation='source-in';tg.fillStyle=C_CREAM;tg.fillRect(0,0,TIN.width,TIN.height);tg.globalCompositeOperation='source-over';
  ctx.resetTransform();for(let k=0;k<12;k++){const a=k/12*TAU;ctx.drawImage(TIN,Math.round(Math.cos(a)*rim),Math.round(Math.sin(a)*rim))}ctx.drawImage(LAY,0,0);ctx.setTransform(...camM())}
const LOOK={hair:'tuft',hairTone:'dark',clothes:'overalls',hat:'straw',glasses:'none',neck:'none',extras:{},held:'none'};
// one character: mirror flips it to face left, rot/pivot tip it over, jolt is the hiccup twitch
function guy(g,x,y,s,o,f={}){g.save();
  if(f.mirror){g.translate(x,0);g.scale(-1,1);g.translate(-x,0)}
  if(f.rot){const px=f.pivot?f.pivot[0]:x,py=f.pivot?f.pivot[1]:y;g.translate(px,py);g.rotate(f.rot);g.translate(-px,-py)}
  const j=f.jolt||0;if(j){g.translate(x,y);g.scale(1-0.03*j,1+0.05*j);g.translate(-x,-y-2.2*j*s)}
  BH.drawGuy(g,x,y,s,{...LOOK,view:'front',expr:'neutral',pose:'relaxed',boil:true,breath:0,blink:false,t:0,...o});g.restore()}
const blinkAt=t=>((t*0.37)%3.1)<0.11;
// a hiccup changes the face for a moment
const hicFace=(t,base)=>{const h=lastHic(t);return h&&!h.fast&&t-h.t<0.32?'surprised':base};
// the "HIC!" pops are drawn after the dither, in screen space
let POPS=[],OVTEXT=[];
function popHic(t,wx,wy,big){const d=sinceHic(t);if(d>0.75)return;const m=camM();POPS.push({x:wx*m[0]+m[4],y:wy*m[3]+m[5],a:d,big})}

/* ---------- props ---------- */
function hog(g,x,y,sling){// a hog in side view, facing left, hanging in a sling
  g.save();g.translate(x,y);g.lineJoin='round';const lw=1.4;
  g.fillStyle=BH.TONE.light;g.strokeStyle=C_INK;g.lineWidth=lw;
  for(const lx of [-12,-5,8,14]){g.beginPath();g.rect(lx-2,7,4,9);g.fill();g.stroke()}
  g.beginPath();g.ellipse(0,0,22,12.5,0,0,TAU);g.fill();g.stroke();
  g.beginPath();g.ellipse(-22,-2,8.5,8,0,0,TAU);g.fill();g.stroke();
  g.beginPath();g.ellipse(-29.5,0,3,4,0,0,TAU);g.fillStyle=BH.TONE.mid;g.fill();g.stroke();g.fillStyle=C_INK;g.fillRect(-30.6,-1.4,0.9,1.2);g.fillRect(-29,-1.4,0.9,1.2);
  g.beginPath();g.moveTo(-20,-8);g.lineTo(-15,-14);g.lineTo(-14,-6);g.closePath();g.fillStyle=BH.TONE.light;g.fill();g.stroke();
  g.beginPath();g.moveTo(-24,-4);g.lineTo(-21.5,-3.6);g.stroke();
  g.beginPath();g.moveTo(21,-3);g.bezierCurveTo(27,-8,29,0,25,-1);g.bezierCurveTo(22,-2,25,-6,27,-5);g.stroke();
  if(sling){g.strokeStyle=C_CREAM;g.lineWidth=1.2;g.beginPath();g.moveTo(-16,-9);g.quadraticCurveTo(0,20,16,-9);g.stroke();g.beginPath();g.moveTo(-16,-9);g.lineTo(0,-20);g.lineTo(16,-9);g.stroke()}
  g.restore()}
function farmBack(t){// ground, a barn, the hoist frame
  ctx.fillStyle=cr(0.1);ctx.fillRect(-40,184,260,140);ctx.strokeStyle=cr(0.6);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-40,184);ctx.lineTo(220,184);ctx.stroke();
  for(let i=0;i<26;i++){const x=(i*37)%190,y=196+(i*13)%40;ctx.strokeStyle=cr(0.3);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+1,y-3);ctx.moveTo(x+2,y);ctx.lineTo(x+3,y-2.5);ctx.stroke()}
  // barn, far away
  ctx.fillStyle=cr(0.16);ctx.beginPath();ctx.moveTo(118,184);ctx.lineTo(118,146);ctx.lineTo(140,128);ctx.lineTo(162,146);ctx.lineTo(162,184);ctx.closePath();ctx.fill();ctx.strokeStyle=cr(0.45);ctx.lineWidth=0.8;ctx.stroke();
  ctx.strokeRect(132,162,16,22);ctx.beginPath();ctx.moveTo(132,162);ctx.lineTo(148,184);ctx.moveTo(148,162);ctx.lineTo(132,184);ctx.stroke();
  // a few stars
  for(let i=0;i<18;i++){const x=(i*53)%180,y=40+(i*29)%70;if(Math.sin(t*2+i)>0.2){ctx.fillStyle=cr(0.5);ctx.fillRect(x,y,0.6,0.6)}}
  // hoist: a post and a beam with a pulley
  ctx.fillStyle=cr(0.55);ctx.fillRect(8,54,5,130);ctx.fillRect(6,50,62,5);ctx.strokeStyle=C_INK;ctx.lineWidth=0.6;ctx.strokeRect(8,54,5,130);ctx.strokeRect(6,50,62,5);
  ctx.beginPath();ctx.moveTo(13,74);ctx.lineTo(30,55);ctx.lineWidth=3;ctx.strokeStyle=cr(0.55);ctx.stroke();
  ctx.beginPath();ctx.arc(46,59,4,0,TAU);ctx.fillStyle=cr(0.7);ctx.fill();ctx.strokeStyle=C_INK;ctx.lineWidth=0.8;ctx.stroke()}
function blender(g,x,y,t,on){g.save();g.translate(x,y);g.lineJoin='round';g.strokeStyle=C_INK;g.lineWidth=1.2;
  g.fillStyle=BH.TONE.mid;g.beginPath();g.moveTo(-9,10);g.lineTo(9,10);g.lineTo(7,2);g.lineTo(-7,2);g.closePath();g.fill();g.stroke();
  g.fillStyle='rgba(255,255,255,0.35)';g.beginPath();g.moveTo(-7,2);g.lineTo(-9,-18);g.lineTo(9,-18);g.lineTo(7,2);g.closePath();g.fill();g.stroke();
  g.fillStyle=BH.TONE.dark;g.fillRect(-10,-21,20,4);g.strokeRect(-10,-21,20,4);
  g.fillStyle=BH.TONE.light;g.beginPath();g.moveTo(-7.4,-2);for(let x_=-7;x_<=7;x_+=1)g.lineTo(x_,-6+(on?Math.sin(t*30+x_)*1.5:0));g.lineTo(7.4,-2);g.lineTo(7,2);g.lineTo(-7,2);g.closePath();g.fill();
  if(on){g.strokeStyle=C_INK;g.lineWidth=0.8;for(let k=0;k<3;k++){const a=t*40+k*2.1;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*5,-1+Math.sin(a)*1.2);g.stroke()}
    g.strokeStyle=C_CREAM;for(const sx of [-14,14]){g.beginPath();g.moveTo(sx,-6);g.lineTo(sx+(sx>0?3:-3),-8);g.stroke()}}
  g.restore()}
// a round inset bubble with a dotted pointer to what it describes
function inset(x,y,r,tx,ty,a,draw){if(a<=0.01)return;ctx.save();ctx.globalAlpha=a;
  const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy);ctx.fillStyle=C_CREAM;for(let k=r+2;k<d-2;k+=3){ctx.fillRect(x+dx/d*k-0.5,y+dy/d*k-0.5,1,1)}
  ctx.beginPath();ctx.arc(x,y,r*(0.7+0.3*a),0,TAU);ctx.fillStyle=C_INK;ctx.fill();ctx.strokeStyle=C_CREAM;ctx.lineWidth=1.2;ctx.stroke();
  ctx.save();ctx.beginPath();ctx.arc(x,y,r-1,0,TAU);ctx.clip();draw(x,y,r);ctx.restore();ctx.restore()}

/* ---------- the cut-away: the same character, with a window into his chest (and later his head) ---------- */
const XR={x:90,y:184,s:1.22};
function breathIn(t){return 0.5+0.5*Math.sin(t*TAU/3.6-1.2)}
function diaY(t){return XR.y-31*XR.s+3.2*breathIn(t)+5.5*jolt(t)}
function cords(t){// 0 open, 1 snapped shut: shuts a split second after each hiccup starts
  let c=0;for(const h of HICS){const d=t-h.t;if(d>0.06&&d<0.45)c=Math.max(c,d<0.1?(d-0.06)/0.04:1-ss((d-0.3)/0.15))}return clamp(c,0,1)}
const AIR=[];for(let i=0;i<26;i++)AIR.push({u:R(),ph:R()*6,dx:rnd(-1.6,1.6)});
const NERVE=sd=>{const {x,y,s}=XR,hy=y-92*s;return[[x+sd*2*s,hy+17*s],[x+sd*5*s,y-66*s],[x+sd*12*s,y-56*s],[x+sd*19*s,y-44*s],[x+sd*24*s,y-34*s]]};
function along(P,u){let L=0;const seg_=[];for(let i=0;i<P.length-1;i++){const d=Math.hypot(P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]);seg_.push(d);L+=d}
  let k=clamp(u,0,1)*L;for(let i=0;i<seg_.length;i++){if(k<=seg_[i]){const f=k/seg_[i];return[lerp(P[i][0],P[i+1][0],f),lerp(P[i][1],P[i+1][1],f)]}k-=seg_[i]}return P[P.length-1]}
function chestXray(g,t,a){const {x,y,s}=XR;if(a<=0)return;const P=BH.bodyPts(x,y,s,'front');
  g.save();g.beginPath();P.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.clip();g.globalAlpha=a;
  g.fillStyle=C_INK;g.fillRect(x-60,y-90*s,120,100*s);
  const bi=breathIn(t),j=jolt(t),dy=diaY(t);
  // ribs, faint
  g.strokeStyle=cr(0.3);g.lineWidth=0.9;for(let k=0;k<5;k++){const ry=y-56*s+k*6.2;for(const sd of [-1,1]){g.beginPath();g.moveTo(x+sd*3,ry);g.quadraticCurveTo(x+sd*20*s,ry-4,x+sd*34*s,ry+6);g.stroke()}}
  // lungs: they fill as the diaphragm pulls down
  for(const sd of [-1,1]){const lx=x+sd*15*s,ly=y-47*s+bi*1.2+j*1.6,rx=(10.5+bi*1.2+j*1.6)*s,ry=(15+bi*1.5+j*2.4)*s;
    g.beginPath();g.moveTo(lx-sd*rx*0.55,ly-ry);g.bezierCurveTo(lx+sd*rx*0.9,ly-ry*1.05,lx+sd*rx*1.15,ly+ry*0.4,lx+sd*rx*0.9,dy-2);g.lineTo(lx-sd*rx*0.75,dy-4);g.bezierCurveTo(lx-sd*rx*0.95,ly,lx-sd*rx,ly-ry*0.7,lx-sd*rx*0.55,ly-ry);g.closePath();
    g.fillStyle=cr(0.3+0.12*bi+0.15*j);g.fill();g.strokeStyle=cr(1);g.lineWidth=1.2;g.stroke();
    g.strokeStyle=cr(0.5);g.lineWidth=0.7;for(let k=0;k<4;k++){g.beginPath();g.moveTo(x+sd*3,y-58*s+k*2);g.quadraticCurveTo(lx,ly-6+k*7,lx+sd*rx*(0.2+k*0.12),ly+k*6);g.stroke()}}
  // windpipe, from the neck down to the lungs, with the voice box at the top
  g.strokeStyle=cr(0.9);g.lineWidth=1;g.fillStyle=cr(0.12);g.beginPath();g.rect(x-2.6,y-66*s,5.2,13*s);g.fill();g.stroke();
  for(let k=0;k<6;k++){g.beginPath();g.moveTo(x-2.6,y-64*s+k*2.6);g.lineTo(x+2.6,y-64*s+k*2.6);g.strokeStyle=cr(0.55);g.lineWidth=0.6;g.stroke()}
  const c=cords(t);g.fillStyle=cr(0.85);g.beginPath();g.ellipse(x,y-63.5*s,4.4,2.6,0,0,TAU);g.fill();g.fillStyle=C_INK;g.beginPath();g.ellipse(x,y-63.5*s,3*(1-c)+0.3,1.2*(1-c)+0.2,0,0,TAU);g.fill();
  // air: drifts in and out with the breath; a hiccup yanks it in, then the shut cords stop it dead
  for(const p of AIR){const flow=(t*0.25*(bi>0.5?1:-1));let u=(p.u+flow+j*0.25)%1;if(u<0)u+=1;const yy=lerp(y-66*s,y-52*s,u);g.fillStyle=cr(0.95);g.fillRect(x+p.dx*0.8-0.5,yy,1,1)}
  // the diaphragm: a dome of muscle under the lungs
  const L=x-31*s,Rr=x+31*s;g.beginPath();g.moveTo(L,dy+8);g.bezierCurveTo(L+6,dy-20+j*4,Rr-6,dy-20+j*4,Rr,dy+8);g.lineTo(Rr,dy+14);g.bezierCurveTo(Rr-6,dy-13+j*4,L+6,dy-13+j*4,L,dy+14);g.closePath();
  g.fillStyle=cr(0.95);g.fill();g.strokeStyle=cr(1);g.lineWidth=1.2;g.stroke();
  g.strokeStyle=C_INK;g.lineWidth=0.6;for(let k=-5;k<=5;k++){const fx=x+k*5*s,yy=dy-11.5+Math.abs(k)*Math.abs(k)*0.62+j*3;g.beginPath();g.moveTo(fx,yy);g.lineTo(fx+1.2,yy+5);g.stroke()}
  // belly below
  g.restore()}
function headXray(g,t,a){const {x,y,s}=XR;if(a<=0)return;const hx=x,hy=y-92*s;
  g.save();g.beginPath();g.ellipse(hx,hy,27*s,26*s,0,0,TAU);g.clip();g.globalAlpha=a;g.fillStyle=C_INK;g.fillRect(hx-40*s,hy-40*s,80*s,80*s);
  g.beginPath();g.moveTo(hx-21*s,hy+3*s);g.bezierCurveTo(hx-24*s,hy-14*s,hx-12*s,hy-22*s,hx,hy-21*s);g.bezierCurveTo(hx+13*s,hy-22*s,hx+24*s,hy-14*s,hx+21*s,hy+3*s);g.bezierCurveTo(hx+18*s,hy+11*s,hx+8*s,hy+11*s,hx+4*s,hy+9*s);g.lineTo(hx-4*s,hy+9*s);g.bezierCurveTo(hx-8*s,hy+11*s,hx-18*s,hy+11*s,hx-21*s,hy+3*s);g.closePath();
  g.fillStyle=cr(0.16);g.fill();g.strokeStyle=cr(0.9);g.lineWidth=1;g.stroke();g.beginPath();g.moveTo(hx,hy-20*s);g.lineTo(hx,hy+8*s);g.strokeStyle=cr(0.45);g.stroke();
  g.strokeStyle=cr(0.4);g.lineWidth=0.7;for(let k=0;k<7;k++){const a_=k*0.9,cx=hx+Math.cos(a_)*11*s*(k%2?1:-1),cy=hy-8*s+Math.sin(a_*1.7)*7*s;g.beginPath();g.arc(cx,cy,3*s,a_,a_+2.4);g.stroke()}
  // brainstem, running down into the neck
  g.beginPath();g.moveTo(hx-3.4*s,hy+7*s);g.lineTo(hx-2.6*s,hy+30*s);g.lineTo(hx+2.6*s,hy+30*s);g.lineTo(hx+3.4*s,hy+7*s);g.closePath();g.fillStyle=cr(0.35+0.4*stemGlow(t));g.fill();g.strokeStyle=cr(0.95);g.lineWidth=1;g.stroke();
  g.restore()}
function stemGlow(t){let gl=0;for(const h of HICS){const d=h.t-t;if(d>0.35&&d<0.6)gl=1-Math.abs(d-0.47)/0.13}return clamp(gl,0,1)}
// the reflex: a signal climbs to the brainstem, then runs down the nerves to the diaphragm
function nerves(g,t,a){if(a<=0)return;const {x,y,s}=XR;g.save();g.globalAlpha=a;
  for(const sd of [-1,1]){const P=NERVE(sd);g.strokeStyle=cr(0.95);g.lineWidth=1.1;g.setLineDash([2.4,1.2]);g.beginPath();P.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();g.setLineDash([]);
    for(const h of HICS){if(h.fast)continue;const up=seg(t,h.t-0.95,h.t-0.5),dn=seg(t,h.t-0.4,h.t);
      if(up>0&&up<1){const [px,py]=along(P,1-up);g.fillStyle=cr(1);g.beginPath();g.arc(px,py,1.5,0,TAU);g.fill()}
      if(dn>0&&dn<1){const [px,py]=along(P,dn);g.fillStyle=cr(1);g.beginPath();g.arc(px,py,2,0,TAU);g.fill();g.strokeStyle=C_INK;g.lineWidth=0.6;g.stroke()}}}
  g.restore()}
// the brainstem's "off switch", which in Osborne's case may have been broken by the fall
function offSwitch(g,t,a,broken){if(a<=0)return;const {x,y,s}=XR,hy=y-92*s,px=x+7.5*s,py=hy+17*s;g.save();g.globalAlpha=a;
  g.beginPath();g.arc(px,py,3.2,0,TAU);g.fillStyle=broken?cr(0.12+0.1*Math.max(0,Math.sin(t*9))):cr(0.95);g.fill();g.strokeStyle=cr(1);g.lineWidth=0.9;g.stroke();
  g.strokeStyle=cr(0.9);g.lineWidth=0.7;g.beginPath();g.moveTo(px-3.2,py);g.lineTo(x+2.6*s,py);g.stroke();
  if(broken){g.strokeStyle=C_INK;g.lineWidth=0.9;g.beginPath();g.moveTo(px-1.6,py-3);g.lineTo(px+0.4,py-0.6);g.lineTo(px-0.8,py+0.6);g.lineTo(px+1.2,py+3);g.stroke()}
  g.restore()}

/* ---------- kids, for the life montage ---------- */
const KIDS=[[18,188,0],[40,186,1],[28,168,2],[50,166,3],[162,188,4],[140,186,5],[152,168,6],[130,166,7]].map(([x,y,i])=>({x,y,t0:46.9+i*0.24,
  look:{clothes:['tshirt','hoodie','sweater','overalls','pajamas','jersey','tshirt','hoodie'][i],hairTone:['dark','mid','light','dark','mid','dark','light','mid'][i],hat:i===3?'cap':i===6?'beanie':'none',glasses:i===5?'round':'none'}}));
KIDS.forEach(k=>EV.push(['pop',k.t0]));

/* ---------- physics: the hog, the rope, and the fall ---------- */
let hogY=172,hogV=0,thudDone=false;
function pullPhase(t){return seg(t,1.4,6.6)}
function physics(t,dt){
  if(t<6.9){const tgt=lerp(172,110,ss(pullPhase(t)))-Math.max(0,Math.sin(t*5.2))*1.2;hogY+=(tgt-hogY)*Math.min(1,dt*10);hogV=0}
  else{hogV+=520*dt;hogY+=hogV*dt;if(hogY>172){hogY=172;if(!thudDone){thudDone=true;EV.push(['thud',t])}hogV=-hogV*0.18;if(Math.abs(hogV)<8)hogV=0}}
  if(Math.floor((t-dt)/0.38)<Math.floor(t/0.38)&&t>1.4&&t<6.6)EV.push(['pull',t]);
  if(Math.floor((t-dt)*10)<Math.floor(t*10)&&t>41.4&&t<45.4)EV.push(['tick',t]);
  for(const h of HICS)if(!h.fast&&t-dt<h.t-0.95&&t>=h.t-0.95&&t>29.6&&t<41.2)EV.push(['pulse',t]);
  if(t-dt<6.9&&t>=6.9)EV.push(['slip',t]);if(t-dt<7.25&&t>=7.25)EV.push(['fall',t]);
  if(t-dt<49.6&&t>=49.6)EV.push(['whirr',t]);
}

/* ---------- each scene ---------- */
function farm(t){farmBack(t);const s=0.62,Y=184,X=98-10*(t<6.9?0:t<7.3?ss(seg(t,6.9,7.3)):t<8.6?1:1-ss(seg(t,8.6,9.2)));if(t>1&&t<6.6)OVTEXT.push({txt:'1922, NEBRASKA',x:90,y:38,sc:1,dim:1});
  // hands on the rope, hand over hand
  const pull=t>1.4&&t<6.9,ph=t*5.2,hA=pull?Math.sin(ph)*9:0;
  const fallK=t<6.9?0:t<7.3?ss(seg(t,6.9,7.3)):t<8.6?1:1-ss(seg(t,8.6,9.2));
  const rot=t<6.9?(pull?0.08:0)+0.03*Math.sin(t*2.6):lerp(0.08,1.42,fallK);
  BH.POSES._pull={arms:[{sd:-1,t:[28,-84+hA],b:1,h:'fist'},{sd:1,t:[36,-66-hA],b:-1,h:'fist'}]};
  BH.POSES._fall={arms:[{sd:-1,t:[-24,-80],b:1,h:'open'},{sd:1,t:[30,-96],b:-1,h:'open'}]};
  BH.POSES._hic={arms:[{sd:-1,t:[-35,-16],b:1,h:'relax'},{sd:1,t:[35,-16],b:-1,h:'relax'}]};
  const pose=t<6.9?(t>1.0?'_pull':'relaxed'):t<9.2?'_fall':'_hic';
  const expr=t<6.9?(t>1.4?'annoyed':'neutral'):t<7.6?'surprised':t<9.3?'neutral':hicFace(t,'content');
  // the rope: from the hog up over the pulley and down to his hands; slack and flying once it slips
  const handX=X-31*s,handY=Y-78*s+(pull?Math.sin(ph)*2:0);
  ctx.strokeStyle=cr(0.85);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(46,hogY-20);ctx.lineTo(46,59);
  if(t<6.9)ctx.lineTo(handX,handY);else{const k=seg(t,6.9,7.5);ctx.quadraticCurveTo(lerp(handX,70,k),lerp(handY,90,k),lerp(handX,58,k),lerp(handY,150,k))}ctx.stroke();
  charLayer(g=>{hog(g,46,hogY,true);
    guy(g,X,Y,s,{view:'q',pose,expr,breath:Math.sin(t*1.6)*0.5,blink:blinkAt(t),t},{mirror:true,rot:-rot,pivot:[X-26*s,Y],jolt:jolt(t)})});
  if(t>9)popHic(t,X-62,Y-150*s,false)}
function years(t){const s=0.9,X=90,Y=186;ctx.fillStyle=cr(0.08);ctx.fillRect(-40,186,260,140);ctx.strokeStyle=cr(0.45);ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(-40,186);ctx.lineTo(220,186);ctx.stroke();
  const k=ss(seg(t,11.2,14.0)),yr=Math.round(lerp(1922,1990,k));OVTEXT.push({txt:String(yr),x:90,y:44,sc:3});
  const tone=k<0.4?'dark':k<0.75?'mid':'light';
  charLayer(g=>guy(g,X,Y,s,{view:'front',hat:'none',hairTone:tone,glasses:k>0.55?'round':'none',expr:hicFace(t,'worried'),breath:Math.sin(t*1.6)*0.5,blink:blinkAt(t),t},{jolt:jolt(t)}));
  popHic(t,X+30,Y-96,false)}
function chest(t){const {x,y,s}=XR;
  // the same man, now drawn big, with a window into him
  const xa=ss(seg(t,15.0,16.2)),ha=win_(t,29.8,30.8,99,100);
  const zoom=win_(t,35.6,36.8,40.6,41.2);CAM={z:1+0.6*zoom,x:90,y:lerp(160,y-92*s+17*s,zoom),sx:0,sy:lerp(0,-65,zoom)};ctx.setTransform(...camM());
  charLayer(g=>{guy(g,x,y,s,{view:'front',pose:'tuck',hat:'none',clothes:'none',hairTone:'mid',expr:hicFace(t,'neutral'),breath:breathIn(t)*0.6,blink:blinkAt(t),t},{jolt:jolt(t)*0.6});
    chestXray(g,t,xa);headXray(g,t,ha);nerves(g,t,ha);offSwitch(g,t,win_(t,35.6,36.4,99,100),t>37.4)});
  // diaphragm arrow while breathing is explained
  const ar=win_(t,17.4,18.0,20.4,20.8);if(ar>0){ctx.globalAlpha=ar;const ay=diaY(t)+12;ctx.strokeStyle=C_CREAM;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x+40,ay-12);ctx.lineTo(x+40,ay);ctx.lineTo(x+37,ay-3);ctx.moveTo(x+40,ay);ctx.lineTo(x+43,ay-3);ctx.stroke();ctx.globalAlpha=1}
  // inset: the vocal cords seen from above, open, then snapping shut
  const ia=win_(t,25.0,25.8,29.2,29.8);
  inset(150,122,20,x+3,y-63.5*s,ia,(cx,cy,r)=>{const c=cords(t);ctx.fillStyle=cr(0.2);ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fill();
    const op=(1-c)*0.55;for(const sd of [-1,1]){ctx.beginPath();ctx.moveTo(cx,cy-13);ctx.lineTo(cx+sd*(1.2+op*14),cy+12);ctx.lineTo(cx+sd*14,cy+12);ctx.lineTo(cx+sd*10,cy-13);ctx.closePath();ctx.fillStyle=cr(0.92);ctx.fill();ctx.strokeStyle=C_INK;ctx.lineWidth=0.8;ctx.stroke()}
    ctx.fillStyle=C_INK;ctx.beginPath();ctx.moveTo(cx,cy-13);ctx.lineTo(cx-(1.2+op*14)+1,cy+12);ctx.lineTo(cx+(1.2+op*14)-1,cy+12);ctx.closePath();ctx.fill();
    if(c>0.6){ctx.strokeStyle=C_CREAM;ctx.lineWidth=1;for(const sd of [-1,1]){ctx.beginPath();ctx.moveTo(cx+sd*5,cy+2);ctx.lineTo(cx+sd*9,cy+1);ctx.stroke()}}});
  if(t>21)popHic(t,x-70,y-104*s,true)}
function count(t){const s=0.8,X=90,Y=186;ctx.fillStyle=cr(0.08);ctx.fillRect(-40,186,260,140);ctx.strokeStyle=cr(0.45);ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(-40,186);ctx.lineTo(220,186);ctx.stroke();
  const k=ss(seg(t,41.6,45.6)),n=Math.round(430e6*k/1e3)*1e3;OVTEXT.push({txt:'HICCUPS',x:90,y:40,sc:1,dim:1});OVTEXT.push({txt:n.toLocaleString('en-US'),x:90,y:52,sc:2});
  if(t>42.6)OVTEXT.push({txt:'20-40 A MINUTE',x:90,y:72,sc:1,dim:1});
  charLayer(g=>guy(g,X,Y,s,{view:'q',hat:'none',hairTone:'light',glasses:'round',clothes:'sweater',expr:hicFace(t,'content'),breath:Math.sin(t*1.6)*0.5,blink:blinkAt(t),t},{jolt:jolt(t)}));
  popHic(t,X+28,Y-92,false)}
function life(t){const s=0.8,X=90,Y=186;ctx.fillStyle=cr(0.08);ctx.fillRect(-40,186,260,140);ctx.strokeStyle=cr(0.45);ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(-40,186);ctx.lineTo(220,186);ctx.stroke();
  charLayer(g=>{for(const kd of KIDS){const a=seg(t,kd.t0,kd.t0+0.25);if(a<=0)continue;const sc=0.42*(a<1?0.6+0.4*Math.sin(a*Math.PI*0.5)+0.12*Math.sin(a*Math.PI):1);
      guy(g,kd.x,kd.y,sc,{view:'front',...kd.look,hair:'tuft',neck:'none',extras:{},expr:'content',breath:Math.sin(t*2+kd.x)*0.5,blink:blinkAt(t+kd.x),t})}
    guy(g,X,Y,s,{view:'front',hat:'none',hairTone:'light',glasses:'round',clothes:'sweater',expr:hicFace(t,'laughing'),breath:Math.sin(t*1.6)*0.5,blink:blinkAt(t),t},{jolt:jolt(t)})});
  popHic(t,X+26,Y-90,false);
  // insets: married twice, and the blender
  inset(30,56,17,X-18,Y-80,win_(t,46.6,47.2,51,51.5),(cx,cy)=>{ctx.strokeStyle=C_CREAM;ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx-4,cy+1,6,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(cx+4,cy+1,6,0,TAU);ctx.stroke();
    ctx.fillStyle=C_CREAM;ctx.beginPath();ctx.moveTo(cx-4,cy-8);ctx.lineTo(cx-1.5,cy-5);ctx.lineTo(cx-4,cy-4);ctx.lineTo(cx-6.5,cy-5);ctx.closePath();ctx.fill()});
  inset(150,56,17,X+20,Y-74,win_(t,49.2,49.8,51,51.5),(cx,cy)=>{blender(ctx,cx,cy+5,t,t>49.6)})}
function stop(t){const s=0.8,X=90,Y=186;ctx.fillStyle=cr(0.08);ctx.fillRect(-40,186,260,140);ctx.strokeStyle=cr(0.45);ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(-40,186);ctx.lineTo(220,186);ctx.stroke();
  OVTEXT.push({txt:'1990',x:90,y:44,sc:3});
  const calm=ss(seg(t,53.0,54.2));
  charLayer(g=>guy(g,X,Y,s,{view:'front',hat:'none',hairTone:'light',glasses:'round',clothes:'sweater',expr:t<53.4?hicFace(t,'worried'):t<54.0?'surprised':'content',breath:Math.sin(t*1.1)*0.5,blink:blinkAt(t),t},{jolt:jolt(t)}));
  popHic(t,X+28,Y-92,false)}
function doc(t){const s=0.85,X=76,Y=186;ctx.fillStyle=cr(0.08);ctx.fillRect(-40,186,260,140);ctx.strokeStyle=cr(0.45);ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(-40,186);ctx.lineTo(220,186);ctx.stroke();
  BH.POSES._show={arms:[{sd:-1,t:[-35,-16],b:1,h:'relax'},{sd:1,t:[40,-78],b:1,h:'open'}]};
  charLayer(g=>guy(g,X,Y,s,{view:'front',hat:'none',hairTone:'dark',clothes:'labcoat',neck:'stethoscope',glasses:'square',expr:'content',pose:'_show',breath:Math.sin(t*1.6)*0.5,blink:blinkAt(t),t}));
  // a calendar: two days
  inset(146,74,22,X+40,Y-78,win_(t,57.6,58.2,61,61.5),(cx,cy)=>{ctx.fillStyle=cr(0.95);ctx.fillRect(cx-12,cy-10,24,22);ctx.fillStyle=cr(0.4);ctx.fillRect(cx-12,cy-10,24,6);ctx.strokeStyle=C_INK;ctx.lineWidth=0.8;ctx.strokeRect(cx-12,cy-10,24,22);
    ctx.fillStyle=C_INK;ctx.fillRect(cx-7,cy-12,1.6,4);ctx.fillRect(cx+5.4,cy-12,1.6,4);for(let i=0;i<2;i++){ctx.strokeStyle=C_INK;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(cx-9+i*9,cy-1);ctx.lineTo(cx-2+i*9,cy+8);ctx.moveTo(cx-2+i*9,cy-1);ctx.lineTo(cx-9+i*9,cy+8);ctx.stroke()}})}
function cam(t){return CAM}
function drawWorld(t){
  POPS=[];OVTEXT=[];CAM={z:1,x:90,y:160,sx:0,sy:0};ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=C_INK;ctx.fillRect(0,0,LW,LH);PX=0.5;BH.setSeed(Math.floor(t*6));
  if(inSc('farm',t))farm(t);else if(inSc('years',t))years(t);else if(inSc('chest',t))chest(t);else if(inSc('count',t))count(t);else if(inSc('life',t))life(t);else if(inSc('stop',t))stop(t);else doc(t);
  ctx.setTransform(1,0,0,1,0,0);
  const g=ctx.createRadialGradient(LW/2,LH*0.36,LH*0.2,LW/2,LH*0.36,LH*0.7);g.addColorStop(0,'rgba(6,6,9,0)');g.addColorStop(1,'rgba(6,6,9,0.55)');ctx.fillStyle=g;ctx.fillRect(0,0,LW,LH);
  // dips to black between scenes
  let dip=0;for(const k of Object.keys(SC)){const b=SC[k][0];if(b>0)dip=Math.max(dip,1-Math.abs(t-b)/0.3)}if(t<0.8)dip=Math.max(dip,1-t/0.8);if(t>60.6)dip=Math.max(dip,ss(seg(t,60.6,61.8)));
  if(dip>0){ctx.fillStyle=`rgba(6,6,9,${clamp(dip,0,1)})`;ctx.fillRect(0,0,LW,LH);if(dip>0.5){POPS=[];OVTEXT=[]}}
}
