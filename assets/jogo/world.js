// Mundo livre do Araras World: céu com temas, terreno com vale, lagos e cachoeira, água, floresta tropical,
// coqueiros e buritis, nuvens, chuva e túnel de videiras em curva.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- ruído determinístico ----------
const H=(x,y)=>{let h=Math.sin(x*127.1+y*311.7)*43758.5453;return h-Math.floor(h);};
function vnoise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
  const a=H(ix,iy),b=H(ix+1,iy),c=H(ix,iy+1),d=H(ix+1,iy+1);return a+(b-a)*ux+(c-a)*uy+(a-b-c+d)*ux*uy;}
function fbm(x,y,o=5){let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*vnoise(x*f,y*f);f*=2.03;a*=.5;}return s;}
const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

export const SUN=new THREE.Vector3(0,.06,1).normalize();
export const WORLD={size:7000,water:0,
  riverX:z=>Math.sin(z*.0011)*520+Math.sin(z*.0031+1.3)*130,
  bar:new THREE.Vector3(),tunnelStart:new THREE.Vector3(0,420,-2600),tunnelLen:150,deck:[235,300],
  lakes:[{x:700,z:-300,r:230},{x:-1150,z:-900,r:260},{x:1400,z:850,r:220},{x:-600,z:1450,r:240},{x:250,z:-1650,r:300},{x:-1500,z:400,r:200}],
  mesa:{x:1090,z:-300,r:150,top:150},
  // túnel em curva: centro e direção em função da distância percorrida
  tunnelPath(s,out={p:new THREE.Vector3(),t:new THREE.Vector3()}){const T0=WORLD.tunnelStart;
    out.p.set(T0.x+Math.sin(s*.03)*9,T0.y+Math.sin(s*.021+.6)*3.5,T0.z+s);
    out.t.set(Math.cos(s*.03)*.27,Math.cos(s*.021+.6)*.0735,1).normalize();return out;}};
export function height(x,z){
  let h=fbm(x*.0009,z*.0009,5)*260-60;              // colinas
  h+=Math.pow(Math.max(0,fbm(x*.0004+7,z*.0004+3,3)-.45),2)*1400; // serras ao fundo
  const d=Math.abs(x-WORLD.riverX(z));
  const s=ss(35,295,d);h=-9+(h+9)*s;               // vale do rio
  const M=WORLD.mesa,dm=Math.hypot(x-M.x,z-M.z);h=Math.max(h,h+(M.top-h)*ss(M.r*1.07,M.r*.95,dm)); // mesa da cachoeira
  for(const L of WORLD.lakes){const dl=Math.hypot(x-L.x,z-L.z);const k=ss(L.r*1.25,L.r*.6,dl);if(k>0)h=h+(-12-h)*k;} // lagos
  const b=WORLD.bar,db=Math.hypot(x-b.x,z-b.z);       // clareira plana do bar
  if(db<140){const k=ss(70,140,db);h=b.y+(h-b.y)*k;}
  return h;
}
{const z=1700;WORLD.bar.set(WORLD.riverX(z)+190,0,z);WORLD.bar.y=Math.max(14,height(WORLD.bar.x,WORLD.bar.z)+0);}

// ---------- temas de céu ----------
export const THEMES={
  amanhecer:{sun:[0,.06,1],g:[[1,.66,.34],[1,.55,.52],[.86,.52,.72],[.30,.36,.78],[.14,.20,.58]],glow:[1,.72,.4],cl:[1,.66,.66],cl2:[1,.80,.52],cd:[.58,.46,.66],fog:[.86,.62,.62],
    sunL:[0xffc89a,2.2],hemi:[0xd8c0e8,0x4a5a30,1.7],exp:1.05,night:0,under:[.95,.70,.72]},
  dia:{sun:[.35,.75,.55],g:[[.86,.92,1],[.72,.84,1],[.48,.68,.98],[.28,.50,.93],[.13,.32,.82]],glow:[1,.95,.82],cl:[1,1,1],cl2:[1,.98,.92],cd:[.62,.68,.80],fog:[.76,.84,.95],
    sunL:[0xfff3e0,2.6],hemi:[0xcfe3ff,0x50603a,1.9],exp:1.1,night:0,under:[.80,.86,.95]},
  por:{sun:[-.15,.04,1],g:[[1,.46,.18],[.98,.36,.30],[.62,.26,.46],[.26,.18,.46],[.10,.08,.30]],glow:[1,.5,.2],cl:[1,.5,.35],cl2:[1,.66,.3],cd:[.42,.26,.40],fog:[.78,.42,.38],
    sunL:[0xff9a5a,2.0],hemi:[0xe0a0b0,0x40302a,1.4],exp:1.05,night:0,under:[.85,.45,.42]},
  noite:{sun:[.25,.45,.85],g:[[.12,.15,.30],[.08,.11,.25],[.05,.07,.19],[.03,.04,.13],[.01,.02,.07]],glow:[.55,.65,1],cl:[.38,.44,.62],cl2:[.42,.48,.66],cd:[.10,.12,.20],fog:[.07,.09,.17],
    sunL:[0x9fb4ff,.55],hemi:[0x5a6aa0,0x101820,.7],exp:1.0,night:1,under:[.10,.12,.22]}};

const PANO=`
uniform sampler2D uPano; uniform vec3 uSun,uG0,uG1,uG2,uG3,uG4,uGlow,uCl,uCl2,uCd,uUnder; uniform float uNight,uRain,uTime;
vec3 pano(vec3 r){float u=atan(r.x,r.z)/6.28318+.1477+uTime*.0006;float el=min(1.5707,asin(clamp(r.y,-1.,1.))+.19);
  float v=(1.5708-el)/(3.14159*.53);return pow(texture2D(uPano,vec2(fract(u),clamp(v,0.,.995))).rgb,vec3(1.12));}
float hsh(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}
vec3 skyColor(vec3 r){
  float mu=dot(r,uSun),d=acos(clamp(mu,-1.,1.)),y=max(r.y,0.),sw=pow(max(mu,0.),4.);
  vec3 g=mix(uG0,uG1,smoothstep(.0,.08,y));g=mix(g,uG2,smoothstep(.06,.22,y));g=mix(g,uG3,smoothstep(.18,.55,y));g=mix(g,uG4,smoothstep(.5,1.,y));
  g=mix(g,uGlow,sw*smoothstep(.35,0.,y)*.8*(1.-uNight*.7));
  vec3 p=pano(vec3(r.x,max(r.y,.0),r.z));float pl=dot(p,vec3(.299,.587,.114)),pb=p.b-p.r;
  float cm=smoothstep(.30,.62,pl)*(1.-smoothstep(.16,.42,pb))*smoothstep(-.005,.03,r.y);
  vec3 cl=mix(uCd*(.6+.6*pl),mix(uCl,uCl2,sw)*(.75+.5*pl),smoothstep(.45,.85,pl));
  vec3 c=mix(g,cl,cm*(.92+uRain*.08));
  if(uNight>0.){vec3 q=floor(r*420.);float st=step(.9965,hsh(q))*smoothstep(.05,.3,r.y)*(1.-cm);c+=vec3(.9,.95,1.)*st*uNight*(.6+.4*sin(uTime*3.+hsh(q)*40.));}
  vec3 under=mix(uUnder,uUnder*.6,smoothstep(-.02,-.5,r.y));c=mix(c,under,smoothstep(.0,-.06,r.y));
  float k=1.-uNight*.75;
  c+=uGlow*(exp(-d*3.)*.25+exp(-d*11.)*.5)*k+vec3(1.,.93,.8)*exp(-d*45.)*1.2*k+mix(vec3(1.,.98,.92),vec3(.85,.9,1.),uNight)*exp(-d*160.)*2.5;
  c=mix(c,vec3(dot(c,vec3(.33)))*.62,uRain*.45);
  return c;}
vec3 grade(vec3 c){c=1.-exp(-c*1.7);c=pow(c,vec3(1.04));return mix(vec3(dot(c,vec3(.299,.587,.114))),c,1.14);}
`;
export const FOG=new THREE.Color().setRGB(.86,.62,.62,THREE.SRGBColorSpace);

export function buildWorld(R,scene){
  const an=R.capabilities.getMaxAnisotropy();const MOB=matchMedia('(pointer: coarse)').matches;
  const big=R.capabilities.maxTextureSize>=8192&&!MOB;
  const pano=new THREE.TextureLoader().load(big?(window.IN_SITE?'../sky-8k.jpg':'sky-8k.jpg'):'sky-pano.jpg');pano.colorSpace=THREE.NoColorSpace;
  const V3=a=>new THREE.Vector3(...a);
  const shared={uPano:{value:pano},uSun:{value:SUN},uTime:{value:0},uCam:{value:new THREE.Vector3()},uNight:{value:0},uRain:{value:0},
    uG0:{value:new THREE.Vector3()},uG1:{value:new THREE.Vector3()},uG2:{value:new THREE.Vector3()},uG3:{value:new THREE.Vector3()},uG4:{value:new THREE.Vector3()},
    uGlow:{value:new THREE.Vector3()},uCl:{value:new THREE.Vector3()},uCl2:{value:new THREE.Vector3()},uCd:{value:new THREE.Vector3()},uUnder:{value:new THREE.Vector3()},uFog:{value:new THREE.Vector3(.86,.62,.62)}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(11000,48,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,toneMapped:false,fog:false,uniforms:shared,
    vertexShader:'varying vec3 vD;void main(){vD=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',
    fragmentShader:PANO+'varying vec3 vD;void main(){gl_FragColor=vec4(grade(skyColor(normalize(vD))),1.);}'}));
  sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
  scene.fog=new THREE.FogExp2(FOG.clone(),.00019);
  const sun=new THREE.DirectionalLight(0xffc89a,2.2);scene.add(sun);
  const hemi=new THREE.HemisphereLight(0xd8c0e8,0x4a5a30,1.7);scene.add(hemi);
  const fill=new THREE.DirectionalLight(0xffd6c0,.9);fill.position.set(-600,900,-2500);scene.add(fill);
  function setTheme(name){const T=THEMES[name]||THEMES.amanhecer;SUN.set(...T.sun).normalize();
    ['uG0','uG1','uG2','uG3','uG4'].forEach((k,i)=>shared[k].value.set(...T.g[i]));shared.uGlow.value.set(...T.glow);shared.uCl.value.set(...T.cl);shared.uCl2.value.set(...T.cl2);shared.uCd.value.set(...T.cd);
    shared.uUnder.value.set(...T.under);shared.uFog.value.set(...T.fog);shared.uNight.value=T.night;
    scene.fog.color.setRGB(...T.fog,THREE.SRGBColorSpace);sun.color.setHex(T.sunL[0]);sun.intensity=T.sunL[1];sun.position.copy(SUN).multiplyScalar(3000).add(new THREE.Vector3(0,900,0));
    hemi.color.setHex(T.hemi[0]);hemi.groundColor.setHex(T.hemi[1]);hemi.intensity=T.hemi[2];fill.intensity=T.night?.15:.9;R.toneMappingExposure=T.exp;}
  setTheme('amanhecer');

  // ---------- terreno com textura aérea real de grama e pedra (Poly Haven, CC0) ----------
  const N=MOB?220:320,S=WORLD.size;const tg=new THREE.PlaneGeometry(S,S,N,N);tg.rotateX(-Math.PI/2);
  const pos=tg.attributes.position,col=new Float32Array(pos.count*3);const c=new THREE.Color();
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i)+600;const h=height(x,z);pos.setY(i,h);pos.setZ(i,z);
    const n=fbm(x*.008,z*.008,3);
    if(h<1.5)c.setRGB(.80,.74,.60);else if(h>380)c.setRGB(.82+n*.1,.80+n*.1,.72);
    else if(h>110&&Math.hypot(x-WORLD.mesa.x,z-WORLD.mesa.z)<WORLD.mesa.r*1.25)c.setRGB(.78,.68,.55);
    else c.setRGB(.42+n*.25,.78+n*.2,.30+n*.12);
    col.set([c.r,c.g,c.b],i*3);}
  tg.setAttribute('color',new THREE.BufferAttribute(col,3));tg.computeVertexNormals();
  const TL=new THREE.TextureLoader();
  const tx=(f,rep)=>{const t=TL.load(f);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=an;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);}return t;};
  const grassT=tx('grass.jpg',300);
  const terrain=new THREE.Mesh(tg,new THREE.MeshStandardMaterial({vertexColors:true,map:grassT,roughness:.95}));scene.add(terrain);

  // ---------- água: profundidade real (mapa de alturas), margens com espuma, reflexo do céu ----------
  const HN=256,hd=new Uint8Array(HN*HN*4);
  for(let y=0;y<HN;y++)for(let x=0;x<HN;x++){const wx=(x/(HN-1)-.5)*S,wz=(y/(HN-1)-.5)*S+600;const h=Math.min(255,Math.max(0,(height(wx,wz)+40)*2));hd[(y*HN+x)*4]=h;hd[(y*HN+x)*4+3]=255;}
  const hTex=new THREE.DataTexture(hd,HN,HN);hTex.magFilter=hTex.minFilter=THREE.LinearFilter;hTex.needsUpdate=true;
  const waterMat=level=>new THREE.ShaderMaterial({toneMapped:false,transparent:true,depthWrite:true,uniforms:{...shared,uH:{value:hTex},uLevel:{value:level},uSize:{value:S}},
    vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:PANO+`uniform vec3 uCam,uFog;uniform sampler2D uH;uniform float uLevel,uSize;varying vec3 vW;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      float wav(vec2 q){return n(q+uTime*.3)+n(q*2.3-uTime*.22)*.5+n(q*6.1+uTime*.5)*.18;}
      void main(){vec2 q=vW.xz*.06;float e=.03;float a=wav(q);
        vec3 N=normalize(vec3((a-wav(q+vec2(e,0)))*1.4,1.,(a-wav(q+vec2(0,e)))*1.4));N=normalize(N+vec3(sin(uTime*2.+vW.x*.4)*.02*uRain,0.,cos(uTime*2.3+vW.z*.4)*.02*uRain));
        vec3 V=normalize(vW-uCam);vec3 Rf=reflect(V,N);Rf.y=abs(Rf.y);
        float fr=.03+.97*pow(1.-max(dot(-V,N),0.),5.);
        float th=texture2D(uH,vec2(vW.x/uSize+.5,(vW.z-600.)/uSize+.5)).r*255./2.-40.;float depth=uLevel-th;
        vec3 shallow=vec3(.16,.50,.46),deep=vec3(.03,.13,.18);vec3 body=mix(shallow,deep,smoothstep(.5,9.,depth))*mix(1.,.35,uNight);
        vec3 c=mix(body,grade(skyColor(normalize(Rf))),clamp(fr*1.25,.18,1.));
        c+=mix(vec3(1.,.85,.65),vec3(.8,.85,1.),uNight)*pow(max(dot(Rf,uSun),0.),300.)*2.4*(1.-uNight*.6);
        float foam=smoothstep(1.6,.2,depth)*smoothstep(.45,.75,n(vW.xz*.35+uTime*.4)+.3*n(vW.xz*1.3-uTime*.6));c=mix(c,vec3(.95,.97,1.)*(1.-uNight*.6),foam*.75);
        float fd=1.-exp(-length(vW-uCam)*.00019);c=mix(c,uFog,fd*.9);
        gl_FragColor=vec4(c,mix(.55,.97,clamp(fr*1.6+smoothstep(1.,6.,depth)*.25,0.,1.)));}`});
  const water=new THREE.Mesh(new THREE.PlaneGeometry(S,S),waterMat(WORLD.water));water.rotation.x=-Math.PI/2;water.position.set(0,WORLD.water,600);water.layers.set(1);scene.add(water);

  // ---------- cachoeira: queda na borda da mesa até o lago, com névoa ----------
  let fx=0,fy=0;const M=WORLD.mesa;for(let x=M.x-M.r*1.4;x<M.x;x+=2){const hh=height(x,M.z);if(hh>M.top*.5){fx=x;fy=hh;break;}}
  const top=height(fx+18,M.z);
  const fallMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,uniforms:shared,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform float uTime,uNight;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      void main(){float s=n(vec2(vUv.x*28.,vUv.y*6.+uTime*3.2))*.6+n(vec2(vUv.x*70.,vUv.y*14.+uTime*5.))*.4;float edge=smoothstep(0.,.12,vUv.x)*smoothstep(1.,.88,vUv.x);
        vec3 c=mix(vec3(.55,.75,.78),vec3(.97,.99,1.),s)*mix(1.,.4,uNight);gl_FragColor=vec4(c,(.55+.45*s)*edge);}`});
  const fall=new THREE.Mesh(new THREE.PlaneGeometry(36,Math.max(20,top+6),1,8),fallMat);fall.position.set(fx-4,(top+6)/2-3,M.z);fall.rotation.y=-Math.PI/2;scene.add(fall);
  const pool=new THREE.Mesh(new THREE.PlaneGeometry(60,80),waterMat(top+.6));pool.rotation.x=-Math.PI/2;pool.position.set(fx+34,top+.6,M.z);pool.layers.set(1);scene.add(pool);
  const haloC=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(cv);})();
  const mists=[];for(let i=0;i<9;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:haloC,transparent:true,depthWrite:false,opacity:.35}));sp.position.set(fx-10-Math.random()*25,4+Math.random()*10,M.z+(Math.random()-.5)*40);sp.scale.setScalar(30+Math.random()*25);scene.add(sp);mists.push(sp);}
  WORLD.waterfall=new THREE.Vector3(fx,top,M.z);

  // ---------- floresta: árvores com folhagem fotográfica (CC0), instanciadas por espécie ----------
  const barkT=tx('jac_trunk.jpg');barkT.wrapS=barkT.wrapT=THREE.RepeatWrapping;
  const barkM=new THREE.MeshStandardMaterial({map:barkT,color:0xb59a82,roughness:1});
  const leafM=f=>new THREE.MeshStandardMaterial({map:tx(f),alphaTest:.42,side:THREE.DoubleSide,roughness:.85,emissive:0x1d2a08,emissiveIntensity:.35});
  let seed=11;const r=()=>((seed=(seed*16807)%2147483647)/2147483647);
  const V=new THREE.Vector3(),C0=new THREE.Vector3();
  function cards(n,cy,rx,ry,size,flat=0){const gs=[];for(let i=0;i<n;i++){
      const u=r()*6.28,v=Math.acos(1-r()*(1.7-flat*.6)),k=.55+.45*Math.cbrt(r());
      V.set(Math.sin(v)*Math.cos(u)*rx*k,Math.cos(v)*ry*k,Math.sin(v)*Math.sin(u)*rx*k);
      const g=new THREE.PlaneGeometry(size*(.8+r()*.5),size*(.8+r()*.5));
      g.rotateX(-Math.PI/2+(r()-.5)*(1.6-flat*1.2));g.rotateY(r()*6.28);g.rotateZ((r()-.5)*.8);g.translate(V.x,V.y+cy,V.z);
      const n2=g.attributes.normal;C0.set(V.x,V.y*1.4+ry*.3,V.z).normalize();for(let j=0;j<n2.count;j++)n2.setXYZ(j,C0.x,C0.y,C0.z);
      gs.push(g);}return mergeGeometries(gs);}
  function wood(h,branches){const gs=[];const t=new THREE.CylinderGeometry(.018,.035,h,7,1);t.translate(0,h/2,0);gs.push(t);
    for(let i=0;i<branches;i++){const a=r()*6.28,len=.18+r()*.2,b=new THREE.CylinderGeometry(.006,.014,len,5,1);b.translate(0,len/2,0);b.rotateZ(.6+r()*.5);b.rotateY(a);b.translate(0,h*(.55+r()*.35),0);gs.push(b);}
    const g=mergeGeometries(gs);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*2,uv.getY(i)*4);return g;}
  const SPECIES=[
    {w:.36,leaf:'spray_broad.png',cards:()=>cards(62,.74,.5,.36,.62),wood:()=>wood(.8,6),tint:[[.62,.95,.45],[.55,.85,.40],[.70,1.,.50]],H:[18,30],R:1},
    {w:.24,leaf:'spray_fern.png',cards:()=>cards(54,.72,.56,.30,.64,.5),wood:()=>wood(.75,7),tint:[[.85,1.,.75],[.75,.95,.7]],H:[16,26],R:1.1},
    {w:.10,leaf:'spray_pink.png',cards:()=>cards(50,.72,.52,.32,.6,.4),wood:()=>wood(.75,7),tint:[[1,1,1]],H:[14,24],R:1},   // ipê-rosa
    {w:.10,leaf:'spray_yellow.png',cards:()=>cards(50,.72,.52,.32,.6,.4),wood:()=>wood(.75,7),tint:[[1,1,1]],H:[14,24],R:1}, // ipê-amarelo
    {w:.10,leaf:'spray_broad.png',cards:()=>cards(56,.88,.7,.2,.62,1),wood:()=>wood(.92,8),tint:[[.6,.9,.45]],H:[34,48],R:1.3}];  // emergentes
  const NT=MOB?2200:8000;
  const sp=SPECIES.map(S2=>{const cg=S2.cards(),wg=S2.wood();const n=Math.ceil(NT*S2.w*1.25);
    const ci=new THREE.InstancedMesh(cg,leafM(S2.leaf),n),wi=new THREE.InstancedMesh(wg,barkM,n);ci.count=wi.count=0;scene.add(wi,ci);return {S2,ci,wi,n};});
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p=new THREE.Vector3(),e=new THREE.Euler();
  const nearLake=(x,z,f=1)=>WORLD.lakes.some(L=>Math.hypot(x-L.x,z-L.z)<L.r*f);
  for(let i=0,placed=0;i<NT*7&&placed<NT;i++){
    const z=(r()-.5)*S*.9+600,x=WORLD.riverX(z)+(r()-.5)*(r()<.85?1900:S*.9);const h=height(x,z);
    if(h<4||h>360)continue;if(Math.abs(x-WORLD.riverX(z))<55||nearLake(x,z,.95))continue;
    {const dx=x-WORLD.bar.x,dz=z-WORLD.bar.z;if(Math.hypot(dx,dz)<170||(dz<0&&dz>-500&&Math.abs(dx)<60))continue;}
    if(fbm(x*.004,z*.004,2)<.33)continue;
    let k=r(),j=0;while(j<sp.length-1&&k>sp[j].S2.w){k-=sp[j].S2.w;j++;}const T2=sp[j];if(T2.ci.count>=T2.n)continue;
    const H2=T2.S2.H[0]+r()*(T2.S2.H[1]-T2.S2.H[0]),W2=H2*(.75+r()*.35)*T2.S2.R;
    q.setFromEuler(e.set((r()-.5)*.08,r()*6.28,(r()-.5)*.08));m.compose(p.set(x,h-1,z),q,s.set(W2,H2,W2));
    T2.ci.setMatrixAt(T2.ci.count,m);T2.wi.setMatrixAt(T2.wi.count,m);
    const t=T2.S2.tint[Math.floor(r()*T2.S2.tint.length)],v=.82+r()*.3;T2.ci.setColorAt(T2.ci.count,c.setRGB(t[0]*v,t[1]*v,t[2]*v));
    T2.ci.count++;T2.wi.count++;placed++;}
  for(const T2 of sp){if(T2.ci.instanceColor)T2.ci.instanceColor.needsUpdate=true;}

  // ---------- coqueiros (margens e clareiras) e buritis (veredas, palmeira onde a arara-canindé faz ninho) ----------
  const trunkT=tx('palm_trunk.jpg');trunkT.wrapS=trunkT.wrapT=THREE.RepeatWrapping;
  const trunkM=new THREE.MeshStandardMaterial({map:trunkT,roughness:1});
  const frondM=new THREE.MeshStandardMaterial({map:tx('coco_frond.png'),alphaTest:.45,side:THREE.DoubleSide,roughness:.75,color:0xd6e8b8,emissive:0x142208,emissiveIntensity:.3});
  const dryM=new THREE.MeshStandardMaterial({map:tx('dry_frond.png'),alphaTest:.45,side:THREE.DoubleSide,roughness:.9});
  const fanM=new THREE.MeshStandardMaterial({map:tx('buriti_fan.png'),alphaTest:.45,side:THREE.DoubleSide,roughness:.8,color:0xd8ecc0,emissive:0x142208,emissiveIntensity:.3});
  const nutM=new THREE.MeshStandardMaterial({color:0x6a7a2a,roughness:.6});
  const bentTrunk=(bend,rad=.035)=>{const g=new THREE.CylinderGeometry(rad*.75,rad,1,9,10);g.translate(0,.5,0);const P=g.attributes.position;for(let i=0;i<P.count;i++){const y=P.getY(i);P.setX(i,P.getX(i)+y*y*bend);}
    const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i),uv.getY(i)*6);g.computeVertexNormals();return g;};
  const frondGeo=(len,droop)=>{const g=new THREE.PlaneGeometry(len,len*.32,10,1);g.translate(len/2,0,0);const P=g.attributes.position;
    for(let i=0;i<P.count;i++){const x=P.getX(i)/len;P.setZ(i,P.getY(i)*.0);P.setY(i,P.getY(i));P.setZ(i,-x*x*droop*len);}g.rotateX(-Math.PI/2);g.computeVertexNormals();return g;};
  // coqueiro (altura 1 = topo do tronco)
  const cocoCrown=[];for(let k=0;k<15;k++){const g=frondGeo(.42,.75);g.rotateZ(.25+r()*.35);g.rotateY(k/15*6.28+r()*.2);g.translate(.12,1,0);cocoCrown.push(g);}
  const cocoLeaf=mergeGeometries(cocoCrown);const cocoNut=(()=>{const gs=[];for(let k=0;k<7;k++){const g=new THREE.SphereGeometry(.022,8,6);g.translate(.12+Math.cos(k)*.03,.97-(k%3)*.012,Math.sin(k)*.03);gs.push(g);}return mergeGeometries(gs);})();
  const cocoTrunk=bentTrunk(.12);
  // buriti: tronco reto, coroa de leques e saia de folhas secas
  const burCrown=[];for(let k=0;k<16;k++){const g=new THREE.PlaneGeometry(.32,.32);g.translate(0,.2,0);g.rotateX(-.5-r()*.6);g.rotateY(k/16*6.28);g.translate(0,1.02,0);burCrown.push(g);}
  const burLeaf=mergeGeometries(burCrown);const burDry=(()=>{const gs=[];for(let k=0;k<10;k++){const g=frondGeo(.22,.2);g.rotateZ(-1.2-r()*.3);g.rotateY(k/10*6.28);g.translate(0,.97,0);gs.push(g);}return mergeGeometries(gs);})();
  const burTrunk=bentTrunk(0,.028);
  const NCO=MOB?260:620,NBU=MOB?140:360;
  const iCT=new THREE.InstancedMesh(cocoTrunk,trunkM,NCO),iCL=new THREE.InstancedMesh(cocoLeaf,frondM,NCO),iCN=new THREE.InstancedMesh(cocoNut,nutM,NCO);
  const iBT=new THREE.InstancedMesh(burTrunk,trunkM,NBU),iBL=new THREE.InstancedMesh(burLeaf,fanM,NBU),iBD=new THREE.InstancedMesh(burDry,dryM,NBU);
  let co=0,bu=0;
  for(let i=0;i<NCO*6&&co<NCO;i++){let x,z;if(r()<.5){const L=WORLD.lakes[Math.floor(r()*WORLD.lakes.length)];const a=r()*6.28,d=L.r*(.95+r()*.45);x=L.x+Math.cos(a)*d;z=L.z+Math.sin(a)*d;}
    else{z=(r()-.5)*S*.85+600;x=WORLD.riverX(z)+(r()<.5?-1:1)*(50+r()*170);}
    if(i<60){const a=r()*6.28,d=60+r()*90;x=WORLD.bar.x+Math.cos(a)*d;z=WORLD.bar.z+Math.sin(a)*d*.8;if(z<WORLD.bar.z-10&&Math.abs(x-WORLD.bar.x)<30)continue;}
    const h=height(x,z);if(h<2||h>140)continue;const th=15+r()*12;
    q.setFromEuler(e.set(0,r()*6.28,0));m.compose(p.set(x,h-.5,z),q,s.set(th,th,th));iCT.setMatrixAt(co,m);iCL.setMatrixAt(co,m);iCN.setMatrixAt(co,m);co++;}
  for(let i=0;i<NBU*8&&bu<NBU;i++){const L=WORLD.lakes[Math.floor(r()*WORLD.lakes.length)];const a=r()*6.28,d=L.r*(.9+r()*.7);const x=L.x+Math.cos(a)*d,z=L.z+Math.sin(a)*d;
    const h=height(x,z);if(h<1||h>90)continue;const th=20+r()*14;
    q.setFromEuler(e.set((r()-.5)*.04,r()*6.28,(r()-.5)*.04));m.compose(p.set(x,h-.5,z),q,s.set(th,th,th));iBT.setMatrixAt(bu,m);iBL.setMatrixAt(bu,m);iBD.setMatrixAt(bu,m);bu++;}
  for(const im of [iCT,iCL,iCN])im.count=co;for(const im of [iBT,iBL,iBD])im.count=bu;scene.add(iCT,iCL,iCN,iBT,iBL,iBD);

  // ---------- nuvens (camada atravessável que se move + névoa entre as árvores) ----------
  const ctex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');
    for(let i=0;i<60;i++){const x=128+(Math.random()-.5)*120,y=128+(Math.random()-.5)*80,rr=30+Math.random()*60;const gr=g.createRadialGradient(x,y,0,x,y,rr);
      gr.addColorStop(0,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,256);}
    return new THREE.CanvasTexture(cv);})();
  const cloudMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{...shared,uTex:{value:ctex}},
    vertexShader:`attribute vec4 aCloud;varying vec2 vUv;varying float vD,vY,vSide,vMist;uniform vec3 uCam;uniform float uTime;
      void main(){vUv=uv;vec3 c=(instanceMatrix*vec4(0,0,0,1)).xyz;float sz=aCloud.x;vMist=aCloud.z;c.x+=uTime*1.6*(1.-vMist);c.z+=uTime*.6*(1.-vMist);
        vec4 mv=viewMatrix*vec4(c,1.);mv.xy+=position.xy*sz*vec2(1.,mix(.62,.28,vMist));vD=-mv.z;vY=position.y;vSide=aCloud.y;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform sampler2D uTex;uniform vec3 uFog,uCl,uCl2,uCd;uniform float uNight,uRain;varying vec2 vUv;varying float vD,vY,vSide,vMist;
      void main(){float a=texture2D(uTex,vUv).a;if(a<.01)discard;float lit=smoothstep(-.5,.6,vY);
        vec3 col=mix(uCd,mix(uCl,uCl2,vSide),lit);col=mix(col,vec3(.62),uRain*.4);
        col=mix(col,mix(vec3(.93,.88,.92),vec3(.25,.28,.38),uNight),vMist*.7);a*=mix(1.,.38,vMist);float near=smoothstep(4.,40.,vD);float fd=1.-exp(-vD*.00028);col=mix(col,uFog,fd*.85);
        a*=near*(1.-fd*.6);gl_FragColor=vec4(col*a,a);}`,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor});
  const quad=new THREE.PlaneGeometry(1,1);const NC=MOB?800:1450;const clouds=new THREE.InstancedMesh(quad,cloudMat,NC);
  const aC=new Float32Array(NC*4);const centers=[];let k=0;
  for(let i=0;i<NC*3&&k<NC;i++){
    let x,y,z,sz,side;
    if(k<NC*.9){x=(r()-.5)*S*.95;z=-3300+r()*4300;if(fbm(x*.0016+5,z*.0016,3)<.43)continue;y=WORLD.deck[0]+r()*(WORLD.deck[1]-WORLD.deck[0]);sz=110+r()*170;}
    else{z=-600+r()*2000;x=WORLD.riverX(z)+(r()-.5)*1400;const h=height(x,z);if(h<0)continue;y=h+28+r()*30;sz=120+r()*140;}
    side=Math.max(0,Math.min(1,.5+(z-x*.1)/6000));
    m.compose(p.set(x,y,z),q.identity(),s.set(1,1,1));clouds.setMatrixAt(k,m);aC.set([sz,side,k>=NC*.9?1:0,0],k*4);centers.push([x,y,z,sz*.42,k>=NC*.9?1:0]);k++;}
  clouds.count=k;quad.setAttribute('aCloud',new THREE.InstancedBufferAttribute(aC,4));clouds.frustumCulled=false;clouds.renderOrder=5;scene.add(clouds);
  const cloudDensityAt=v=>{const t=shared.uTime.value;let best=0;for(const [x,y,z,rr,mist] of centers){const dx=v.x-(x+(mist?0:t*1.6)),dy=(v.y-y)*1.6,dz=v.z-(z+(mist?0:t*.6));const d2=dx*dx+dy*dy+dz*dz;if(d2<rr*rr){best=Math.max(best,1-Math.sqrt(d2)/rr);}}return best;};

  // ---------- chuva (não interfere no jogo) ----------
  const ND=MOB?900:2200,rg=new THREE.BufferGeometry(),rp=new Float32Array(ND*6),rv=new Float32Array(ND);for(let i=0;i<ND;i++){rv[i]=Math.random();}
  rg.setAttribute('position',new THREE.BufferAttribute(rp,3));
  const rain=new THREE.LineSegments(rg,new THREE.LineBasicMaterial({color:0xcfdcff,transparent:true,opacity:0,depthWrite:false}));rain.frustumCulled=false;scene.add(rain);
  let rainAmt=0,rainTarget=0;

  // ---------- materiais de videira (túnel e anéis) ----------
  const bark=TL.load('bark.jpg');bark.colorSpace=THREE.SRGBColorSpace;bark.wrapS=bark.wrapT=THREE.RepeatWrapping;bark.repeat.set(10,1);bark.anisotropy=an;
  const barkMat=new THREE.MeshStandardMaterial({map:bark,color:0xd8b89a,roughness:.95});
  const leafTex=tx('leaf.webp');
  const leafMat=new THREE.MeshStandardMaterial({map:leafTex,alphaTest:.5,side:THREE.DoubleSide,roughness:.75,emissive:0x2a3a08,emissiveIntensity:.3});
  const grapeMat=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.32,clearcoat:.6,clearcoatRoughness:.25,sheen:.4,sheenColor:new THREE.Color(0x9a7aa8),emissive:0x1a0410});
  const stemMat=new THREE.MeshStandardMaterial({color:0x5a4a2a,roughness:.9});
  // arco de videira trançado (raio rr0) com folhas, gavinhas e cachos; geometria em coordenadas locais (anel no plano XY)
  function vineArch(rr0,opt={}){const ph0=r()*6.28,out={tubes:[],leaves:[],grapes:[],stems:[]};const strands=opt.strands||5;
    for(let st=0;st<strands;st++){const pts=[];const ph=ph0+st*2.094,thick=st<3;const tw=(thick?.28:.55)*(rr0/4.6),turns=thick?9:14;
      for(let i=0;i<=120;i++){const t=i/120*Math.PI*2;const rr=rr0+Math.cos(t*turns+ph)*tw+Math.sin(t*3+ph0)*.15*(rr0/4.6);
        pts.push(new THREE.Vector3(Math.cos(t)*rr,Math.sin(t)*rr,Math.sin(t*turns+ph)*tw+Math.sin(t*2+ph0)*.35));}
      out.tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),240,(thick?.24+r()*.08:.06+r()*.03)*Math.max(1,rr0/6),8,true));}
    const tend=opt.tendrils??4;for(let k2=0;k2<tend;k2++){const pts=[];const a0=Math.PI*(.1+r()*.8),b0=new THREE.Vector3(Math.cos(a0)*rr0,Math.sin(a0)*rr0,(r()-.5)*1.5);const len=1.4+r()*1.6;
      for(let i=0;i<24;i++){const f=i/24;pts.push(b0.clone().add(new THREE.Vector3(Math.cos(f*18)*.25*(1-f),-f*len,Math.sin(f*18)*.25*(1-f))));}
      out.tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),48,.018,4));}
    const nl=Math.round((opt.leaves||190)*(rr0/4.6));for(let i=0;i<nl;i++){const t=r()*Math.PI*2,rr=rr0+(r()-.5)*1.8;e.set(r()*6,r()*6,r()*6);q.setFromEuler(e);
      out.leaves.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(t)*rr,Math.sin(t)*rr,(r()-.5)*2.8),q.clone(),new THREE.Vector3().setScalar(.6+r()*.8)));}
    const ng=opt.grapes??10;for(let g=0;g<ng;g++){const t=Math.PI*(.12+r()*.76),rr=rr0-.6;const cx=Math.cos(t)*rr,cy=Math.sin(t)*rr-.35,cz=(r()-.5)*2.2;
      const len=.55+r()*.35,hue=r();const stg=new THREE.CylinderGeometry(.012,.02,.3,5);stg.translate(cx,cy+.12,cz);out.stems.push(stg);
      for(let b=0;b<30;b++){const f=b/30,y=-f*len,rad=(1-f)*.17+.03;const an2=b*2.399+r()*.4;const br=.055+r()*.03;const v=.75+r()*.35;
        out.grapes.push([new THREE.Matrix4().compose(new THREE.Vector3(cx+Math.cos(an2)*rad*r(),cy+y,cz+Math.sin(an2)*rad*r()),new THREE.Quaternion(),new THREE.Vector3().setScalar(br)),hue<.8?[.36*v,.06*v,.20*v]:[.55*v,.62*v,.22*v]]);}}
    return out;}
  function assemble(parts,group){const tubes=mergeGeometries(parts.tubes);group.add(new THREE.Mesh(tubes,barkMat));
    if(parts.stems.length)group.add(new THREE.Mesh(mergeGeometries(parts.stems),stemMat));
    const L2=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5,1),leafMat,parts.leaves.length);parts.leaves.forEach((mm,i)=>L2.setMatrixAt(i,mm));group.add(L2);
    if(parts.grapes.length){const G2=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),grapeMat,parts.grapes.length);parts.grapes.forEach(([mm,cc],i)=>{G2.setMatrixAt(i,mm);G2.setColorAt(i,c.setRGB(...cc));});G2.instanceColor.needsUpdate=true;group.add(G2);}
    return group;}
  const xform=(parts,M4)=>{parts.tubes.forEach(g=>g.applyMatrix4(M4));parts.stems.forEach(g=>g.applyMatrix4(M4));parts.leaves=parts.leaves.map(mm=>M4.clone().multiply(mm));parts.grapes=parts.grapes.map(([mm,cc])=>[M4.clone().multiply(mm),cc]);return parts;};

  // ---------- túnel de videiras em curva: arcos de tamanhos variados, folhagem densa, gavinhas e cachos ----------
  {const L=WORLD.tunnelLen,all={tubes:[],leaves:[],grapes:[],stems:[]};const P={p:new THREE.Vector3(),t:new THREE.Vector3()};const T0=WORLD.tunnelStart;
    for(let a=0;a*5.2<L+4;a++){const z=a*5.2+r()*1.2;WORLD.tunnelPath(z,P);const rr0=4.4+Math.sin(a*.7)*.5+(a%6===0?1.1:0)+r()*.3;
      const parts=vineArch(rr0,{leaves:220,grapes:a%2?12:8,tendrils:5});
      const M4=new THREE.Matrix4().lookAt(new THREE.Vector3(),P.t.clone().negate(),new THREE.Vector3(0,1,0));M4.setPosition(P.p.clone().sub(T0));
      xform(parts,M4.multiply(new THREE.Matrix4().makeRotationZ((r()-.5)*.3)));for(const k2 in all)all[k2].push(...parts[k2]);}
    const T=assemble(all,new THREE.Group());T.position.copy(T0);scene.add(T);}

  // anéis das provas (mesmo estilo do túnel), criados pelo jogo
  function makeRing(R){return assemble(vineArch(R,{leaves:Math.round(120*R/6),grapes:Math.max(3,Math.round(R)),tendrils:3,strands:4}),new THREE.Group());}

  function setRain(on){rainTarget=on?1:0;}
  return {shared,cloudDensityAt,terrain,makeRing,setTheme,setRain,
    get raining(){return rainAmt>.05;},
    update(t,cam,dt=.016){shared.uTime.value=t;shared.uCam.value.copy(cam.position);
      rainAmt+=(rainTarget-rainAmt)*Math.min(1,dt*.4);shared.uRain.value=rainAmt;rain.material.opacity=rainAmt*.55;
      if(rainAmt>.01){for(let i=0;i<ND;i++){const ph=(rv[i]+t*.9*(.8+rv[i]*.4))%1;const x=cam.position.x+((rv[i]*97.3)%1-.5)*140,z=cam.position.z+((rv[i]*61.7)%1-.5)*140,y=cam.position.y+60-ph*120;
        rp.set([x,y,z,x+.4,y-3.2,z+.2],i*6);}rg.attributes.position.needsUpdate=true;}
      for(const ms of mists){ms.material.opacity=.25+.12*Math.sin(t*1.3+ms.position.x);}}};
}
