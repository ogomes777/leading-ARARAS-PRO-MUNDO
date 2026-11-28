// Araras World — jogo de voo. Túnel no trilho (scroll), depois mundo livre com mecânica de ave,
// câmera de jogo, coleta, missões, poderes, minimapa e pouso no Araras.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {buildWorld,WORLD,height,SUN} from './world.js';
import {buildBar} from './bar.js';

const $=id=>document.getElementById(id);
const canvas=$('view');
const R=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.AgXToneMapping;R.toneMappingExposure=1.05;R.autoClear=false;
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(58,1,.3,24000);
const world=buildWorld(R,scene);
const bar=buildBar(R);bar.group.position.copy(WORLD.bar);bar.group.rotation.y=Math.PI;scene.add(bar.group); // fachada voltada para quem chega do sul
const doorWorld=bar.door.clone().applyMatrix4(bar.group.matrixWorld.compose(bar.group.position,bar.group.quaternion,bar.group.scale));

// ---------- arara: cena própria (luz do laboratório) compartilhando a profundidade do mundo ----------
const birdScene=new THREE.Scene();
birdScene.environment=new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(),.04).texture;
{const k=new THREE.DirectionalLight(0xffffff,1.6);k.position.set(2,3,2);birdScene.add(k);const r=new THREE.DirectionalLight(0xffffff,.9);r.position.set(-2,1.5,-3);birdScene.add(r);}
const birdRoot=new THREE.Group();birdRoot.matrixAutoUpdate=false;birdScene.add(birdRoot);const mirror=new THREE.Object3D(),flipY=new THREE.Matrix4().makeScale(1,-1,1);
const flyer=new THREE.Group();birdRoot.add(flyer);           // trajetória + orientação aerodinâmica
const roller=new THREE.Group();flyer.add(roller);             // pirueta
const comp=new THREE.Group();roller.add(comp);                // compensação de postura por clip
let model=null,mixer=null,act={},bones={},span=1;const neck={x:0,y:0,z:0};
const CLIP_PITCH={AERO:12.2,BANK:12.2,LANDING:12.2,FLAP:67.2,GLIDE:67.2}; // medido no Laboratório
const b64=t=>{const s=atob(t.trim()),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;};
fetch('../araras-master.glb').then(r=>{if(!r.ok)throw Error('glb');return r.arrayBuffer();}).then(buf=>new GLTFLoader().parseAsync(buf,''))
 .then(g=>{model=g.scene;const an=R.capabilities.getMaxAnisotropy();
   model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;for(const m of [].concat(o.material))for(const t of [m.map,m.normalMap])if(t){t.anisotropy=an;t.needsUpdate=true;}}
     if(o.isBone){if(/Head_0/.test(o.name))bones.h0=o;if(/Head_1/.test(o.name))bones.h1=o;if(/Head_2/.test(o.name))bones.h2=o;
       if(/0_Left_Limb_0/.test(o.name))bones.wl=o;if(/0_Right_Limb_0/.test(o.name))bones.wr=o;}});
   mixer=new THREE.AnimationMixer(model);window.__anims=g.animations;
   for(const c of g.animations){const k=Object.keys(CLIP_PITCH).find(k=>c.name.includes(k));if(k){act[k]=mixer.clipAction(c);act[k].play();act[k].setEffectiveWeight(k==='AERO'?1:0);}}
   mixer.update(0);model.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(model,true);
   const c=b.getCenter(new THREE.Vector3());span=b.getSize(new THREE.Vector3()).x;model.position.sub(c);
   comp.add(model);comp.scale.setScalar(3.2/span);           // envergadura de 3,2 m no mundo
   $('loading').hidden=true;window.GAME_READY=true;})
 .catch(e=>{$('loading').textContent='Não consegui carregar a arara';console.error(e);});

// ---------- configurações (salvas neste navegador) ----------
const CFG_DEF={friends:true,difficulty:'normal',music:'aventura',volume:.6,camSens:1,camReturn:2.5,camTilt:1,btnScale:1,btnAlpha:.75,layout:{},sound:true,camDist:1,camHeight:.2,fov:58,sens:1,invert:false,hudMap:true,hudQuest:true,hudKeys:true,hudArrow:true,quality:1.5};
const MOBILE=matchMedia('(pointer: coarse)').matches;if(MOBILE){CFG_DEF.quality=1;CFG_DEF.camDist=.72;CFG_DEF.camHeight=.16;}
const CFG=Object.assign({},CFG_DEF);try{Object.assign(CFG,JSON.parse(localStorage.getItem('araras-game')||'{}'));}catch(e){}
CFG.camDist=Math.min(1.8,Math.max(.55,+CFG.camDist||1));CFG.quality=Math.min(MOBILE?1.25:2,+CFG.quality||1);
const saveCfg=()=>{try{localStorage.setItem('araras-game',JSON.stringify(CFG));}catch(e){}applyCfg();};
function applyCfg(){window.QUALITY=CFG.quality;applyLayout();setMusic&&setMusic(CFG.music);if(window.MUSICVOL)MUSICVOL.gain.value=CFG.volume*.5;document.body.classList.toggle('noMap',!CFG.hudMap);document.body.classList.toggle('noQuest',!CFG.hudQuest);document.body.classList.toggle('noKeys',!CFG.hudKeys);}
window.CFG=CFG;
// ---------- estado ----------
const G={phase:'tunnel',t:0,rail:0,railV:4,lat:new THREE.Vector2(),
  pos:new THREE.Vector3().copy(WORLD.tunnelStart).add(new THREE.Vector3(0,0,-8)),yaw:0,pitch:0,roll:0,speed:22,
  flap:0,rollSpin:0,rollDir:0,boostT:0,boostCD:0,mode:'story',
  powers:{roll:false,boost:false,turbo:false,magnet:false,wind:false},mem:0,lvl:0,score:0,pow:{magnet:0,x2:0,turbo:0},inWind:false,memT:0,items:{pena:0,uva:0,vinil:0,canastra:0},rings:0,landing:null,orbit:{yaw:0,pitch:0,tYaw:0,tPitch:0,rel:0,vy:0,vp:0,drag:false}};
window.G=G;
const EMBED=/[?&]embed=1/.test(location.search);
if(EMBED){document.body.classList.add('embed');window.PAUSED=true;addEventListener('message',e=>{if(e.origin===location.origin&&e.data&&e.data.araras==='start'){window.PAUSED=false;}});
  setTimeout(()=>{try{if(window.parent===window)window.PAUSED=false;}catch(_){}},0);}window.DOOR=doorWorld;window.tryLand=tryLand;window.SNAP=()=>{camVel&&camVel.set(0,0,0);forward(G.yaw,0);camPos.copy(G.pos).addScaledVector(fwd,-10).add(new THREE.Vector3(0,3,0));camLook.copy(G.pos);};

// ---------- entrada: teclado, mouse, touch ----------
const key={};
addEventListener('keydown',e=>{key[e.code]=true;
  if(e.code==='KeyM')toggleMap();if(e.code==='Escape'){$('settings').hidden=true;$('bigmap').hidden=true;}if(e.code==='KeyQ')doRoll(-1);if(e.code==='KeyE')doRoll(1);if(e.code==='KeyF')doBoost();if(e.code==='KeyL')tryLand();
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();});
addEventListener('keyup',e=>{key[e.code]=false;});
addEventListener('wheel',e=>{if(e.target.closest&&e.target.closest('#settings'))return;if(G.phase==='tunnel'){G.railV=Math.min(26,Math.max(2,G.railV+e.deltaY*.02));}else{CFG.camDist=Math.min(1.8,Math.max(.55,CFG.camDist*(1+e.deltaY*.001)));saveCfg();window.syncCfg&&window.syncCfg();}},{passive:true});
const joy={x:0,y:0,id:null,ox:0,oy:0};const btn={flap:false,dive:false};
{const pad=$('joy'),knob=$('knob');
 pad.addEventListener('pointerdown',e=>{joy.id=e.pointerId;const r=pad.getBoundingClientRect();joy.ox=r.left+r.width/2;joy.oy=r.top+r.height/2;pad.setPointerCapture(e.pointerId);move(e);});
 const move=e=>{if(e.pointerId!==joy.id)return;let dx=(e.clientX-joy.ox)/50,dy=(e.clientY-joy.oy)/50;const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}joy.x=dx;joy.y=dy;knob.style.transform=`translate(${dx*36}px,${dy*36}px)`;};
 pad.addEventListener('pointermove',move);
 const end=e=>{if(e.pointerId!==joy.id)return;joy.id=null;joy.x=joy.y=0;knob.style.transform='';};pad.addEventListener('pointerup',end);pad.addEventListener('pointercancel',end);
 for(const [id,k] of [['bFlap','flap'],['bDive','dive']]){const b=$(id);b.addEventListener('pointerdown',()=>btn[k]=true);for(const ev of ['pointerup','pointerleave','pointercancel'])b.addEventListener(ev,()=>btn[k]=false);}
 $('bRoll').onclick=()=>doRoll(1);$('bBoost').onclick=()=>doBoost();$('bLand').onclick=()=>tryLand();}
// câmera: arrastar (mouse ou dedo fora dos controles) gira com inércia; solta e ela volta suave para trás da arara
{const ptrs=new Map();let pinch=0;
 canvas.addEventListener('pointerdown',e=>{ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);G.orbit.rel=0;G.orbit.drag=true;});
 canvas.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
   if(ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)CFG.camDist=Math.min(1.8,Math.max(.55,CFG.camDist*pinch/d));pinch=d;return;}
   if(G.phase==='tunnel'&&e.pointerType!=='mouse'){G.railV=Math.min(26,Math.max(2,G.railV-dy*.04));return;}
   const k=(e.pointerType==='mouse'?3.2:4.2)*CFG.camSens;G.orbit.vy=-dx/innerWidth*k*60;G.orbit.vp=dy/innerHeight*k*36;
   G.orbit.tYaw+=-dx/innerWidth*k;G.orbit.tPitch=Math.max(-.9,Math.min(1.1,G.orbit.tPitch+dy/innerHeight*k*.6));});
 const up=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=0;if(!ptrs.size){G.orbit.drag=false;G.orbit.rel=performance.now();saveCfg();}};
 canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);}
function input(){
  const ax=(key.KeyD||key.ArrowRight?1:0)-(key.KeyA||key.ArrowLeft?1:0)+joy.x;
  const ay=((key.KeyW||key.ArrowUp?1:0)-(key.KeyS||key.ArrowDown?1:0)-joy.y)*(CFG.invert?-1:1);
  return {turn:Math.max(-1,Math.min(1,ax*CFG.sens)),climb:Math.max(-1,Math.min(1,ay)),flap:!!(key.Space||btn.flap),dive:!!(key.ShiftLeft||key.ShiftRight||btn.dive)};
}
function doRoll(dir){if(G.phase!=='free'||G.rollSpin>0)return;if(!G.powers.roll){toast('Pirueta bloqueada · colete 10 penas douradas');return;}G.rollSpin=1;G.rollDir=dir;}
function doBoost(){if(G.phase!=='free'||G.boostCD>0)return;if(!G.powers.boost){toast('Arrancada bloqueada · passe por 5 arcos de videira');return;}G.boostT=1.4;G.boostCD=4;}

// ---------- itens e missões ----------
const haloT=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,236,170,1)');gr.addColorStop(.25,'rgba(255,200,90,.6)');gr.addColorStop(1,'rgba(255,180,60,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);})();
const ITEMS=[];const itemGroup=new THREE.Group();scene.add(itemGroup);
const gold=new THREE.MeshStandardMaterial({color:0xffc63a,emissive:0x8a5a00,emissiveIntensity:.8,metalness:.6,roughness:.3});
const featherGeo=(()=>{const s=new THREE.Shape();s.moveTo(0,-1.4);s.quadraticCurveTo(.55,-.2,0,1.4);s.quadraticCurveTo(-.55,-.2,0,-1.4);return new THREE.ExtrudeGeometry(s,{depth:.08,bevelEnabled:false});})();
const MESH={
  pena:()=>{const g=new THREE.Group();const f=new THREE.Mesh(featherGeo,gold);f.scale.setScalar(1.5);g.add(f);const h=new THREE.Sprite(new THREE.SpriteMaterial({map:haloT,color:0xffd34d,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.75}));h.scale.setScalar(7);g.add(h);return g;},
  uva:()=>{const g=new THREE.Group();const m=new THREE.MeshStandardMaterial({color:0x6a1a4a,emissive:0x2a0418,roughness:.25});for(let i=0;i<14;i++){const r=Math.floor(i/4);const s=new THREE.Mesh(new THREE.SphereGeometry(.38,10,8),m);s.position.set(Math.cos(i*2.4)*.5*(1-r*.2),-r*.5,Math.sin(i*2.4)*.5*(1-r*.2));g.add(s);}return g;},
  vinil:()=>{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.4,.08,40),new THREE.MeshStandardMaterial({color:0x111111,roughness:.25,metalness:.4})));const l=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.1,24),new THREE.MeshStandardMaterial({color:0xe8b323,emissive:0x664400}));g.add(l);g.rotation.x=Math.PI/2;return g;},
  canastra:()=>{const g=new THREE.Group();const m=new THREE.Mesh(new THREE.CylinderGeometry(2,2,1.3,40),new THREE.MeshStandardMaterial({color:0xf2d27a,emissive:0x5a3a00,emissiveIntensity:.6,roughness:.6}));g.add(m);const h=new THREE.Mesh(new THREE.TorusGeometry(2.6,.12,8,48),gold);h.rotation.x=Math.PI/2;g.add(h);return g;},
  arco:()=>{const g=new THREE.Group();const t=new THREE.Mesh(new THREE.TorusGeometry(9,.7,10,48),new THREE.MeshStandardMaterial({color:0x6a4a2e,roughness:.9}));g.add(t);
    const lm=new THREE.MeshStandardMaterial({color:0x5f8f2a,roughness:.8,side:THREE.DoubleSide});for(let i=0;i<40;i++){const a=i/40*6.28;const l=new THREE.Mesh(new THREE.CircleGeometry(.9,5),lm);l.position.set(Math.cos(a)*9,Math.sin(a)*9,(Math.random()-.5));l.rotation.set(Math.random()*3,Math.random()*3,0);g.add(l);}return g;}};
function addItem(kind,p,r=3){const o=MESH[kind]();o.position.copy(p);itemGroup.add(o);ITEMS.push({kind,o,p:o.position,r,got:false});}
// ---------- penas em trilhas pelo mapa ----------
const exit=WORLD.tunnelStart.clone().add(new THREE.Vector3(0,0,WORLD.tunnelLen));
const gy=(x,z,o)=>Math.max(height(x,z),0)+o;
for(let i=0;i<16;i++)addItem('pena',exit.clone().add(new THREE.Vector3(Math.sin(i*.55)*40,Math.sin(i*.8)*10-4,60+i*55)),4);
for(let i=0;i<22;i++){const a=i*.42;addItem('pena',new THREE.Vector3(Math.cos(a)*90+120,300+i*3,-1700+Math.sin(a)*90),4);}         // espiral sobre as nuvens
for(const [z0,side] of [[-700,1],[200,-1],[1000,1]])for(let i=0;i<18;i++){const z=z0+i*32,x=WORLD.riverX(z)+side*(20+Math.sin(i*.5)*30);addItem('pena',new THREE.Vector3(x,gy(x,z,14+Math.sin(i*.7)*6),z),4);} // rasantes no rio
for(let i=0;i<20;i++){const a=i/20*6.28;const x=-700+Math.cos(a)*120,z=300+Math.sin(a)*120;addItem('pena',new THREE.Vector3(x,gy(x,z,60),z),4);} // anel no morro
// arcos de videira no céu, descendo pelas nuvens
for(let i=0;i<6;i++){const z=exit.z+900+i*230,x=Math.sin(i*1.3)*120;addItem('arco',new THREE.Vector3(x,330-i*48,z),9);}
// uvas e vinis pelo vale, Canastra escondido numa curva do rio
for(let i=0;i<24;i++){const z=-900+i*110,x=WORLD.riverX(z)+Math.sin(i)*60;addItem(i%3?'uva':'vinil',new THREE.Vector3(x,gy(x,z,38+Math.sin(i*.7)*12),z),4);}
{const z=600,x=WORLD.riverX(z)-260;addItem('canastra',new THREE.Vector3(x,gy(x,z,20),z),6);}
// ---------- lembranças: a história da volta para casa ----------
const MEMS=[
 [exit.clone().add(new THREE.Vector3(0,6,950)),'Sozinha no céu, ela procura o caminho de casa.'],
 [new THREE.Vector3(120,345,-1700),'Cada pena dourada é uma lembrança que ficou pelo caminho.'],
 [new THREE.Vector3(WORLD.riverX(-600),gy(WORLD.riverX(-600),-600,30),-600),'Lá embaixo, a floresta ainda conhece o seu canto.'],
 [new THREE.Vector3(-700,gy(-700,300,90),300),'O som da casa: música, risadas, copos que se encontram.'],
 [new THREE.Vector3(WORLD.riverX(600)-200,gy(WORLD.riverX(600)-200,600,40),600),'O cheiro da cozinha mineira atravessa a mata.'],
 [new THREE.Vector3(WORLD.riverX(1150)+60,gy(WORLD.riverX(1150)+60,1150,22),1150),'Saudade também é um jeito de voltar.'],
 [WORLD.bar.clone().add(new THREE.Vector3(-40,70,-380)),'Ela não está mais sozinha. Está quase em casa.']];
const memMat=new THREE.MeshBasicMaterial({color:0xffe6a0});

MESH.memoria=()=>{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.1,2),memMat));const f=new THREE.Mesh(featherGeo,gold);f.scale.setScalar(.7);g.add(f);
  const h=new THREE.Sprite(new THREE.SpriteMaterial({map:haloT,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));h.scale.setScalar(16);g.add(h);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.4,1.6,260,12,1,true),new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:.14,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));beam.position.y=130;g.add(beam);return g;};
MESH.esp=()=>{const g=new THREE.Group();const m=new THREE.Mesh(new THREE.OctahedronGeometry(1.6,0),new THREE.MeshBasicMaterial({color:0x7fe0ff}));g.add(m);
  const h=new THREE.Sprite(new THREE.SpriteMaterial({map:haloT,color:0x7fe0ff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));h.scale.setScalar(12);g.add(h);return g;};
MEMS.forEach(([p,txt],i)=>{addItem('memoria',p,7);ITEMS[ITEMS.length-1].txt=txt;ITEMS[ITEMS.length-1].idx=i;});
const DIFF={facil:{r:2.5,mag:42,low:0,lead:1.3,score:.8},normal:{r:0,mag:26,low:.4,lead:1,score:1},dificil:{r:-1.2,mag:14,low:.85,lead:.8,score:1.5}};
const dif=()=>DIFF[CFG.difficulty]||DIFF.normal;
// gerador infinito de desafios: trilhas, anéis, rasantes e zigue-zagues à frente da arara
let spawnT=0;const PATTERNS=['linha','anel','zigue','rasante','espiral'];
function spawnPattern(){const d=dif();forward(G.yaw,0);const ahead=G.pos.clone().addScaledVector(fwd,260+Math.random()*220);
  ahead.x+=(Math.random()-.5)*260;ahead.z+=(Math.random()-.5)*120;const gh=Math.max(height(ahead.x,ahead.z),0);
  const kind=PATTERNS[Math.floor(Math.random()*PATTERNS.length)];const low=Math.random()<d.low;
  let base=low?gh+10+Math.random()*12:Math.max(gh+50,ahead.y=G.pos.y+(Math.random()-.4)*60);ahead.y=Math.min(560,base);
  const right=new THREE.Vector3(Math.cos(G.yaw),0,-Math.sin(G.yaw));const grp={t:0,n:0,got:0,id:Math.random()};const n=kind==='anel'?10:kind==='espiral'?14:9;
  for(let i=0;i<n;i++){let p;const f=i/(n-1);
    if(kind==='linha')p=ahead.clone().addScaledVector(fwd,i*26);
    else if(kind==='anel'){const a=f*6.28;p=ahead.clone().addScaledVector(right,Math.cos(a)*14).add(new THREE.Vector3(0,Math.sin(a)*14,0));}
    else if(kind==='zigue')p=ahead.clone().addScaledVector(fwd,i*28).addScaledVector(right,(i%2?1:-1)*22*d.lead);
    else if(kind==='rasante'){p=ahead.clone().addScaledVector(fwd,i*30);p.y=Math.max(height(p.x,p.z),0)+7+Math.sin(f*3.14)*6;}
    else{const a=f*12.56;p=ahead.clone().addScaledVector(fwd,i*16).addScaledVector(right,Math.cos(a)*16).add(new THREE.Vector3(0,Math.sin(a)*16,0));}
    p.y=Math.max(p.y,Math.max(height(p.x,p.z),0)+5);addItem(Math.random()<.08?'uva':'pena',p,4+d.r);const it=ITEMS[ITEMS.length-1];it.grp=grp;it.spawned=true;grp.n++;}
  if(Math.random()<.12){const p=ahead.clone().addScaledVector(fwd,300).add(new THREE.Vector3(0,20,0));addItem('vinil',p,4+d.r);ITEMS[ITEMS.length-1].spawned=true;}
  if(Math.random()<.22){const p=ahead.clone().addScaledVector(fwd,n*22+20);addItem('esp',p,5+d.r);const it=ITEMS[ITEMS.length-1];it.spawned=true;it.esp=['magnet','x2','turbo'][Math.floor(Math.random()*3)];}}
function cleanFar(){for(let i=ITEMS.length-1;i>=0;i--){const it=ITEMS[i];if(it.spawned&&(it.got||it.p.distanceTo(G.pos)>1700)){itemGroup.remove(it.o);ITEMS.splice(i,1);}}}
// ---------- desbloqueios (sem ordem obrigatória: voe, colete e brinque à vontade) ----------
const UNLOCKS=[
 {k:'roll',when:()=>G.items.pena>=10,msg:'Poder liberado · Pirueta (Q/E)'},
 {k:'magnet',when:()=>G.mem>=3,msg:'Poder liberado · Ímã de penas: elas vêm até você'},
 {k:'boost',when:()=>G.rings>=5,msg:'Poder liberado · Arrancada (F)'},
 {k:'turbo',when:()=>G.items.canastra>=1,msg:'Poder liberado · Mergulho turbo (Shift)'},
 {k:'wind',when:()=>G.mem>=5,msg:'A corrente de vento dourada apareceu · ela leva você para casa'}];
function missionText(){if(G.phase==='landed')return 'Em casa';if(G.mem<MEMS.length)return `Encontre as lembranças · siga a luz dourada`;return 'Leve todas as lembranças para casa';}
function missionTarget(){if(G.mem>=MEMS.length||G.phase==='landing')return doorWorld;let best=null,bd=1e9;
  for(const it of ITEMS){if(it.got||it.kind!=='memoria')continue;const d=it.p.distanceToSquared(G.pos);if(d<bd){bd=d;best=it;}}return best?best.p:doorWorld;}
// ---------- corrente de vento dourada até o Araras ----------
const windCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-300,200,-900),new THREE.Vector3(WORLD.riverX(-300),120,-300),new THREE.Vector3(WORLD.riverX(400)+80,90,400),new THREE.Vector3(WORLD.riverX(1100),70,1100),WORLD.bar.clone().add(new THREE.Vector3(0,45,-330))]);
const WS=windCurve.getSpacedPoints(400);const windG=new THREE.BufferGeometry();const NWP=1600,wp=new Float32Array(NWP*3),wseed=new Float32Array(NWP*2);
for(let i=0;i<NWP;i++){wseed[i*2]=Math.random();wseed[i*2+1]=Math.random();}
windG.setAttribute('position',new THREE.BufferAttribute(wp,3));
const windPts=new THREE.Points(windG,new THREE.PointsMaterial({color:0xffd27a,size:2.2,map:haloT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.9}));
windPts.frustumCulled=false;windPts.visible=false;scene.add(windPts);
function updateWind(t){if(!windPts.visible)return;for(let i=0;i<NWP;i++){const u=(wseed[i*2]+t*.02)%1,pt=windCurve.getPointAt(u);const a=wseed[i*2+1]*6.28,rr=4+8*((i*7)%10)/10;
  wp[i*3]=pt.x+Math.cos(a+u*40)*rr;wp[i*3+1]=pt.y+Math.sin(a+u*40)*rr*.6;wp[i*3+2]=pt.z+Math.sin(a)*rr;}windG.attributes.position.needsUpdate=true;}
function windAt(p){let bi=0,bd=1e9;for(let i=0;i<WS.length;i+=2){const d=WS[i].distanceToSquared(p);if(d<bd){bd=d;bi=i;}}return {d:Math.sqrt(bd),i:bi};}
// ---------- companheiros: cada lembrança traz um pássaro para voar junto ----------
const friends=[];window.FRIENDS=friends;
// companheiras: cópias menores da própria arara MASTER (mesmo modelo, mesmas animações, mesma luz do laboratório)
function makeFriend(i){if(!model||CFG.friends===false)return;if(MOBILE&&friends.length>=2)return;
  const g=new THREE.Group(),inner=new THREE.Group();const c=cloneSkinned(model);inner.add(c);g.add(inner);
  inner.scale.setScalar(comp.scale.x*(.62+Math.random()*.08));inner.rotation.x=THREE.MathUtils.degToRad(6);
  c.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
  const mx=new THREE.AnimationMixer(c);const clip=(window.__anims||[]).find(a=>/AERO/.test(a.name));if(clip){const ac=mx.clipAction(clip);ac.play();ac.time=Math.random()*clip.duration;ac.setEffectiveTimeScale(.9+Math.random()*.25);}
  g.userData={mx};g.position.copy(G.pos).add(new THREE.Vector3((Math.random()-.5)*20,8,-20));birdRoot.add(g);friends.push(g);}
const fTmp=new THREE.Vector3(),fQ=new THREE.Quaternion();
function updateFriends(dt){friends.forEach((f,i)=>{const side=i%2?1:-1,row=Math.floor(i/2)+1;
  let tgt;if(G.phase==='landed'){const a=i/friends.length*3.14-1.57;tgt=doorWorld.clone().add(new THREE.Vector3(Math.cos(a)*7,4.5+Math.sin(i)*.5,-1+Math.sin(a)*2));}
  else{tgt=new THREE.Vector3(side*(6+row*3),1.6+row*.9+Math.sin(G.t*1.3+i)*.4,2-row*1.2).applyEuler(flyer.rotation).add(G.pos);}
  fTmp.copy(f.position);f.position.lerp(tgt,1-Math.exp(-3*dt));const v=f.position.clone().sub(fTmp);
  if(v.lengthSq()>1e-5){const look=f.position.clone().add(v);f.lookAt(look);} 
  f.userData.mx.update(G.phase==='landed'&&f.position.distanceTo(tgt)<.8?dt*.2:dt);f.visible=CFG.friends!==false&&f.position.distanceTo(cam.position)>7;});}
// ---------- efeitos de coleta: brilho + som ----------
const bursts=[];const bGeo=new THREE.BufferGeometry();
function burst(p,color){const n=26,pos=new Float32Array(n*3),vel=[];for(let i=0;i<n;i++){pos.set([p.x,p.y,p.z],i*3);vel.push(new THREE.Vector3((Math.random()-.5),(Math.random()-.2),(Math.random()-.5)).normalize().multiplyScalar(6+Math.random()*8));}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));const m=new THREE.PointsMaterial({color,size:1.4,map:haloT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const pts=new THREE.Points(g,m);pts.frustumCulled=false;scene.add(pts);bursts.push({pts,vel,t:0});}
function updateBursts(dt){for(let k=bursts.length-1;k>=0;k--){const b=bursts[k];b.t+=dt;const P=b.pts.geometry.attributes.position;for(let i=0;i<b.vel.length;i++){P.setXYZ(i,P.getX(i)+b.vel[i].x*dt,P.getY(i)+b.vel[i].y*dt,P.getZ(i)+b.vel[i].z*dt);}P.needsUpdate=true;
  b.pts.material.opacity=Math.max(0,1-b.t/.8);if(b.t>.8){scene.remove(b.pts);b.pts.geometry.dispose();b.pts.material.dispose();bursts.splice(k,1);}}}
let AC=null,combo=0,comboT=0;
function audio(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC;}
addEventListener('pointerdown',audio,{once:true});addEventListener('keydown',audio,{once:true});
function chime(freqs,dur=.5,vol=.08,type='sine'){if(CFG.sound===false||!audio())return;const t0=AC.currentTime;freqs.forEach((f,i)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;
  g.gain.setValueAtTime(0,t0+i*.06);g.gain.linearRampToValueAtTime(vol,t0+i*.06+.02);g.gain.exponentialRampToValueAtTime(.0001,t0+i*.06+dur);o.connect(g).connect(AC.destination);o.start(t0+i*.06);o.stop(t0+i*.06+dur+.05);});}
// pontos flutuando no centro e banner de poder liberado
function floatScore(txt,color){const e=document.createElement('div');e.className='fscore';e.textContent=txt;e.style.color=color;e.style.left=(46+Math.random()*8)+'%';$('fx').appendChild(e);setTimeout(()=>e.remove(),1100);}
const POWER_INFO={esp_magnet:['Ímã gigante','12 s · tudo vem até você','M6 3v9a6 6 0 0 0 12 0V3h-4v9a2 2 0 0 1-4 0V3z'],esp_x2:['Pontos em dobro','12 s · cada item vale ×2','M4 12h16M12 4v16'],esp_turbo:['Turbo','6 s · velocidade máxima','M13 2 3 14h7l-1 8 10-12h-7z'],roll:['Pirueta','Q / E · gire no ar','M12 3a9 9 0 1 0 9 9h-3l4 4 4-4h-3A11 11 0 1 1 12 1z'],magnet:['Ímã de penas','as penas vêm até você','M6 3v9a6 6 0 0 0 12 0V3h-4v9a2 2 0 0 1-4 0V3z'],boost:['Arrancada','F · explosão de velocidade','M13 2 3 14h7l-1 8 10-12h-7z'],turbo:['Mergulho turbo','Shift · mergulho mais rápido','M12 2v14m0 0-5-5m5 5 5-5M5 21h14'],wind:['Vento de casa','a corrente dourada leva você ao Araras','M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8']};
function unlockBanner(k){const [t,d,ic]=POWER_INFO[k]||['Novo poder','',''];const b=$('unlock');b.innerHTML=`<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#10233a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ic}"/></svg><div><small>Poder liberado</small><strong>${t}</strong><span>${d}</span></div>`;
  b.classList.remove('on');void b.offsetWidth;b.classList.add('on');}
function pop(id){const e=$(id);if(!e)return;e.classList.remove('pop');void e.offsetWidth;e.classList.add('pop');}
// ---------- HUD ----------
let toastT=0,acc0=0;function toast(t){$('toast').textContent=t;$('toast').classList.add('on');toastT=3.2;}
function hud(){$('mission').textContent=missionText();
  $('cPena').textContent=G.items.pena;$('cUva').textContent=G.items.uva;$('cVinil').textContent=G.items.vinil;$('cQueijo').textContent=G.items.canastra;
  $('pw').innerHTML=Object.entries(G.pow).filter(([k,v])=>v>0).map(([k,v])=>`<span class="pwr">${{magnet:'Ímã',x2:'×2',turbo:'Turbo'}[k]} <b>${Math.ceil(v)}</b></span>`).join('');$('lvl').textContent='Velocidade '+(G.lvl+1);$('lvlBar').style.width=(G.lvl>=5?100:(G.items.pena%8)/8*100)+'%';$('score').textContent=G.score.toLocaleString('pt-BR');if($('mems').childElementCount!==MEMS.length||$('mems').dataset.n!=G.mem){$('mems').dataset.n=G.mem;$('mems').innerHTML=MEMS.map((_,i)=>`<i class="${i<G.mem?'on':''}"><svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/></svg></i>`).join('');}$('memN').textContent=G.mem+'/'+MEMS.length;
  for(const k of ['roll','boost','turbo','magnet','wind'])$('p_'+k).classList.toggle('on',G.powers[k]);
  $('bRoll').hidden=!G.powers.roll;$('bBoost').hidden=!G.powers.boost;}
// minimapa: terreno pré-renderizado + itens + arara + Araras
const mm=$('minimap'),mg=mm.getContext('2d'),MMS=mm.width;const base=document.createElement('canvas');base.width=base.height=MMS;
{const g=base.getContext('2d'),img=g.createImageData(MMS,MMS);const S=WORLD.size,st=S/MMS;
 const H=(x,y)=>height((x/MMS-.5)*S,(y/MMS-.5)*S+600);
 for(let y=0;y<MMS;y++)for(let x=0;x<MMS;x++){const h=H(x,y);const dx=H(x+1,y)-H(x-1,y),dy=H(x,y+1)-H(x,y-1);
   const shade=Math.max(.35,Math.min(1.25,1-(dx*.7+dy*.5)/(st*2.2)));let c;
   if(h<1){const d=Math.min(1,-h/9);c=[22+30*(1-d),92+40*(1-d),140+30*(1-d)];}
   else if(h<60)c=[52,112,62];else if(h<180)c=[70,124,58];else if(h<330)c=[118,128,72];else c=[168,160,128];
   const cont=(Math.floor(h/45)!==Math.floor(H(x+1,y)/45)||Math.floor(h/45)!==Math.floor(H(x,y+1)/45))&&h>2?.82:1;
   const i=(y*MMS+x)*4;img.data.set([c[0]*shade*cont,c[1]*shade*cont,c[2]*shade*cont,255],i);}
 g.putImageData(img,0,0);}
const toMM=v=>[(v.x/WORLD.size+.5)*MMS,((v.z-600)/WORLD.size+.5)*MMS];
function drawMinimap(){mg.clearRect(0,0,MMS,MMS);mg.save();mg.beginPath();mg.arc(MMS/2,MMS/2,MMS/2-2,0,7);mg.clip();
  // centrado na arara, girando com o rumo (frente para cima)
  const [px,py]=toMM(G.pos),Z=2.6;mg.translate(MMS/2,MMS/2);mg.rotate(G.yaw+Math.PI);mg.scale(Z,Z);mg.translate(-px,-py);mg.drawImage(base,0,0);
  mg.globalAlpha=.35;mg.drawImage(explored,0,0);mg.globalAlpha=1;
  {const t=missionTarget(),[tx,ty]=toMM(t);mg.strokeStyle='rgba(255,255,255,.7)';mg.lineWidth=.6;mg.setLineDash([1.5,2.5]);mg.beginPath();mg.moveTo(px,py);mg.lineTo(tx,ty);mg.stroke();mg.setLineDash([]);}
  for(const it of ITEMS){if(it.got)continue;const [x,y]=toMM(it.p);mg.fillStyle={pena:'#ffd34d',uva:'#b0397a',vinil:'#111',canastra:'#fff1a8',arco:'#7fbf3f',memoria:'#fff4c8'}[it.kind];mg.beginPath();mg.arc(x,y,it.kind==='memoria'?3.2:it.kind==='canastra'?2.2:1.1,0,7);mg.fill();}
  const [bx,by]=toMM(doorWorld);mg.fillStyle='#e8b323';mg.strokeStyle='#124c85';mg.lineWidth=.8;mg.beginPath();mg.arc(bx,by,3,0,7);mg.fill();mg.stroke();
  mg.restore();
  mg.fillStyle='#e8b323';mg.beginPath();mg.moveTo(MMS/2,MMS/2-7);mg.lineTo(MMS/2+5,MMS/2+5);mg.lineTo(MMS/2,MMS/2+2);mg.lineTo(MMS/2-5,MMS/2+5);mg.fill();
  mg.strokeStyle='rgba(246,238,220,.6)';mg.lineWidth=1.5;mg.beginPath();mg.arc(MMS/2,MMS/2,MMS/2-2,0,7);mg.stroke();
  const na=-(G.yaw+Math.PI);mg.fillStyle='#f6eedc';mg.font='800 26px Archivo';mg.textAlign='center';mg.fillText('N',MMS/2+Math.sin(na)*(MMS/2-22),MMS/2-Math.cos(na)*(MMS/2-22)+9);mg.textAlign='start';}
// áreas exploradas (o mapa se revela enquanto você voa)
const explored=document.createElement('canvas');explored.width=explored.height=MMS;const eg=explored.getContext('2d');eg.fillStyle='#0b1220';eg.fillRect(0,0,MMS,MMS);
function explore(){const [x,y]=toMM(G.pos);eg.globalCompositeOperation='destination-out';const gr=eg.createRadialGradient(x,y,0,x,y,16);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');eg.fillStyle=gr;eg.beginPath();eg.arc(x,y,16,0,7);eg.fill();eg.globalCompositeOperation='source-over';}
let mapZoom=1;const trail=[];let trailT=0;
// mapa aberto (M)
const big=$('bigmapC'),bg=big.getContext('2d');
function toggleMap(){$('bigmap').hidden=!$('bigmap').hidden;if(!$('bigmap').hidden)drawBig();}
function drawBig(){const W=big.width;bg.clearRect(0,0,W,W);bg.save();const [cx0,cy0]=toMM(G.pos);const k0=W/MMS;bg.translate(W/2,W/2);bg.scale(mapZoom,mapZoom);bg.translate(-(mapZoom>1?cx0*k0:W/2),-(mapZoom>1?cy0*k0:W/2));
  bg.drawImage(base,0,0,W,W);bg.globalAlpha=.5;bg.drawImage(explored,0,0,W,W);bg.globalAlpha=1;const k=k0;
  if(trail.length>1){bg.strokeStyle='rgba(255,226,140,.9)';bg.lineWidth=3/mapZoom;bg.setLineDash([6/mapZoom,6/mapZoom]);bg.beginPath();trail.forEach(([x,y],i)=>i?bg.lineTo(x*k,y*k):bg.moveTo(x*k,y*k));bg.stroke();bg.setLineDash([]);}
  {const t=missionTarget(),[tx,ty]=toMM(t),[qx,qy]=toMM(G.pos);bg.strokeStyle='rgba(255,255,255,.55)';bg.lineWidth=2/mapZoom;bg.setLineDash([2/mapZoom,8/mapZoom]);bg.beginPath();bg.moveTo(qx*k,qy*k);bg.lineTo(tx*k,ty*k);bg.stroke();bg.setLineDash([]);}
  for(const it of ITEMS){if(it.got)continue;const [x,y]=toMM(it.p);bg.fillStyle={pena:'#ffd34d',uva:'#b0397a',vinil:'#111',canastra:'#fff1a8',arco:'#7fbf3f',memoria:'#fff4c8'}[it.kind];bg.beginPath();bg.arc(x*k,y*k,it.kind==='memoria'?10:it.kind==='canastra'?6:3,0,7);bg.fill();if(it.kind==='memoria'){bg.strokeStyle='rgba(255,210,120,.8)';bg.lineWidth=3;bg.stroke();}}
  if(G.powers.wind){bg.strokeStyle='rgba(255,210,122,.8)';bg.lineWidth=4;bg.setLineDash([10,8]);bg.beginPath();WS.forEach((p,i)=>{const [x,y]=toMM(p);i?bg.lineTo(x*k,y*k):bg.moveTo(x*k,y*k);});bg.stroke();bg.setLineDash([]);}
  const [bx,by]=toMM(doorWorld);bg.fillStyle='#e8b323';bg.strokeStyle='#124c85';bg.lineWidth=3;bg.beginPath();bg.arc(bx*k,by*k,9,0,7);bg.fill();bg.stroke();
  bg.font='700 18px Archivo';bg.fillStyle='#fff';bg.fillText('Araras',bx*k+12,by*k+6);
  const [px,py]=toMM(G.pos);bg.save();bg.translate(px*k,py*k);bg.rotate(-G.yaw+Math.PI);bg.fillStyle='#e8b323';bg.strokeStyle='#124c85';bg.lineWidth=2;bg.beginPath();bg.moveTo(0,-16);bg.lineTo(11,11);bg.lineTo(0,5);bg.lineTo(-11,11);bg.closePath();bg.fill();bg.stroke();bg.restore();bg.restore();
  bg.fillStyle='rgba(10,14,28,.6)';bg.fillRect(0,W-54,W,54);bg.font='600 17px Archivo';const L=[['#fff4c8','Lembrança'],['#ffd34d','Pena'],['#b0397a','Uva'],['#e8b323','Araras'],['#7fbf3f','Arco']];
  L.forEach(([c,t],i)=>{const x=24+i*(W-40)/5;bg.fillStyle=c;bg.beginPath();bg.arc(x,W-27,7,0,7);bg.fill();bg.fillStyle='#f6eedc';bg.fillText(t,x+14,W-21);});
  bg.fillStyle='#f6eedc';bg.font='800 18px Archivo';bg.fillText('N',W/2-6,26);}
// seta de direção na borda da tela
const v3=new THREE.Vector3();
function drawArrow(){const tgt=missionTarget();const a=$('arrow');if((G.phase!=='free'&&G.mode!=='story')||!CFG.hudArrow){a.hidden=true;return;}
  v3.copy(tgt).project(cam);const behind=v3.z>1;let x=v3.x,y=v3.y;if(behind){x=-x;y=-y;}
  const on=!behind&&Math.abs(x)<.85&&Math.abs(y)<.8;a.hidden=G.phase==='tunnel';
  const ang=Math.atan2(y,x);const m=Math.max(Math.abs(x)/.85,Math.abs(y)/.8,1);const ex=on?x:x/m,ey=on?y:y/m;
  a.style.left=((ex*.5+.5)*innerWidth)+'px';a.style.top=((-ey*.5+.5)*innerHeight)+'px';a.style.transform=`translate(-50%,-50%) rotate(${on?90:-ang*180/Math.PI+90}deg)`;
  a.classList.toggle('mark',on);$('dist').textContent=Math.round(tgt.distanceTo(G.pos))+' m';}

// ---------- utilidades ----------
const tmpQ=new THREE.Quaternion(),tmpQ2=new THREE.Quaternion(),ax=new THREE.Vector3();
function boneTurn(b,axis,angle){if(!b||!b.parent)return;b.parent.getWorldQuaternion(tmpQ);ax.copy(axis).applyQuaternion(model.getWorldQuaternion(tmpQ2));
  const dW=new THREE.Quaternion().setFromAxisAngle(ax.normalize(),angle);const inv=tmpQ.clone().invert();b.quaternion.premultiply(inv.multiply(dW).multiply(tmpQ));}
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
const fwd=new THREE.Vector3();
function forward(y,p,out=fwd){return out.set(Math.sin(y)*Math.cos(p),Math.sin(p),Math.cos(y)*Math.cos(p));}

// ---------- história: frases no alto ----------
const STORY=[[0,'Se puder, coloque fones. Sinta o voo.'],[.2,'O caminho de volta para casa'],[.5,'Uma homenagem à arara que deu nome à nossa casa'],[.8,'Na lembrança, ela voa de volta']];
let cap='';function caption(t){if(t===cap)return;cap=t;const c=$('cap');c.classList.remove('on');setTimeout(()=>{c.textContent=t;if(t)c.classList.add('on');},500);}

// ---------- piloto automático (modo história) ----------
const route=[exit.clone().add(new THREE.Vector3(0,0,500)),new THREE.Vector3(80,330,-1300),new THREE.Vector3(-60,200,-700),new THREE.Vector3(WORLD.riverX(-100),90,-100),new THREE.Vector3(WORLD.riverX(800),70,800),WORLD.bar.clone().add(new THREE.Vector3(0,60,-260))];
let rIdx=0;
function autopilot(){const tgt=route[Math.min(rIdx,route.length-1)];if(G.pos.distanceTo(tgt)<70&&rIdx<route.length-1)rIdx++;
  if(rIdx===route.length-1&&G.pos.distanceTo(tgt)<90&&!G.landing)tryLand(true);
  const d=tgt.clone().sub(G.pos);const wantYaw=Math.atan2(d.x,d.z);let dy=wantYaw-G.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));
  const wantPitch=Math.atan2(d.y,Math.hypot(d.x,d.z));return {turn:Math.max(-1,Math.min(1,-dy*2)),climb:Math.max(-1,Math.min(1,(wantPitch-G.pitch)*3)),flap:G.speed<26,dive:false};}

// ---------- pouso ----------
function tryLand(auto){if(G.landing||G.phase==='landed')return;const d=G.pos.distanceTo(doorWorld);
  if(d>420&&!auto){toast('Chegue mais perto do Araras para pousar');return;}
  $('hintTunnel').classList.remove('on');G.phase='landing';G.landing={t:0,from:G.pos.clone(),yaw:G.yaw,ctl:G.pos.clone().lerp(doorWorld,.5).add(new THREE.Vector3(0,70,0))};caption('Prepare-se para pousar');}

function collect(it){const k=it.kind;const sc=dif().score;if(k==='esp'){const t=it.esp;G.pow[t]=t==='turbo'?6:12;unlockBanner('esp_'+t);chime([660,880,1320],.6,.06,'square');burst(it.p,0x7fe0ff);return;}
  const pts=Math.round(({pena:10,uva:15,vinil:25,canastra:200,memoria:500,arco:50}[k]||0)*sc*(G.pow.x2>0?2:1));G.score+=pts;pop('score');
  floatScore('+'+pts,{pena:'#ffd34d',uva:'#f07ab8',vinil:'#e8b323',canastra:'#fff1a8',memoria:'#fff6d0',arco:'#9be05a'}[k]||'#fff');
  if(it.grp){it.grp.got++;if(it.grp.got===it.grp.n){G.score+=Math.round(150*sc);toast('Trilha completa · +'+Math.round(150*sc));chime([523,659,784,1046,1318],.7,.05,'triangle');}}
  if(k==='arco'){G.rings++;toast(`Arco de videira ${G.rings}/5`);burst(it.p,0x9be05a);chime([440,554,659],.5,.05);return;}
  if(k==='memoria'){G.mem++;G.memT=7;caption(it.txt);burst(it.p,0xffe08a);burst(it.p,0xffffff);chime([392,494,587,784],1.6,.06,'triangle');makeFriend(G.mem-1);pop('memN');
    if(G.mem===MEMS.length)setTimeout(()=>toast('Todas as lembranças reunidas · agora, para casa'),3000);return;}
  G.items[k]++;combo++;comboT=1.6;const base={pena:784,uva:659,vinil:523,canastra:392}[k];chime([base*Math.pow(1.06,Math.min(combo,12))],.35,.05);
  burst(it.p,{pena:0xffd34d,uva:0xd04a8a,vinil:0xe8b323,canastra:0xfff1a8}[k]);pop({pena:'cPena',uva:'cUva',vinil:'cVinil',canastra:'cQueijo'}[k]);
  if(combo>=5&&combo%5===0)toast('Sequência ×'+combo);}
// respingos e ondas quando a arara passa rente à água
const rippleMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.5,depthWrite:false});const ripples=[];
const dropG=new THREE.BufferGeometry();const ND=400,dp=new Float32Array(ND*3),dv=new Float32Array(ND*3),dl=new Float32Array(ND);dropG.setAttribute('position',new THREE.BufferAttribute(dp,3));
const drops=new THREE.Points(dropG,new THREE.PointsMaterial({color:0xeaf6ff,size:.45,map:haloT,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));drops.frustumCulled=false;scene.add(drops);let dI=0;
function waterFx(dt){const hw=G.pos.y-WORLD.water;const over=height(G.pos.x,G.pos.z)<WORLD.water+1;
  if(over&&hw<9&&G.phase==='free'){const k=1-hw/9;
    for(let n=0;n<Math.ceil(k*10);n++){const side=n%2?1:-1;const r=new THREE.Vector3(Math.cos(G.yaw),0,-Math.sin(G.yaw)).multiplyScalar(side*(1.2+Math.random()));
      const i=dI++%ND;dp.set([G.pos.x+r.x,WORLD.water+.1,G.pos.z+r.z],i*3);dv.set([r.x*1.5+(Math.random()-.5)*2,3+Math.random()*5*k,r.z*1.5+(Math.random()-.5)*2],i*3);dl[i]=1;}
    if(Math.random()<k*.5){const m=new THREE.Mesh(new THREE.RingGeometry(.8,1.1,32),rippleMat.clone());m.rotation.x=-Math.PI/2;m.position.set(G.pos.x,WORLD.water+.05,G.pos.z);m.layers.set(0);scene.add(m);ripples.push({m,t:0});}
    if(!G.splashHint&&k>.5){G.splashHint=1;}}
  for(let i=0;i<ND;i++){if(dl[i]<=0)continue;dv[i*3+1]-=14*dt;dp[i*3]+=dv[i*3]*dt;dp[i*3+1]+=dv[i*3+1]*dt;dp[i*3+2]+=dv[i*3+2]*dt;dl[i]-=dt*1.2;if(dp[i*3+1]<WORLD.water){dl[i]=0;dp[i*3+1]=-999;}}
  dropG.attributes.position.needsUpdate=true;
  for(let k=ripples.length-1;k>=0;k--){const r=ripples[k];r.t+=dt;const s=1+r.t*9;r.m.scale.set(s,s,s);r.m.material.opacity=.45*(1-r.t/1.4);if(r.t>1.4){scene.remove(r.m);r.m.geometry.dispose();r.m.material.dispose();ripples.splice(k,1);}}}
// ---------- laço principal ----------
const clock=new THREE.Clock();const camPos=new THREE.Vector3().copy(G.pos).add(new THREE.Vector3(0,3,-10)),camLook=new THREE.Vector3(),camVel=new THREE.Vector3();
function step(dt){
  G.t+=dt;const I=G.mode==='story'&&G.phase==='free'?autopilot():input();
  if(G.phase==='tunnel'){
    // trilho: scroll/toque define a velocidade; desvio limitado dentro dos arcos
    G.railV=damp(G.railV,Math.max(4,G.railV*.985),2,dt);G.rail+=G.railV*dt;
    G.lat.x=Math.max(-2.2,Math.min(2.2,G.lat.x-I.turn*dt*3));G.lat.y=Math.max(-1.8,Math.min(1.8,G.lat.y+I.climb*dt*3));G.lat.multiplyScalar(Math.pow(.6,dt));
    G.pos.set(WORLD.tunnelStart.x+G.lat.x,WORLD.tunnelStart.y+G.lat.y-1.2,WORLD.tunnelStart.z-8+G.rail);
    G.yaw=damp(G.yaw,-I.turn*.25,4,dt);G.pitch=damp(G.pitch,I.climb*.2,4,dt);G.roll=damp(G.roll,I.turn*.5,4,dt);G.speed=G.railV;
    const pr=G.rail/(WORLD.tunnelLen+8);caption((STORY.filter(s=>pr>=s[0]).pop()||[0,''])[1]);
    $('hintTunnel').classList.toggle('on',true);
    if(pr>=1){G.phase='choice';G.speed=Math.max(22,G.railV);$('menu').hidden=false;$('choice').hidden=true;setTimeout(()=>{$('menuLoad').classList.add('done');},2600);$('hintTunnel').classList.remove('on');caption('Existe um mundo além do horizonte');}
  } else if(G.phase==='free'||G.phase==='choice'){
    if(G.phase==='choice'){I.turn=0;I.climb=0;}
    // mecânica de ave: você aponta, o corpo responde
    for(const k in G.pow)G.pow[k]=Math.max(0,G.pow[k]-dt);const turbo=(G.powers.turbo&&I.dive)||G.pow.turbo>0;if(G.pow.turbo>0)acc0=40;
    const tPitch=I.dive?(turbo?-1.1:-.75):I.climb*.6;G.pitch=damp(G.pitch,tPitch,I.dive?3:2.2,dt);
    const tRoll=I.turn*(.9+Math.min(.3,G.speed/120));G.roll=damp(G.roll,tRoll,3.2,dt);
    G.yaw-=Math.sin(G.roll)*dt*(1.1+18/Math.max(12,G.speed));
    let acc=-Math.sin(G.pitch)*13+acc0;acc0=0;                      // gravidade: descer acelera, subir desacelera
    const lv=1+G.lvl*.1;if(I.flap||I.climb>.3){acc+=11*lv;G.flap=1;} else G.flap=damp(G.flap,0,2,dt);
    if(G.boostT>0){acc+=40;G.boostT-=dt;}G.boostCD=Math.max(0,G.boostCD-dt);
    acc-=G.speed*G.speed*.0042+1.5;                    // arrasto
    const W=G.powers.wind?windAt(G.pos):{d:1e9};G.inWind=W.d<32;
    if(G.inWind){const tg=windCurve.getTangentAt(Math.min(1,W.i/(WS.length-1)));const wy=Math.atan2(tg.x,tg.z),wpi=Math.asin(tg.y);let dy=wy-G.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));
      G.yaw+=dy*dt*1.2*(1-Math.abs(I.turn));G.pitch=damp(G.pitch,wpi,1.5,dt);acc+=60;if(!G.windHint){G.windHint=1;toast('Corrente de vento · ela leva você para casa');chime([523,659,784,1046],.9,.05,'triangle');}}
    G.speed=Math.max(12,Math.min(G.inWind?165:(turbo?110:G.boostT>0?95:70)*lv,G.speed+acc*dt));
    if(G.rollSpin>0){G.rollSpin=Math.max(0,G.rollSpin-dt/.75);}
    forward(G.yaw,G.pitch);G.pos.addScaledVector(fwd,G.speed*dt);
    // chão, teto e borda do mapa (curva sozinha de volta)
    const gh=Math.max(height(G.pos.x,G.pos.z),WORLD.water)+6;if(G.pos.y<gh){G.pos.y=gh;G.pitch=Math.max(G.pitch,.15);}
    if(G.pos.y>700){G.pitch=Math.min(G.pitch,-.1);}
    const rr=Math.hypot(G.pos.x,G.pos.z-600);if(rr>3300){const back=Math.atan2(-G.pos.x,600-G.pos.z);let dy=back-G.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));G.yaw+=dy*dt*.8;}
    // coleta
    comboT-=dt;if(comboT<=0)combo=0;
    for(const it of ITEMS){if(it.got)continue;const d=it.p.distanceTo(G.pos);
      if((G.powers.magnet||G.pow.magnet>0)&&d<dif().mag*(G.pow.magnet>0?2.4:1)&&(it.kind==='pena'||it.kind==='uva'||it.kind==='vinil'))it.p.lerp(G.pos,1-Math.exp(-6*dt));
      if(d<it.r+3.2){it.got=true;it.o.visible=false;collect(it);}
      else if(G.mode==='game'&&d<34&&it.kind!=='arco'&&it.kind!=='memoria'){const v=it.p.clone().sub(G.pos).normalize();forward(G.yaw,G.pitch);if(v.dot(fwd)>.86)it.p.lerp(G.pos,1-Math.exp(-(G.pow.magnet>0?7:2.2)*dt));}}
    if(G.mode==='game'){spawnT-=dt;const live=ITEMS.filter(i=>i.spawned&&!i.got).length;if(spawnT<=0&&live<45){spawnPattern();spawnT=3.5;}if(Math.random()<.02)cleanFar();}
    for(const u of UNLOCKS){if(!G.powers[u.k]&&u.when()){G.powers[u.k]=true;unlockBanner(u.k);chime([392,523,659,784],.8,.06,'triangle');if(u.k==='wind')windPts.visible=true;}}
    const nl=Math.min(5,Math.floor(G.items.pena/8));if(nl>G.lvl){G.lvl=nl;floatScore('VELOCIDADE '+(nl+1),'#e8b323');chime([523,784,1046],.6,.06,'triangle');pop('lvl');}
    if(G.memT>0)G.memT-=dt;
    if(G.mode==='story'){const dist=G.pos.distanceTo(doorWorld);caption(dist>2600?'Existe um mundo além do horizonte':dist>1800?'O sabor de Minas espera por você':dist>1200?'É hora de descer':dist>700?'Queijo Canastra. Receitas com a nossa assinatura.':dist>350?'Drinks autorais. Novas histórias à mesa.':'Estamos chegando');}
    else if(G.memT<=0)caption(G.mem===0&&G.t<60?'Sozinha no céu, ela procura o caminho de casa.':'');
    $('bLand').hidden=G.pos.distanceTo(doorWorld)>420;
  }
  if(G.phase==='landing'||G.phase==='landed'){$('bLand').hidden=true;$('keys').style.display='none';}
  if(false){
  } else if(G.phase==='landing'){
    const L=G.landing;L.t=Math.min(1,L.t+dt/7);const u=L.t*L.t*(3-2*L.t);
    const a=L.from.clone().lerp(L.ctl,u),b=L.ctl.clone().lerp(doorWorld.clone().add(new THREE.Vector3(0,1.4,-3)),u);const np=a.lerp(b,u);
    const d=np.clone().sub(G.pos);if(d.lengthSq()>1e-6){G.yaw=damp(G.yaw,Math.atan2(d.x,d.z),3,dt);G.pitch=damp(G.pitch,Math.atan2(d.y,Math.hypot(d.x,d.z))*.5,3,dt);}
    G.pos.copy(np);G.roll=damp(G.roll,0,3,dt);G.speed=damp(G.speed,4,1.5,dt);
    if(L.t>=1){G.phase='landed';const all=G.mem>=MEMS.length;chime([262,330,392,523,659],2.4,.06,'triangle');
      const seq=[['Ela chegou em casa.',0],[all?'E trouxe todas as lembranças com ela.':'Aqui sempre foi o lugar dela.',4200],['Bem-vinda de volta ao Araras · O bar que voa alto',8400]];
      seq.forEach(([t,d])=>setTimeout(()=>caption(t),d));setTimeout(()=>{$('end').hidden=false;},9000);}
  }
  // orientação do corpo
  flyer.position.copy(G.pos);flyer.rotation.set(-G.pitch,G.yaw,G.roll,'YXZ');
  roller.rotation.z=G.rollSpin>0?G.rollDir*(1-G.rollSpin)*Math.PI*2:0;
  // animação: clip pelo estado, batida ligada à velocidade
  if(mixer){const w={AERO:1,BANK:0,FLAP:0,GLIDE:0,LANDING:0};
    if(G.phase==='landing'||G.phase==='landed'){w.AERO=0;w.LANDING=1;}
    else if(G.phase==='free'||G.phase==='choice'){const turnA=Math.min(1,Math.abs(G.roll)/.7),diveA=Math.min(1,Math.max(0,-G.pitch-.25)/.4);
      w.FLAP=G.flap*(1-diveA);w.BANK=turnA*(1-w.FLAP);w.GLIDE=diveA*.7;w.AERO=Math.max(0,1-w.FLAP-w.BANK-w.GLIDE);}
    let pc=0,tot=0;for(const k in act){act[k].weight=damp(act[k].weight??0,w[k],5,dt);act[k].setEffectiveWeight(act[k].weight);pc+=act[k].weight*CLIP_PITCH[k];tot+=act[k].weight;}
    const rate=G.phase==='tunnel'?Math.min(2.4,.55+G.railV/9):(.7+G.speed/60+G.flap*.6);
    if(act.AERO)act.AERO.setEffectiveTimeScale(rate);if(act.FLAP)act.FLAP.setEffectiveTimeScale(rate);if(act.BANK)act.BANK.setEffectiveTimeScale(rate*.8);
    comp.rotation.x=THREE.MathUtils.degToRad((tot?pc/tot:12)-6);  // corpo deitado em todos os clips
    mixer.update(dt);
    // pescoço vivo e asas recolhidas no mergulho (sobre a animação, sem alterar o arquivo)
    if(model){model.updateMatrixWorld(true);
      // pescoço sutil: acompanha a curva e a subida/descida com atraso suave
      neck.y=damp(neck.y,-G.roll*.05,2.2,dt);neck.x=damp(neck.x,-G.pitch*.04,2.2,dt);neck.z=damp(neck.z,-G.roll*.12,2.2,dt);
      /* pescoço procedural desligado: a cabeça segue só a animação original */
      const tuck=Math.min(1,Math.max(0,-G.pitch-.3)/.45)*(G.phase==='free'?1:0);
      if(tuck>0){boneTurn(bones.wl,new THREE.Vector3(0,1,0),tuck*.9);boneTurn(bones.wr,new THREE.Vector3(0,1,0),-tuck*.9);}}}
  // câmera de jogo: mola atrás e acima, arara no terço inferior, inclina na curva, lente abre com a velocidade
  const o=G.orbit;if(!o.drag){o.tYaw+=o.vy*dt;o.tPitch=Math.max(-.9,Math.min(1.1,o.tPitch+o.vp*dt));o.vy*=Math.pow(.02,dt);o.vp*=Math.pow(.02,dt);}
  if(o.rel&&!o.drag&&performance.now()-o.rel>(CFG.camReturn*1000)){o.tYaw=Math.atan2(Math.sin(o.tYaw),Math.cos(o.tYaw))*Math.pow(.25,dt);o.tPitch*=Math.pow(.25,dt);}
  o.yaw=damp(o.yaw,o.tYaw,9,dt);o.pitch=damp(o.pitch,o.tPitch,9,dt);
  const close=(G.phase==='tunnel'?8:G.phase==='landed'?16:11+G.speed*.05)*(G.phase==='landed'?1:CFG.camDist);
  const cy=G.yaw+o.yaw,cp=CFG.camHeight+o.pitch;
  const want=G.pos.clone().add(new THREE.Vector3(-Math.sin(cy)*Math.cos(cp)*close,Math.sin(cp)*close+1.2,-Math.cos(cy)*Math.cos(cp)*close));
  if(G.phase==='landed')want.copy(doorWorld).add(new THREE.Vector3(-3,4.5,-17));
  else if(G.phase!=='tunnel'){ // câmera não atravessa morros: sobe e aproxima quando o relevo fica no caminho
    for(let i=1;i<=14;i++){const t=i/14;const px=G.pos.x+(want.x-G.pos.x)*t,pz=G.pos.z+(want.z-G.pos.z)*t,py=G.pos.y+(want.y-G.pos.y)*t;
      const need=Math.max(height(px,pz),WORLD.water)+3.5;if(py<need){want.y+=(need-py)/t;}}
    const gh=Math.max(height(want.x,want.z),WORLD.water)+3;if(want.y<gh)want.y=gh;}
  {const w=G.phase==='tunnel'?9:5.2;const ax=want.clone().sub(camPos).multiplyScalar(w*w).addScaledVector(camVel,-2*w);camVel.addScaledVector(ax,dt);camPos.addScaledVector(camVel,dt);} // mola criticamente amortecida
  if(G.phase!=='tunnel'){const gh=Math.max(height(camPos.x,camPos.z),WORLD.water)+2.5;if(camPos.y<gh){camPos.y=gh;camVel.y=Math.max(0,camVel.y);}}
  forward(G.yaw,0);const lookAt=G.phase==='landed'?doorWorld.clone().add(new THREE.Vector3(0,3,0)):G.pos.clone().addScaledVector(fwd,10).add(new THREE.Vector3(0,2.2,0));
  camLook.lerp(lookAt,1-Math.exp(-8*dt));cam.position.copy(camPos);cam.up.set(0,1,0);cam.lookAt(camLook);cam.rotateZ(G.roll*.18*CFG.camTilt);
  cam.fov=damp(cam.fov,CFG.fov+Math.min(26,Math.max(0,G.speed-25)*.25),3,dt);cam.updateProjectionMatrix();
  // dentro da nuvem: véu
  const cd=world.cloudDensityAt(cam.position);$('veil').style.opacity=Math.min(.85,cd*1.4);
  // itens giram
  for(const it of ITEMS)if(!it.got){it.o.rotation.y+=dt*1.6;}
  updateFriends(dt);updateBursts(dt);updateWind(G.t);waterFx(dt);
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').classList.remove('on');}
}
let acc=0,fpsAcc=0,fpsN=0,autoQ=1;function frame(){requestAnimationFrame(frame);const raw=clock.getDelta();const dt=Math.min(raw,.05);
  fpsAcc+=raw;fpsN++;if(fpsAcc>3){const fps=fpsN/fpsAcc;fpsAcc=0;fpsN=0;if(window.GAME_READY){if(fps<28&&autoQ>.55){autoQ-=.15;}else if(fps>55&&autoQ<1){autoQ=Math.min(1,autoQ+.05);}}window.FPS=fps;}
  const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio,window.QUALITY||1.5)*autoQ;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){R.setPixelRatio(dpr);R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  if(window.GAME_READY&&!window.PAUSED)step(dt);
  world.update(G.t,cam);
  R.clear();cam.layers.set(0);R.render(scene,cam);
  if(window.GAME_READY&&(!MOBILE||autoQ>.8)&&G.pos.y-WORLD.water<90&&height(G.pos.x,G.pos.z)<WORLD.water+4){mirror.matrix.makeTranslation(0,2*WORLD.water,0).multiply(flipY);birdRoot.matrix.copy(mirror.matrix);birdRoot.matrixWorldNeedsUpdate=true;R.render(birdScene,cam);birdRoot.matrix.identity();birdRoot.matrixWorldNeedsUpdate=true;} // reflexo
  cam.layers.set(1);R.render(scene,cam);cam.layers.set(0);   // água por cima do reflexo
  R.render(birdScene,cam);   // arara testada contra a profundidade do mundo
  trailT+=dt;if(trailT>.6&&G.phase!=='tunnel'){trailT=0;trail.push(toMM(G.pos));if(trail.length>600)trail.shift();}
  acc+=dt;if(acc>.1){acc=0;explore();hud();if(CFG.hudMap)drawMinimap();if(!$('bigmap').hidden)drawBig();}drawArrow();}
frame();

// ---------- escolha na saída do túnel ----------
$('mStory').onclick=()=>{$('menu').hidden=true;$('cStory').onclick();};$('mPlay').onclick=()=>{$('menu').hidden=true;$('cPlay').onclick();};$('mSet').onclick=()=>{$('settings').hidden=false;};
$('cStory').onclick=()=>{audio();curMusic=null;setMusic(CFG.music==='aventura'?'calma':CFG.music);G.mode='story';G.phase='free';$('choice').hidden=true;document.body.classList.remove('playing');};
$('cPlay').onclick=()=>{audio();curMusic=null;setMusic(CFG.music);let seen=null;try{seen=localStorage.getItem('araras-help');}catch(e){}if(!seen)showHelp();G.mode='game';G.phase='free';$('choice').hidden=true;document.body.classList.add('playing');toast(matchMedia('(pointer: coarse)').matches?'Você está no controle · joystick para voar · Asas acelera':'Você está no controle · W A S D voa · Espaço bate asa · H ajuda');};
$('toGame').onclick=()=>{if(G.phase==='free'&&G.mode==='story')$('cPlay').onclick();};
$('again').onclick=()=>location.reload();

// ---------- trilha sonora ----------
let musicNode=null,musicTimer=0,userTracks=[],userIdx=0,userAudio=null;
function stopMusic(){clearInterval(musicTimer);musicTimer=0;if(userAudio){userAudio.pause();}}
function synthTrack(kind){if(!audio())return;window.MUSICVOL=window.MUSICVOL||(()=>{const g=AC.createGain();g.gain.value=CFG.volume*.5;g.connect(AC.destination);return g;})();
  const V=window.MUSICVOL,bpm=kind==='aventura'?118:72,beat=60/bpm;let step=0;
  const prog=kind==='aventura'?[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]:[[50,57,62],[46,53,58],[43,50,55],[48,55,60]];
  const n2f=n=>440*Math.pow(2,(n-69)/12);
  const tone=(f,t,d,v,type='sine')=>{const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(V);o.start(t);o.stop(t+d+.05);};
  const noise=(t,d,v,hp)=>{const b=AC.createBuffer(1,AC.sampleRate*d,AC.sampleRate),c=b.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=(Math.random()*2-1)*(1-i/c.length);const s=AC.createBufferSource();s.buffer=b;const f=AC.createBiquadFilter();f.type='highpass';f.frequency.value=hp;const g=AC.createGain();g.gain.value=v;s.connect(f).connect(g).connect(V);s.start(t);};
  musicTimer=setInterval(()=>{const t=AC.currentTime+.05;const ch=prog[Math.floor(step/16)%4];
    if(kind==='aventura'){
      if(step%4===0){const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(42,t+.18);g.gain.setValueAtTime(.55,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g).connect(V);o.start(t);o.stop(t+.3);}
      if(step%8===4)noise(t,.18,.25,1200);if(step%2===1)noise(t,.05,.08,7000);
      if(step%2===0)tone(n2f(ch[0]-12),t,beat*.45,.18,'sawtooth');
      tone(n2f(ch[(step*2)%3]+12),t,beat*.4,.06,'triangle');
      if(step%16===0)ch.forEach(n=>tone(n2f(n),t,beat*16,.035,'sawtooth'));
    } else {
      if(step%16===0)ch.forEach(n=>tone(n2f(n),t,beat*18,.05,'sine'));
      if(step%4===0&&Math.random()<.7)tone(n2f(ch[Math.floor(Math.random()*3)]+24),t,beat*3,.04,'triangle');}
    step++;},beat/4*1000*(kind==='aventura'?1:2));}
function playUser(){if(!userTracks.length)return;if(!userAudio){userAudio=new Audio();userAudio.addEventListener('ended',()=>{userIdx=(userIdx+1)%userTracks.length;playUser();});}
  userAudio.src=URL.createObjectURL(userTracks[userIdx]);userAudio.volume=CFG.volume;userAudio.play().catch(()=>{});toast('Tocando · '+userTracks[userIdx].name.replace(/\.[^.]+$/,''));}
let curMusic=null;function setMusic(kind){if(kind===curMusic&&(musicTimer||(userAudio&&!userAudio.paused)))return;curMusic=kind;stopMusic();if(!G||G.phase==='tunnel'&&!AC)return;
  if(kind==='aventura'||kind==='calma')synthTrack(kind);else if(kind==='playlist'){if(userTracks.length)playUser();}}
window.setMusic=setMusic;
// ---------- layout dos botões de toque ----------
const TBTN=['joy','bFlap','bDive','bRoll','bBoost'];
function applyLayout(){for(const id of TBTN){const e=$(id);if(!e)continue;e.style.opacity=CFG.btnAlpha;e.style.scale=CFG.btnScale;const L=CFG.layout&&CFG.layout[id];
  if(L){e.style.left=L.x*100+'%';e.style.top=L.y*100+'%';e.style.right='auto';e.style.bottom='auto';e.style.transform='translate(-50%,-50%)';}else{e.style.left=e.style.top=e.style.right=e.style.bottom=e.style.transform='';}}}
function startLayoutEdit(){document.body.classList.add('editing','playing');$('editBar').hidden=false;
  for(const id of TBTN){const e=$(id);e.hidden=false;e.onpointerdown=ev=>{ev.preventDefault();ev.stopPropagation();e.setPointerCapture(ev.pointerId);
    const mv=m=>{CFG.layout=CFG.layout||{};CFG.layout[id]={x:Math.min(.95,Math.max(.05,m.clientX/innerWidth)),y:Math.min(.95,Math.max(.1,m.clientY/innerHeight))};applyLayout();};
    e.onpointermove=mv;e.onpointerup=()=>{e.onpointermove=null;saveCfg();};};}}
function endLayoutEdit(){document.body.classList.remove('editing');$('editBar').hidden=true;for(const id of TBTN){const e=$(id);e.onpointerdown=null;}location.reload();}
$('editDone').onclick=endLayoutEdit;$('editReset').onclick=()=>{CFG.layout={};saveCfg();};
// ---------- como jogar ----------
function showHelp(){$('help').hidden=false;}
$('helpBtn').onclick=showHelp;$('helpClose').onclick=()=>{$('help').hidden=true;try{localStorage.setItem('araras-help','1');}catch(e){}};
addEventListener('keydown',e=>{if(e.code==='KeyH')$('help').hidden=!$('help').hidden;});
function confirmRestart(){const b=$('restartGame');if(b.dataset.arm){return true;}b.dataset.arm='1';b.textContent='Toque de novo para recomeçar';setTimeout(()=>{delete b.dataset.arm;b.textContent='Recomeçar o voo';},3000);return false;}
// ---------- painel de configurações ----------
const FIELDS=[['camDist','Distância da câmera',.55,1.8,.01],['camHeight','Altura da câmera',-.2,.9,.01],['camSens','Velocidade de girar a câmera',.4,2,.05],['camReturn','Câmera volta para trás após (s)',1,8,.5],['camTilt','Inclinação da câmera nas curvas',0,1.5,.05],['fov','Lente (FOV)',40,80,1],['sens','Sensibilidade da curva',.4,1.8,.05],['volume','Volume da música',0,1,.05],['quality','Qualidade (resolução)',.6,2,.1],['btnScale','Tamanho dos botões (toque)',.7,1.5,.05],['btnAlpha','Transparência dos botões',.3,1,.05]];
const TOG=[['friends','Araras companheiras (lembranças)'],['sound','Som dos efeitos'],['invert','Inverter subir/descer'],['hudMap','Minimapa'],['hudQuest','Missão e itens'],['hudKeys','Dicas de controle'],['hudArrow','Seta de direção']];
$('setBody').innerHTML=`<div class="seg"><span>Dificuldade</span>${['facil','normal','dificil'].map(d=>`<button data-diff="${d}">${{facil:'Fácil',normal:'Normal',dificil:'Difícil'}[d]}</button>`).join('')}</div><div class="seg"><span>Música</span>${[['aventura','Aventura'],['calma','Calma'],['playlist','Minha playlist'],['off','Sem música']].map(([k,l])=>`<button data-music="${k}">${l}</button>`).join('')}</div><label class="file">Escolher músicas do aparelho<input type="file" id="musicFiles" accept="audio/*" multiple></label><button id="editLayout" class="glass">Editar posição dos botões (toque)</button>`+FIELDS.map(([k,l,a,b,st])=>`<label class="rg">${l}<output data-o="${k}"></output><input type="range" data-k="${k}" min="${a}" max="${b}" step="${st}"></label>`).join('')+TOG.map(([k,l])=>`<label class="tg"><input type="checkbox" data-t="${k}">${l}</label>`).join('')+'<button id="restartGame" class="glass">Recomeçar o voo</button><button id="setReset" class="glass">Restaurar padrão</button>';
function syncCfg(){document.querySelectorAll('[data-diff]').forEach(b=>b.ariaPressed=String(b.dataset.diff===CFG.difficulty));document.querySelectorAll('[data-music]').forEach(b=>b.ariaPressed=String(b.dataset.music===CFG.music));document.querySelectorAll('#setBody [data-k]').forEach(i=>{i.value=CFG[i.dataset.k];document.querySelector(`[data-o="${i.dataset.k}"]`).textContent=(+CFG[i.dataset.k]).toFixed(i.step<1?2:0);});document.querySelectorAll('#setBody [data-t]').forEach(i=>i.checked=!!CFG[i.dataset.t]);}
window.syncCfg=syncCfg;
$('setBody').addEventListener('input',e=>{const t=e.target;if(t.dataset.k)CFG[t.dataset.k]=+t.value;if(t.dataset.t)CFG[t.dataset.t]=t.checked;saveCfg();syncCfg();});
$('setBody').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.diff){CFG.difficulty=b.dataset.diff;saveCfg();syncCfg();}
  if(b.dataset.music){audio();curMusic=null;CFG.music=b.dataset.music;saveCfg();syncCfg();if(CFG.music==='playlist'&&!userTracks.length)$('musicFiles').click();}
  if(b.id==='editLayout'){$('settings').hidden=true;startLayoutEdit();}});
$('musicFiles').onchange=e=>{userTracks=[...e.target.files];userIdx=0;CFG.music='playlist';curMusic=null;saveCfg();syncCfg();audio();setMusic('playlist');};
$('restartGame').onclick=()=>{if(confirmRestart()){location.reload();}};
$('setReset').onclick=()=>{Object.assign(CFG,CFG_DEF);saveCfg();syncCfg();};
$('gear').onclick=()=>{$('settings').hidden=!$('settings').hidden;};
$('minimap').onclick=()=>toggleMap();big.addEventListener('wheel',e=>{e.preventDefault();mapZoom=Math.min(4,Math.max(1,mapZoom*(1-e.deltaY*.0015)));drawBig();},{passive:false});$('mapZoomIn').onclick=e=>{e.stopPropagation();mapZoom=Math.min(4,mapZoom*1.5);drawBig();};$('mapZoomOut').onclick=e=>{e.stopPropagation();mapZoom=Math.max(1,mapZoom/1.5);drawBig();};$('bigmap').onclick=e=>{if(e.target.id==='bigmap')toggleMap();};
syncCfg();applyCfg();
