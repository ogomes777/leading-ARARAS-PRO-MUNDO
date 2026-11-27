// Araras Bar (blockout fiel às fotos reais) como grupo para o mundo do jogo. Fachada voltada para +Z.
import * as THREE from 'three';
export function buildBar(R){
  const G0=new THREE.Group();
  const an=R.capabilities.getMaxAnisotropy();
  const tex=(w,h,draw,rep)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=an;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...rep);}return t;};
  const load=src=>{const t=new THREE.TextureLoader().load(src);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=an;return t;};
  const M=(o)=>new THREE.MeshStandardMaterial(o);
  // Rua com pinturas: bandeira do Brasil (como na foto real), onça e araras; asfalto verde-escuro pintado
  const street=tex(2048,1024,(g,w,h)=>{g.fillStyle='#14231c';g.fillRect(0,0,w,h);
    for(let i=0;i<900;i++){g.strokeStyle=`rgba(${60+Math.random()*60},${120+Math.random()*60},${90+Math.random()*50},.25)`;g.lineWidth=2+Math.random()*3;g.beginPath();const x=Math.random()*w,y=Math.random()*h;g.arc(x,y,10+Math.random()*30,0,Math.PI*1.3);g.stroke();}
    // bandeira em grande escala, losango laranja-amarelo, círculo azul com faixa e estrelas
    const fx=w*.7,fy=h*.55,fw=w*.36,fh=h*.62;g.fillStyle='#1f7a3a';g.fillRect(fx-fw/2,fy-fh/2,fw,fh);
    g.fillStyle='#f2a218';g.beginPath();g.moveTo(fx,fy-fh*.44);g.lineTo(fx+fw*.46,fy);g.lineTo(fx,fy+fh*.44);g.lineTo(fx-fw*.46,fy);g.closePath();g.fill();
    for(let i=0;i<60;i++){g.strokeStyle='rgba(255,210,90,.35)';g.lineWidth=3;g.beginPath();g.arc(fx+(Math.random()-.5)*fw*.6,fy+(Math.random()-.5)*fh*.5,12+Math.random()*26,0,Math.PI*1.5);g.stroke();}
    g.fillStyle='#1d3f8f';g.beginPath();g.arc(fx,fy,fh*.24,0,7);g.fill();g.strokeStyle='#f3f1e6';g.lineWidth=16;g.beginPath();g.arc(fx-fh*.05,fy+fh*.5,fh*.6,-Math.PI*.62,-Math.PI*.38);g.stroke();
    g.fillStyle='#fff';for(let i=0;i<22;i++){g.beginPath();g.arc(fx+(Math.random()-.5)*fh*.36,fy+Math.random()*fh*.18,3+Math.random()*3,0,7);g.fill();}
    // rio e onça à esquerda
    g.strokeStyle='#4aa3d8';g.lineWidth=28;g.beginPath();g.moveTo(0,h*.25);g.bezierCurveTo(w*.15,h*.15,w*.3,h*.35,w*.48,h*.2);g.stroke();
    g.fillStyle='#e7a12a';g.beginPath();g.ellipse(w*.14,h*.62,w*.09,h*.17,0,0,7);g.fill();g.fillStyle='#2b1a0b';for(let i=0;i<40;i++){g.beginPath();g.arc(w*.14+(Math.random()-.5)*w*.14,h*.62+(Math.random()-.5)*h*.26,6+Math.random()*7,0,7);g.fill();}
    g.fillStyle='#f6e7c8';g.beginPath();g.arc(w*.11,h*.6,10,0,7);g.arc(w*.17,h*.6,10,0,7);g.fill();
    g.fillStyle='#1e5fb8';g.beginPath();g.ellipse(w*.33,h*.66,w*.05,h*.12,.4,0,7);g.fill();g.beginPath();g.ellipse(w*.42,h*.7,w*.05,h*.12,-.3,0,7);g.fill();
    g.fillStyle='#f2c230';g.beginPath();g.ellipse(w*.335,h*.6,w*.02,h*.04,0,0,7);g.fill();g.beginPath();g.ellipse(w*.415,h*.64,w*.02,h*.04,0,0,7);g.fill();});
  const road=new THREE.Mesh(new THREE.PlaneGeometry(44,22),M({map:street,roughness:.8}));road.rotation.x=-Math.PI/2;road.position.set(0,0,13);road.receiveShadow=true;G0.add(road);
  const tiles=tex(512,512,(g,w,h)=>{g.fillStyle='#8a6a52';g.fillRect(0,0,w,h);for(let y=0;y<8;y++)for(let x=0;x<8;x++){const v=120+Math.random()*50;g.fillStyle=`rgb(${v+20},${v-10},${v-40})`;g.fillRect(x*64+2,y*64+2,60,60);}},[8,2]);
  const walk=new THREE.Mesh(new THREE.BoxGeometry(44,.18,4),M({map:tiles,roughness:.5,metalness:.05}));walk.position.set(0,.09,1.2);walk.receiveShadow=true;G0.add(walk);
  
  // Edifício
  const G=new THREE.Group();G0.add(G);
  const slats=tex(1024,512,(g,w,h)=>{g.fillStyle='#3a2414';g.fillRect(0,0,w,h);for(let x=0;x<w;x+=22){const v=70+Math.random()*40;g.fillStyle=`rgb(${v+40},${v},${v-30})`;g.fillRect(x,0,16,h);}for(let y=0;y<h;y+=128){g.fillStyle='rgba(20,10,4,.6)';g.fillRect(0,y,w,10);}},[3,1]);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(20,3.6,6),M({map:slats,roughness:.75}));wall.position.set(0,1.8,-3.2);wall.castShadow=true;G.add(wall);
  const upper=new THREE.Mesh(new THREE.BoxGeometry(6,2.2,4),M({color:0xe9e3d6,roughness:.9}));upper.position.set(-5.8,4.7,-3.5);G.add(upper);
  const corr=tex(512,64,(g,w,h)=>{for(let x=0;x<w;x++){const v=150+70*Math.sin(x*.4);g.fillStyle=`rgb(${v},${v},${v+6})`;g.fillRect(x,0,1,h);}},[6,1]);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(21.5,.08,3.4),M({map:corr,metalness:.7,roughness:.35}));roof.position.set(0,3.75,-.4);roof.rotation.x=.12;roof.castShadow=true;G.add(roof);
  // Letreiro: Araras · O bar que voa alto (marca preservada: logo oficial ao lado)
  const signT=tex(2048,512,(g,w,h)=>{g.fillStyle='#f5f2ea';g.fillRect(0,0,w,h);g.strokeStyle='#1e4fa8';g.lineWidth=14;g.strokeRect(7,7,w-14,h-14);
    g.fillStyle='#1d4fb0';g.font='bold 250px Georgia,serif';g.textAlign='center';g.fillText('Araras',w*.5,h*.6);g.font='italic 80px Georgia,serif';g.fillText('O bar que voa alto.',w*.5,h*.86);
    for(const [x,flip] of [[w*.1,1],[w*.9,-1]]){g.save();g.translate(x,h*.5);g.scale(flip,1);g.fillStyle='#2e7d32';for(let i=0;i<5;i++){g.rotate(1.2);g.beginPath();g.ellipse(60,0,70,34,0,0,7);g.fill();}g.restore();}});
  const sign=new THREE.Mesh(new THREE.BoxGeometry(11,2.6,.2),[M({color:0xddd}),M({color:0xddd}),M({color:0xddd}),M({color:0xddd}),new THREE.MeshStandardMaterial({map:signT,emissive:0xffffff,emissiveMap:signT,emissiveIntensity:.55,roughness:.6}),M({color:0x999})]);
  sign.position.set(3.2,5.3,-1.6);G.add(sign);
  const logo=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,.18,48),[M({color:0x6b4a2a,roughness:.8}),new THREE.MeshStandardMaterial({map:load('logo.png'),roughness:.7,emissive:0x221a10}),M({color:0x6b4a2a})]);
  logo.rotation.x=Math.PI/2;logo.rotation.y=0;logo.position.set(-5.6,4.9,-1.4);G.add(logo);
  // Neon circular "araras bar"
  const neonT=tex(512,512,(g,w,h)=>{g.fillStyle='#5a3a20';g.beginPath();g.arc(256,256,250,0,7);g.fill();g.fillStyle='#fff3e0';g.font='bold 90px Georgia,serif';g.textAlign='center';g.fillText('araras',256,230);g.fillText('bar',256,340);});
  const disc=new THREE.Mesh(new THREE.CircleGeometry(1.25,48),new THREE.MeshStandardMaterial({map:neonT,emissive:0xffd9a8,emissiveMap:neonT,emissiveIntensity:.35}));disc.position.set(2.3,1.9,-.18);G.add(disc);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.3,.045,12,96),new THREE.MeshBasicMaterial({color:0xff8a3c}));ring.position.copy(disc.position);G.add(ring);
  const glow=new THREE.PointLight(0xff8a3c,6,8,2);glow.position.set(2.3,1.9,.6);G.add(glow);
  // Discos de vinil ao longo da rampa
  const vinyl=new THREE.InstancedMesh(new THREE.CylinderGeometry(.15,.15,.02,24),M({color:0x111111,roughness:.3,metalness:.3}),18);
  const dm=new THREE.Matrix4();for(let i=0;i<18;i++){dm.makeRotationX(Math.PI/2);dm.setPosition(-4.6+i*.36,.45+i*.06,-.12);vinyl.setMatrixAt(i,dm);}G.add(vinyl);
  // Entrada iluminada
  const door=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3),new THREE.MeshBasicMaterial({color:0xffb366}));door.position.set(6.6,1.6,-.19);G.add(door);
  const inner=new THREE.PointLight(0xffa860,10,12,2);inner.position.set(6.6,2,1.2);G.add(inner);
  // Mesas e cadeiras
  const wood=M({color:0x2b1a10,roughness:.7});
  for(let i=0;i<4;i++){const t=new THREE.Group();const top=new THREE.Mesh(new THREE.BoxGeometry(1.1,.06,.8),wood);top.position.y=.78;t.add(top);
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.06,.78,.06),wood);for(const [a,b] of [[-.48,-.33],[.48,-.33],[-.48,.33],[.48,.33]]){const l=leg.clone();l.position.set(a,.39,b);t.add(l);}
    for(const sx of [-.75,.75]){const ch=new THREE.Mesh(new THREE.BoxGeometry(.45,.05,.45),wood);ch.position.set(sx,.46,0);t.add(ch);const bk=new THREE.Mesh(new THREE.BoxGeometry(.05,.55,.45),wood);bk.position.set(sx+(sx>0?.22:-.22),.72,0);t.add(bk);}
    const candle=new THREE.Mesh(new THREE.SphereGeometry(.05,8,8),new THREE.MeshBasicMaterial({color:0xffc070}));candle.position.y=.86;t.add(candle);
    t.position.set(-7.5+i*2.4,0,1.6);t.traverse(o=>{if(o.isMesh)o.castShadow=true;});G.add(t);}
  // Cordão de luzes sob a cobertura
  const bulbs=new THREE.InstancedMesh(new THREE.SphereGeometry(.07,8,8),new THREE.MeshBasicMaterial({color:0xffd48a}),40);
  for(let i=0;i<40;i++){const x=-9.5+i*.5;dm.makeTranslation(x,3.25-.18*Math.sin(i*.6)**2,1.1);bulbs.setMatrixAt(i,dm);}G.add(bulbs);
  
  
  // Videira sobre a cobertura e vegetação (folhas reais da pasta como cartões)
  const leafT=load('leaf.webp');const leafM=new THREE.MeshStandardMaterial({map:leafT,alphaTest:.5,side:THREE.DoubleSide,roughness:.8});
  const leafG=new THREE.PlaneGeometry(.55,.38);const vine=new THREE.InstancedMesh(leafG,leafM,700);
  const q=new THREE.Quaternion(),e=new THREE.Euler(),sc=new THREE.Vector3(),pos=new THREE.Vector3();let k=0;
  for(let i=0;i<420;i++){pos.set(-10.5+Math.random()*21,3.4+Math.random()*.5-(Math.random()<.3?Math.random()*1.2:0),.9+Math.random()*.6);e.set(Math.random()*1.4-.7,Math.random()*6,Math.random()*1.4);q.setFromEuler(e);sc.setScalar(.7+Math.random()*.8);dm.compose(pos,q,sc);vine.setMatrixAt(k++,dm);}
  // árvore sobre a cena (como na referência) + arbustos floridos
  for(let i=0;i<280;i++){const a=Math.random()*6.28,r=Math.random()*5;pos.set(-13+Math.cos(a)*r,6.5+Math.random()*3,4+Math.sin(a)*r*.6);e.set(Math.random()*3,Math.random()*6,Math.random()*3);q.setFromEuler(e);sc.setScalar(1.4+Math.random());dm.compose(pos,q,sc);vine.setMatrixAt(k++,dm);}
  vine.count=k;vine.instanceColor=null;G.add(vine);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.35,.6,8,12),M({color:0x3a2a1c,roughness:.9}));trunk.position.set(-13,3.5,4);trunk.rotation.z=-.15;G.add(trunk);
  const flowers=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,6,6),new THREE.MeshStandardMaterial({color:0xc2187a,emissive:0x40052a}),260);
  for(let i=0;i<260;i++){pos.set(-11+Math.random()*2.5,.5+Math.random()*2.6,0+Math.random()*2);dm.makeTranslation(pos.x,pos.y,pos.z);flowers.setMatrixAt(i,dm);}G.add(flowers);
  // casas vizinhas (telhado cerâmico)
  for(let i=0;i<14;i++){const h=new THREE.Mesh(new THREE.BoxGeometry(5,3,5),M({color:0xd8cfc0,roughness:1}));const side=i%2?1:-1;h.position.set(side*(16+Math.floor(i/2)*6),1.5,-6-Math.random()*6);G0.add(h);
    const rf=new THREE.Mesh(new THREE.ConeGeometry(4,1.6,4),M({color:0x9c4a2c,roughness:.9}));rf.position.set(h.position.x,3.8,h.position.z);rf.rotation.y=Math.PI/4;G0.add(rf);}
  return {group:G0,door:new THREE.Vector3(6.6,1.2,0)};
}
