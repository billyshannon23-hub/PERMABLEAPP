import json,numpy as np,wave
from scipy.signal import lfilter,butter,fftconvolve,sosfilt
rng=np.random.default_rng(11)
M=json.load(open('meta.json')); SR=44100; DUR=M['N']/24; n=int(SR*(DUR+4))
L=np.zeros((2,n)); S=np.zeros((2,n))   # dry, reverb send
def put(x,at,g=1,rev=0.3,pan=0.0):
    i=int(at*SR)
    if i>=n or i<0: return
    j=min(n,i+len(x)); x=x[:j-i]*g; a=np.cos((pan+1)*np.pi/4); b=np.sin((pan+1)*np.pi/4)
    L[0,i:j]+=x*a; L[1,i:j]+=x*b; S[0,i:j]+=x*a*rev; S[1,i:j]+=x*b*rev
def sos(kind,f,order=2):
    if kind=='band': return butter(order,[max(20,f[0])/(SR/2),min(SR/2*0.95,f[1])/(SR/2)],'band',output='sos')
    return butter(order,min(f,SR/2*0.95)/(SR/2),kind,output='sos')
def t_(d): return np.arange(int(d*SR))/SR
def m2f(m): return 440*2**((m-69)/12)
def tear(at):
    d=t_(0.9); x=rng.standard_normal(len(d))
    cr=(rng.random(len(d))<np.clip(0.02*np.exp(-d/0.25),0,1))*rng.uniform(-1,1,len(d))   # crackle
    cr=sosfilt(sos('band',(900,4200)),cr)*3
    sweep=np.zeros_like(d); 
    for i,fc in enumerate(np.linspace(1800,350,9)):
        seg=(d>=i*0.07)&(d<i*0.07+0.18); sweep+=sosfilt(sos('band',(fc*0.7,fc*1.3)),x)*seg*np.exp(-(d-i*0.07)/0.08)
    blow=np.sin(2*np.pi*np.cumsum(70*np.exp(-d/0.2)+30)/SR)*np.exp(-d/0.18)
    put(cr*np.exp(-d/0.3),at,0.35,rev=0.35); put(sweep,at,0.55,rev=0.4); put(blow,at,0.55,rev=0.2)
    lowx=sosfilt(sos('low',140),rng.standard_normal(int(2.5*SR)))*np.exp(-t_(2.5)/0.8); put(lowx,at,0.25,rev=0.3)
def bubble(at,g,pan):
    d=t_(0.09); f0=rng.uniform(260,780); f=f0*(1+d*rng.uniform(6,14)); x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-d/0.025)*np.clip(d/0.003,0,1)
    put(x,at,g,rev=0.35,pan=pan)
def ks(f,at,g,dur=1.8,damp=0.996,bright=0.5,pan=0):  # plucked string / fibre
    N=int(SR/f); buf=sosfilt(sos('low',f*6*bright+200),rng.uniform(-1,1,N)); out=np.zeros(int(dur*SR))
    for i in range(len(out)):
        v=buf[i%N]; out[i]=v; buf[i%N]=damp*0.5*(v+buf[(i+1)%N])
    put(out*np.exp(-t_(dur)/(dur/2.5)),at,g,rev=0.55,pan=pan)
def bell(f,at,g,pan=0):  # soft inharmonic glass, long tail
    d=t_(3.0); x=np.sin(2*np.pi*f*d+1.2*np.exp(-d/0.6)*np.sin(2*np.pi*f*1.41*d))*np.exp(-d/0.9)+0.3*np.sin(2*np.pi*f*2.76*d)*np.exp(-d/0.35)
    put(x*np.clip(d/0.004,0,1),at,g,rev=0.75,pan=pan)
def tick(at,g,pan):
    d=t_(0.04); x=sosfilt(sos('band',(1500,3200)),rng.standard_normal(len(d)))*np.exp(-d/0.006); put(x,at,g,rev=0.25,pan=pan)
def swell(at,dur,midis,g):
    d=t_(dur+2); env=np.clip(d/(dur*0.6),0,1)*np.exp(-np.clip(d-dur*0.6,0,None)/1.0)
    x=sum(np.sin(2*np.pi*m2f(m)*d)+0.3*np.sin(4*np.pi*m2f(m)*d) for m in midis); put(sosfilt(sos('low',2000),x*env),at,g,rev=0.8)

def creak(at,dur,g):
    d=t_(dur); x=rng.standard_normal(len(d)); out=np.zeros_like(d)
    for i,fc in enumerate(np.linspace(260,900,6)):
        a=i*dur/6; m=(d>=a)&(d<a+dur/3); out+=sosfilt(sos('band',(fc*0.85,fc*1.15)),x)*m
    put(out*np.sin(np.pi*d/dur)**2,at,g,rev=0.5)
def crackle(at,dur,g):
    d=t_(dur); cr=(rng.random(len(d))<0.003)*rng.uniform(-1,1,len(d)); put(sosfilt(sos('band',(1500,5000)),cr)*np.sin(np.pi*d/dur),at,g,rev=0.35)

CH_CALM=[[50,57,62,64,69],[47,54,59,62,66],[43,50,57,59,64],[45,52,57,59,64]]
CH_HURT=[[50,57,62,65,69],[46,53,58,62,65],[43,50,55,58,62],[45,52,57,60,64]]
CH_A=[[48,55,60,64,67],[45,52,57,60,64],[41,48,53,57,64],[43,50,55,59,62]]
def chord_at(t): return CH_A[int(t//3.5)%4]
SEGL=3.5
SEGL=3.5
for k in range(int(DUR/SEGL)+2):
    t0=k*SEGL-1.2; ch=chord_at(max(0,t0+1.3)); d=SEGL+3.5; tt=t_(d)
    env=(np.clip(tt/2.2,0,1)*np.clip((d-tt)/2.2,0,1))**1.5; sig=np.zeros_like(tt)
    for m in ch:
        f=m2f(m)
        for dt_ in (-6,-2,3,7):
            ph=2*np.pi*f*2**(dt_/1200)*tt+rng.uniform(0,6.28)+0.6*np.sin(2*np.pi*rng.uniform(.05,.15)*tt)
            sig+=np.sin(ph)*0.5+0.18*np.sin(2*ph)+0.07*np.sin(3*ph)
    sig=sosfilt(sos('low',1900),sig); put(sig*env,max(0,t0),0.010,rev=0.75)
tt=t_(DUR+4); sub=np.sin(2*np.pi*36.7*tt)*0.5+np.sin(2*np.pi*55*tt+0.4*np.sin(2*np.pi*0.07*tt))*0.35
sub*=0.5+0.5*np.sin(2*np.pi*tt/11)**2; put(sub,0,0.035,rev=0.1)
br=np.cumsum(rng.standard_normal(len(tt)));br=br-sosfilt(sos('low',0.5,1),br);br/=np.max(np.abs(br))
put(sosfilt(sos('band',(120,700)),br)*(0.6+0.4*np.sin(2*np.pi*tt/9)),0,0.2,rev=0.4)
# a light plucked pattern over the chords, a little lift without getting busy
for k in range(int(DUR/0.875)):
    t0=0.6+k*0.875
    if t0>DUR-2.5: break
    ch=chord_at(t0); m=ch[[2,3,4,3][k%4]]+12
    ks(m2f(m),t0,0.022 if k%2 else 0.03,dur=1.1,damp=0.993,bright=0.6,pan=[-.4,.2,.4,-.2][k%4])
def hic(at,g,fast):
    d=t_(0.16); f=260*np.exp(-d/0.05)+150
    v=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-d/0.035)*np.clip(d/0.004,0,1)
    v=sosfilt(sos('band',(180,1600)),v+0.5*rng.standard_normal(len(d))*np.exp(-d/0.012))
    cl=np.zeros(int(0.02*SR)); cl[int(0.0*SR)]=1; cl=sosfilt(sos('band',(1200,4000)),cl)*8
    put(v,at,g,rev=0.2,pan=rng.uniform(-.15,.15)); put(cl,at+0.035,g*0.6,rev=0.1)
def thud(at,g):
    d=t_(0.6); x=np.sin(2*np.pi*np.cumsum(90*np.exp(-d/0.08)+38)/SR)*np.exp(-d/0.16)
    n_=sosfilt(sos('low',500),rng.standard_normal(len(d)))*np.exp(-d/0.05); put(x+0.5*n_,at,g,rev=0.25)
def whoosh(at,dur,g):
    d=t_(dur); x=rng.standard_normal(len(d)); out=np.zeros_like(d)
    for i,fc in enumerate(np.linspace(600,2400,8)):
        m=(d>=i*dur/8)&(d<(i+2)*dur/8); out+=sosfilt(sos('band',(fc*0.8,fc*1.2)),x)*m
    put(out*np.sin(np.pi*d/dur),at,g,rev=0.4)
def whirr(at,dur,g):
    d=t_(dur); f=110+20*np.sin(2*np.pi*3*d); x=np.sign(np.sin(2*np.pi*np.cumsum(f)/SR))*0.4+0.3*rng.standard_normal(len(d))
    put(sosfilt(sos('band',(150,2500)),x)*np.clip(d/0.1,0,1)*np.clip((dur-d)/0.2,0,1),at,g,rev=0.2)
def chime(at,g):
    for k,f in enumerate([2093,2637,3136,3951]): bell(f,at+k*0.06,g,rng.uniform(-.5,.5))
def scan(at,dur,g):
    d=t_(dur); f=600+900*d/dur; x=np.sin(2*np.pi*np.cumsum(f)/SR)*0.5+0.5*np.sin(2*np.pi*np.cumsum(f*1.5)/SR)
    put(sosfilt(sos('band',(400,3000)),x)*np.sin(np.pi*d/dur)**2,at,g,rev=0.4)
def squish(at,g):
    d=t_(0.12); f=500*np.exp(-d/0.04)+180; put(np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-d/0.03),at,g,rev=0.3,pan=rng.uniform(-.4,.4))
def hiss(at,dur,g):
    d=t_(dur); x=sosfilt(sos('band',(2500,9000)),rng.standard_normal(len(d)))*np.clip(d/0.05,0,1)*np.exp(-d/(dur*0.5)); put(x,at,g,rev=0.2)
def rise(at,g):
    d=t_(0.9); f=300+500*d; x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.sin(np.pi*d/0.9)**2; put(x,at,g,rev=0.5)
    for k in range(10): tick(at+0.05+k*0.06,g*0.35,rng.uniform(-.7,.7))
def yawnsnd(at,dur,g):
    d=t_(dur); env=np.where(d<dur*0.72,np.sin(np.pi*0.5*d/(dur*0.72))**2,1-((d-dur*0.72)/(dur*0.28)))
    env=np.clip(env,0,1)**1.3; f=np.where(d<dur*0.72,180+60*d/dur,240-120*(d-dur*0.72)/(dur*0.28))
    tone=np.sin(2*np.pi*np.cumsum(f)/SR); air=sosfilt(sos('band',(400,2200)),rng.standard_normal(len(d)))
    put(sosfilt(sos('low',1800),0.35*tone+air)*env,at,g,rev=0.35)
for e in M['ev']:
    k,t=e[0],e[1]
    if k=='yawn': yawnsnd(t,e[2] if len(e)>2 else 3,0.05)
    elif k=='pop': bubble(t,0.06,rng.uniform(-.4,.4))
    elif k=='cool': chime(t,0.01)
    elif k=='bar': tick(t,0.06,0)
swell(24.2,4,[57,60,64,69],0.012); swell(51.6,5,[60,64,67,71,74],0.016)
for t in np.arange(3,56,4.2): bell(m2f([76,79,81,84][rng.integers(0,4)]),t+rng.uniform(0,1),0.007,rng.uniform(-.6,.6))
# reverb: long and dark
RL=int(SR*4.5); ir=np.stack([sosfilt(sos('low',3500),rng.uniform(-1,1,RL))*(1-np.arange(RL)/RL)**3 for _ in range(2)])
wet=np.stack([fftconvolve(S[c],ir[c])[:n] for c in range(2)]); wet*=0.5*np.abs(L).mean()/max(1e-9,np.abs(wet).mean())
out=L+wet
out=np.stack([sosfilt(sos('low',9000),out[c]) for c in range(2)])
out=out[:,:int(DUR*SR)]
fi_=int(1.2*SR); out[:,:fi_]*=np.linspace(0,1,fi_); fo=int(3*SR); out[:,-fo:]*=np.linspace(1,0,fo)
out/=np.sqrt((out**2).mean())/0.16; out=np.tanh(out*0.9); out/=np.max(np.abs(out))/0.95
w=wave.open('score.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out.T*32767).astype(np.int16).tobytes()); w.close(); print('ok',out.shape[1]/SR)
