// Mundo livre do Araras World: céu de amanhecer, terreno com vale e rio, água, floresta, nuvens e túnel de videiras.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- ruído determinístico ----------
const H=(x,y)=>{let h=Math.sin(x*127.1+y*311.7)*43758.5453;return h-Math.floor(h);};
function vnoise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
  const a=H(ix,iy),b=H(ix+1,iy),c=H(ix,iy+1),d=H(ix+1,iy+1);return a+(b-a)*ux+(c-a)*uy+(a-b-c+d)*ux*uy;}
function fbm(x,y,o=5){let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*vnoise(x*f,y*f);f*=2.03;a*=.5;}return s;}

export const SUN=new THREE.Vector3(0,.06,1).normalize();
export const WORLD={size:7000,water:0,
  riverX:z=>Math.sin(z*.0011)*520+Math.sin(z*.0031+1.3)*130,
  bar:new THREE.Vector3(),tunnelStart:new THREE.Vector3(0,420,-2600),tunnelLen:150,deck:[235,300]};
export function height(x,z){
  let h=fbm(x*.0009,z*.0009,5)*260-60;              // colinas
  h+=Math.pow(Math.max(0,fbm(x*.0004+7,z*.0004+3,3)-.45),2)*1400; // serras ao fundo
  const d=Math.abs(x-WORLD.riverX(z));
  const v=Math.min(1,Math.max(0,(d-35)/260));const s=v*v*(3-2*v);
  h=-9+(h+9)*s;                                     // vale do rio
  const b=WORLD.bar,db=Math.hypot(x-b.x,z-b.z);       // clareira plana do bar
  if(db<140){const k=Math.min(1,Math.max(0,(db-70)/70));h=b.y+(h-b.y)*k*k*(3-2*k);}
  return h;
}
{const z=1700;WORLD.bar.set(WORLD.riverX(z)+190,0,z);WORLD.bar.y=Math.max(14,height(WORLD.bar.x,WORLD.bar.z)+0);}

// ---------- céu ----------
const PANO=`
uniform sampler2D uPano; uniform vec3 uSun;
vec3 pano(vec3 r){float u=atan(r.x,r.z)/6.28318+.1477;float el=min(1.5707,asin(clamp(r.y,-1.,1.))+.19);
  float v=(1.5708-el)/(3.14159*.53);return pow(texture2D(uPano,vec2(fract(u),clamp(v,0.,.995))).rgb,vec3(1.12));}
vec3 skyColor(vec3 r){
  float mu=dot(r,uSun),d=acos(clamp(mu,-1.,1.)),y=max(r.y,0.),sw=pow(max(mu,0.),4.);
  vec3 g=mix(vec3(1.,.66,.34),vec3(1.,.55,.52),smoothstep(.0,.08,y));
  g=mix(g,vec3(.86,.52,.72),smoothstep(.06,.22,y));g=mix(g,vec3(.30,.36,.78),smoothstep(.18,.55,y));
  g=mix(g,vec3(.14,.20,.58),smoothstep(.5,1.,y));g=mix(g,vec3(1.,.78,.45),sw*smoothstep(.35,0.,y)*.8);
  vec3 p=pano(vec3(r.x,max(r.y,.0),r.z));float pl=dot(p,vec3(.299,.587,.114)),pb=p.b-p.r;
  float cm=smoothstep(.30,.62,pl)*(1.-smoothstep(.16,.42,pb))*smoothstep(-.005,.03,r.y);
  vec3 cl=mix(vec3(.58,.46,.66)*(.6+.6*pl),mix(vec3(1.,.62,.66),vec3(1.,.80,.52),sw)*(.75+.5*pl),smoothstep(.45,.85,pl));
  vec3 c=mix(g,cl,cm*.92);
  vec3 under=mix(vec3(.95,.70,.72),vec3(.55,.45,.60),smoothstep(-.02,-.5,r.y));
  c=mix(c,under,smoothstep(.0,-.06,r.y));
  c+=vec3(1.,.55,.2)*exp(-d*3.)*.25+vec3(1.,.72,.4)*exp(-d*11.)*.5+vec3(1.,.93,.8)*exp(-d*45.)*1.2+vec3(1.,.98,.92)*exp(-d*160.)*2.5;
  return c;}
vec3 grade(vec3 c){c=1.-exp(-c*1.7);return pow(c,vec3(1.04));}
`;
export const FOG=new THREE.Color().setRGB(.86,.62,.62,THREE.SRGBColorSpace);

export function buildWorld(R,scene){
  const an=R.capabilities.getMaxAnisotropy();
  const big=R.capabilities.maxTextureSize>=8192&&!matchMedia('(pointer: coarse)').matches;
  const pano=new THREE.TextureLoader().load(big?'../sky-8k.jpg':'sky-pano.jpg');pano.colorSpace=THREE.NoColorSpace;
  const shared={uPano:{value:pano},uSun:{value:SUN},uTime:{value:0},uCam:{value:new THREE.Vector3()}};
  // céu
  const sky=new THREE.Mesh(new THREE.SphereGeometry(11000,48,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,toneMapped:false,fog:false,uniforms:shared,
    vertexShader:'varying vec3 vD;void main(){vD=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',
    fragmentShader:PANO+'varying vec3 vD;void main(){gl_FragColor=vec4(grade(skyColor(normalize(vD))),1.);}'}));
  sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
  scene.fog=new THREE.FogExp2(FOG,.00019);
  // luz do amanhecer
  const sun=new THREE.DirectionalLight(0xffc89a,2.2);sun.position.copy(SUN).multiplyScalar(3000).add(new THREE.Vector3(0,900,0));scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xd8c0e8,0x4a5a30,1.7));{const f=new THREE.DirectionalLight(0xffd6c0,.9);f.position.set(-600,900,-2500);scene.add(f);}

  // ---------- terreno ----------
  const N=300,S=WORLD.size;const tg=new THREE.PlaneGeometry(S,S,N,N);tg.rotateX(-Math.PI/2);
  const pos=tg.attributes.position,col=new Float32Array(pos.count*3);const c=new THREE.Color();
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i)+600;const h=height(x,z);pos.setY(i,h);pos.setZ(i,z);
    const n=fbm(x*.01,z*.01,3);const dr=Math.abs(x-WORLD.riverX(z));
    if(h<2)c.setRGB(.33,.30,.22);else if(h>380)c.setRGB(.36+n*.1,.38+n*.1,.30);
    else c.setRGB(.10+n*.08,.26+n*.12,.08+n*.05);
    if(dr<70&&h<8)c.setRGB(.42,.36,.26);
    col.set([c.r,c.g,c.b],i*3);}
  tg.setAttribute('color',new THREE.BufferAttribute(col,3));tg.computeVertexNormals();
  const gtex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=512;const g=cv.getContext('2d');g.fillStyle='#808080';g.fillRect(0,0,512,512);
    for(let i=0;i<9000;i++){const v=90+Math.random()*90;g.fillStyle=`rgb(${v},${v+10},${v-10})`;g.beginPath();g.arc(Math.random()*512,Math.random()*512,1+Math.random()*4,0,7);g.fill();}
    const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(160,160);t.anisotropy=an;t.colorSpace=THREE.SRGBColorSpace;return t;})();
  const terrain=new THREE.Mesh(tg,new THREE.MeshStandardMaterial({vertexColors:true,map:gtex,roughness:.95}));scene.add(terrain);

  // ---------- água (rio e lagos) ----------
  const wm=new THREE.ShaderMaterial({toneMapped:false,transparent:true,depthWrite:true,uniforms:{...shared,uFog:{value:new THREE.Vector3(.86,.62,.62)}},
    vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:PANO+`uniform float uTime;uniform vec3 uCam,uFog;varying vec3 vW;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      void main(){vec2 q=vW.xz*.05;float e=.02;
        float a=n(q+uTime*.25)+n(q*2.3-uTime*.18)*.5;float bx=n(q+vec2(e,0)+uTime*.25)+n((q+vec2(e,0))*2.3-uTime*.18)*.5;float bz=n(q+vec2(0,e)+uTime*.25)+n((q+vec2(0,e))*2.3-uTime*.18)*.5;
        vec3 N=normalize(vec3((a-bx)*1.2,1.,(a-bz)*1.2));vec3 V=normalize(vW-uCam);vec3 Rf=reflect(V,N);Rf.y=abs(Rf.y);
        float fr=.04+.96*pow(1.-max(dot(-V,N),0.),5.);vec3 deep=vec3(.05,.16,.20);
        vec3 c=mix(deep,grade(skyColor(normalize(Rf))),clamp(fr*1.2,.25,1.));
        c+=vec3(1.,.8,.6)*pow(max(dot(Rf,uSun),0.),400.)*2.;
        float fd=1.-exp(-length(vW-uCam)*.00019);c=mix(c,uFog,fd*.9);gl_FragColor=vec4(c,mix(.62,.96,clamp(fr*1.6,0.,1.)));}`});
  const water=new THREE.Mesh(new THREE.PlaneGeometry(S,S),wm);water.rotation.x=-Math.PI/2;water.position.set(0,WORLD.water,600);water.layers.set(1);scene.add(water);

  // ---------- floresta: árvores com folhagem fotográfica (texturas CC0 Poly Haven), instanciadas por espécie ----------
  const TL=new THREE.TextureLoader();
  const tx=(f)=>{const t=TL.load(f);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=an;return t;};
  const barkT=tx('jac_trunk.jpg');barkT.wrapS=barkT.wrapT=THREE.RepeatWrapping;
  const barkM=new THREE.MeshStandardMaterial({map:barkT,color:0xb59a82,roughness:1});
  const leafM=f=>{const t=tx(f);return new THREE.MeshStandardMaterial({map:t,alphaTest:.42,side:THREE.DoubleSide,roughness:.85,emissive:0x1d2a08,emissiveIntensity:.35});};
  let seed=11;const r=()=>((seed=(seed*16807)%2147483647)/2147483647);
  const V=new THREE.Vector3(),C0=new THREE.Vector3();
  function cards(n,cy,rx,ry,size,flat=0){const gs=[];for(let i=0;i<n;i++){
      const u=r()*6.28,v=Math.acos(1-r()*(1.7-flat*.6)),k=.55+.45*Math.cbrt(r());
      V.set(Math.sin(v)*Math.cos(u)*rx*k,Math.cos(v)*ry*k,Math.sin(v)*Math.sin(u)*rx*k);
      const g=new THREE.PlaneGeometry(size*(.8+r()*.5),size*(.8+r()*.5));
      g.rotateX(-Math.PI/2+(r()-.5)*(1.6-flat*1.2));g.rotateY(r()*6.28);g.rotateZ((r()-.5)*.8);g.translate(V.x,V.y+cy,V.z);
      const n2=g.attributes.normal;C0.set(V.x,V.y*1.4+ry*.3,V.z).normalize();for(let j=0;j<n2.count;j++)n2.setXYZ(j,C0.x,C0.y,C0.z); // normais esféricas: copa macia
      gs.push(g);}return mergeGeometries(gs);}
  function wood(h,branches,cy){const gs=[];const t=new THREE.CylinderGeometry(.018,.035,h,7,1);t.translate(0,h/2,0);gs.push(t);
    for(let i=0;i<branches;i++){const a=r()*6.28,len=.18+r()*.2,b=new THREE.CylinderGeometry(.006,.014,len,5,1);b.translate(0,len/2,0);b.rotateZ(.6+r()*.5);b.rotateY(a);b.translate(0,h*(.55+r()*.35),0);gs.push(b);}
    const g=mergeGeometries(gs);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*2,uv.getY(i)*4);return g;}
  const SPECIES=[
    {w:.42,leaf:'spray_broad.png',cards:()=>cards(62,.74,.5,.36,.62),wood:()=>wood(.8,6),tint:[[.62,.95,.45],[.55,.85,.40],[.70,1.,.50]],H:[18,30],R:1},
    {w:.26,leaf:'spray_fern.png',cards:()=>cards(54,.72,.56,.30,.64,.5),wood:()=>wood(.75,7),tint:[[.85,1.,.75],[.75,.95,.7]],H:[16,26],R:1.1},
    {w:.05,leaf:'spray_pink.png',cards:()=>cards(50,.72,.52,.32,.6,.4),wood:()=>wood(.75,7),tint:[[1,1,1]],H:[14,22],R:1},
    {w:.05,leaf:'spray_yellow.png',cards:()=>cards(50,.72,.52,.32,.6,.4),wood:()=>wood(.75,7),tint:[[1,1,1]],H:[14,22],R:1},
    {w:.10,leaf:'spray_broad.png',cards:()=>cards(56,.88,.7,.2,.62,1),wood:()=>wood(.92,8),tint:[[.6,.9,.45]],H:[34,48],R:1.3}];
  const NT=matchMedia('(pointer: coarse)').matches?2200:8000;
  const sp=SPECIES.map(S2=>{const cg=S2.cards(),wg=S2.wood();const n=Math.ceil(NT*S2.w*1.2);
    const ci=new THREE.InstancedMesh(cg,leafM(S2.leaf),n),wi=new THREE.InstancedMesh(wg,barkM,n);ci.count=wi.count=0;scene.add(wi,ci);return {S2,ci,wi,n};});
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p=new THREE.Vector3(),e=new THREE.Euler();
  for(let i=0,placed=0;i<NT*7&&placed<NT;i++){
    const z=(r()-.5)*S*.9+600,x=WORLD.riverX(z)+(r()-.5)*(r()<.85?1900:S*.9);const h=height(x,z);
    if(h<4||h>360)continue;if(Math.abs(x-WORLD.riverX(z))<55)continue;
    {const dx=x-WORLD.bar.x,dz=z-WORLD.bar.z;if(Math.hypot(dx,dz)<170||(dz<0&&dz>-500&&Math.abs(dx)<60))continue;}
    if(fbm(x*.004,z*.004,2)<.33)continue;
    let k=r(),j=0;while(j<sp.length-1&&k>sp[j].S2.w){k-=sp[j].S2.w;j++;}const T2=sp[j];if(T2.ci.count>=T2.n)continue;
    const H2=T2.S2.H[0]+r()*(T2.S2.H[1]-T2.S2.H[0]),W2=H2*(.75+r()*.35)*T2.S2.R;
    q.setFromEuler(e.set((r()-.5)*.08,r()*6.28,(r()-.5)*.08));m.compose(p.set(x,h-1,z),q,s.set(W2,H2,W2));
    T2.ci.setMatrixAt(T2.ci.count,m);T2.wi.setMatrixAt(T2.wi.count,m);
    const t=T2.S2.tint[Math.floor(r()*T2.S2.tint.length)],v=.82+r()*.3;T2.ci.setColorAt(T2.ci.count,c.setRGB(t[0]*v,t[1]*v,t[2]*v));
    T2.ci.count++;T2.wi.count++;placed++;}
  for(const T2 of sp){if(T2.ci.instanceColor)T2.ci.instanceColor.needsUpdate=true;}
  // palmeiras perto do rio: tronco curvo e folhas arqueadas
  const frondG=(()=>{const g=new THREE.PlaneGeometry(1,.28,8,1);g.translate(.5,0,0);const P=g.attributes.position;for(let i=0;i<P.count;i++){const x=P.getX(i);P.setY(i,P.getY(i)*(1-x*.6));P.setZ(i,-x*x*.45);}g.computeVertexNormals();return g;})();
  const fronds=[];for(let k=0;k<11;k++){const g=frondG.clone();g.rotateX(-Math.PI/2);g.rotateZ(.35+r()*.35);g.rotateY(k/11*6.28+r()*.3);g.translate(0,1,0);fronds.push(g);}
  const palmLeaf=mergeGeometries(fronds);const palmWood=(()=>{const g=new THREE.CylinderGeometry(.022,.04,1,7,6);g.translate(0,.5,0);const P=g.attributes.position;for(let i=0;i<P.count;i++){const y=P.getY(i);P.setX(i,P.getX(i)+y*y*.12);}return g;})();
  const ft=tx('frond.png');const palmM=new THREE.MeshStandardMaterial({map:ft,alphaTest:.4,side:THREE.DoubleSide,roughness:.8,color:0xcfe8a8,emissive:0x1a2a08,emissiveIntensity:.3});
  const NP=520,pl=new THREE.InstancedMesh(palmLeaf,palmM,NP),pw=new THREE.InstancedMesh(palmWood,barkM,NP);let pi=0;
  for(let i=0;i<NP*4&&pi<NP;i++){const z=(r()-.5)*S*.85+600,side=r()<.5?-1:1,x=WORLD.riverX(z)+side*(60+r()*170);const h=height(x,z);if(h<3||h>120)continue;
    if(Math.hypot(x-WORLD.bar.x,z-WORLD.bar.z)<200)continue;const th=16+r()*10;
    q.setFromEuler(e.set(0,r()*6.28,0));m.compose(p.set(x,h-1,z),q,s.set(th*.75,th,th*.75));pl.setMatrixAt(pi,m);pw.setMatrixAt(pi,m);pi++;}
  pl.count=pw.count=pi;scene.add(pl,pw);
  // ---------- nuvens (camada atravessável + névoa entre as árvores) ----------
  const ctex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');
    for(let i=0;i<60;i++){const x=128+(Math.random()-.5)*120,y=128+(Math.random()-.5)*80,rr=30+Math.random()*60;const gr=g.createRadialGradient(x,y,0,x,y,rr);
      gr.addColorStop(0,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,256);}
    const t=new THREE.CanvasTexture(cv);return t;})();
  const cloudMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{...shared,uTex:{value:ctex},uFog:{value:new THREE.Vector3(.86,.62,.62)}},
    vertexShader:`attribute vec4 aCloud;varying vec2 vUv;varying float vD,vY,vSide,vMist;uniform vec3 uCam;
      void main(){vUv=uv;vec3 c=(instanceMatrix*vec4(0,0,0,1)).xyz;float sz=aCloud.x;
        vec4 mv=viewMatrix*vec4(c,1.);vMist=aCloud.z;mv.xy+=position.xy*sz*vec2(1.,mix(.62,.28,vMist));vD=-mv.z;vY=position.y;vSide=aCloud.y;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform sampler2D uTex;uniform vec3 uFog;varying vec2 vUv;varying float vD,vY,vSide,vMist;
      void main(){float a=texture2D(uTex,vUv).a;if(a<.01)discard;float lit=smoothstep(-.5,.6,vY);
        vec3 col=mix(vec3(.62,.50,.70),mix(vec3(1.,.70,.72),vec3(1.,.86,.62),vSide),lit);
        col=mix(col,vec3(.93,.88,.92),vMist*.7);a*=mix(1.,.38,vMist);float near=smoothstep(4.,40.,vD);float fd=1.-exp(-vD*.00028);col=mix(col,uFog,fd*.85);
        a*=near*(1.-fd*.6);gl_FragColor=vec4(col*a,a);}`,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor});
  const quad=new THREE.PlaneGeometry(1,1);const NC=matchMedia('(pointer: coarse)').matches?800:1450;const clouds=new THREE.InstancedMesh(quad,cloudMat,NC);
  const aC=new Float32Array(NC*4);const centers=[];let k=0;
  for(let i=0;i<NC*3&&k<NC;i++){
    let x,y,z,sz,side;
    if(k<NC*.9){x=(r()-.5)*S*.95;z=-3300+r()*4300;if(fbm(x*.0016+5,z*.0016,3)<.43)continue;y=WORLD.deck[0]+r()*(WORLD.deck[1]-WORLD.deck[0]);sz=110+r()*170;}
    else{z=-600+r()*2000;x=WORLD.riverX(z)+(r()-.5)*1400;const h=height(x,z);if(h<0)continue;y=h+28+r()*30;sz=120+r()*140;}
    side=Math.max(0,Math.min(1,.5+(z-x*.1)/6000));
    m.compose(p.set(x,y,z),q.identity(),s.set(1,1,1));clouds.setMatrixAt(k,m);aC.set([sz,side,k>=NC*.9?1:0,0],k*4);centers.push([x,y,z,sz*.42]);k++;}
  clouds.count=k;quad.setAttribute('aCloud',new THREE.InstancedBufferAttribute(aC,4));clouds.frustumCulled=false;clouds.renderOrder=5;scene.add(clouds);
  const cloudDensityAt=v=>{let best=0;for(const [x,y,z,rr] of centers){const dx=v.x-x,dy=(v.y-y)*1.6,dz=v.z-z;const d2=dx*dx+dy*dy+dz*dz;if(d2<rr*rr){best=Math.max(best,1-Math.sqrt(d2)/rr);}}return best;};

  // ---------- túnel de videiras no céu ----------
  const T=new THREE.Group();T.position.copy(WORLD.tunnelStart);scene.add(T);
  const bark=new THREE.TextureLoader().load('bark.jpg');bark.colorSpace=THREE.SRGBColorSpace;bark.wrapS=bark.wrapT=THREE.RepeatWrapping;bark.repeat.set(10,1);bark.anisotropy=an;
  const barkMat=new THREE.MeshStandardMaterial({map:bark,color:0xd8b89a,roughness:.95});
  const leafTex=tx('leaf.webp');
  const leafMat=new THREE.MeshStandardMaterial({map:leafTex,alphaTest:.5,side:THREE.DoubleSide,roughness:.75,emissive:0x2a3a08,emissiveIntensity:.25});
  const grapeMat=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.32,clearcoat:.6,clearcoatRoughness:.25,sheen:.4,sheenColor:new THREE.Color(0x9a7aa8),emissive:0x1a0410});
  const L=WORLD.tunnelLen,ARCH=Math.floor(L/6);const leafG=new THREE.PlaneGeometry(1.5,1);const NL=ARCH*150;
  const leaves=new THREE.InstancedMesh(leafG,leafMat,NL),berries=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,10),grapeMat,ARCH*14*30);const stems=[];
  let li=0,bi=0;
  for(let a=0;a<ARCH;a++){const z=a*6+r()*1.2;
    const ph0=r()*6.28,rr0=4.6+r()*.3;
    for(let st=0;st<5;st++){const pts=[];const ph=ph0+st*2.094,thick=st<3;const tw=thick?.28:.55,turns=thick?9:14;
      for(let i=0;i<=120;i++){const t=i/120*Math.PI*2;const rr=rr0+Math.cos(t*turns+ph)*tw+Math.sin(t*3+ph0)*.15;
        pts.push(new THREE.Vector3(Math.cos(t)*rr,Math.sin(t)*rr,z+Math.sin(t*turns+ph)*tw+Math.sin(t*2+ph0)*.35));}
      T.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),240,thick?.24+r()*.08:.06+r()*.03,8,true),barkMat));}
    for(let k=0;k<3;k++){const pts=[];const a0=r()*6.28,b0=new THREE.Vector3(Math.cos(a0)*rr0,Math.sin(a0)*rr0,z);
      for(let i=0;i<24;i++){const f=i/24;pts.push(b0.clone().add(new THREE.Vector3(Math.cos(f*18)*.25*(1-f),-f*1.4,Math.sin(f*18)*.25*(1-f))));}
      T.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),48,.018,4),barkMat));}
    for(let i=0;i<150&&li<NL;i++){const t=r()*Math.PI*2,rr=4.6+(r()-.5)*1.6;e.set(r()*6,r()*6,r()*6);q.setFromEuler(e);
      m.compose(p.set(Math.cos(t)*rr,Math.sin(t)*rr,z+(r()-.5)*2.5),q,s.setScalar(.6+r()*.7));leaves.setMatrixAt(li++,m);}
    for(let g=0;g<14;g++){const t=Math.PI*(.12+r()*.76),rr=4.0;const cx=Math.cos(t)*rr,cy=Math.sin(t)*rr-.35,cz=z+(r()-.5)*2.2;
      const len=.55+r()*.35,hue=r();const st=new THREE.CylinderGeometry(.012,.02,.3,5);st.translate(cx,cy+.12,cz);stems.push(st);
      for(let b=0;b<30;b++){const f=b/30,y=-f*len,rad=(1-f)*.17+.03;const an2=b*2.399+r()*.4;const br=.055+r()*.03;
        m.compose(p.set(cx+Math.cos(an2)*rad*r(),cy+y,cz+Math.sin(an2)*rad*r()),q.identity(),s.setScalar(br));berries.setMatrixAt(bi,m);
        const v=.75+r()*.35;berries.setColorAt(bi,hue<.8?c.setRGB(.36*v,.06*v,.20*v):c.setRGB(.55*v,.62*v,.22*v));bi++;}}}
  T.add(new THREE.Mesh(mergeGeometries(stems),new THREE.MeshStandardMaterial({color:0x5a4a2a,roughness:.9})));
  leaves.count=li;berries.count=bi;berries.instanceColor.needsUpdate=true;T.add(leaves,berries);

  return {shared,cloudDensityAt,terrain,update(t,cam){shared.uTime.value=t;shared.uCam.value.copy(cam.position);}};
}
