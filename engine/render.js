/* ============ RENDER ============
   present(): the 1-bit cream/ink Bayer dither (red survives only for villains),
   the 5x7 pixel font (drawText, textW) and caption wrapping. */
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+0.5)/16),LTH=BAYER.map(v=>v*65280),RTH=BAYER.map(v=>v*200);
function present(gl){const LW=cv.width,LH=cv.height;const o_=ctx.getTransform();ctx.resetTransform();const img=ctx.getImageData(0,0,LW,LH),d=img.data,d32=new Uint32Array(d.buffer);
  const CC=(255<<24)|(206<<16)|(226<<8)|232,II=(255<<24)|(9<<16)|(6<<8)|6,RR=(255<<24)|(46<<16)|(38<<8)|200;
  for(let y=0;y<LH;y++){const by=(y&3)<<2,row=y*LW;for(let x=0;x<LW;x++){const k=row+x,i=k<<2,r=d[i],g=d[i+1],b=d[i+2],q=(x&3)+by;
    if(r-g>60&&r-b>50&&g<140)d32[k]=r>RTH[q]?RR:II;else d32[k]=(77*r+151*g+28*b)>LTH[q]?CC:II}}
  let bands=Math.floor(gl*5)+(R()<0.01?1:0);while(bands-->0){const y0=Math.floor(rnd(0,LH-8)),hh=Math.floor(rnd(1,7)),sh=Math.round(rnd(-8,8)*(0.4+gl));for(let y=y0;y<Math.min(LH,y0+hh);y++){const row=d32.slice(y*LW,(y+1)*LW);for(let x=0;x<LW;x++)d32[y*LW+x]=row[((x-sh)%LW+LW)%LW]}}
  ctx.putImageData(img,0,0);ctx.setTransform(1,0,0,1,0,0)}
/* type */
const F5={A:'0E11111F111111',B:'1E11111E11111E',C:'0E11101010110E',D:'1C12111111121C',E:'1F10101E10101F',F:'1F10101E101010',G:'0E11101711110F',H:'1111111F111111',I:'0E04040404040E',J:'0702020202120C',K:'11121418141211',L:'1010101010101F',M:'111B1515111111',N:'11111915131111',O:'0E11111111110E',P:'1E11111E101010',Q:'0E11111115120D',R:'1E11111E141211',S:'0F10100E01011E',T:'1F040404040404',U:'1111111111110E',V:'11111111110A04',W:'1111111515150A',X:'11110A040A1111',Y:'1111110A040404',Z:'1F01020408101F',
  '0':'0E11131519110E','1':'040C040404040E','2':'0E11010204081F','3':'1F02040201110E','4':'02060A121F0202','5':'1F101E0101110E','6':'0608101E11110E','7':'1F010204080808','8':'0E11110E11110E','9':'0E11110F01020C',
  '.':'00000000000C0C',',':'000000000C0408','!':'04040404040004','?':'0E110102040004',"'":'0C040800000000','-':'0000001F000000',':':'000C0C000C0C00','/':'00010204081000','+':'0004041F040400',' ':'00000000000000'};
const FONT={};for(const k in F5){const h=F5[k];FONT[k]=[0,1,2,3,4,5,6].map(i=>parseInt(h.substr(i*2,2),16))}
const textW=(s,sc=1)=>s.length*6*sc-sc;
function drawText(str,x,y,col,sc=1){ctx.fillStyle=col;str=str.toUpperCase();for(let i=0;i<str.length;i++){const g=FONT[str[i]]||FONT['?'];for(let r=0;r<7;r++){const row=g[r];for(let c=0;c<5;c++)if(row&(16>>c))ctx.fillRect(x+(i*6+c)*sc,y+r*sc,sc,sc)}}}
function wrap(str,maxW){const w=str.split(' '),L=[];let cur='';for(const x of w){const t=cur?cur+' '+x:x;if(textW(t)>maxW&&cur){L.push(cur);cur=x}else cur=t}if(cur)L.push(cur);return L}
