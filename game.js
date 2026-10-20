(()=>{'use strict';
const $=i=>document.getElementById(i),clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),MPH=1.4667,G=32.2,DT=1/120,TAU=Math.PI*2,H=0.9;
const wrap=a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;
const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const rngF=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const subs=[];const on=(t,e,f,o)=>{t.addEventListener(e,f,o);subs.push([t,e,f,o])};
/* ---------- persistence ---------- */
const KEY='echobound.progress',UNL=['trail','violet','theme2'];
const S={v:1,best:0,runs:0,lands:0,clean:0,crashes:0,rings:0,flips:0,bestSpeed:0,unlocked:[]};
function load(){try{const o=JSON.parse(localStorage.getItem(KEY));if(o&&o.v===1){for(const k of ['best','runs','lands','clean','crashes','rings','flips','bestSpeed'])if(Number.isFinite(o[k])&&o[k]>=0&&o[k]<1e9)S[k]=o[k];if(Array.isArray(o.unlocked))S.unlocked=o.unlocked.filter(x=>UNL.includes(x))}}catch(e){}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function unlockCheck(){const n=[];const add=k=>{if(!S.unlocked.includes(k)){S.unlocked.push(k);n.push(k)}};if(S.lands>=3)add('trail');if(S.rings>=5)add('violet');if(S.clean>=3)add('theme2');return n}
const UNAME={trail:'Cyan energy trail',violet:'Violet paint scheme',theme2:'Amber night-road theme'};
/* ---------- audio ---------- */
let ac,master,hum,humG,thrG,noiseBuf,vol=.6,muted=false;
function audioInit(){if(ac){if(ac.state==='suspended')ac.resume();return}try{ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.connect(ac.destination);setVol();noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
hum=ac.createOscillator();hum.type='sawtooth';hum.frequency.value=60;const lp=ac.createBiquadFilter();lp.frequency.value=380;humG=ac.createGain();humG.gain.value=0;hum.connect(lp);lp.connect(humG);humG.connect(master);hum.start();
const ns=ac.createBufferSource();ns.buffer=noiseBuf;ns.loop=true;const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2600;thrG=ac.createGain();thrG.gain.value=0;ns.connect(bp);bp.connect(thrG);thrG.connect(master);ns.start();
[55,82.4].forEach(f=>{const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;g.gain.value=.025;o.connect(g);g.connect(master);o.start()})}catch(e){ac=null}}
function setVol(){if(master)master.gain.value=muted?0:vol}
function tone(f,d,type,v,f2){if(!ac)return;const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v||.2,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d)}
function burst(d,v,f){if(!ac)return;const t=ac.currentTime,s=ac.createBufferSource(),fl=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuf;fl.type='lowpass';fl.frequency.value=f;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(fl);fl.connect(g);g.connect(master);s.start(t);s.stop(t+d)}
const sfx={beep:()=>tone(520,.14,'square',.1),green:()=>tone(1040,.4,'sine',.22),err:()=>tone(160,.25,'sawtooth',.15,90),chime:()=>{tone(1175,.25,'sine',.18);setTimeout(()=>tone(1568,.4,'sine',.16),70)},land:()=>{burst(.35,.5,500);tone(90,.3,'sine',.4,40)},crash:()=>{burst(1.1,.7,1400);tone(140,.8,'sawtooth',.25,30)},secret:()=>{tone(660,.5,'triangle',.18,1320)}};
/* ---------- ECHO ---------- */
const pick=a=>a[Math.floor(Math.random()*a.length)];
const LINES={launch:['The road is listening.','Ramp speed set. Keep your nose honest.'],crash:['The road is still here. Try a different line.','That one is mine to keep. Go again.'],crashMore:['Same road, new angle.','Check the rotation before the ground does.'],land:['Clean contact. Noted.','That surface remembers the touch.'],ring:['A ring holds more than gas.','Another one, bound to you.'],best:['That was different. I felt it.','New high on the wall of the road.'],secret:['Above the apex, a quiet door.','Not every path is lit.','You looked where nobody lit a lamp.'],unlock:['The road shifts. It was waiting for this.']};
function echoSay(t){const e=$('echo');e.textContent='ECHO: '+t;e.classList.add('on');later(4200,()=>e.classList.remove('on'),'echo')}
const timers=[];function later(ms,fn,tag){if(tag)for(let i=timers.length-1;i>=0;i--)if(timers[i].tag===tag)timers.splice(i,1);timers.push({t:ms/1000,fn,tag})}
function msg(t,ms){const m=$('msg');m.textContent=t;m.classList.add('on');later(ms||1600,()=>m.classList.remove('on'),'msg')}
/* ---------- ramp curve (sampled, arc-length) ---------- */
const ramp=[];{let x=0,y=0,th=0,s=0;const t1=Math.acos(1-14/22),t2=Math.PI/2+22*Math.PI/180,d=.005;ramp.push({x,y,s,th});while(th<t2-1e-9){const dd=Math.min(d,t2-th),R=th<t1?22:9,ds=R*dd;x+=Math.cos(th+dd/2)*ds;y+=Math.sin(th+dd/2)*ds;th+=dd;s+=ds;ramp.push({x,y,s,th})}}
const rampEnd=ramp[ramp.length-1];let rIdx=0;
function rampAt(s){s=clamp(s,0,rampEnd.s);while(rIdx>0&&ramp[rIdx].s>s)rIdx--;while(rIdx<ramp.length-2&&ramp[rIdx+1].s<s)rIdx++;const a=ramp[rIdx],b=ramp[rIdx+1],u=(s-a.s)/(b.s-a.s||1);return{x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,th:a.th+(b.th-a.th)*u}}
/* ---------- levels ---------- */
const LV=[{seed:11,pad:0,half:46,n:5,jit:2,rr:4.6,lamp:0x22d3ee,name:'First Light'},{seed:23,pad:-10,half:38,n:6,jit:6,rr:4.2,lamp:0x8b5cf6,name:'Violet Arc'},{seed:37,pad:12,half:32,n:7,jit:10,rr:3.9,lamp:0xff4fd8,name:'Neon Drift'},{seed:59,pad:-4,half:26,n:8,jit:14,rr:3.6,lamp:0xffb347,name:'Needle Eye'}];
const PADX=-275;
/* ---------- state machine ---------- */
const TR={TITLE:['COUNT'],COUNT:['DRIVE','TITLE'],DRIVE:['RAMP'],RAMP:['AIR'],AIR:['LANDED','CRASHED'],LANDED:['RESULTS'],CRASHED:['RESULTS'],RESULTS:['COUNT','TITLE']};
let st='TITLE',paused=false,R=null,lvl=0,lockUntil=0,greenAt=0,timeScale=1,shake=0,skyFlash=0,landT=0;
const inp={l:false,r:false,t:false};
function go(n){if(!(TR[st]||[]).includes(n))return false;st=n;enter(n);return true}
function show(id,v){$(id).hidden=!v}
function enter(n){const run=['COUNT','DRIVE','RAMP','AIR','LANDED','CRASHED'].includes(n);show('pTitle',n==='TITLE');show('pRes',n==='RESULTS');show('hud',run);show('lights',n==='COUNT');show('ctl',run&&(n==='COUNT'||n==='AIR'||n==='DRIVE'||n==='RAMP'));show('bGo',n==='COUNT');show('airctl',n!=='COUNT');
 if(n==='TITLE'){updateStats();if(S.runs>0)echoSay('Your best here is '+S.best.toLocaleString()+'.')}}
/* ---------- three.js setup ---------- */
let renderer,scene,camera,carG,paintMat,plumes=[],ringObjs=[],padMesh,roadMat,laneMats=[],skyMats=[],pts,ptsGeo,orb,orbMat,orbLight,rampMat,lampLight,raf;
const P=600,pPos=new Float32Array(P*3),pCol=new Float32Array(P*3),pVel=new Float32Array(P*3),pLife=new Float32Array(P),pMax=new Float32Array(P);let pI=0;
const debris=[],cb=new THREE.Vector3(0,12,40),cl=new THREE.Vector3();
function init(){const cv=$('c');try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'})}catch(e){renderer=null}
 if(!renderer||!renderer.getContext()){show('nogl',true);return false}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));scene=new THREE.Scene();scene.background=new THREE.Color(0x050a1c);scene.fog=new THREE.FogExp2(0x070d28,.0021);
 camera=new THREE.PerspectiveCamera(55,1,.5,2000);scene.add(new THREE.HemisphereLight(0x5577cc,0x080818,.9));const dl=new THREE.DirectionalLight(0x99bbff,.7);dl.position.set(60,120,90);scene.add(dl);
 roadMat=new THREE.MeshStandardMaterial({color:0x0a1022,roughness:.15,metalness:.85,emissive:0x050a1a});const road=new THREE.Mesh(new THREE.PlaneGeometry(700,34),roadMat);road.rotation.x=-Math.PI/2;road.position.set(-250,0,0);scene.add(road);
 const mkL=(w,d,x,z,c)=>{const m=new THREE.MeshBasicMaterial({color:c});laneMats.push(m);const b=new THREE.Mesh(new THREE.BoxGeometry(w,.05,d),m);b.position.set(x,.03,z);scene.add(b)};
 mkL(700,.35,-250,-15,0x38e8ff);mkL(700,.35,-250,15,0x38e8ff);for(let x=-590;x<100;x+=16)mkL(7,.3,x,0,0x7fc8ff);
 padMesh=new THREE.Mesh(new THREE.BoxGeometry(1,.14,24),new THREE.MeshBasicMaterial({color:0x1cffa0,transparent:true,opacity:.35}));padMesh.position.y=.08;scene.add(padMesh);
 for(let s=-1;s<=1;s+=2){const m=new THREE.MeshBasicMaterial({color:0x5dffb0});const e=new THREE.Mesh(new THREE.BoxGeometry(1,.5,.5),m);e.userData.edge=s;e.position.set(0,.3,s*12);scene.add(e);padMesh.userData.edges=(padMesh.userData.edges||[]).concat(e)}
 const sm=[0x0a1a3a,0x12103a,0x082a40].map((c,i)=>new THREE.MeshStandardMaterial({color:0x060c1e,emissive:c,emissiveIntensity:.6,roughness:.5}));skyMats=sm;const rr=rngF(7);
 for(let i=0;i<80;i++){const h=40+rr()*170,w=12+rr()*22,b=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),sm[i%3]);b.position.set(-560+rr()*760,h/2,-70-rr()*190);scene.add(b)}
 const ap=new Float32Array(240*3);for(let i=0;i<240;i++){ap[i*3]=-560+rr()*700;ap[i*3+1]=rr()*160;ap[i*3+2]=-30+rr()*60}const ag=new THREE.BufferGeometry();ag.setAttribute('position',new THREE.BufferAttribute(ap,3));scene.add(new THREE.Points(ag,new THREE.PointsMaterial({size:.7,color:0x88ccff,transparent:true,opacity:.5,depthWrite:false})));
 // ramp mesh
 const pos=[],idx=[],W=9;ramp.forEach((p,i)=>{if(i%4&&i!==ramp.length-1)return;pos.push(p.x,p.y,-W,p.x,p.y,W)});for(let i=0;i<pos.length/6-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
 const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));rg.setIndex(idx);rg.computeVertexNormals();rampMat=new THREE.MeshStandardMaterial({color:0x101a3a,roughness:.2,metalness:.8,side:THREE.DoubleSide,emissive:0x081030});scene.add(new THREE.Mesh(rg,rampMat));
 [-W,W].forEach(z=>{const g=new THREE.BufferGeometry(),a=[];for(let i=0;i<pos.length;i+=6)a.push(pos[i],pos[i+1],z);g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:0x38e8ff}));scene.add(l);rampMat.userData.lines=(rampMat.userData.lines||[]).concat(l)});
 lampLight=new THREE.PointLight(0x22d3ee,2,90);lampLight.position.set(12,24,12);scene.add(lampLight);
 carG=mkCar();scene.add(carG);
 ptsGeo=new THREE.BufferGeometry();ptsGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));ptsGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));for(let i=0;i<P;i++)pPos[i*3+1]=-9999;
 pts=new THREE.Points(ptsGeo,new THREE.PointsMaterial({size:1.5,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));pts.frustumCulled=false;scene.add(pts);
 orbMat=new THREE.MeshBasicMaterial({color:0x66ccff,transparent:true,opacity:.9});orb=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),orbMat);orbLight=new THREE.PointLight(0x66ccff,1.5,40);orb.add(orbLight);scene.add(orb);
 const dm=new THREE.MeshStandardMaterial({color:0x8899bb,metalness:.8,roughness:.3});for(let i=0;i<14;i++){const d=new THREE.Mesh(new THREE.BoxGeometry(.6,.3,.9),dm);d.visible=false;d.userData={v:new THREE.Vector3(),w:new THREE.Vector3()};scene.add(d);debris.push(d)}
 resize();on(window,'resize',resize);return true}
function mkCar(){const g=new THREE.Group(),M=(c,e,r,m)=>new THREE.MeshStandardMaterial({color:c,emissive:e||0,roughness:r,metalness:m});paintMat=M(0x9fb6d8,0,.25,.9);
 const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
 add(new THREE.BoxGeometry(4.8,.55,2.1),paintMat,0,-.1,0);add(new THREE.BoxGeometry(1.7,.3,1.8),paintMat,2.7,-.24,0).rotation.z=-.12;
 const cab=add(new THREE.SphereGeometry(1,18,10,0,TAU,0,Math.PI/2),M(0x0a1830,0x103060,.05,1),-.2,.15,0);cab.scale.set(1.6,.6,.85);
 add(new THREE.BoxGeometry(.6,.08,2.3),paintMat,-2.5,.6,0);[-.8,.8].forEach(z=>add(new THREE.BoxGeometry(.1,.4,.1),paintMat,-2.4,.4,z));
 const wm=M(0x05060a,0,.6,.2);[[1.6,1.05],[1.6,-1.05],[-1.6,1.05],[-1.6,-1.05]].forEach(([x,z])=>{const w=add(new THREE.CylinderGeometry(.5,.5,.4,16),wm,x,-.4,z);w.rotation.x=Math.PI/2});
 const hl=new THREE.MeshBasicMaterial({color:0xcff4ff});[-.65,.65].forEach(z=>add(new THREE.BoxGeometry(.12,.12,.5),hl,3.5,-.12,z));
 const tl=new THREE.MeshBasicMaterial({color:0xff4d6d});add(new THREE.BoxGeometry(.08,.1,1.9),tl,-2.42,.1,0);
 const pm=new THREE.MeshBasicMaterial({color:0x4aa8ff});[[1.7,.6],[1.7,-.6],[-1.7,.6],[-1.7,-.6]].forEach(([x,z])=>{add(new THREE.CylinderGeometry(.2,.2,.06,12),pm,x,-.38,z);const c=add(new THREE.ConeGeometry(.28,2.4,10,1,true),new THREE.MeshBasicMaterial({color:0x6cc4ff,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}),x,-1.6,z);c.rotation.z=Math.PI;c.visible=false;plumes.push(c)});
 const pl=new THREE.PointLight(0x88ccff,1.2,26);pl.position.set(4,0,0);g.add(pl);return g}
function resize(){if(!renderer)return;const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<.9?72:55;camera.updateProjectionMatrix()}
/* ---------- particles ---------- */
function em(x,y,z,vx,vy,vz,life,r,g,b){const i=pI;pI=(pI+1)%P;pPos[i*3]=x;pPos[i*3+1]=y;pPos[i*3+2]=z;pVel[i*3]=vx;pVel[i*3+1]=vy;pVel[i*3+2]=vz;pLife[i]=pMax[i]=life;pCol[i*3]=r;pCol[i*3+1]=g;pCol[i*3+2]=b}
function partStep(dt){for(let i=0;i<P;i++){if(pLife[i]<=0)continue;pLife[i]-=dt;if(pLife[i]<=0){pPos[i*3+1]=-9999;continue}const k=pLife[i]/pMax[i];pPos[i*3]+=pVel[i*3]*dt;pPos[i*3+1]+=pVel[i*3+1]*dt;pPos[i*3+2]+=pVel[i*3+2]*dt;pVel[i*3+1]-=12*dt;const f=Math.max(0,1-dt*2.2);pCol[i*3]*=f;pCol[i*3+1]*=f;pCol[i*3+2]*=f}
 ptsGeo.attributes.position.needsUpdate=true;ptsGeo.attributes.color.needsUpdate=true}
const rnd=(a)=>(Math.random()-.5)*a;
function explode(x,y){const n=reduce?60:160;for(let i=0;i<n;i++){const a=Math.random()*TAU,s=10+Math.random()*50,c=Math.random();em(x,y,rnd(2),Math.cos(a)*s,Math.sin(a)*s,rnd(20),.6+Math.random()*.9,1,.4+c*.5,.1+c*.2)}
 debris.forEach(d=>{d.visible=true;d.position.set(x,y,0);d.userData.v.set(rnd(40)+R.vx*.2,Math.random()*30+10,rnd(14));d.userData.w.set(rnd(12),rnd(12),rnd(12))})}
/* ---------- run ---------- */
function newRun(){lvl=Math.min(S.runs===0?0:S.runs%(1+Math.min(3,Math.floor(S.lands/1))),3);if(S.runs>0&&S.lands===0)lvl=0;
 R={x:-140,y:H,a:0,vx:0,vy:0,w:0,v:0,acc:0,s:0,gas:1,airT:0,maxY:0,a0:0,flips:0,rings:0,score:0,peakG:1,sink:0,tilt:0,landed:false,done:false,green:false,rt:0,mph:0,secret:false,perfect:false,reason:'',ringBonus:0,gasUsed:0,thr:false};
 buildLevel(lvl);applyCosmetics();carG.visible=true;debris.forEach(d=>d.visible=false);timeScale=1;shake=0;rIdx=0}
function buildLevel(i){const L=LV[i],r=rngF(L.seed);ringObjs.forEach(o=>scene.remove(o.m));ringObjs=[];
 const px=PADX+L.pad;padMesh.scale.x=L.half*2;padMesh.position.x=px;padMesh.userData.edges.forEach(e=>{e.scale.x=L.half*2;e.position.x=px});R.padX=px;R.padHalf=L.half;
 lampLight.color.setHex(L.lamp);rampMat.userData.lines.forEach(l=>l.material.color.setHex(L.lamp));
 const v0=83*MPH,ve=Math.sqrt(v0*v0-2*G*rampEnd.y),vx=ve*Math.cos(rampEnd.th),vy=ve*Math.sin(rampEnd.th),T=(vy+Math.sqrt(vy*vy+2*G*rampEnd.y))/G;
 const nom=t=>[rampEnd.x+vx*t,rampEnd.y+vy*t-G*t*t/2];
 for(let k=0;k<L.n;k++){const t=T*(.2+.66*k/(L.n-1)),[x,y]=nom(t);addRing(x+(r()-.5)*L.jit*2,Math.max(8,y+(r()-.5)*L.jit*2),L.rr,false)}
 const [sx,sy]=nom(T*.5);addRing(sx-14,sy+32,3.2,true)}
function addRing(x,y,rad,secret){const mat=new THREE.MeshBasicMaterial({color:secret?0xb18cff:[0x38e8ff,0x9b6bff,0x4d8dff][ringObjs.length%3],transparent:true,opacity:secret?.18:.95,blending:THREE.AdditiveBlending,depthWrite:false});const m=new THREE.Mesh(new THREE.TorusGeometry(rad,.32,12,40),mat);m.position.set(x,y,0);scene.add(m);ringObjs.push({m,mat,x,y,r:rad,secret,got:false,anim:0,min:1e9,near:false})}
function applyCosmetics(){paintMat.color.setHex(S.unlocked.includes('violet')?0x8a5cff:0x9fb6d8);const t2=S.unlocked.includes('theme2');roadMat.emissive.setHex(t2?0x2a1604:0x050a1a);laneMats.forEach((m,i)=>m.color.setHex(i<2?(t2?0xffb347:0x38e8ff):(t2?0xffd9a0:0x7fc8ff)));scene.fog.color.setHex(t2?0x160c08:0x070d28);scene.background.setHex(t2?0x120a08:0x050a1c);
 const stage=S.unlocked.length;orbMat.color.setHex([0x66ccff,0x22ffee,0xaa77ff,0xffcc66][Math.min(3,stage)]);orbLight.color.copy(orbMat.color)}
function startCount(){if(st==='RESULTS'||st==='TITLE'){}else{st='TITLE'}
 paused=false;show('pPause',false);newRun();if(!go('COUNT'))return;audioInit();const L=[...$('lights').children];L.forEach(i=>i.className='');
 [.5,1.2,1.9].forEach((t,i)=>later(t*1000,()=>{if(st!=='COUNT')return;L[i].className='r';sfx.beep()}));
 later((2.6+.7+Math.random()*1.1)*1000,()=>{if(st!=='COUNT')return;L[3].className='g';R.green=true;greenAt=performance.now();sfx.green();msg('GO!',700)},'green');
 msg('Wait for green',1800);if(S.runs>0)later(900,()=>echoSay(pick([`Best so far: ${S.best.toLocaleString()}.`,`${S.lands} landings on this road so far.`,`${S.rings} rings collected across your runs.`])),'echo')}
function attempt(){if(st!=='COUNT')return;const now=performance.now();if(now<lockUntil)return;if(!R.green){lockUntil=now+400;sfx.err();msg('Too early. Wait for green.',900);return}
 if(R.done)return;R.done=true;R.rt=(now-greenAt)/1000;R.mph=clamp(90-5*R.rt,76,90);R.v=0;R.acc=Math.pow(R.mph*MPH,2)/(2*140);R.vT=R.mph*MPH;if(!go('DRIVE'))return;
 msg(`Reaction ${R.rt.toFixed(3)} s · ${R.mph.toFixed(1)} mph`,2000);if(S.runs===0&&S.lands===0&&S.crashes===0)echoSay('So... you found the road.');else echoSay(pick(LINES.launch))}
/* ---------- physics ---------- */
const CORN=[[1.6,-.9],[-1.6,-.9],[2.4,.1],[-2.4,.1],[-2,.6],[2,.6]];
function step(dt){const c=R;
 if(st==='DRIVE'){c.v=Math.min(c.v+c.acc*dt,c.vT);c.x+=c.v*dt;c.y=H;c.a=0;c.vx=c.v;c.vy=0;c.peakG=Math.max(c.peakG,c.acc/G+1);if(c.x>=0){c.s=0;go('RAMP')}}
 else if(st==='RAMP'){const p=rampAt(c.s);c.v-=G*Math.sin(p.th)*dt;c.v=Math.max(c.v,20);c.s+=c.v*dt;const q=rampAt(c.s),Rr=q.th<Math.acos(1-14/22)?22:9;c.peakG=Math.max(c.peakG,c.v*c.v/Rr/G+Math.cos(q.th));
  c.x=q.x-Math.sin(q.th)*H;c.y=q.y+Math.cos(q.th)*H;c.a=q.th;c.vx=c.v*Math.cos(q.th);c.vy=c.v*Math.sin(q.th);
  if(c.s>=rampEnd.s){c.w=1.4;c.a0=c.a;c.airT=0;c.maxY=c.y;go('AIR')}}
 else if(st==='AIR'){c.airT+=dt;const ux=-Math.sin(c.a),uy=Math.cos(c.a);let ax=0,ay=-G;c.thr=inp.t&&c.gas>0;
  if(c.thr){ax+=26*ux;ay+=26*uy;c.gas=Math.max(0,c.gas-.28*dt);c.peakG=Math.max(c.peakG,Math.hypot(ax,ay+G)/G+1)}
  const px=c.x,py=c.y;c.vx+=ax*dt;c.vy+=ay*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;
  c.w+=((inp.l?1:0)-(inp.r?1:0))*14*dt;c.w*=Math.exp(-1.2*dt);c.w=clamp(c.w,-5,5);c.a+=c.w*dt;
  c.maxY=Math.max(c.maxY,c.y);const fl=Math.floor(Math.abs(c.a-c.a0)/TAU);if(fl>c.flips){c.flips=fl;msg('FLIP x'+fl,900);sfx.chime()}
  for(const r of ringObjs){if(r.got)continue;const dx=c.x-px,dy=c.y-py,l2=dx*dx+dy*dy||1e-9;const u=clamp(((r.x-px)*dx+(r.y-py)*dy)/l2,0,1),d=Math.hypot(px+dx*u-r.x,py+dy*u-r.y);
   if(d<r.r+1.2){r.got=true;c.rings++;c.gas=Math.min(1,c.gas+.35);sfx[r.secret?'secret':'chime']();for(let i=0;i<40;i++){const a=Math.random()*TAU;em(r.x+Math.cos(a)*r.r,r.y+Math.sin(a)*r.r,0,Math.cos(a)*14,Math.sin(a)*14,rnd(8),.7,.5,.9,1)}
    if(r.secret){c.secret=true;msg('Secret ring found',1600);echoSay(pick(LINES.secret))}else if(c.rings===1)echoSay(pick(LINES.ring))}
   else{r.min=Math.min(r.min,d);if(!r.near&&r.min<r.r+5&&d>r.min+2&&!r.secret){r.near=true;msg('Near miss!',700);for(let i=0;i<10;i++)em(r.x,r.y,0,rnd(20),rnd(20),0,.4,1,.6,.3)}}}
  let mn=1e9;const sa=Math.sin(c.a),ca=Math.cos(c.a);for(const [lx,ly] of CORN)mn=Math.min(mn,c.y+sa*lx+ca*ly);
  if(mn<=0&&c.vy<0){c.y-=mn;touch()}}
 else if(st==='LANDED'){c.x+=c.vx*dt;c.vx*=Math.exp(-1.8*dt);c.a-=wrap(c.a)*(1-Math.exp(-9*dt));c.y+=(H-c.y)*(1-Math.exp(-10*dt))}}
function touch(){const c=R;if(c.touched)return;c.touched=true;c.sink=-c.vy;c.tilt=Math.abs(wrap(c.a))*180/Math.PI;const onPad=Math.abs(c.x-c.padX)<=c.padHalf;
 const ok=onPad&&c.sink<=39&&c.tilt<=28;c.landed=ok;
 if(ok){c.perfect=c.sink<=10&&c.tilt<=6;c.vy=0;go('LANDED');sfx.land();shake=.5;landT=.5;for(let i=0;i<50;i++){const a=Math.PI*Math.random();em(c.x+rnd(4),.3,rnd(3),Math.cos(a)*20,Math.sin(a)*10,rnd(10),.6,.4,.9,1)}msg(c.perfect?'PERFECT LANDING':'Landed',1600);later(1900,finish,'fin')}
 else{c.reason=!onPad?'Missed the landing pad':c.sink>39?'Too much sink speed':'Landing angle too steep';go('CRASHED');sfx.crash();carG.visible=false;explode(c.x,Math.max(c.y,1));shake=1.2;timeScale=reduce?1:.25;later(1200,()=>{timeScale=1},'slow');msg(c.reason,2400);later(2500,finish,'fin')}}
/* ---------- results ---------- */
function finish(){if(st!=='LANDED'&&st!=='CRASHED')return;const c=R;
 const altPts=Math.round(c.maxY*10),airPts=Math.round(c.airT*100),ringPts=c.rings*500,flipPts=c.flips*1500,landPts=c.landed?Math.round(1000*(1-c.sink/39)+500*(1-c.tilt/28)):0;
 const score=ringPts+flipPts+altPts+airPts+landPts,prevBest=S.best,isBest=score>prevBest;const firstLand=c.landed&&S.lands===0,firstCrash=!c.landed&&S.crashes===0;
 let grade=score>=8000?'S':score>=6000?'A':score>=4500?'B':score>=3000?'C':'D';if(!c.landed&&'SAB'.includes(grade))grade='C';
 S.runs++;S.rings+=c.rings;S.flips+=c.flips;if(c.landed){S.lands++;if(c.sink<=20&&c.tilt<=10)S.clean++}else S.crashes++;if(isBest)S.best=score;S.bestSpeed=Math.max(S.bestSpeed,c.mph);const nu=unlockCheck();persist();applyCosmetics();
 let line;if(isBest&&prevBest>0)line=pick(LINES.best);else if(firstLand)line='You listened this time.';else if(firstCrash)line=LINES.crash[0];else if(c.landed)line=pick(LINES.land);else line=pick(LINES.crashMore);
 if(nu.length)line=pick(LINES.unlock);if(isBest&&prevBest>0)skyFlash=2.5;
 $('echo').classList.remove('on');$('grade').textContent=grade;const rs=$('rStatus');rs.textContent=c.landed?(c.perfect?'PERFECT LANDING':'LANDED'):'CRASHED: '+c.reason;rs.className='status '+(c.landed?'ok':'bad');
 $('rBest').hidden=!isBest;$('rPB').textContent=prevBest>0?`Personal best before this run: ${prevBest.toLocaleString()}`:'First scored run';$('rEcho').textContent='ECHO: '+line;
 const row=(a,b)=>`<tr><td>${a}</td><td>${b}</td></tr>`;
 $('rTable').innerHTML=row('Rings ('+c.rings+' × 500)',ringPts)+row('Flips ('+c.flips+' × 1,500)',flipPts)+row('Altitude points',altPts)+row('Airtime points',airPts)+row('Landing bonus',landPts)+row('Reaction time',c.rt.toFixed(3)+' s')+row('Ramp speed',c.mph.toFixed(1)+' mph')+row('Peak G',c.peakG.toFixed(1)+' G')+row('Max altitude',c.maxY.toFixed(0)+' ft')+row('Airtime',c.airT.toFixed(2)+' s')+row('Touchdown sink speed',c.sink.toFixed(1)+' ft/s')+row('Landing angle',c.tilt.toFixed(1)+'°');
 $('rUnlock').textContent=nu.length?'Unlocked: '+nu.map(k=>UNAME[k]).join(', '):'';$('shareNote').textContent='';
 c.final={score,grade,isBest,ringPts,flipPts,altPts,airPts,landPts};if(!go('RESULTS'))return;
 const el=$('rScore'),t0=performance.now();(function tick(n){const k=Math.min(1,(n-t0)/900);el.textContent=Math.round(score*k).toLocaleString();if(k<1&&st==='RESULTS')requestAnimationFrame(tick)})(t0);
 if(nu.length)later(1200,()=>sfx.secret())}
async function share(){const c=R;if(!c||!c.final)return;const f=c.final,cv=document.createElement('canvas');cv.width=cv.height=1080;const x=cv.getContext('2d');
 const g=x.createLinearGradient(0,0,1080,1080);g.addColorStop(0,'#050a1c');g.addColorStop(1,'#1a0b3d');x.fillStyle=g;x.fillRect(0,0,1080,1080);x.strokeStyle='#38e8ff';x.lineWidth=4;x.strokeRect(30,30,1020,1020);
 x.fillStyle='#e8f1ff';x.font='bold 84px sans-serif';x.fillText('ECHOBOUND',70,150);x.fillStyle='#8fa4c8';x.font='30px sans-serif';x.fillText('You drive the road. The road remembers you.',70,205);
 x.fillStyle='#38e8ff';x.font='bold 220px sans-serif';x.fillText(f.score.toLocaleString(),70,470);if(f.isBest){x.fillStyle='#5dffb0';x.font='bold 44px sans-serif';x.fillText('NEW PERSONAL BEST',70,540)}
 x.fillStyle='#e8f1ff';x.font='48px sans-serif';[`Grade ${f.grade}`,`Rings ${c.rings}   Flips ${c.flips}`,c.landed?(c.perfect?'Perfect landing':'Landed safely'):'Crashed: '+c.reason,`${c.mph.toFixed(1)} mph · ${c.maxY.toFixed(0)} ft up · ${c.airT.toFixed(1)} s air`].forEach((t,i)=>x.fillText(t,70,640+i*80));
 x.fillStyle='#6f84ad';x.font='26px sans-serif';x.fillText('Unofficial fan game, not affiliated with Tesla.',70,1020);
 const text=`ECHOBOUND: I scored ${f.score.toLocaleString()} (grade ${f.grade}), ${c.rings} rings, ${c.flips} flips. ${c.landed?'Landed it.':'Crashed.'}`;
 const blob=await new Promise(r=>cv.toBlob(r,'image/png'));try{const file=new File([blob],'echobound.png',{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:'ECHOBOUND',text,files:[file]});return}
  if(navigator.share){await navigator.share({title:'ECHOBOUND',text});return}}catch(e){if(e&&e.name==='AbortError')return}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='echobound-score.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
 let note='Score card downloaded.';try{await navigator.clipboard.writeText(text);note+=' Text copied too.'}catch(e){}$('shareNote').textContent=note}
/* ---------- frame ---------- */
let last=performance.now(),acc=0;
function frame(now){raf=requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.1);last=now;if(!renderer)return;
 if(!paused){for(let i=timers.length-1;i>=0;i--){const t=timers[i];t.t-=dt;if(t.t<=0){timers.splice(i,1);t.fn()}}
  if(R&&['DRIVE','RAMP','AIR','LANDED','CRASHED'].includes(st)){acc+=dt*timeScale;let n=0;while(acc>=DT&&n++<40){step(DT);acc-=DT}}
  visuals(dt)}
 renderer.render(scene,camera)}
function visuals(dt){if(!R)return;const c=R,air=st==='AIR'||st==='LANDED'||st==='CRASHED',run=st!=='TITLE'&&st!=='RESULTS'&&st!=='COUNT';
 carG.position.set(c.x,c.y,0);carG.rotation.z=c.a;landT=Math.max(0,landT-dt);carG.scale.y=1-Math.sin(landT*Math.PI*2)*.12*landT*2;
 const thr=st==='AIR'&&c.thr;plumes.forEach(p=>{p.visible=thr;if(thr)p.scale.y=.8+Math.random()*.5});
 const ux=-Math.sin(c.a),uy=Math.cos(c.a),ca=Math.cos(c.a),sa=Math.sin(c.a);
 if(thr&&(!reduce||Math.random()<.5))for(const [lx,lz] of [[1.7,.6],[1.7,-.6],[-1.7,.6],[-1.7,-.6]]){const wx=c.x+ca*lx+ux*-.4*-1*0+(-sa*-.4),wy=c.y+sa*lx+ca*-.4;em(wx,wy,lz,-ux*20+c.vx*.2+rnd(5),-uy*20+c.vy*.2+rnd(5),rnd(3),.4,.4,.7,1)}
 if(run&&st!=='CRASHED'&&(!reduce||Math.random()<.5)){const cy=S.unlocked.includes('trail');em(c.x-ca*2.6,c.y-sa*2.6,rnd(1),rnd(3),rnd(3),rnd(2),.7,cy?.2:.4,cy?1:.5,cy?1:1)}
 partStep(dt);
 debris.forEach(d=>{if(!d.visible)return;const u=d.userData;u.v.y-=G*dt;d.position.addScaledVector(u.v,dt);d.rotation.x+=u.w.x*dt;d.rotation.y+=u.w.y*dt;d.rotation.z+=u.w.z*dt;if(d.position.y<.2){d.position.y=.2;u.v.set(u.v.x*.5,Math.abs(u.v.y)*.3,u.v.z*.5)}});
 ringObjs.forEach(r=>{r.m.rotation.y+=dt*1.5;if(r.got){r.anim+=dt*2.2;const s=1+r.anim*1.2;r.m.scale.set(s,s,s);r.mat.opacity=Math.max(0,.9-r.anim);r.m.visible=r.anim<1}else if(r.secret){const d=Math.hypot(c.x-r.x,c.y-r.y);r.mat.opacity=d<45?.9:.18}});
 skyFlash=Math.max(0,skyFlash-dt);skyMats.forEach(m=>{m.emissiveIntensity=.6+skyFlash*1.4});
 const t=performance.now()/1000;orb.position.set(c.x+7*Math.cos(t*.9),c.y+6+Math.sin(t*1.7)*1.5,5);orb.scale.setScalar(1+Math.sin(t*3)*.12);
 // camera
 const k=1-Math.exp(-3*dt);let tx,ty,tz,lx,ly;if(!air){tx=c.x-24;ty=c.y+8;tz=20;lx=c.x+14;ly=c.y*.5+2}else{tz=70+Math.max(0,c.y)*.35;tx=c.x;ty=Math.max(c.y*.7,10)+6;lx=c.x;ly=c.y*.85+2}
 cb.x+=(tx-cb.x)*k;cb.y+=(ty-cb.y)*k;cb.z+=(tz-cb.z)*k;cl.x+=(lx-cl.x)*k;cl.y+=(ly-cl.y)*k;shake=Math.max(0,shake-dt*1.6);const sh=reduce?0:shake*shake*1.6;
 camera.position.set(cb.x+rnd(sh),cb.y+rnd(sh),cb.z);camera.lookAt(cl.x,cl.y,0);
 // hud + audio
 const sp=Math.hypot(c.vx,c.vy)/MPH;$('hSpd').textContent=Math.round(sp);$('hRings').textContent=c.rings;$('hFlips').textContent=c.flips;$('hRot').textContent=Math.round(wrap(c.a)*180/Math.PI)+'°';
 $('hScore').textContent=(c.rings*500+c.flips*1500).toLocaleString();$('gasBar').style.width=(c.gas*100)+'%';
 if(ac){humG.gain.value=run&&st!=='CRASHED'?.05:0;hum.frequency.value=50+sp*1.4;thrG.gain.value=thr?.18:0}}
function updateStats(){$('stats').textContent=S.runs?`Best ${S.best.toLocaleString()} · ${S.runs} runs · ${S.lands} landings · ${S.rings} rings · ${S.flips} flips${S.unlocked.length?' · '+S.unlocked.length+'/3 unlocks':''}`:'No runs yet. The road is waiting.'}
/* ---------- input ---------- */
function onSpace(){audioInit();if(st==='TITLE'&&!paused)startCount();else if(st==='COUNT')attempt()}
function togglePause(){if(!['COUNT','DRIVE','RAMP','AIR'].includes(st))return;paused=!paused;show('pPause',paused);if(paused){if(ac)ac.suspend()}else{if(ac)ac.resume();last=performance.now()}}
on(window,'keydown',e=>{if(e.code==='Space'){if(e.target.tagName==='INPUT'||e.target.tagName==='BUTTON')return;e.preventDefault();if(!e.repeat)onSpace();inp.t=true}
 else if(e.code==='ArrowLeft'){e.preventDefault();inp.l=true}else if(e.code==='ArrowRight'){e.preventDefault();inp.r=true}
 else if(e.code==='Escape')togglePause();else if(e.code==='KeyR'&&(st==='RESULTS'||paused)&&e.target.tagName!=='INPUT'){startCount()}});
on(window,'keyup',e=>{if(e.code==='Space')inp.t=false;else if(e.code==='ArrowLeft')inp.l=false;else if(e.code==='ArrowRight')inp.r=false});
on(window,'blur',()=>{inp.l=inp.r=inp.t=false});
function hold(id,dn,up){const el=$(id);on(el,'pointerdown',e=>{e.preventDefault();audioInit();try{el.setPointerCapture(e.pointerId)}catch(_){}el.classList.add('down');dn()});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>on(el,ev,e=>{e.preventDefault();el.classList.remove('down');up&&up()}));on(el,'contextmenu',e=>e.preventDefault())}
hold('bGo',attempt);hold('bL',()=>inp.l=true,()=>inp.l=false);hold('bR',()=>inp.r=true,()=>inp.r=false);hold('bT',()=>inp.t=true,()=>inp.t=false);
const clk=(id,f)=>on($(id),'click',e=>{e.target.blur();audioInit();f()});
clk('bStart',startCount);clk('bAgain',startCount);clk('bShare',share);clk('bPause',togglePause);clk('bResume',togglePause);clk('bRestart',startCount);
clk('bMenu1',()=>{paused=false;show('pPause',false);st='RESULTS';timers.length=0;go('TITLE')});clk('bMenu2',()=>go('TITLE'));
clk('bReset',()=>{if(confirm('Reset all ECHOBOUND progress? This cannot be undone.')){Object.assign(S,{best:0,runs:0,lands:0,clean:0,crashes:0,rings:0,flips:0,bestSpeed:0,unlocked:[]});persist();if(R)applyCosmetics();updateStats()}});
on($('mute'),'change',e=>{muted=e.target.checked;setVol()});on($('vol'),'input',e=>{vol=e.target.value/100;setVol()});
on(document,'visibilitychange',()=>{if(document.hidden&&['COUNT','DRIVE','RAMP','AIR'].includes(st)&&!paused)togglePause()});
on(window,'pagehide',()=>{cancelAnimationFrame(raf);subs.forEach(([t,e,f,o])=>t.removeEventListener(e,f,o));if(renderer)renderer.dispose();if(ac)ac.close()});
/* ---------- boot ---------- */
load();updateStats();
if(init()){newRun();enter('TITLE');raf=requestAnimationFrame(frame)}
})();
