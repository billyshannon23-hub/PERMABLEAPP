/* ============ LIB: helpers for writing scenes ============
   Included when project.json has "lib": true (the starter template does).
   Everything here is optional; read docs/SCENE_API.md for a tour. */

// ---------- timing
// rises a..b, holds, falls c..d (all eased). The workhorse for fading things in and out.
const win_=(t,a,b,c,d)=>ss(seg(t,a,b))*(1-ss(seg(t,c,d)));
// true exactly once, on the frame where scene time passes x (use inside physics to fire events)
let _dt=0;const at=(t,x)=>t-_dt<x&&t>=x;
// which scene is on: SC = {name:[start,end],...}
const inSc=(SC,k,t)=>t>=SC[k][0]&&t<SC[k][1];

// ---------- camera: world point (CAM.x, CAM.y) lands at the middle of the screen, zoomed by CAM.z
let CAM={z:1,x:90,y:160,sx:0,sy:0};
function camM(){const C=CAM;return[C.z,0,0,C.z,LW/2+C.sx-C.x*C.z,LH/2+C.sy-C.y*C.z]}
function useCam(c){CAM={z:1,x:90,y:160,sx:0,sy:0,...c};ctx.setTransform(...camM())}

// ---------- the character layer: characters are drawn on their own canvas, then stamped with a thin cream rim
// so their ink outlines read on the ink background. Draw every character in one charLayer(g=>{...}) call.
const LAY=document.createElement('canvas');LAY.width=cv.width;LAY.height=cv.height;const lg=LAY.getContext('2d');
const TIN=document.createElement('canvas');TIN.width=cv.width;TIN.height=cv.height;const tg=TIN.getContext('2d');
function charLayer(draw,rim=3){lg.setTransform(1,0,0,1,0,0);lg.clearRect(0,0,LAY.width,LAY.height);const m=camM();lg.setTransform(m[0]*SS,0,0,m[3]*SS,m[4]*SS,m[5]*SS);draw(lg);lg.setTransform(1,0,0,1,0,0);
  tg.setTransform(1,0,0,1,0,0);tg.clearRect(0,0,TIN.width,TIN.height);tg.globalCompositeOperation='source-over';tg.drawImage(LAY,0,0);tg.globalCompositeOperation='source-in';tg.fillStyle=C_CREAM;tg.fillRect(0,0,TIN.width,TIN.height);tg.globalCompositeOperation='source-over';
  ctx.resetTransform();for(let k=0;k<12;k++){const a=k/12*TAU;ctx.drawImage(TIN,Math.round(Math.cos(a)*rim),Math.round(Math.sin(a)*rim))}ctx.drawImage(LAY,0,0);ctx.setTransform(...camM())}

// ---------- the character (needs "character": true in project.json)
const LOOK={hair:'tuft',hairTone:'dark',clothes:'tshirt',hat:'none',glasses:'none',neck:'none',extras:{},held:'none'};
const blinkAt=t=>((t*0.37)%3.1)<0.11;                       // an occasional blink
const breathAt=(t,ph=0)=>Math.sin(t*1.6+ph)*0.5;            // gentle idle breathing
// a yawn that starts at t0 and lasts dur: 0 closed .. 1 wide open
function yawnK(t,t0,dur=6.5){const u=(t-t0)/dur;if(u<=0||u>=1)return 0;return u<0.35?ss(u/0.35):u<0.72?1:1-ss((u-0.72)/0.28)}
/* guy(g, x, y, scale, options, extras)
   x,y: the bottom middle of the body. scale 1 = about 120 units tall (head included).
   options: any studio look (clothes, hat, ...) plus view ('front','q','side','back'), expr, pose, breath, blink, t.
   extras: {mirror:true} faces left, {rot, pivot:[x,y]} tips over, {jolt:0..1} a sudden twitch, {yawn:0..1}, {chimp:true}. */
function guy(g,x,y,s,o={},f={}){if(typeof BH==='undefined')throw new Error('guy() needs "character": true in project.json');g.save();
  if(f.mirror){g.translate(x,0);g.scale(-1,1);g.translate(-x,0)}
  if(f.rot){const px=f.pivot?f.pivot[0]:x,py=f.pivot?f.pivot[1]:y;g.translate(px,py);g.rotate(f.rot);g.translate(-px,-py)}
  const j=f.jolt||0;if(j){g.translate(x,y);g.scale(1-0.03*j,1+0.05*j);g.translate(-x,-y-2.2*j*s)}
  const k=f.yawn||0;if(k>0){g.translate(x,y);g.scale(1+0.03*k,1+0.05*k);g.translate(-x,-y)}
  const hy=y-92*s-(o.breath||0)*0.8*s;if(f.chimp)chimpEars(g,x,hy,s);
  BH.setYawn(k||1);BH.drawGuy(g,x,y,s,{...LOOK,view:'front',expr:'neutral',pose:'relaxed',boil:true,breath:0,blink:false,t:0,...o,...(k>0.08?{expr:'yawn'}:{}),...(f.chimp?{hair:'none',clothes:'chimp'}:{})});BH.setYawn(1);
  if(f.chimp)chimpFur(g,x,hy,s);g.restore()}
// lying flat on the back, head to the left
function lying(g,x,y,s,o={}){g.save();g.translate(x,y);g.rotate(-Math.PI/2);BH.drawGuy(g,0,34*s,s,{...LOOK,view:'side',pose:'tuck',boil:true,breath:0,t:0,...o});g.restore()}
// custom pose: hand targets are relative to the body's base, in body units (see docs/CHARACTER.md)
function pose(name,left,right){BH.POSES[name]={arms:[{sd:-1,t:left,b:1,h:'relax'},{sd:1,t:right,b:-1,h:'relax'}]};return name}
// chimps: the same character, with big ears and a cap of fur that leaves the face bare
if(typeof BH!=='undefined')BH.CLOTHES.chimp={label:'CHIMP',fill:'dark',sleeve:null};
function chimpEars(g0,x,hy,s){const g=BH.wobCtx(g0,1.1*s*0.85,s);for(const sd of [-1,1]){g.beginPath();g.arc(x+sd*26*s,hy+1*s,9.5*s,0,TAU);g.fillStyle=BH.TONE.dark;g.fill();g.lineWidth=2.4*s;g.strokeStyle=BH.INK;g.stroke();
  g.beginPath();g.arc(x+sd*26.5*s,hy+1*s,5*s,0,TAU);g.fillStyle=BH.TONE.light;g.fill();g.lineWidth=1.4*s;g.stroke()}}
function chimpFur(g0,x,hy,s){const g=BH.wobCtx(g0,1.1*s*0.85,s),P=(dx,dy)=>[x+dx*s,hy+dy*s];
  g.save();g.beginPath();g.ellipse(x,hy,27.5*s,26.5*s,0,0,TAU);g.clip();
  g.beginPath();g.moveTo(...P(-30,14));g.lineTo(...P(-30,-30));g.lineTo(...P(30,-30));g.lineTo(...P(30,14));g.lineTo(...P(22,14));
  g.bezierCurveTo(...P(24,2),...P(22,-9),...P(14,-10));g.bezierCurveTo(...P(8,-11),...P(4,-9),...P(0,-5));g.bezierCurveTo(...P(-4,-9),...P(-8,-11),...P(-14,-10));
  g.bezierCurveTo(...P(-22,-9),...P(-24,2),...P(-22,14));g.closePath();g.fillStyle=BH.TONE.dark;g.fill();g.lineWidth=2*s;g.strokeStyle=BH.INK;g.stroke();g.restore();
  g.beginPath();g.ellipse(x,hy,27*s,26*s,0,0,TAU);g.lineWidth=2.6*s;g.strokeStyle=BH.INK;g.stroke()}

// ---------- text drawn crisp after the dither
let OVTEXT=[],POPS=[];
// big numbers and headings: x is the centre (or the left edge with left:true). sc 1..3. dim:true for a softer grey.
function text(txt,x,y,sc=1,o={}){OVTEXT.push({txt,x:o.left?x+40:x,y,sc,dim:!!o.dim,left:!!o.left})}
// a word that pops out next to a world point ('HIC!' by default); age = seconds since it happened (shows for ~0.6s)
function pop(wx,wy,age,txt){if(age<0||age>0.75)return;const m=camM();POPS.push({x:wx*m[0]+m[4],y:wy*m[3]+m[5],a:age,txt})}

// ---------- drawing helpers
// a round inset bubble (a close-up), with an optional dotted pointer to (tx,ty)
function inset(x,y,r,a,draw,tx,ty){if(a<=0.01)return;ctx.save();ctx.globalAlpha=a;
  if(tx!=null){const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy);ctx.fillStyle=C_CREAM;for(let k=r+2;k<d-2;k+=3)ctx.fillRect(x+dx/d*k-0.5,y+dy/d*k-0.5,1,1)}
  ctx.beginPath();ctx.arc(x,y,r*(0.7+0.3*a),0,TAU);ctx.fillStyle=C_INK;ctx.fill();ctx.strokeStyle=C_CREAM;ctx.lineWidth=1.2;ctx.stroke();
  ctx.save();ctx.beginPath();ctx.arc(x,y,r-1,0,TAU);ctx.clip();draw(x,y,r);ctx.restore();ctx.restore()}
// a floor line with a dark band below it
function ground(y=186){ctx.fillStyle=cr(0.08);ctx.fillRect(-60,y,300,160);ctx.strokeStyle=cr(0.45);ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(-60,y);ctx.lineTo(240,y);ctx.stroke()}
// a point a fraction u (0..1) of the way along a polyline [[x,y],...]
function along(P,u){let L=0;const sg=[];for(let i=0;i<P.length-1;i++){const d=Math.hypot(P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]);sg.push(d);L+=d}let k=clamp(u,0,1)*L;for(let i=0;i<sg.length;i++){if(k<=sg[i]){const f=k/sg[i];return[lerp(P[i][0],P[i+1][0],f),lerp(P[i][1],P[i+1][1],f)]}k-=sg[i]}return P[P.length-1]}
// villains (bacteria, viruses) are the only red things: use C_RED for them and nothing else

// ---------- frame setup and finish: call begin(t) first and finish(t, SC, end) last in drawWorld
function begin(t){OVTEXT=[];POPS=[];CAM={z:1,x:90,y:160,sx:0,sy:0};ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=C_INK;ctx.fillRect(0,0,LW,LH);PX=0.5;if(typeof BH!=='undefined')BH.setSeed(Math.floor(t*6))}
// a soft vignette, a dip to black at every scene change, a fade in at the start and out at the end
function finish(t,SC,fadeOutAt){ctx.setTransform(1,0,0,1,0,0);
  const g=ctx.createRadialGradient(LW/2,LH*0.36,LH*0.2,LW/2,LH*0.36,LH*0.7);g.addColorStop(0,'rgba(6,6,9,0)');g.addColorStop(1,'rgba(6,6,9,0.55)');ctx.fillStyle=g;ctx.fillRect(0,0,LW,LH);
  let dip=0;for(const k of Object.keys(SC)){const b=SC[k][0];if(b>0)dip=Math.max(dip,1-Math.abs(t-b)/0.3)}if(t<0.8)dip=Math.max(dip,1-t/0.8);if(t>fadeOutAt)dip=Math.max(dip,ss(seg(t,fadeOutAt,fadeOutAt+1.2)));
  if(dip>0){ctx.fillStyle=`rgba(6,6,9,${clamp(dip,0,1)})`;ctx.fillRect(0,0,LW,LH);if(dip>0.5){OVTEXT=[];POPS=[]}}}
function cam(t){return CAM}
