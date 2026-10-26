/* ============ TAIL ============
   overlay(): big texts (OVTEXT), HIC-style pops (POPS), pointer labels (LABELS) and the typed captions (CAPS),
   drawn after the dither so text stays crisp. Voice sync and time warping for narration.
   window.__R is what the capture and narration tools call to render frame N. */
function overlay(t,C){ctx.setTransform(1,0,0,1,0,0);const toS=(x,y)=>[(x-C.x)*C.z+LW/2+C.sx,(y-C.y)*C.z+LH/2+C.sy];
  // big numbers and small headings
  for(const o of OVTEXT){const w=textW(o.txt,o.sc);drawText(o.txt,Math.round(o.left?o.x-40:o.x-w/2),o.y,o.dim?cr(0.75):C_CREAM,o.sc)}
  // "HIC!" pops: a quick burst by his mouth
  for(const p of POPS){if(p.a>0.62)continue;const sc=p.a<0.06?1:2,txt=p.txt||'HIC!',w=textW(txt,sc),x=Math.round(clamp(p.x,4,LW-4-w)),y=Math.round(p.y-p.a*10);
    ctx.fillStyle=C_INK;ctx.fillRect(x-2,y-2,w+4,7*sc+4);drawText(txt,x,y,C_CREAM,sc);
    if(p.a<0.25){ctx.fillStyle=C_CREAM;for(const [dx,dy] of [[-5,-3],[-6,3],[w+3,-4],[w+4,3]])ctx.fillRect(x+dx,y+dy+4,2,1)}}
  for(const [t0,t1,txt,get,pos] of LABELS){if(t<t0||t>t1)continue;const n=Math.min(txt.length,Math.floor((t-t0)*30));if(n<1)continue;const s=txt.slice(0,n),tw=textW(s),lx=clamp(pos[0],14,166-textW(txt)),ly=clamp(pos[1],36,196);
    const w=get();if(w){const [sx,sy]=toS(w[0],w[1]);const ex=lx+(sx<lx?0:tw),ey=ly+4;ctx.fillStyle=C_CREAM;const steps=Math.ceil(Math.hypot(sx-ex,sy-ey)/3);for(let i=0;i<steps;i+=2){const k=i/steps;ctx.fillRect(Math.round(lerp(ex,sx,k)),Math.round(lerp(ey,sy,k)),1,1)}ctx.strokeStyle=C_CREAM;ctx.lineWidth=1;ctx.beginPath();ctx.arc(Math.round(sx)+0.5,Math.round(sy)+0.5,2.5,0,TAU);ctx.stroke()}
    ctx.fillStyle=C_INK;ctx.fillRect(lx-2,ly-2,tw+4,11);drawText(s,lx,ly,C_CREAM)}
  let cur=null,ci=-1;CAPS.forEach((c,i)=>{if(t>=capStart(i))ci=i});if(ci>=0)cur=CAPS[ci];
  if(cur&&t<CAP_END){const n=capChars(ci,t,34),L=wrap(cur[1],128);let left=n;const shown=[];for(const ln of L){if(left<=0)break;shown.push(ln.slice(0,left));left-=ln.length+1}
    if(shown.length){const y0=232-(L.length*10+4);ctx.fillStyle=C_INK;ctx.fillRect(17,y0-5,146,L.length*10+9);shown.forEach((ln,j)=>drawText(ln,Math.round(90-textW(L[j])/2),y0+j*10,C_CREAM))}}}
function warpT(tv){const K=window.__TW;if(tv<=K[0][0])return K[0][1];for(let k=1;k<K.length;k++)if(tv<=K[k][0]){const a=K[k-1],b=K[k];return a[1]+(b[1]-a[1])*(tv-a[0])/Math.max(1e-6,b[0]-a[0])}const L=K[K.length-1];return L[1]+(tv-L[0])}
function capStart(i){const V=window.__VT&&window.__VT[i];return V&&!window.__TW?V.start:CAPS[i][0]}
function capChars(i,t,cps){const V=window.__VT&&window.__VT[i];if(!V)return Math.floor((t-CAPS[i][0])*cps);const el=(window.__TW?window.__TV:t)-V.start,R=V.reveal;if(el<=R[0][0])return R[0][1];for(let k=1;k<R.length;k++)if(el<R[k][0]){const a=R[k-1],b=R[k];return Math.floor(a[1]+(b[1]-a[1])*(el-a[0])/Math.max(1e-6,b[0]-a[0]))}return R[R.length-1][1]}
let simT=0;
window.__R={TOTAL,N:Math.round(TOTAL*FPS),CAPS,events:()=>EV,frame(fi){const tv=fi/FPS;window.__TV=tv;const t=window.__TW?warpT(tv):tv;while(simT<t){physics(simT,DT);simT+=DT}TT=t;
  drawWorld(t);const C={...CAM};present(0);overlay(t,C);return cv.toDataURL('image/png')}};

