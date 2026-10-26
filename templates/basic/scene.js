/* ================= STARTER: the heartbeat. A short, complete example that uses the main tools. =================
   Copy this file's structure for your own video:
     SC       the scenes and when they run (scene time, seconds)
     physics  runs at a steady rate; push sound events here with EV.push([name, time])
     one function per scene, drawing in the 180 x 320 world
     drawWorld picks the scene, then finish() adds the vignette and the dips to black
   Coordinates: x 0..180 left to right, y 0..320 top to bottom. Keep important things between y 36 and 196:
   the captions sit below that, and TikTok's buttons cover the bottom and right edges. */
const SC={intro:[0,5.0],heart:[5.0,16.5]};

// the heart beats 75 times a minute: one beat every 0.8 s
const BEATS=[];for(let b=0.9;b<16;b+=0.8)BEATS.push(b);
const sinceBeat=t=>{let d=99;for(const b of BEATS)if(t>=b)d=Math.min(d,t-b);return d};
const squeeze=t=>{const d=sinceBeat(t);return d<0.35?Math.sin(d/0.35*Math.PI):0};

function physics(t,dt){_dt=dt;
  for(const b of BEATS)if(at(t,b))EV.push(['beat',t]);   // each 'beat' plays the thump sound mapped in score.py
}

// a simple heart outline, centred on (x,y), size r
function heartPath(g,x,y,r){g.beginPath();g.moveTo(x,y+r*0.95);g.bezierCurveTo(x-r*1.3,y+r*0.15,x-r*1.0,y-r*0.95,x,y-r*0.4);g.bezierCurveTo(x+r*1.0,y-r*0.95,x+r*1.3,y+r*0.15,x,y+r*0.95);g.closePath()}

/* ---------- scene 1: the character, with a window into his chest */
function intro(t){ground(186);
  const k=squeeze(t),X=90,Y=186,s=0.85;
  charLayer(g=>{guy(g,X,Y,s,{expr:'content',breath:breathAt(t),blink:blinkAt(t),t});
    // x-ray window: clip to his body, fill with ink, draw the heart inside
    const P=BH.bodyPts(X,Y,s,'front');g.save();g.beginPath();P.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.clip();
    const a=ss(seg(t,1.0,1.8));g.globalAlpha=a;g.fillStyle=C_INK;g.fillRect(X-40,Y-70,80,70);
    heartPath(g,X+4,Y-34,(10+3*k));g.fillStyle=cr(0.6+0.35*k);g.fill();g.strokeStyle=C_CREAM;g.lineWidth=1.2;g.stroke();g.restore()});
  // a counter as big crisp text, and a pop on every beat
  const n=BEATS.filter(b=>b<=t).length;text('BEATS',90,40,1,{dim:true});text(String(n),90,52,2);
  pop(X+22,Y-48,sinceBeat(t),'THUMP')}

/* ---------- scene 2: the heart up close; the sinoatrial node fires and the signal spreads */
const HX=90,HY=118,HR=52;
const NODE=[HX-26,HY-24];   // in the right atrium, which is on the viewer's left in a front view
function heart(t){
  const k=squeeze(t);
  ctx.save();ctx.translate(HX,HY);ctx.scale(1-0.06*k,1-0.08*k);ctx.translate(-HX,-HY);
  heartPath(ctx,HX,HY,HR);ctx.fillStyle=cr(0.22);ctx.fill();ctx.strokeStyle=C_CREAM;ctx.lineWidth=1.4;ctx.stroke();
  // the signal: a ring growing out of the node, clipped to the heart
  ctx.save();heartPath(ctx,HX,HY,HR);ctx.clip();const d=sinceBeat(t);
  if(d<0.6){const r=d/0.6*120;ctx.strokeStyle=cr(1);ctx.lineWidth=3;ctx.globalAlpha=1-d/0.6;ctx.beginPath();ctx.arc(NODE[0],NODE[1],r,0,TAU);ctx.stroke();ctx.globalAlpha=1}
  ctx.restore();
  // the node itself, flashing as it fires
  ctx.beginPath();ctx.arc(NODE[0],NODE[1],3.4,0,TAU);ctx.fillStyle=d<0.12?cr(1):cr(0.6);ctx.fill();ctx.strokeStyle=C_INK;ctx.lineWidth=0.8;ctx.stroke();
  ctx.restore();
  // a close-up bubble of the node's cells, from 7 s
  inset(150,60,18,win_(t,7.0,7.6,10,10.4),(cx,cy)=>{for(let i=0;i<6;i++){const a=i*1.05;ctx.beginPath();ctx.ellipse(cx+Math.cos(a)*7,cy+Math.sin(a)*6,4,2.4,a,0,TAU);ctx.fillStyle=d<0.15?cr(1):cr(0.55);ctx.fill();ctx.strokeStyle=C_INK;ctx.lineWidth=0.6;ctx.stroke()}},NODE[0],NODE[1])}

function drawWorld(t){begin(t);
  if(inSc(SC,'intro',t))intro(t);else heart(t);
  finish(t,SC,15.6)}
