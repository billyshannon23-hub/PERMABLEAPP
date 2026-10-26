/* ================= YAWNING: what a yawn is, the ideas about why, and why it spreads ================= */
const win_=(t,a,b,c,d)=>ss(seg(t,a,b))*(1-ss(seg(t,c,d)));
const SC={yawn:[0,10.6],animals:[10.6,16.2],oxy:[16.2,24.2],cool:[24.2,32.6],size:[32.6,40.6],spread:[40.6,46.4],family:[46.4,51.6],chimp:[51.6,58]};
const inSc=(k,t)=>t>=SC[k][0]&&t<SC[k][1];
const LAY=document.createElement('canvas');LAY.width=cv.width;LAY.height=cv.height;const lg=LAY.getContext('2d');
const TIN=document.createElement('canvas');TIN.width=cv.width;TIN.height=cv.height;const tg=TIN.getContext('2d');
let CAM={z:1,x:90,y:160,sx:0,sy:0};
function camM(){const C=CAM;return[C.z,0,0,C.z,LW/2+C.sx-C.x*C.z,LH/2+C.sy-C.y*C.z]}
function charLayer(draw,rim=3){lg.setTransform(1,0,0,1,0,0);lg.clearRect(0,0,LAY.width,LAY.height);const m=camM();lg.setTransform(m[0]*SS,0,0,m[3]*SS,m[4]*SS,m[5]*SS);draw(lg);lg.setTransform(1,0,0,1,0,0);
  tg.setTransform(1,0,0,1,0,0);tg.clearRect(0,0,TIN.width,TIN.height);tg.globalCompositeOperation='source-over';tg.drawImage(LAY,0,0);tg.globalCompositeOperation='source-in';tg.fillStyle=C_CREAM;tg.fillRect(0,0,TIN.width,TIN.height);tg.globalCompositeOperation='source-over';
  ctx.resetTransform();for(let k=0;k<12;k++){const a=k/12*TAU;ctx.drawImage(TIN,Math.round(Math.cos(a)*rim),Math.round(Math.sin(a)*rim))}ctx.drawImage(LAY,0,0);ctx.setTransform(...camM())}
const BASE={hair:'tuft',hairTone:'dark',clothes:'tshirt',hat:'none',glasses:'none',neck:'none',extras:{},held:'none'};
const blinkAt=t=>((t*0.37)%3.1)<0.11;
// a yawn that starts at t0 and lasts dur: the jaw opens wide, a long breath in, a short breath out
function yk(t,t0,dur=6.5){const u=(t-t0)/dur;if(u<=0||u>=1)return 0;return u<0.35?ss(u/0.35):u<0.72?1:1-ss((u-0.72)/0.28)}
function breathIn(t,t0,dur=6.5){const u=(t-t0)/dur;if(u<=0||u>=1)return 0;return u<0.72?ss(u/0.72):1-ss((u-0.72)/0.28)}
BH.POSES._stretch={arms:[{sd:-1,t:[-34,-108],b:-1,h:'open'},{sd:1,t:[34,-108],b:1,h:'open'}]};
// one character, yawning by amount k
function guy(g,x,y,s,o,k=0,f={}){g.save();if(f.mirror){g.translate(x,0);g.scale(-1,1);g.translate(-x,0)}
  if(k>0){g.translate(x,y);g.scale(1+0.03*k,1+0.05*k);g.translate(-x,-y)}
  BH.setYawn(k);const pose=o.pose||(k>0.5&&o.stretch?'_stretch':'relaxed');
  if(pose==='_stretch'){const r=ss((k-0.5)/0.5);BH.POSES._stretchK={arms:[{sd:-1,t:[lerp(-35,-34,r),lerp(-16,-108,r)],b:-1,h:'open'},{sd:1,t:[lerp(35,34,r),lerp(-16,-108,r)],b:1,h:'open'}]}}
  const hy=y-92*s-(o.breath||0)*0.8*s;if(f.chimp)chimpEars(g,x,hy,s);
  BH.drawGuy(g,x,y,s,{...BASE,view:'front',boil:true,breath:0,blink:false,t:0,...o,pose:pose==='_stretch'?'_stretchK':pose,expr:k>0.08?'yawn':(o.expr||'neutral')});
  if(f.chimp)chimpFur(g,x,hy,s);BH.setYawn(1);g.restore()}
// chimp parts, drawn the same way as the rest of the character: big round ears behind the head, and a cap of dark fur that leaves the face bare
BH.CLOTHES.chimp={label:'CHIMP',fill:'dark',sleeve:null};
function chimpEars(g0,x,hy,s){const g=BH.wobCtx(g0,1.1*s*0.85,s);for(const sd of [-1,1]){g.beginPath();g.arc(x+sd*26*s,hy+1*s,9.5*s,0,TAU);g.fillStyle=BH.TONE.dark;g.fill();g.lineWidth=2.4*s;g.strokeStyle=BH.INK;g.stroke();
  g.beginPath();g.arc(x+sd*26.5*s,hy+1*s,5*s,0,TAU);g.fillStyle=BH.TONE.light;g.fill();g.lineWidth=1.4*s;g.stroke()}}
function chimpFur(g0,x,hy,s){const g=BH.wobCtx(g0,1.1*s*0.85,s),P=(dx,dy)=>[x+dx*s,hy+dy*s];
  g.save();g.beginPath();g.ellipse(x,hy,27.5*s,26.5*s,0,0,TAU);g.clip();
  g.beginPath();g.moveTo(...P(-30,14));g.lineTo(...P(-30,-30));g.lineTo(...P(30,-30));g.lineTo(...P(30,14));g.lineTo(...P(22,14));
  g.bezierCurveTo(...P(24,2),...P(22,-9),...P(14,-10));g.bezierCurveTo(...P(8,-11),...P(4,-9),...P(0,-5));g.bezierCurveTo(...P(-4,-9),...P(-8,-11),...P(-14,-10));
  g.bezierCurveTo(...P(-22,-9),...P(-24,2),...P(-22,14));g.closePath();g.fillStyle=BH.TONE.dark;g.fill();g.lineWidth=2*s;g.strokeStyle=BH.INK;g.stroke();
  // a few lighter fur flicks on top
  g.strokeStyle=BH.TONE.light;g.lineWidth=1*s;for(const [a,b] of [[-12,-20],[-4,-23],[6,-22],[14,-18]]){g.beginPath();g.moveTo(...P(a,b));g.lineTo(...P(a+2,b+3));g.stroke()}
  g.restore();g.beginPath();g.ellipse(x,hy,27*s,26*s,0,0,TAU);g.lineWidth=2.6*s;g.strokeStyle=BH.INK;g.stroke()}
let OVTEXT=[];
function ground(y){ctx.fillStyle=cr(0.08);ctx.fillRect(-40,y,260,140);ctx.strokeStyle=cr(0.45);ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(-40,y);ctx.lineTo(220,y);ctx.stroke()}
function inset(x,y,r,a,draw,tx,ty){if(a<=0.01)return;ctx.save();ctx.globalAlpha=a;
  if(tx!=null){const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy);ctx.fillStyle=C_CREAM;for(let k=r+2;k<d-2;k+=3)ctx.fillRect(x+dx/d*k-0.5,y+dy/d*k-0.5,1,1)}
  ctx.beginPath();ctx.arc(x,y,r*(0.7+0.3*a),0,TAU);ctx.fillStyle=C_INK;ctx.fill();ctx.strokeStyle=C_CREAM;ctx.lineWidth=1.2;ctx.stroke();ctx.save();ctx.beginPath();ctx.arc(x,y,r-1,0,TAU);ctx.clip();draw(x,y,r);ctx.restore();ctx.restore()}
// a breath gauge: fills slowly on the way in, empties fast on the way out
function gauge(x,y,v,a){if(a<=0)return;ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=C_CREAM;ctx.lineWidth=1;ctx.strokeRect(x,y,10,60);ctx.fillStyle=C_CREAM;ctx.fillRect(x+2,y+58-56*v,6,56*v);
  for(let i=1;i<5;i++){ctx.fillStyle=C_INK;ctx.fillRect(x+2,y+i*12,6,0.8)}ctx.restore()}

/* ---------- scenes ---------- */
const Y1=3.0;
function yawnSc(t){ground(186);const k=yk(t,Y1),b=breathIn(t,Y1);
  charLayer(g=>guy(g,90,186,1.0,{expr:'neutral',stretch:true,pose:k>0.3?'_stretch':'relaxed',breath:Math.sin(t*1.6)*0.5*(1-k),blink:blinkAt(t),t},k));
  gauge(150,70,b,win_(t,5.4,6.0,10.0,10.5));
  // air: drawn in slowly, then out
  const u=(t-Y1)/6.5;if(u>0.3&&u<1){const inn=u<0.72;ctx.fillStyle=C_CREAM;for(let i=0;i<14;i++){const f=((t*(inn?0.5:1.4)+i/14)%1),r=inn?lerp(26,4,f):lerp(4,30,f),a=i*0.45;ctx.globalAlpha=Math.sin(f*Math.PI)*0.9;ctx.fillRect(90+Math.cos(a)*r*1.3,186-92+14+Math.sin(a)*r*0.6+(inn?0:-2),1.2,1.2)}ctx.globalAlpha=1}}
// animals with backbones, all yawning
function fish(x,y,k){ctx.save();ctx.translate(x,y);ctx.fillStyle=cr(0.8);ctx.strokeStyle=C_CREAM;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,0,14,8,0,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(22,-7);ctx.lineTo(22,7);ctx.closePath();ctx.fill();
  ctx.fillStyle=C_INK;ctx.beginPath();ctx.moveTo(-14,0);ctx.lineTo(-6,-1.5-4*k);ctx.lineTo(-6,1.5+4*k);ctx.closePath();ctx.fill();ctx.beginPath();ctx.arc(-6,-3-k,1.3,0,TAU);ctx.fill();ctx.restore()}
function bird(x,y,k){ctx.save();ctx.translate(x,y);ctx.fillStyle=cr(0.8);ctx.beginPath();ctx.ellipse(4,4,12,9,0.2,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(-6,-6,7,0,TAU);ctx.fill();
  ctx.fillStyle=cr(0.95);ctx.beginPath();ctx.moveTo(-12,-7);ctx.lineTo(-20,-8-4*k);ctx.lineTo(-12,-5);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(-12,-5);ctx.lineTo(-19,-3+3*k);ctx.lineTo(-12,-3.5);ctx.closePath();ctx.fill();
  ctx.fillStyle=C_INK;ctx.beginPath();ctx.arc(-7,-8,1.2,0,TAU);ctx.fill();ctx.strokeStyle=cr(0.8);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(2,12);ctx.lineTo(1,20);ctx.moveTo(7,12);ctx.lineTo(8,20);ctx.stroke();ctx.restore()}
function lizard(x,y,k){ctx.save();ctx.translate(x,y);ctx.fillStyle=cr(0.8);ctx.beginPath();ctx.ellipse(4,0,14,5,0,0,TAU);ctx.fill();ctx.strokeStyle=cr(0.8);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(16,0);ctx.quadraticCurveTo(26,2,30,-4);ctx.stroke();
  ctx.lineWidth=2;for(const lx of [-4,10]){ctx.beginPath();ctx.moveTo(lx,3);ctx.lineTo(lx-3,8);ctx.stroke()}
  ctx.fillStyle=cr(0.8);ctx.beginPath();ctx.moveTo(-8,-3);ctx.lineTo(-20,-3-6*k);ctx.lineTo(-18,-1-2*k);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(-8,2);ctx.lineTo(-20,1);ctx.lineTo(-10,4);ctx.closePath();ctx.fill();
  ctx.fillStyle=C_INK;ctx.beginPath();ctx.arc(-11,-3-2*k,1,0,TAU);ctx.fill();ctx.restore()}
function catHead(x,y,k){ctx.save();ctx.translate(x,y);ctx.fillStyle=cr(0.8);ctx.beginPath();ctx.arc(0,0,12,0,TAU);ctx.fill();for(const sd of [-1,1]){ctx.beginPath();ctx.moveTo(sd*4,-10);ctx.lineTo(sd*10,-20);ctx.lineTo(sd*12,-4);ctx.closePath();ctx.fill()}
  ctx.fillStyle=C_INK;for(const sd of [-1,1]){ctx.fillRect(sd*5-2,-3,4,0.9+(1-k)*1.2)}ctx.beginPath();ctx.ellipse(0,5+2*k,2+3*k,1+5*k,0,0,TAU);ctx.fill();if(k>0.5){ctx.fillStyle=cr(0.5);ctx.beginPath();ctx.ellipse(0,8+3*k,2*k,1.5*k,0,0,TAU);ctx.fill()}ctx.restore()}
function animals(t){ground(186);
  const L=[[fish,36,92,11.0],[bird,140,90,11.8],[lizard,40,150,12.6],[catHead,140,148,13.4]];
  for(const [f,x,y,t0] of L){const a=ss(seg(t,t0-0.4,t0));if(a<=0)continue;ctx.globalAlpha=a;f(x,y,yk(t,t0,2.6));ctx.globalAlpha=1}
  // a baby in the womb, yawning too
  inset(90,120,26,win_(t,13.6,14.2,16,16.4),(cx,cy)=>{ctx.fillStyle=cr(0.2);ctx.beginPath();ctx.arc(cx,cy,25,0,TAU);ctx.fill();const k=yk(t,14.4,1.8);
    ctx.fillStyle=cr(0.85);ctx.beginPath();ctx.ellipse(cx+3,cy+5,10,13,0.4,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(cx-6,cy-7,9,0,TAU);ctx.fill();
    ctx.fillStyle=C_INK;ctx.fillRect(cx-11,cy-9,3,0.9);ctx.beginPath();ctx.ellipse(cx-10,cy-2+k,1.4+1.4*k,0.8+2.4*k,0,0,TAU);ctx.fill();
    ctx.strokeStyle=cr(0.6);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(cx+9,cy+14);ctx.quadraticCurveTo(cx+18,cy+18,cx+20,cy+10);ctx.stroke()})}
// the oxygen test: air with extra carbon dioxide, and a tally of yawns that does not change
function oxy(t){ground(186);
  const k1=Math.max(yk(t,17.6,2.6),yk(t,21.6,2.6)),k2=Math.max(yk(t,17.8,2.6),yk(t,21.8,2.6));
  charLayer(g=>{guy(g,48,186,0.78,{expr:'neutral',breath:Math.sin(t*1.6)*0.5,blink:blinkAt(t),t},k1);guy(g,132,186,0.78,{expr:'neutral',hairTone:'mid',clothes:'sweater',breath:Math.sin(t*1.6+1)*0.5,blink:blinkAt(t+1),t},k2)});
  // gas tank beside the right one, and labels
  const ta=ss(seg(t,19.4,20.2));if(ta>0){ctx.globalAlpha=ta;ctx.fillStyle=cr(0.5);ctx.beginPath();ctx.roundRect?ctx.roundRect(160,130,12,50,4):ctx.rect(160,130,12,50);ctx.fill();ctx.strokeStyle=C_CREAM;ctx.lineWidth=1;ctx.stroke();
    ctx.beginPath();ctx.moveTo(166,130);ctx.quadraticCurveTo(166,112,146,112);ctx.stroke();ctx.globalAlpha=1;OVTEXT.push({txt:'CO2',x:166,y:150,sc:1,dim:0})}
  // yawn tallies over each head
  const n1=(t>17.6?1:0)+(t>21.6?1:0),n2=(t>17.8?1:0)+(t>21.8?1:0);
  if(t>19.4){OVTEXT.push({txt:'NORMAL AIR',x:48,y:52,sc:1,dim:1});OVTEXT.push({txt:'EXTRA CO2',x:132,y:52,sc:1,dim:1});OVTEXT.push({txt:'YAWNS '+n1,x:48,y:64,sc:1});OVTEXT.push({txt:'YAWNS '+n2,x:132,y:64,sc:1})}
  else if(t>16.6){// oxygen bubbles drifting into the mouth
    ctx.fillStyle=C_CREAM;for(let i=0;i<10;i++){const f=(t*0.4+i/10)%1,x=lerp(10+i*16,48,f*0.8),y=lerp(60,120,f);ctx.globalAlpha=Math.sin(f*Math.PI);ctx.strokeStyle=C_CREAM;ctx.lineWidth=0.8;ctx.beginPath();ctx.arc(x,y,2.4,0,TAU);ctx.stroke()}ctx.globalAlpha=1;OVTEXT.push({txt:'O2?',x:90,y:56,sc:2})}}
// brain cooling: the head in x-ray, a thermometer, cool air and blood during a yawn
const XR={x:90,y:200,s:1.25};const Y2=25.2;
function cool(t){const {x,y,s}=XR,k=yk(t,Y2),hx=x,hy=y-92*s;
  const ha=ss(seg(t,24.6,25.4));
  charLayer(g=>{guy(g,x,y,s,{expr:'neutral',pose:'tuck',breath:0,blink:blinkAt(t),t},k);
    // x-ray window over the top of the head: the brain inside
    g.save();g.beginPath();g.ellipse(hx,hy-6*s,26*s,16*s,0,Math.PI,TAU);g.closePath();g.clip();g.globalAlpha=ha;g.fillStyle=C_INK;g.fillRect(hx-40*s,hy-40*s,80*s,40*s);
    const heat=1-ss(seg(t,Y2+3,Y2+6.5))*0.75;g.beginPath();g.ellipse(hx,hy-6*s,21*s,13*s,0,Math.PI,TAU);g.closePath();g.fillStyle=cr(0.25+0.55*heat);g.fill();g.strokeStyle=cr(1);g.lineWidth=1.1;g.stroke();
    g.strokeStyle=cr(0.15);g.lineWidth=0.8;for(let i=0;i<6;i++){const a=Math.PI*(1.12+i*0.14);g.beginPath();g.arc(hx+Math.cos(a)*10*s,hy-6*s+Math.sin(a)*6*s,4*s,a,a+2.2);g.stroke()}
    g.restore()});
  // thermometer
  const heat=1-ss(seg(t,Y2+3,Y2+6.5))*0.75;inset(150,72,20,ha,(cx,cy)=>{ctx.strokeStyle=C_CREAM;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(cx-2.5,cy+8);ctx.lineTo(cx-2.5,cy-13);ctx.arc(cx,cy-13,2.5,Math.PI,0);ctx.lineTo(cx+2.5,cy+8);ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy+11,4.5,0,TAU);ctx.fillStyle=C_CREAM;ctx.fill();ctx.fillRect(cx-1.2,cy+8-heat*19,2.4,heat*19+2)},hx+16*s,hy-12*s);
  // cool air in through the mouth, warm blood carried away down the neck
  if(k>0.2){ctx.fillStyle=C_CREAM;for(let i=0;i<12;i++){const f=(t*0.9+i/12)%1;ctx.globalAlpha=Math.sin(f*Math.PI)*k;ctx.fillRect(lerp(hx-30+i*5,hx,f),lerp(hy+40,hy+16*s,f),1.2,1.2)}
    for(const sd of [-1,1])for(let i=0;i<4;i++){const f=(t*0.7+i/4)%1;ctx.globalAlpha=k*Math.sin(f*Math.PI);ctx.beginPath();ctx.arc(hx+sd*9*s,lerp(hy+2*s,hy+34*s,f),1.4,0,TAU);ctx.fill()}ctx.globalAlpha=1}}
// the towel test, then brain size and yawn length
function size(t){ground(186);
  if(t<36.4){// warm towel versus cold pack
    const kw=Math.max(yk(t,33.4,2.4),yk(t,35.0,2.4));
    charLayer(g=>{guy(g,48,186,0.78,{expr:'neutral',breath:Math.sin(t*1.6)*0.5,blink:blinkAt(t),t},kw);guy(g,132,186,0.78,{expr:'neutral',hairTone:'mid',clothes:'sweater',breath:Math.sin(t*1.6+1)*0.5,blink:blinkAt(t+1),t},0);
      // the towel and the pack, across each forehead
      g.fillStyle=BH.TONE.light;g.fillRect(48-16,186-0.78*92-18,32,7);g.strokeStyle=C_INK;g.lineWidth=1;g.strokeRect(48-16,186-0.78*92-18,32,7);
      g.fillStyle=BH.TONE.white;g.fillRect(132-14,186-0.78*92-18,28,7);g.strokeRect(132-14,186-0.78*92-18,28,7)});
    ctx.strokeStyle=C_CREAM;ctx.lineWidth=0.9;for(let i=0;i<3;i++){ctx.beginPath();for(let j=0;j<=10;j++)ctx.lineTo(40+i*8+Math.sin(j*0.9+t*4)*1.5,100-j*2.2);ctx.stroke()}
    for(let i=0;i<3;i++){const a=i*Math.PI/3,cx=132,cy=96;ctx.beginPath();ctx.moveTo(cx-Math.cos(a)*6,cy-Math.sin(a)*6);ctx.lineTo(cx+Math.cos(a)*6,cy+Math.sin(a)*6);ctx.stroke()}
    OVTEXT.push({txt:'WARM',x:48,y:52,sc:1,dim:1});OVTEXT.push({txt:'COLD',x:132,y:52,sc:1,dim:1});
  }else{// two bars: a mouse's yawn and a human's
    const g1=ss(seg(t,36.8,37.6)),g2=ss(seg(t,37.4,38.8));const x0=34,w=126,y1=96,y2=136;
    ctx.fillStyle=C_CREAM;ctx.fillRect(x0,y1,w*0.8/6.5*g1,12);ctx.fillRect(x0,y2,w*g2,12);ctx.strokeStyle=cr(0.5);ctx.lineWidth=0.8;ctx.strokeRect(x0,y1,w,12);ctx.strokeRect(x0,y2,w,12);
    OVTEXT.push({txt:'MOUSE  0.8 S',x:x0+40,y:y1-12,sc:1,dim:1,left:1});OVTEXT.push({txt:'HUMAN  6.5 S',x:x0+40,y:y2-12,sc:1,dim:1,left:1});
    // small brains beside the bars
    for(const [yy,r] of [[y1+6,3.4],[y2+6,9]]){ctx.beginPath();ctx.ellipse(18,yy,r*1.2,r,0,0,TAU);ctx.fillStyle=cr(0.75);ctx.fill();ctx.strokeStyle=C_CREAM;ctx.lineWidth=0.8;ctx.stroke();ctx.strokeStyle=C_INK;ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(18,yy-r);ctx.lineTo(18,yy+r);ctx.stroke()}
    OVTEXT.push({txt:'YAWN LENGTH',x:90,y:56,sc:1});
    if(t>39.0){ctx.globalAlpha=ss(seg(t,39.0,39.6));OVTEXT.push({txt:'?',x:90,y:166,sc:3})}ctx.globalAlpha=1}}
// a row of people: one yawns, and it travels down the line
const ROW=[22,56,90,124,158];
function spread(t){ground(186);
  charLayer(g=>{ROW.forEach((x,i)=>{const t0=41.2+i*1.0,k=yk(t,t0,2.8);guy(g,x,186,0.5,{expr:'neutral',hairTone:['dark','mid','light','dark','mid'][i],clothes:['tshirt','hoodie','sweater','overalls','jersey'][i],breath:Math.sin(t*1.6+i)*0.5,blink:blinkAt(t+i),t},k)})});
  // seeing, hearing, reading: little icons
  const ia=win_(t,42.4,43,46,46.4);inset(36,70,14,ia,(cx,cy)=>{ctx.fillStyle=C_CREAM;ctx.beginPath();ctx.ellipse(cx,cy,9,5,0,0,TAU);ctx.fill();ctx.fillStyle=C_INK;ctx.beginPath();ctx.arc(cx,cy,2.6,0,TAU);ctx.fill()});
  inset(90,62,14,ia,(cx,cy)=>{ctx.strokeStyle=C_CREAM;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(cx-6,cy-3);ctx.lineTo(cx-2,cy-3);ctx.lineTo(cx+3,cy-7);ctx.lineTo(cx+3,cy+7);ctx.lineTo(cx-2,cy+3);ctx.lineTo(cx-6,cy+3);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.arc(cx+4,cy,6,-0.8,0.8);ctx.stroke()});
  inset(144,70,14,ia,(cx,cy)=>{ctx.fillStyle=C_CREAM;ctx.fillRect(cx-7,cy-8,14,16);ctx.fillStyle=C_INK;for(let i=0;i<4;i++)ctx.fillRect(cx-5,cy-5+i*3.4,i===3?6:10,1)})}
// family catch it; the stranger does not
function family(t){ground(186);
  charLayer(g=>{[[24,0],[52,1],[80,2]].forEach(([x,i])=>{const k=yk(t,47.0+i*0.9,2.8);guy(g,x,186,0.56,{expr:'content',hairTone:'dark',clothes:'sweater',breath:Math.sin(t*1.6+i)*0.5,blink:blinkAt(t+i),t},k)});
    guy(g,150,186,0.56,{expr:'neutral',clothes:'trench',hat:'fedora',view:'q',breath:Math.sin(t*1.6+3)*0.5,blink:blinkAt(t+3),t},0,{mirror:true})});
  if(t>47.2){OVTEXT.push({txt:'FAMILY',x:52,y:52,sc:1,dim:1});OVTEXT.push({txt:'STRANGER',x:150,y:52,sc:1,dim:1})}}
// two chimpanzees
function chimp(x,y,k,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle=cr(0.35);ctx.strokeStyle=C_CREAM;ctx.lineWidth=1;
  ctx.beginPath();ctx.ellipse(0,34,30,18,0,Math.PI,TAU);ctx.lineTo(30,60);ctx.lineTo(-30,60);ctx.closePath();ctx.fill();ctx.stroke();
  for(const sd of [-1,1]){ctx.beginPath();ctx.arc(sd*22,-4,8,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle=cr(0.75);ctx.beginPath();ctx.arc(sd*22,-4,4.5,0,TAU);ctx.fill();ctx.fillStyle=cr(0.35)}
  ctx.beginPath();ctx.arc(0,-6,20,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle=cr(0.8);ctx.beginPath();ctx.ellipse(0,-8,14,9,0,0,TAU);ctx.fill();ctx.beginPath();ctx.ellipse(0,6+4*k,12,8+6*k,0,0,TAU);ctx.fill();
  ctx.fillStyle=C_INK;for(const sd of [-1,1]){if(k>0.3)ctx.fillRect(sd*6-2,-9,4,1);else{ctx.beginPath();ctx.arc(sd*6,-9,1.6,0,TAU);ctx.fill()}}
  ctx.fillRect(-2.6,0,1.2,1.2);ctx.fillRect(1.4,0,1.2,1.2);
  ctx.beginPath();ctx.ellipse(0,8+5*k,3+5*k,1+7*k,0,0,TAU);ctx.fill();if(k>0.4){ctx.fillStyle=cr(0.95);for(const sd of [-1,1]){ctx.beginPath();ctx.moveTo(sd*4*k,2+k*2);ctx.lineTo(sd*(4*k+1.5),5+k*3);ctx.lineTo(sd*(4*k+3),2+k*2);ctx.closePath();ctx.fill()}}
  ctx.restore()}
function chimpSc(t){ground(186);
  const CH={hair:'none',clothes:'chimp',hat:'none',glasses:'none',neck:'none',extras:{},held:'none'};
  charLayer(g=>{guy(g,62,186,0.62,{...CH,expr:'content',breath:Math.sin(t*1.6)*0.5,blink:blinkAt(t),t},yk(t,52.4,3),{chimp:true});
    guy(g,122,186,0.52,{...CH,expr:'content',breath:Math.sin(t*1.6+1)*0.5,blink:blinkAt(t+1),t},yk(t,54.0,3),{chimp:true})});
  // a ripple between them: in sync
  const a=win_(t,55.4,56,57.6,58);if(a>0){ctx.strokeStyle=C_CREAM;ctx.lineWidth=1;for(let i=0;i<3;i++){const f=(t*0.8+i/3)%1;ctx.globalAlpha=a*(1-f);ctx.beginPath();ctx.arc(91,90,8+f*40,Math.PI*1.15,Math.PI*1.85);ctx.stroke()}ctx.globalAlpha=1}}
function physics(t,dt){const at=(x)=>t-dt<x&&t>=x;
  if(at(Y1))EV.push(['yawn',t,6.5]);for(const x of [11.0,11.8,12.6,13.4])if(at(x))EV.push(['pop',t]);if(at(14.4))EV.push(['yawn',t,1.8]);
  for(const x of [17.6,17.8,21.6,21.8])if(at(x))EV.push(['yawn',t,2.6]);if(at(Y2))EV.push(['yawn',t,6.5]);if(at(Y2+3))EV.push(['cool',t]);
  for(const x of [33.4,35.0])if(at(x))EV.push(['yawn',t,2.4]);for(const x of [36.8,37.4])if(at(x))EV.push(['bar',t]);
  for(let i=0;i<5;i++)if(at(41.2+i))EV.push(['yawn',t,2.8]);for(let i=0;i<3;i++)if(at(47+i*0.9))EV.push(['yawn',t,2.8]);for(const x of [52.4,54.0])if(at(x))EV.push(['yawn',t,3])}
function drawWorld(t){
  OVTEXT=[];CAM={z:1,x:90,y:160,sx:0,sy:0};ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=C_INK;ctx.fillRect(0,0,LW,LH);PX=0.5;BH.setSeed(Math.floor(t*6));
  if(inSc('yawn',t))yawnSc(t);else if(inSc('animals',t))animals(t);else if(inSc('oxy',t))oxy(t);else if(inSc('cool',t))cool(t);else if(inSc('size',t))size(t);else if(inSc('spread',t))spread(t);else if(inSc('family',t))family(t);else chimpSc(t);
  ctx.setTransform(1,0,0,1,0,0);
  const g=ctx.createRadialGradient(LW/2,LH*0.36,LH*0.2,LW/2,LH*0.36,LH*0.7);g.addColorStop(0,'rgba(6,6,9,0)');g.addColorStop(1,'rgba(6,6,9,0.55)');ctx.fillStyle=g;ctx.fillRect(0,0,LW,LH);
  let dip=0;for(const k of Object.keys(SC)){const b=SC[k][0];if(b>0)dip=Math.max(dip,1-Math.abs(t-b)/0.3)}if(t<0.8)dip=Math.max(dip,1-t/0.8);if(t>57.8)dip=Math.max(dip,ss(seg(t,57.8,59)));
  if(dip>0){ctx.fillStyle=`rgba(6,6,9,${clamp(dip,0,1)})`;ctx.fillRect(0,0,LW,LH);if(dip>0.5)OVTEXT=[]}
}
let POPS=[];function cam(t){return CAM}
