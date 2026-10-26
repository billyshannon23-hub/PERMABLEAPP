/* ================= OTZI: the 5,300-year-old man found in the ice. Starring the series character. ================= */
const win_=(t,a,b,c,d)=>ss(seg(t,a,b))*(1-ss(seg(t,c,d)));
const SC={find:[0,8.6],years:[8.6,11.4],ice:[11.4,16.4],tat:[16.4,26.8],gut:[26.8,41.8],xray:[41.8,50.8],hand:[50.8,55.0],museum:[55.0,61]};
const inSc=(k,t)=>t>=SC[k][0]&&t<SC[k][1];

/* ---------- character layer with a cream rim (shared with the other videos) ---------- */
const LAY=document.createElement('canvas');LAY.width=cv.width;LAY.height=cv.height;const lg=LAY.getContext('2d');
const TIN=document.createElement('canvas');TIN.width=cv.width;TIN.height=cv.height;const tg=TIN.getContext('2d');
let CAM={z:1,x:90,y:160,sx:0,sy:0};
function camM(){const C=CAM;return[C.z,0,0,C.z,LW/2+C.sx-C.x*C.z,LH/2+C.sy-C.y*C.z]}
function charLayer(draw,rim=3){lg.setTransform(1,0,0,1,0,0);lg.clearRect(0,0,LAY.width,LAY.height);const m=camM();lg.setTransform(m[0]*SS,0,0,m[3]*SS,m[4]*SS,m[5]*SS);draw(lg);lg.setTransform(1,0,0,1,0,0);
  tg.setTransform(1,0,0,1,0,0);tg.clearRect(0,0,TIN.width,TIN.height);tg.globalCompositeOperation='source-over';tg.drawImage(LAY,0,0);tg.globalCompositeOperation='source-in';tg.fillStyle=C_CREAM;tg.fillRect(0,0,TIN.width,TIN.height);tg.globalCompositeOperation='source-over';
  ctx.resetTransform();for(let k=0;k<12;k++){const a=k/12*TAU;ctx.drawImage(TIN,Math.round(Math.cos(a)*rim),Math.round(Math.sin(a)*rim))}ctx.drawImage(LAY,0,0);ctx.setTransform(...camM())}
const BASE={hair:'tuft',hairTone:'dark',clothes:'tshirt',hat:'none',glasses:'none',neck:'none',extras:{},held:'none'};
const OTZI={hair:'none',hairTone:'dark',clothes:'fur',hat:'furhat',glasses:'none',neck:'none',extras:{beard:true},held:'axe'};
const MUMMY={hair:'none',hairTone:'dark',clothes:'none',hat:'none',glasses:'none',neck:'none',extras:{beard:true},held:'none'};
const DET={hair:'tuft',hairTone:'dark',clothes:'trench',hat:'fedora',glasses:'none',neck:'none',extras:{},held:'magnifier'};
function guy(g,x,y,s,o,f={}){g.save();
  if(f.mirror){g.translate(x,0);g.scale(-1,1);g.translate(-x,0)}
  if(f.rot){const px=f.pivot?f.pivot[0]:x,py=f.pivot?f.pivot[1]:y;g.translate(px,py);g.rotate(f.rot);g.translate(-px,-py)}
  BH.drawGuy(g,x,y,s,{...BASE,view:'front',expr:'neutral',pose:'relaxed',boil:true,breath:0,blink:false,t:0,...o});g.restore()}
// lying flat on his back, head to the left: a side view tipped over
function lying(g,x,y,s,o){g.save();g.translate(x,y);g.rotate(-Math.PI/2);BH.drawGuy(g,0,34*s,s,{...BASE,view:'side',pose:'tuck',boil:true,breath:0,t:0,...o});g.restore()}
const blinkAt=t=>((t*0.37)%3.1)<0.11;
let OVTEXT=[];
function inset(x,y,r,tx,ty,a,draw){if(a<=0.01)return;ctx.save();ctx.globalAlpha=a;
  if(tx!=null){const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy);ctx.fillStyle=C_CREAM;for(let k=r+2;k<d-2;k+=3){ctx.fillRect(x+dx/d*k-0.5,y+dy/d*k-0.5,1,1)}}
  ctx.beginPath();ctx.arc(x,y,r*(0.7+0.3*a),0,TAU);ctx.fillStyle=C_INK;ctx.fill();ctx.strokeStyle=C_CREAM;ctx.lineWidth=1.2;ctx.stroke();
  ctx.save();ctx.beginPath();ctx.arc(x,y,r-1,0,TAU);ctx.clip();draw(x,y,r);ctx.restore();ctx.restore()}
function ground(y){ctx.fillStyle=cr(0.08);ctx.fillRect(-40,y,260,140);ctx.strokeStyle=cr(0.45);ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(-40,y);ctx.lineTo(220,y);ctx.stroke()}

/* ---------- the mountains ---------- */
const PEAKS=[[-20,150],[10,96],[34,120],[62,70],[92,112],[118,84],[150,118],[176,92],[204,150]];
const FLAKES=[];for(let i=0;i<70;i++)FLAKES.push({x:rnd(0,180),y:rnd(0,200),v:rnd(5,12),ph:rnd(0,6)});
function mountains(t,a){ctx.save();ctx.globalAlpha=a;
  ctx.fillStyle=cr(0.18);ctx.beginPath();ctx.moveTo(-20,200);PEAKS.forEach(([x,y])=>ctx.lineTo(x,y));ctx.lineTo(204,200);ctx.closePath();ctx.fill();ctx.strokeStyle=cr(0.6);ctx.lineWidth=0.9;ctx.stroke();
  // snow caps
  ctx.fillStyle=cr(0.85);for(let i=1;i<PEAKS.length-1;i++){const [x,y]=PEAKS[i],[xl,yl]=PEAKS[i-1],[xr,yr]=PEAKS[i+1];if(y>110)continue;const k=0.32;
    ctx.beginPath();ctx.moveTo(lerp(x,xl,k),lerp(y,yl,k));ctx.lineTo(x,y);ctx.lineTo(lerp(x,xr,k),lerp(y,yr,k));ctx.lineTo(lerp(x,xr,k*0.6),lerp(y,yr,k*0.6)+3);ctx.lineTo(x,y+7);ctx.lineTo(lerp(x,xl,k*0.6),lerp(y,yl,k*0.6)+3);ctx.closePath();ctx.fill()}
  // the glacier in front
  ctx.fillStyle=cr(0.22);ctx.beginPath();ctx.moveTo(-20,150);ctx.quadraticCurveTo(60,138,110,146);ctx.quadraticCurveTo(160,152,204,142);ctx.lineTo(204,330);ctx.lineTo(-20,330);ctx.closePath();ctx.fill();
  ctx.strokeStyle=cr(1);ctx.lineWidth=1;ctx.stroke();ctx.strokeStyle=cr(0.4);ctx.lineWidth=0.7;for(let i=0;i<9;i++){const x=10+i*19,y=160+(i*7)%22;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+8,y+2);ctx.stroke()}
  ctx.restore()}
function snow(t,a,dens=1){ctx.fillStyle=cr(0.9);for(const f of FLAKES){if(f.ph>dens*6)continue;const y=(f.y+t*f.v)%210,x=f.x+Math.sin(t+f.ph)*3;ctx.globalAlpha=a*0.8;ctx.fillRect(x,y,0.8,0.8)}ctx.globalAlpha=1}
// a block of ice over part of a body
function ice(g,x,y,w,h,a,t){g.save();g.globalAlpha=a;g.fillStyle='rgba(225,225,225,0.5)';g.beginPath();g.moveTo(x,y+3);g.lineTo(x+4,y-2);g.lineTo(x+w-6,y);g.lineTo(x+w,y+5);g.lineTo(x+w-2,y+h);g.lineTo(x+2,y+h-1);g.closePath();g.fill();
  g.strokeStyle=C_CREAM;g.lineWidth=1.1;g.stroke();g.strokeStyle='rgba(255,255,255,0.8)';g.lineWidth=0.7;
  for(let i=0;i<5;i++){const cx=x+8+i*w/5.5,cy=y+4+(i*7)%(h-8);g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+5,cy+3);g.lineTo(cx+3,cy+7);g.stroke()}
  g.fillStyle='rgba(255,255,255,0.9)';g.fillRect(x+5,y+3,w*0.3,1.2);g.restore()}

/* ---------- each scene ---------- */
const HIKERS=[{x0:205,x1:128,o:{clothes:'sweater',hat:'beanie',hairTone:'mid'},d:0},{x0:230,x1:152,o:{clothes:'hoodie',hat:'cap',hairTone:'dark'},d:0.5}];
function find(t){mountains(t,1);snow(t,0.8,0.6);
  // the body: head and shoulders sticking out of the melting ice
  const bx=66,by=170,s=0.62;
  charLayer(g=>{lying(g,bx,by,s,{...MUMMY,expr:'asleep'});ice(g,bx-14,by-26,64,40,1,t);
    for(const h of HIKERS){const k=ss(seg(t,0.4+h.d,3.2+h.d)),x=lerp(h.x0,h.x1,k),walk=k>0&&k<1,bob=walk?Math.abs(Math.sin(t*9+h.d*3))*1.6:0;
      const ex=t<3.4+h.d?'content':t<5.2?'surprised':'worried';
      guy(g,x,180-bob,0.56,{...h.o,view:'q',expr:ex,pose:t>3.6+h.d&&t<5.2?'shrug':'relaxed',breath:Math.sin(t*1.6+h.d)*0.5,blink:blinkAt(t+h.d),t},{mirror:true})}});
}
function years(t){ground(186);snow(t,0.5,0.4);
  const k=ss(seg(t,8.9,10.9)),y=Math.round(lerp(1991,-3300,k));OVTEXT.push({txt:y>0?String(y):String(-y)+' BC',x:90,y:36,sc:3});
  if(t>10.4)OVTEXT.push({txt:'5,300 YEARS AGO',x:90,y:62,sc:1,dim:1});
  const a=ss(seg(t,9.0,10.6));
  charLayer(g=>{g.globalAlpha=a;guy(g,90,186,0.8,{...OTZI,view:'front',expr:'neutral',breath:Math.sin(t*1.6)*0.5,blink:blinkAt(t),t});g.globalAlpha=1})}
const DRY=[];for(let i=0;i<40;i++)DRY.push({x:rnd(40,140),ph:rnd(0,1),v:rnd(10,20)});
function iceSc(t){ground(186);snow(t,0.6,0.8);
  const bx=90,by=158,s=0.78;
  charLayer(g=>{lying(g,bx,by,s,{...MUMMY,expr:'asleep'});ice(g,bx-74,by-32,120,64,ss(seg(t,11.6,12.6)),t)});
  // water leaving the body as it freeze-dries
  const dr=win_(t,13.6,14.2,16.2,16.4);if(dr>0){ctx.fillStyle=C_CREAM;for(const d of DRY){const u=(d.ph+t*0.35)%1,y=lerp(150,60,u);ctx.globalAlpha=dr*(1-u);ctx.fillRect(d.x+Math.sin(u*9+d.ph*6)*2,y,1,1.6)}ctx.globalAlpha=1}}
// tattoo marks: groups of short lines, and crosses, in his own coordinates (front view)
const TAT_F=[[-24,-8,'l3'],[22,-10,'l4'],[-14,-4,'x'],[12,-3,'x'],[-26,-20,'l2'],[26,-22,'l2']];
function tatMarks(g,x,y,s,list,a){g.save();g.globalAlpha=a;g.strokeStyle=C_INK;g.lineWidth=1.8;g.lineCap='round';
  for(const [dx,dy,k] of list){const px=x+dx*s,py=y+dy*s;if(k==='x'){g.beginPath();g.moveTo(px-3.2,py-3.2);g.lineTo(px+3.2,py+3.2);g.moveTo(px+3.2,py-3.2);g.lineTo(px-3.2,py+3.2);g.stroke()}
    else{const n=+k[1];for(let i=0;i<n;i++){g.beginPath();g.moveTo(px-4.2,py-3.6+i*2.9);g.lineTo(px+4.2,py-3.6+i*2.9);g.stroke()}}}g.restore()}
function tat(t){ground(176);
  const backT=ss(seg(t,21.6,22.4)),view=backT>0.5?'back':'front',X=62,Y=176,s=0.85;
  // pain: little jolts around the worn joints
  charLayer(g=>{guy(g,X,Y,s,{...MUMMY,extras:{beard:true},view,expr:'neutral',breath:Math.sin(t*1.6)*0.5,blink:blinkAt(t),t});
    const ta=ss(seg(t,17.4,19.4));
    if(view==='front'){tatMarks(g,X,Y,s,TAT_F,ta);tatMarks(g,X-35*s,Y-11*s,s,[[0,0,'l3']],ta);tatMarks(g,X+35*s,Y-11*s,s,[[0,0,'l3']],ta)}
    else{tatMarks(g,X,Y,s,[[-6,-22,'l4'],[6,-22,'l4'],[-6,-14,'l3'],[6,-14,'l3'],[0,-30,'l2'],[-24,-8,'l3'],[22,-8,'l3']],1)}
    guy(g,146,176,0.72,{...DET,view:'q',expr:'thinking',pose:'_look',breath:Math.sin(t*1.6+1)*0.5,blink:blinkAt(t+2),t},{mirror:true})});
  const pa=win_(t,23.0,23.6,26.4,26.8);if(pa>0){ctx.strokeStyle=C_CREAM;ctx.lineWidth=1;ctx.globalAlpha=pa;
    for(const [px,py] of [[X-24*s,Y-14*s],[X+22*s,Y-14*s],[X,Y-26*s]]){const f=Math.sin(t*14+px)>0?1:0.6;for(const a of [0.4,1.6,2.8,4.0,5.2]){ctx.beginPath();ctx.moveTo(px+Math.cos(a)*7,py+Math.sin(a)*7);ctx.lineTo(px+Math.cos(a)*(9+2*f),py+Math.sin(a)*(9+2*f));ctx.stroke()}}ctx.globalAlpha=1}
  if(t>18&&t<21.4)OVTEXT.push({txt:'61 TATTOOS',x:90,y:36,sc:2})}
BH.POSES._look={arms:[{sd:-1,t:[-35,-16],b:1,h:'relax'},{sd:1,t:[36,-70],b:1,h:'fist'}]};

/* ---------- the gut: an x-ray window into his belly ---------- */
const XR={x:90,y:184,s:1.22};
const FOOD=[];{const kinds=['meat','meat','meat','grain','grain','grain','grain','fern'];for(let i=0;i<14;i++)FOOD.push({k:kinds[i%kinds.length],u:rnd(-0.8,0.8),v:rnd(-0.6,0.7),rot:rnd(0,6),t0:32.2+i*0.18})}
const BUGS=[];for(let i=0;i<9;i++)BUGS.push({u:rnd(-0.8,0.8),v:rnd(-0.5,0.7),ph:rnd(0,6),sp:rnd(0.6,1.3),t0:37.4+i*0.25});
function stomachPos(t){const {x,y,s}=XR,up=ss(seg(t,28.0,30.4));return[x+8*s,lerp(y-24*s,y-44*s,up)]}
function gut(t){const {x,y,s}=XR;const xa=ss(seg(t,27.2,28.2));
  charLayer(g=>{guy(g,x,y,s,{...MUMMY,view:'front',pose:'tuck',expr:'asleep',breath:0,t});
    if(xa>0){const P=BH.bodyPts(x,y,s,'front');g.save();g.beginPath();P.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.clip();g.globalAlpha=xa;
      g.fillStyle=C_INK;g.fillRect(x-60,y-90*s,120,100*s);
      // ribs and spine, faint
      g.strokeStyle=cr(0.3);g.lineWidth=0.9;for(let k=0;k<6;k++){const ry=y-58*s+k*6;for(const sd of [-1,1]){g.beginPath();g.moveTo(x+sd*3,ry);g.quadraticCurveTo(x+sd*20*s,ry-4,x+sd*34*s,ry+6);g.stroke()}}
      g.fillStyle=cr(0.25);for(let k=0;k<9;k++)g.fillRect(x-2,y-62*s+k*5.2,4,3.6);
      // where the stomach normally sits (dashed), and where it ended up
      const [sx,sy]=stomachPos(t),moved=ss(seg(t,28.0,30.4));
      if(moved>0.05){g.setLineDash([2,2]);g.strokeStyle=cr(0.5);g.lineWidth=0.9;stomachPath(g,x+8*s,y-24*s,s);g.stroke();g.setLineDash([])}
      stomachPath(g,sx,sy,s);g.fillStyle=cr(0.3);g.fill();g.strokeStyle=cr(1);g.lineWidth=1.3;g.stroke();
      // the last meal
      g.save();stomachPath(g,sx,sy,s);g.clip();
      for(const f of FOOD){const a=seg(t,f.t0,f.t0+0.3);if(a<=0)continue;const fx=sx+f.u*12*s,fy=sy+f.v*9*s+Math.sin(t*1.3+f.rot)*0.6;g.save();g.translate(fx,fy);g.rotate(f.rot+t*0.1);g.scale(a,a);
        if(f.k==='meat'){g.fillStyle=cr(0.7);g.beginPath();g.moveTo(-4,-2);g.lineTo(2,-3.4);g.lineTo(4.4,0.6);g.lineTo(0,3.2);g.lineTo(-3.6,1.8);g.closePath();g.fill();g.strokeStyle=C_INK;g.lineWidth=0.6;g.stroke();g.beginPath();g.moveTo(-2,-1);g.lineTo(2,1);g.stroke()}
        else if(f.k==='grain'){g.fillStyle=cr(0.95);g.beginPath();g.ellipse(0,0,2.2,1.2,0,0,TAU);g.fill();g.strokeStyle=C_INK;g.lineWidth=0.5;g.beginPath();g.moveTo(-1.6,0);g.lineTo(1.6,0);g.stroke()}
        else{g.strokeStyle=cr(0.95);g.lineWidth=0.8;g.beginPath();g.moveTo(-5,0);g.lineTo(5,0);g.stroke();for(let i=-4;i<=4;i+=2){g.beginPath();g.moveTo(i,0);g.lineTo(i+1.5,-2.4);g.moveTo(i,0);g.lineTo(i+1.5,2.4);g.stroke()}}
        g.restore()}
      g.restore();g.restore()}
  });
  // H. pylori: small red corkscrew rods with whip tails, burrowing into the stomach wall
  const [sx,sy]=stomachPos(t);
  for(const b of BUGS){const a=seg(t,b.t0,b.t0+0.4);if(a<=0||t>41.6)continue;const bx=sx+b.u*13*s+Math.sin(t*b.sp*2+b.ph)*2,by=sy+b.v*9*s+Math.cos(t*b.sp*1.7+b.ph)*1.5,ang=t*b.sp+b.ph;
    ctx.save();ctx.translate(bx,by);ctx.rotate(ang);ctx.scale(a,a);ctx.strokeStyle=C_RED;ctx.lineWidth=1.8;ctx.lineCap='round';ctx.beginPath();for(let i=0;i<=8;i++){const u=i/8;ctx.lineTo(-3+u*6,Math.sin(u*9+t*12)*0.9)}ctx.stroke();
    ctx.lineWidth=0.6;for(const sd of [-1,1]){ctx.beginPath();ctx.moveTo(-3,0);ctx.quadraticCurveTo(-6,sd*2+Math.sin(t*20+b.ph)*1.2,-8,sd*1);ctx.stroke()}ctx.restore()}}
function stomachPath(g,x,y,s){g.beginPath();g.moveTo(x-12*s,y-8*s);g.bezierCurveTo(x-4*s,y-12*s,x+10*s,y-11*s,x+14*s,y-3*s);g.bezierCurveTo(x+17*s,y+6*s,x+6*s,y+12*s,x-4*s,y+9*s);
  g.bezierCurveTo(x-9*s,y+8*s,x-11*s,y+5*s,x-8*s,y+2*s);g.bezierCurveTo(x-5*s,y-1*s,x-9*s,y-3*s,x-12*s,y-8*s);g.closePath()}

/* ---------- the x-ray that found the arrowhead ---------- */
function xray(t){const {x,y,s}=XR;OVTEXT.push({txt:'2001',x:150,y:44,sc:2});
  const scanY=lerp(40,200,ss(seg(t,42.2,44.6)));
  charLayer(g=>{guy(g,x,y,s,{...MUMMY,view:'back',pose:'tuck',breath:0,t});
    const P=BH.bodyPts(x,y,s,'back');g.save();g.beginPath();P.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.ellipse(x,y-92*s,27*s,26*s,0,0,TAU);g.clip();
    g.beginPath();g.rect(x-80,0,160,scanY);g.clip();
    g.fillStyle=C_INK;g.fillRect(x-80,0,160,260);
    // skull from behind, spine, ribs, shoulder blades
    g.strokeStyle=cr(0.75);g.lineWidth=1.1;g.beginPath();g.ellipse(x,y-94*s,20*s,21*s,0,0,TAU);g.stroke();
    g.fillStyle=cr(0.8);for(let k=0;k<14;k++){const yy=y-68*s+k*4.6*s;g.fillRect(x-2.6,yy,5.2,3.2*s)}
    g.strokeStyle=cr(0.55);g.lineWidth=1;for(let k=0;k<7;k++){const ry=y-58*s+k*5.6*s;for(const sd of [-1,1]){g.beginPath();g.moveTo(x+sd*3,ry);g.quadraticCurveTo(x+sd*22*s,ry-5,x+sd*33*s,ry+7);g.stroke()}}
    for(const sd of [-1,1]){g.beginPath();g.moveTo(x+sd*7*s,y-58*s);g.lineTo(x+sd*25*s,y-56*s);g.lineTo(x+sd*14*s,y-38*s);g.closePath();g.fillStyle=cr(0.3);g.fill();g.strokeStyle=cr(0.85);g.stroke()}
    // the artery under the collarbone, out toward the left arm (his left is our left, seen from behind)
    const cut=ss(seg(t,46.6,47.4));g.strokeStyle=cr(0.95);g.lineWidth=1.6;g.beginPath();g.moveTo(x-1*s,y-60*s);g.quadraticCurveTo(x-10*s,y-64*s,x-17*s,y-57*s);g.stroke();
    g.beginPath();g.moveTo(x-21*s,y-55*s);g.quadraticCurveTo(x-27*s,y-52*s,x-33*s,y-46*s);g.stroke();
    if(cut>0){g.fillStyle=cr(0.9);for(let i=0;i<14;i++){const u=((t*0.6+i/14)%1),px=x-19*s+Math.sin(i*2.3)*u*7,py=y-56*s+u*16;g.globalAlpha=cut*(1-u);g.fillRect(px,py,1.2,1.2)}g.globalAlpha=1}
    g.restore()});
  // the flint arrowhead, revealed by the scan (red: the one villain here)
  if(scanY>y-62*s){const ax=x-19*s,ay=y-56*s;ctx.save();ctx.translate(ax,ay);ctx.rotate(-0.5);ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(4,-3.4);ctx.lineTo(6,0);ctx.lineTo(4,3.4);ctx.closePath();ctx.fillStyle=C_RED;ctx.fill();ctx.strokeStyle=C_INK;ctx.lineWidth=0.7;ctx.stroke();ctx.restore()}
  // the scan line
  if(t<44.8){ctx.fillStyle=C_CREAM;ctx.fillRect(18,scanY,144,1);ctx.globalAlpha=0.3;ctx.fillRect(18,scanY-3,144,3);ctx.globalAlpha=1}}
function hand(t){ground(186);const X=90,Y=186,s=0.95;
  charLayer(g=>guy(g,X,Y,s,{...OTZI,held:'none',view:'front',expr:'worried',pose:'_hand',breath:Math.sin(t*1.6)*0.5,blink:blinkAt(t),t}));
  inset(146,72,22,X+30*s,Y-60*s,win_(t,51.4,52.0,54.6,55),(cx,cy)=>{ctx.beginPath();ctx.arc(cx,cy+2,13,0,TAU);ctx.fillStyle=C_CREAM;ctx.fill();ctx.strokeStyle=C_INK;ctx.lineWidth=1.2;ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx-7,cy-3);ctx.lineTo(cx-2,cy+1);ctx.lineTo(cx+1,cy-1);ctx.lineTo(cx+7,cy+5);ctx.strokeStyle=C_INK;ctx.lineWidth=1.8;ctx.stroke()})}
BH.POSES._hand={arms:[{sd:-1,t:[-35,-16],b:1,h:'relax'},{sd:1,t:[30,-62],b:1,h:'fist'}]};
function museum(t){ground(186);
  // a cold cell: a small room, frost inside, and a little window to look through
  const rx=24,ry=70,rw=132,rh=100;ctx.fillStyle=cr(0.12);ctx.fillRect(rx,ry,rw,rh);ctx.strokeStyle=cr(0.7);ctx.lineWidth=1.2;ctx.strokeRect(rx,ry,rw,rh);
  charLayer(g=>{g.save();g.beginPath();g.rect(rx+1,ry+1,rw-2,rh-2);g.clip();g.fillStyle=cr(0.45);g.fillRect(rx+18,ry+72,96,8);lying(g,96,ry+70,0.6,{...MUMMY,expr:'asleep'});g.restore()});
  ctx.save();ctx.beginPath();ctx.rect(rx,ry,rw,rh);ctx.clip();snow(t,0.9,1);ctx.restore();
  // frost in the corners
  ctx.strokeStyle=cr(0.9);ctx.lineWidth=0.7;for(const [cx,cy,sx,sy] of [[rx,ry,1,1],[rx+rw,ry,-1,1],[rx,ry+rh,1,-1],[rx+rw,ry+rh,-1,-1]])for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+sx*(6+i*3),cy+sy*(12-i*2));ctx.stroke()}
  // a visitor at the window
  charLayer(g=>guy(g,150,186,0.62,{...DET,held:'none',view:'q',expr:'content',breath:Math.sin(t*1.6)*0.5,blink:blinkAt(t),t},{mirror:true}))}
function cam(t){return CAM}
function physics(t,dt){
  if(t-dt<3.4&&t>=3.4)EV.push(['gasp',t]);if(t-dt<4.0&&t>=4.0)EV.push(['gasp',t]);
  if(Math.floor((t-dt)*12)<Math.floor(t*12)&&t>8.9&&t<10.9)EV.push(['tick',t]);
  for(const f of FOOD)if(t-dt<f.t0&&t>=f.t0)EV.push(['pop',t]);
  for(const b of BUGS)if(t-dt<b.t0&&t>=b.t0)EV.push(['wriggle',t]);
  if(t-dt<42.2&&t>=42.2)EV.push(['scan',t]);if(t-dt<43.2&&t>=43.2)EV.push(['hit',t]);if(t-dt<18&&t>=18)EV.push(['ink',t]);
  if(t-dt<12&&t>=12)EV.push(['freeze',t]);if(t-dt<55.3&&t>=55.3)EV.push(['freeze',t]);
}
function drawWorld(t){
  OVTEXT=[];CAM={z:1,x:90,y:160,sx:0,sy:0};ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=C_INK;ctx.fillRect(0,0,LW,LH);PX=0.5;BH.setSeed(Math.floor(t*6));
  if(inSc('find',t))find(t);else if(inSc('years',t))years(t);else if(inSc('ice',t))iceSc(t);else if(inSc('tat',t))tat(t);else if(inSc('gut',t))gut(t);else if(inSc('xray',t))xray(t);else if(inSc('hand',t))hand(t);else museum(t);
  ctx.setTransform(1,0,0,1,0,0);
  const g=ctx.createRadialGradient(LW/2,LH*0.36,LH*0.2,LW/2,LH*0.36,LH*0.7);g.addColorStop(0,'rgba(6,6,9,0)');g.addColorStop(1,'rgba(6,6,9,0.55)');ctx.fillStyle=g;ctx.fillRect(0,0,LW,LH);
  let dip=0;for(const k of Object.keys(SC)){const b=SC[k][0];if(b>0)dip=Math.max(dip,1-Math.abs(t-b)/0.3)}if(t<0.8)dip=Math.max(dip,1-t/0.8);if(t>59.6)dip=Math.max(dip,ss(seg(t,59.6,60.8)));
  if(dip>0){ctx.fillStyle=`rgba(6,6,9,${clamp(dip,0,1)})`;ctx.fillRect(0,0,LW,LH);if(dip>0.5)OVTEXT=[]}
}
let POPS=[];
