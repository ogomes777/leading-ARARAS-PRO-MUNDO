// Arara MASTER no voo, renderizada EXATAMENTE como no Laboratório:
// mesma câmera Three.js (Perspective 35°, vista "Atrás"), mesma luz de estúdio 360°, AgX, sRGB, anisotropia máxima.
// Camada própria sobre o cenário: nenhuma luz do cenário toca a arara. Do voo vem apenas posição na tela e inclinação.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createArrival} from './arrival-scene.js';

const dialog=document.getElementById('flightDialog'),host=document.getElementById('flightCanvas');
const mk=(tag,id,css)=>{const e=document.createElement(tag);e.id=id;e.setAttribute('aria-hidden','true');e.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;'+css;host.appendChild(e);return e;};
const arrCanvas=mk('canvas','arrivalScene','opacity:0');
const mist=mk('div','flightMist','opacity:0;background:radial-gradient(ellipse at 50% 55%,rgba(255,236,232,.98),rgba(240,200,210,.9) 60%,rgba(200,170,200,.85))');
const canvas=mk('canvas','birdScene','');let visible=false;
const R=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
R.setClearColor(0x000000,0);R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.AgXToneMapping;R.toneMappingExposure=1;
const S=new THREE.Scene();const pm=new THREE.PMREMGenerator(R);
S.environment=pm.fromScene(new RoomEnvironment(),.04).texture;              // igual ao Laboratório
const key=new THREE.DirectionalLight(0xffffff,1.6);key.position.set(2,3,2);S.add(key);
const rim=new THREE.DirectionalLight(0xffffff,.9);rim.position.set(-2,1.5,-3);S.add(rim);
const cam=new THREE.PerspectiveCamera(35,1,.005,50);
const bank=new THREE.Group();S.add(bank);const pose=new THREE.Group();bank.add(pose);               // inclinação/curva vinda do voo e do controle
const say=()=>{};
let curName='AERO',arrival=null,scaleArr=1,model=null,mixer=null,clips=[],action=null,center=new THREE.Vector3(),radius=1,clock=new THREE.Clock();

const DEF={scale:.66,height:-.14,side:0,pitch:14,yaw:0,roll:0,camUp:.32,fov:35};const P={...DEF};
const ctrl={on:false,clip:null,x:0,y:0,tx:0,ty:0};window.ARARAS_CTRL=ctrl;

function install(g){
  model=g.scene;clips=g.animations;
  const an=R.capabilities.getMaxAnisotropy();
  model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;for(const m of [].concat(o.material))for(const t of [m.map,m.normalMap])if(t){t.anisotropy=an;t.needsUpdate=true;}}});
  pose.add(model);mixer=new THREE.AnimationMixer(model);
  play(clips.findIndex(c=>/AERO/.test(c.name)),0);       // começa sempre na AERO
  // Enquadramento "Atrás" do Laboratório, medido na pose animada.
  mixer.update(0);model.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(model,true);b.getCenter(center);radius=b.getSize(new THREE.Vector3()).length();
  model.position.sub(center);center.set(0,0,0);          // gira em torno do corpo
  window.ARARAS_HIDE_BIRD=true;
  say(`Arara MASTER 4K · câmera e luz do Laboratório · ${clips.length} animações`);
  window.ARARAS_GLB_DEBUG={radius};
}
function play(i,fade=.4){if(i<0)i=0;const a=mixer.clipAction(clips[i]);a.reset().setEffectiveWeight(1).play();if(action&&action!==a)action.crossFadeTo(a,fade,false);action=a;}
window.ARARAS_playClip=name=>{if(!mixer)return;const i=name?clips.findIndex(c=>c.name.includes(name)):clips.findIndex(c=>/AERO/.test(c.name));play(i);};

const loader=new GLTFLoader();let requested=false;
function load(){if(requested)return;requested=true;loader.load('assets/araras-master.glb',install,undefined,e=>console.warn('Araras: arara MASTER indisponível',e));}
// carregamento sob demanda: só quando o visitante se aproxima do portal ou abre o voo
document.getElementById('portalTrigger')?.addEventListener('pointerenter',load,{once:true});
document.getElementById('portalTrigger')?.addEventListener('focus',load,{once:true});
new MutationObserver(()=>{if(dialog.open)load();}).observe(dialog,{attributes:true,attributeFilter:['open']});

// Controles minimalistas: girar 360° (só o cenário; a arara fica estável) e pilotar
window.ARARAS_ORBIT={yaw:0,pitch:0,tyaw:0,tpitch:0,on:false};
window.ARARAS_FREE={on:false,x:0,y:0,head:0,turn:0};
const hud=document.createElement('div');hud.className='flight-hud';
const ico={orbit:'<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5v-2a1.5 1.5 0 0 1 3 0V12M14 10.5a1.5 1.5 0 0 1 3 0V12M17 11.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-2.7L4.3 15a1.5 1.5 0 0 1 2.4-1.8L8 15"/>',game:'<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5M16 11h.01M18 13.5h.01"/>'};
hud.innerHTML=`<button type="button" data-h="orbit" aria-pressed="false" aria-label="Girar 360°" title="Girar 360°"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">${ico.orbit}</svg></button><button type="button" data-h="game" aria-pressed="false" aria-label="Pilotar a arara" title="Pilotar a arara"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">${ico.game}</svg></button>`;
const game=document.createElement('div');game.className='flight-game';game.hidden=true;
game.innerHTML=`<div class="keys">${[['aero','1','Voo'],['bank','2','Curva'],['glide','3','Planar'],['flap','4','Asas'],['land','5','Pousar'],['free','F','Voo livre']].map(([c,k,l])=>`<button type="button" data-c="${c}"><kbd>${k}</kbd>${l}</button>`).join('')}</div><p>← → curva · ↑ ↓ altitude · a seta aponta para o Araras</p>`;
const compass=document.createElement('div');compass.className='flight-compass';compass.hidden=true;
compass.innerHTML='<svg viewBox="0 0 40 40" width="30" height="30"><circle cx="20" cy="20" r="18" fill="rgba(10,26,42,.3)" stroke="rgba(246,238,220,.5)"/><path d="M20 6 L26 22 L20 19 L14 22 Z" fill="#e8b323"/></svg><span></span>';
dialog.append(hud,game,compass);
const style=document.createElement('style');style.textContent=`.flight-hud{position:absolute;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));display:flex;gap:8px;z-index:5}
.flight-hud button{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;padding:0;background:rgba(10,20,34,.28);border:1px solid rgba(246,238,220,.3);color:#f6eedc;backdrop-filter:blur(6px);cursor:pointer}
.flight-hud svg{width:18px;height:18px}.flight-hud button[aria-pressed=true]{background:rgba(232,179,35,.88);color:#10233a;border-color:transparent}
.flight-game{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(70px + env(safe-area-inset-bottom,0px));display:grid;gap:6px;justify-items:center;z-index:5;width:min(560px,calc(100% - 32px))}
.flight-game[hidden],.flight-compass[hidden]{display:none}
.flight-game .keys{display:flex;flex-wrap:wrap;gap:4px;justify-content:center}
.flight-game button{display:inline-flex;align-items:center;gap:6px;font:600 11px Archivo,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#f6eedc;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);border-radius:99px;padding:8px 11px;cursor:pointer}
.flight-game button[aria-pressed=true]{background:rgba(232,179,35,.9);color:#10233a;border-color:transparent}
.flight-game kbd{font:800 10px Archivo,sans-serif;border:1px solid currentColor;border-radius:4px;padding:0 4px;opacity:.75}
.flight-game p{margin:0;font:500 11px Archivo,sans-serif;color:#f6eedc;opacity:.8;text-shadow:0 1px 6px rgba(0,0,0,.5);text-align:center}
.flight-compass{position:absolute;top:calc(64px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);display:flex;gap:8px;align-items:center;font:700 11px Archivo,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#f6eedc;text-shadow:0 1px 6px rgba(0,0,0,.5);pointer-events:none;z-index:5}
.flight-compass path{transform-origin:20px 20px}
#flightDialog .flight-story{top:calc(9% + env(safe-area-inset-top,0px));bottom:auto;font-size:clamp(20px,2.8vw,30px)}
#flightDialog .flight-compass{top:auto;bottom:calc(120px + env(safe-area-inset-bottom,0px))}`;document.head.appendChild(style);
const clipName={aero:'AERO',bank:'BANK',glide:'GLIDE',flap:'FLAP',land:'LANDING'};
hud.onclick=e=>{const b=e.target.closest('button');if(!b)return;const on=b.ariaPressed!=='true';b.ariaPressed=String(on);
  if(b.dataset.h==='orbit'){window.ARARAS_ORBIT.on=on;host.style.cursor=on?'grab':'';if(!on){window.ARARAS_ORBIT.tyaw=0;window.ARARAS_ORBIT.tpitch=0;}}
  else{ctrl.on=on;game.hidden=!on;if(!on){ctrl.clip=null;ctrl.tx=ctrl.ty=0;window.ARARAS_FREE.on=false;}}};
game.onclick=e=>{const b=e.target.closest('button');if(!b)return;const c=b.dataset.c;
  if(c==='free'){const F=window.ARARAS_FREE;F.on=!F.on;b.ariaPressed=String(F.on);return;}
  ctrl.clip=c==='aero'?null:c;if(mixer)play(clips.findIndex(x=>x.name.includes(clipName[c])));
  game.querySelectorAll('[data-c]:not([data-c=free])').forEach(x=>x.ariaPressed=String(x===b));};
const keys={};
addEventListener('keydown',e=>{if(!dialog.open||!ctrl.on)return;keys[e.key]=1;if(e.key.startsWith('Arrow'))e.stopPropagation();const n={'1':'aero','2':'bank','3':'glide','4':'flap','5':'land','f':'free','F':'free'}[e.key];if(n)game.querySelector(`[data-c="${n}"]`).click();if(e.key.startsWith('Arrow'))e.preventDefault();},{capture:true});
addEventListener('keyup',e=>{keys[e.key]=0;});
{let d=null;
 host.addEventListener('pointerdown',e=>{if(!window.ARARAS_ORBIT.on)return;window.ARARAS_ORBIT.release=0;d={x:e.clientX,y:e.clientY,yaw:window.ARARAS_ORBIT.tyaw,pitch:window.ARARAS_ORBIT.tpitch};host.style.cursor='grabbing';});
 addEventListener('pointermove',e=>{if(d){const O=window.ARARAS_ORBIT;O.tyaw=d.yaw-(e.clientX-d.x)/innerWidth*Math.PI*2;O.tpitch=Math.max(-1.2,Math.min(1.2,d.pitch+(e.clientY-d.y)/innerHeight*Math.PI));}
   else if(ctrl.on&&!window.ARARAS_ORBIT.on&&e.pointerType==='mouse'){ctrl.tx=Math.max(-1.6,Math.min(1.6,(e.clientX/innerWidth-.5)*3.2));ctrl.ty=Math.max(-.9,Math.min(.9,-(e.clientY/innerHeight-.45)*1.8));}});
 addEventListener('pointerup',()=>{if(d){d=null;host.style.cursor=window.ARARAS_ORBIT.on?'grab':'';window.ARARAS_ORBIT.release=performance.now();}});
 host.addEventListener('dblclick',()=>{window.ARARAS_ORBIT.tyaw=0;window.ARARAS_ORBIT.tpitch=0;});}
function controls(dt){const FR=window.ARARAS_FREE,O=window.ARARAS_ORBIT;
  const steer=ctrl.on?((keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0)+ctrl.tx*.6):0,climb=ctrl.on?((keys.ArrowUp?1:0)-(keys.ArrowDown?1:0)+ctrl.ty*.6):0;
  if(FR.on){FR.turn+=(steer-FR.turn)*Math.min(1,dt*3);FR.head+=FR.turn*dt*.9;FR.x+=Math.sin(FR.head)*dt*9;FR.y=Math.max(-8,Math.min(6,FR.y+climb*dt*2.5));}
  else{FR.head*=Math.pow(.25,dt);FR.x*=Math.pow(.4,dt);FR.y*=Math.pow(.4,dt);FR.turn*=Math.pow(.1,dt);}
  if(O.release&&performance.now()-O.release>2600){O.tyaw*=Math.pow(.35,dt);O.tpitch*=Math.pow(.35,dt);if(Math.abs(O.tyaw)+Math.abs(O.tpitch)<.002){O.tyaw=O.tpitch=0;O.release=0;}}
  O.yaw+=((O.tyaw+FR.head)-O.yaw)*Math.min(1,dt*4);O.pitch+=(O.tpitch-O.pitch)*Math.min(1,dt*6);
  compass.hidden=!(FR.on||Math.abs(FR.head)>.05);compass.querySelector('path').style.transform=`rotate(${-FR.head*180/Math.PI}deg)`;
  const st=window.ARARAS_FLIGHT;if(st)compass.querySelector('span').textContent='Araras · '+Math.max(0,(1-st.p)*12).toFixed(1)+' km';}
const v4=new THREE.Vector4();
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),.05);
  const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio,2);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){R.setPixelRatio(dpr);R.setSize(w,h,false);}
  controls(dt);
  if(!dialog.open){if(visible){R.clear();arrCanvas.style.opacity=0;mist.style.opacity=0;visible=false;}return;}
  visible=true;
  if(!model){R.clear();return;}
  const st=window.ARARAS_FLIGHT;
  // posição na tela: onde o voo coloca a arara (projeção da trajetória), suavizada e limitada
  let nx=0,ny=0,roll=0;
  if(st){const m=st.bird,p=st.vp0||st.vp;v4.set(m[12],m[13],m[14],1);const x=p[0]*v4.x+p[4]*v4.y+p[8]*v4.z+p[12],y=p[1]*v4.x+p[5]*v4.y+p[9]*v4.z+p[13],ww=p[3]*v4.x+p[7]*v4.y+p[11]*v4.z+p[15];
    nx=Math.max(-.7,Math.min(.7,x/ww));ny=Math.max(-.35,Math.min(.6,y/ww));roll=Math.asin(Math.max(-1,Math.min(1,m[1])));}
  ctrl.x+=(ctrl.tx-ctrl.x)*Math.min(1,dt*4);ctrl.y+=(ctrl.ty-ctrl.y)*Math.min(1,dt*4);
  nx=Math.max(-.9,Math.min(.9,nx+ctrl.x*.45+P.side));ny=Math.max(-.55,Math.min(.65,ny+ctrl.y*.4+P.height));
  {const O2=window.ARARAS_ORBIT;const k=Math.min(1,(Math.abs((O2?.yaw||0)-(window.ARARAS_FREE?.head||0))+Math.abs(O2?.pitch||0))*2.5);nx*=1-k;ny=ny*(1-k)+(P.height*.5)*k;}
  bank.rotation.set(0,0,roll*.8-(ctrl.tx-ctrl.x)*.8-(window.ARARAS_FREE?.turn||0)*.7);
  const D=Math.PI/180;pose.rotation.set(P.pitch*D,P.yaw*D,P.roll*D,'YXZ');
  // câmera "Atrás" do Laboratório: direção (0,.45,-1), distância 1.5 × diagonal
  cam.aspect=w/h;cam.fov=P.fov;const k=1.5/P.scale*(w<h?1.35:1)*Math.tan(35*Math.PI/360)/Math.tan(P.fov*Math.PI/360);
  const O=window.ARARAS_ORBIT||{yaw:0,pitch:0},FRh=(window.ARARAS_FREE?.head||0);const oy=O.yaw-FRh,op=O.pitch;
  const dir=new THREE.Vector3(0,P.camUp,-1).normalize(); // câmera de jogo: gira em volta da arara; ela segue reto no rumo
  dir.applyAxisAngle(new THREE.Vector3(1,0,0),-op).applyAxisAngle(new THREE.Vector3(0,1,0),oy);
  cam.position.copy(dir).multiplyScalar(radius*k);cam.up.set(0,1,0);cam.lookAt(0,0,0);cam.updateProjectionMatrix();
  cam.projectionMatrix.elements[8]-=nx;cam.projectionMatrix.elements[9]-=ny;cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  // Animações por trecho (o controle manual tem prioridade)
  if(mixer&&!ctrl.clip&&st){const p=st.p;const want=p>.93?'LANDING':((p>.58&&p<.75)||Math.abs(roll)>.42)?'BANK':'AERO';
    if(want!==curName){curName=want;play(clips.findIndex(c=>c.name.includes(want)),.8);}}
  // Chegada: cena da fachada por baixo, arara desce até a porta
  const pa=st?st.p:0;const A=Math.min(1,Math.max(0,(pa-.885)/.02));
  arrCanvas.style.opacity=A;mist.style.opacity=Math.max(0,1-Math.abs(pa-.893)/.012)*.9;
  if(A>0){if(!arrival)arrival=createArrival(arrCanvas);const a=Math.min(1,Math.max(0,(pa-.885)/.115));arrival.render(a,performance.now()/1000);
    if(a>.55){const d=arrival.doorScreen();const k2=Math.min(1,(a-.55)/.45);const e2=k2*k2*(3-2*k2);
      cam.projectionMatrix.elements[8]+=nx-(nx*(1-e2)+d.x*e2);cam.projectionMatrix.elements[9]+=ny-(ny*(1-e2)+(d.y+.12)*e2);
      cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();scaleArr=1-e2*.62;} else scaleArr=1;}
  else scaleArr=1;
  if(scaleArr!==1){const s0=pose.scale.x;pose.scale.setScalar(scaleArr);} else pose.scale.setScalar(1);
  if(mixer)mixer.update(dt);
  R.render(S,cam);
}
frame();
