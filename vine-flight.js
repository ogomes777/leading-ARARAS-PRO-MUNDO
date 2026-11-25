(() => {
  const vertex = `
    attribute vec3 aPoint, aNormal, aColor;
    uniform mat4 uView, uModel, uWing;
    uniform float uTime,uPlant;
    varying vec3 vNormal, vColor, vWorld;
    varying float vDistance;
    void main() {
      vec3 sway=aPoint;
      sway.x+=uPlant*.12*sin(uTime*1.6+aPoint.z*.7+aPoint.y);
      sway.y+=uPlant*.055*cos(uTime*1.8+aPoint.x*2.);
      vec4 point = uModel * uWing * vec4(sway, 1.);
      gl_Position = uView * point;
      vWorld = point.xyz;
      vNormal = mat3(uModel) * mat3(uWing) * aNormal;
      vColor = aColor;
      vDistance = gl_Position.w;
    }`;
  const fragment = `
    precision highp float;
    varying vec3 vNormal, vColor, vWorld;
    varying float vDistance;
    uniform vec3 uEye;
    uniform float uBird, uShine, uWood,uTime; uniform sampler2D uBark;
    float hash(vec2 p) {
      vec3 q = fract(vec3(p.xyx) * .1031);
      q += dot(q, q.yzx + 33.33);
      return fract((q.x + q.y) * q.z);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.-2.*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+1.), u.x), u.y);
    }
    float fbm(vec2 p) {
      return noise(p)*.49 + noise(p*2.04)*.25 + noise(p*4.17)*.14 + noise(p*8.29)*.08 + noise(p*16.31)*.04;
    }
    float noise3(vec3 p) {
      vec3 i=floor(p),f=fract(p);
      f=f*f*(3.-2.*f);
      vec2 a=i.xy+vec2(37.,19.)*i.z;
      return mix(
        mix(mix(hash(a),hash(a+vec2(1.,0.)),f.x),mix(hash(a+vec2(0.,1.)),hash(a+1.),f.x),f.y),
        mix(mix(hash(a+vec2(37.,19.)),hash(a+vec2(38.,19.)),f.x),mix(hash(a+vec2(37.,20.)),hash(a+vec2(38.,20.)),f.x),f.y),
        f.z);
    }
    float cloudShape(vec3 p) {
      vec3 q=p*vec3(.14,.27,.14)+vec3(uTime*.075,0.,uTime*.035);
      float mass=noise3(q)*.57+noise3(q*2.03)*.28+noise3(q*4.1)*.15;
      float grouping=noise3(q*.42+vec3(7.,2.,3.));
      float center=-4.3+2.5*(noise3(vec3(p.x*.08,3.2,p.z*.08))-.5);
      float envelope=abs(p.y-center)*.09;
      float top=1.-smoothstep(-1.75,-.55,p.y);
      return smoothstep(.38,.64,mass-envelope-max(0.,.49-grouping)*.47)*top;
    }

    float grain(vec3 p) {
      return sin(p.x * 43. + sin(p.y * 31.) + p.z * 71.) * sin(p.x * 81. - p.y * 64. + p.z * 35.);
    }
    void main() {
      vec3 view = normalize(uEye - vWorld);
      vec3 n = normalize(vNormal);
      if (dot(n, view) < 0.) n = -n;
      vec3 sun = normalize(vec3(.35, .48, 1.));
      float frontLight = max(0., dot(n, sun));
      float rim = pow(1. - abs(dot(n, view)), 3.) * max(0., dot(n, sun));
      float sheen = pow(max(dot(n, normalize(sun + view)), 0.), 17.);
      vec3 warm = vec3(1., .78, .45);
      vec3 light = mix(vec3(.72, .76, .52), vec3(.60, .72, .86), uBird);
      float rings=sin(vWorld.z*42.+sin(vWorld.y*11.)*2.5+sin(vWorld.x*9.)*1.7);
      float fibers=sin(vWorld.z*180.+vWorld.x*39.)*.07;
      float barkN=noise3(vWorld*vec3(14.,14.,14.))*.6+noise3(vWorld*31.)*.4;
      float ridge=1.-abs(noise3(vWorld*vec3(6.,22.,6.))*2.-1.);
      float texture = 1. + (rings*.06+fibers*.5+(barkN-.5)*.55+(ridge-.5)*.5)*uWood;
      n=normalize(n+vec3(rings*.11,fibers*.8,0.)*uWood);
      vec3 alb=vColor;
      if(uWood>.5){vec3 bw=pow(abs(n),vec3(4.));bw/=bw.x+bw.y+bw.z;
        vec3 bk=texture2D(uBark,vWorld.zy*vec2(.9,1.6)).rgb*bw.x+texture2D(uBark,vWorld.xz*vec2(1.6,.9)).rgb*bw.y+texture2D(uBark,vWorld.xy*1.4).rgb*bw.z;
        alb=pow(bk,vec3(1.1))*vec3(1.08,.86,.66)*1.1*(dot(vColor,vec3(.333))/.17);texture=1.;}
      vec3 lit = alb * (light + frontLight * warm * mix(.92,.68,uBird)) * texture
        + warm * (rim * mix(.38, .12, uBird) + sheen * uShine);
      if(uWood>.5){float moss=smoothstep(.35,.9,n.y)*smoothstep(.45,.7,noise3(vWorld*4.));
        lit=mix(lit,vec3(.16,.22,.06)*(light+frontLight*warm*.8),moss*.6);
        lit*=mix(.55,1.,smoothstep(.2,.6,ridge));}
      if(uShine>.3){
        float fres=pow(1.-abs(dot(n,view)),2.);
        float spec=pow(max(dot(n,normalize(sun+view)),0.),60.);
        float trans=pow(max(0.,dot(-view,sun)),3.);
        lit=vColor*(.35+frontLight*1.1)+vec3(.55,.62,.75)*fres*.22+vec3(1.,.95,.85)*spec*.9+vec3(.55,.08,.18)*trans*.6;
      }
      float fog = smoothstep(24., 155., vDistance) * .90 * (1. - uBird);
      vec3 horizon = mix(vec3(1., .74, .62), vec3(.92, .70, .78), smoothstep(-3., 6., vWorld.y));
      vec3 color = mix(lit, horizon, fog);
      if(uBird < .5 && vWorld.y < -.55){
        vec3 travel=vWorld-uEye;
        float distanceToSurface=length(travel);
        vec3 ray=travel/distanceToSurface;
        float begin=max(0.,(-.55-uEye.y)/min(-.001,ray.y));
        float finish=min(distanceToSurface,begin+90.);
        float stride=max(0.,finish-begin)/14.;
        float opacity=0.;
        vec3 vapor=vec3(0.);
        for(int i=0;i<14;i++){
          vec3 point=uEye+ray*(begin+(float(i)+.5)*stride);
          float density=cloudShape(point);
          float lighting=clamp(.42+(density-cloudShape(point+vec3(.22,.7,.48)))*1.7,0.,1.);
          vec3 mist=mix(vec3(.62,.42,.36),vec3(1.,.80,.56),lighting);
          float alpha=(1.-exp(-density*stride*.42))*(1.-opacity);
          vapor+=mist*alpha;opacity+=alpha;
        }
        color=color*(1.-opacity)+vapor;
      }
      if(uBird>.5){
        float barb=sin(vWorld.z*310.+sin(vWorld.x*120.)*1.8);
        float barb2=sin(vWorld.x*260.+vWorld.z*90.);
        color*=.93+.05*barb+.03*barb2;
        float iri=pow(1.-abs(dot(n,view)),2.5);
        color+=vec3(.05,.35,.30)*iri*.35*step(vColor.b,vColor.r+.9)*step(vColor.r,.2);
        color+=vec3(1.,.85,.6)*pow(max(dot(n,normalize(sun+view)),0.),40.)*.25;
      }
      gl_FragColor = vec4(color, 1.);
    }`;
  const skyVertex = `
    attribute vec2 aPoint;
    varying vec2 vScreen;
    void main() { vScreen = aPoint; gl_Position = vec4(aPoint, 0., 1.); }`;
  const skyFragment = `
    precision highp float;
    varying vec2 vScreen;
    uniform vec3 uEye;
    uniform float uAspect, uFov, uTime;
    float hash(vec2 p) {
      vec3 q = fract(vec3(p.xyx) * .1031);
      q += dot(q, q.yzx + 33.33);
      return fract((q.x + q.y) * q.z);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.-2.*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+1.), u.x), u.y);
    }
    float fbm(vec2 p) {
      return noise(p)*.49 + noise(p*2.04)*.25 + noise(p*4.17)*.14 + noise(p*8.29)*.08 + noise(p*16.31)*.04;
    }
    float noise3(vec3 p) {
      vec3 i=floor(p),f=fract(p);
      f=f*f*(3.-2.*f);
      vec2 a=i.xy+vec2(37.,19.)*i.z;
      return mix(
        mix(mix(hash(a),hash(a+vec2(1.,0.)),f.x),mix(hash(a+vec2(0.,1.)),hash(a+1.),f.x),f.y),
        mix(mix(hash(a+vec2(37.,19.)),hash(a+vec2(38.,19.)),f.x),mix(hash(a+vec2(37.,20.)),hash(a+vec2(38.,20.)),f.x),f.y),
        f.z);
    }
    float cloudShape(vec3 p) {
      vec3 q=p*vec3(.14,.27,.14)+vec3(uTime*.075,0.,uTime*.035);
      float mass=noise3(q)*.57+noise3(q*2.03)*.28+noise3(q*4.1)*.15;
      float grouping=noise3(q*.42+vec3(7.,2.,3.));
      float center=-4.3+2.5*(noise3(vec3(p.x*.08,3.2,p.z*.08))-.5);
      float envelope=abs(p.y-center)*.09;
      float top=1.-smoothstep(-1.75,-.55,p.y);
      return smoothstep(.38,.64,mass-envelope-max(0.,.49-grouping)*.47)*top;
    }
    uniform sampler2D uPano; uniform float uReady, uFront, uSea, uYaw, uPitch;
    const vec3 SUN=normalize(vec3(0.,.05,1.)); // sol a ~3° do horizonte (céu da foto rebaixado 11°)
    vec3 pano(vec3 r){
      float u=atan(r.x,r.z)/6.28318+.1477;
      float el=min(1.5707,asin(clamp(r.y,-1.,1.))+.19);
      float v=(1.5708-el)/(3.14159*.53);
      vec3 c=texture2D(uPano,vec2(fract(u),clamp(v,0.,.995))).rgb;
      c=pow(c,vec3(1.12));
      {float l=dot(c,vec3(.299,.587,.114));float sat=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));
       float cloudM=smoothstep(.42,.8,l)*(1.-smoothstep(.12,.32,sat));float sw=pow(max(dot(normalize(r),SUN),0.),6.);
       vec3 pinkC=c*vec3(1.18,.80,.86)+vec3(.06,.0,.03),goldC=c*vec3(1.2,.92,.62)+vec3(.05,.02,0.);
       c=mix(c,mix(pinkC,goldC,sw),cloudM*.85);}
      float lum=dot(c,vec3(.299,.587,.114));
      c=mix(vec3(lum),c,1.38);
      float up=smoothstep(.05,.6,r.y);
      c*=mix(vec3(1.,.97,.94),vec3(.78,.94,1.2),up);
      return c;
    }
    float seaD(vec3 p,float detail){
      vec3 w=p+vec3(uTime*1.4,0.,uTime*.5);
      float cov=noise3(w*vec3(.011,0.,.011)+vec3(3.,0.,1.))*.6+noise3(w*.028)*.4;
      float h=clamp((p.y+15.)/16.,0.,1.);
      float topM=smoothstep(0.,.08,h)*(1.-smoothstep(.22+cov*cov*.7,.36+cov*cov*.72,h));
      float base=noise3(w*.05)*.55+noise3(w*.1)*.3+noise3(w*.2)*.15;
      float d=base*topM-(1.-cov)*.52-.09-smoothstep(380.,620.,uEye.z)*.12;
      if(d<=0.)return 0.;
      float bill=1.-abs(noise3(w*.36)*2.-1.);
      d-=(1.-(bill*.6+noise3(w*.9)*.4))*.18*detail*(1.-h*.3);
      return clamp(d*2.6,0.,1.);
    }
    float puffD(vec3 p){
      vec3 w=p+vec3(uTime*.6,0.,0.);
      float cell=noise3(w*vec3(.05,.12,.05)+vec3(5.,1.,2.));
      float hc=(uEye.y<-8.?-30.:.8)+(noise3(w*vec3(.04,0.,.04))-.5)*5.;float hs=2.+noise3(w*.07+9.)*3.;float d=cell*(1.-smoothstep(.2*hs,hs,abs(p.y-hc)))-.68;
      if(d<=0.)return 0.;
      d+=noise3(w*.35)*.16+noise3(w*.8)*.08-.12;
      return clamp(d*3.,0.,1.);
    }
    vec2 h22(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
    vec4 crowns(vec2 q){
      vec2 i=floor(q),f=fract(q);float best=9.;vec2 bo=vec2(0.),bid=vec2(0.);
      for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=h22(i+g);
        vec2 r=g+o*.85-f;float s=.55+.45*h22(i+g+7.).x;float dd=length(r)/s;if(dd<best){best=dd;bo=r/s;bid=i+g;}}
      return vec4(best,bo,hash(bid));
    }
    float hg(float c,float g){float g2=g*g;return (1.-g2)/(12.566*pow(1.+g2-2.*g*c,1.5));}
    void main() {
      vec2 p = vec2(vScreen.x*uAspect, vScreen.y);
      vec3 ray = normalize(vec3(p*uFov - vec2(-uEye.x * .026, -.10), 1.));
      {float cp=cos(uPitch),sp=sin(uPitch);ray.yz=mat2(cp,sp,-sp,cp)*ray.yz;float cy=cos(uYaw),sy=sin(uYaw);ray.xz=mat2(cy,-sy,sy,cy)*ray.xz;}
      float mu=dot(ray,SUN);float d=acos(clamp(mu,-1.,1.));
      if(uFront>0.){
        vec4 acc=vec4(0.);float stp=1.6;float t=2.+stp*fract(52.9829*fract(dot(gl_FragCoord.xy,vec2(.06711,.00583))));
        float ph=min(mix(hg(mu,.6),hg(mu,-.2),.35)*12.566,2.6);
        for(int i=0;i<26;i++){vec3 pos=uEye+ray*t;float dd=puffD(pos);
          if(dd>.001){float ld=puffD(pos+SUN*1.5)+puffD(pos+SUN*4.);
            vec3 lum=vec3(1.,.95,.88)*1.5*exp(-ld*1.6)*min(ph,2.5)*.35+mix(vec3(.74,.60,.72),vec3(.96,.78,.80),clamp((pos.y+1.)/4.,0.,1.))*.75;
            float a=(1.-exp(-dd*stp*.5))*(1.-acc.a);acc+=vec4(lum*a,a);if(acc.a>.97)break;}
          t+=stp*(1.+t*.02);}
        float edgeFade=smoothstep(0.,.25,1.-abs(vScreen.y));
        gl_FragColor=vec4(acc.rgb,acc.a)*uFront*.9;return;
      }
      // céu procedural de reserva enquanto a foto carrega
      float above = smoothstep(-.08, .28, ray.y);
      vec3 sky = mix(vec3(.91, .57, .35), vec3(.065, .28, .62), above);
      vec3 photo=pano(vec3(ray.x,max(ray.y,-.04),ray.z));
      {float y=max(ray.y,0.);float sw=pow(max(mu,0.),4.);
       vec3 g=mix(vec3(1.,.66,.34),vec3(1.,.55,.52),smoothstep(.0,.08,y));
       g=mix(g,vec3(.86,.52,.72),smoothstep(.06,.22,y));
       g=mix(g,vec3(.30,.36,.78),smoothstep(.18,.55,y));
       g=mix(g,vec3(.14,.20,.58),smoothstep(.5,1.,y));
       g=mix(g,vec3(1.,.78,.45),sw*smoothstep(.35,0.,y)*.8);
       float pl=dot(photo,vec3(.299,.587,.114));float pb=photo.b-photo.r;
       float cm=uReady*smoothstep(.30,.62,pl)*(1.-smoothstep(.16,.42,pb))*smoothstep(-.005,.03,ray.y);
       vec3 cloudLit=mix(vec3(1.,.62,.66),vec3(1.,.80,.52),sw)*(.75+.5*pl);
       vec3 cloudShadow=vec3(.58,.46,.66)*(.6+.6*pl);
       vec3 cl=mix(cloudShadow,cloudLit,smoothstep(.45,.85,pl));
       sky=mix(g,cl,cm*.92);}
      {float hz=exp(-max(ray.y,0.)*5.5);float sunW=pow(max(mu,0.),3.);
       vec3 pink=vec3(1.,.62,.70),gold=vec3(1.,.74,.36);
       vec3 tint=mix(pink,gold,sunW);
       sky=mix(sky,sky*tint*1.12+tint*.06,hz*.75);
       sky=mix(sky,sky*vec3(.86,.95,1.12),smoothstep(.15,.7,ray.y));}
      // abaixo do horizonte: brilho alaranjado sob o mar de nuvens
      vec3 under=mix(vec3(.95,.70,.72),vec3(.55,.45,.60),smoothstep(-.02,-.5,ray.y));
      under=mix(under,vec3(1.,.93,.82),exp(-d*5.)*.5);
      sky=mix(sky,under,smoothstep(.0,-.06,ray.y));
      if(uSea==1.&&ray.y<-.004&&uEye.z>330.){float gd=(-40.-uEye.y)/ray.y;vec2 g=(uEye+ray*gd).xz;
        vec3 floorC=mix(vec3(.05,.11,.05),vec3(.13,.21,.08),fbm(g*.08))*(.65+.7*fbm(g*.6))*(.8+.4*fbm(g*2.3));
        floorC=mix(floorC,mix(vec3(.98,.66,.62),vec3(1.,.80,.55),pow(max(mu,0.),4.)),1.-exp(-gd*.0035));
        sky=mix(sky,floorC,smoothstep(-.004,-.03,ray.y));}
      float T=1.;vec3 seaAcc=vec3(0.);
      bool below=uEye.y<-15.;
      if(uSea!=1.&&((ray.y<-.003&&!below)||(ray.y>.003&&below))){
        float t0=below?(-15.-uEye.y)/ray.y:max((-1.-uEye.y)/ray.y,0.);float t1=min(below?(-1.-uEye.y)/ray.y:(-15.-uEye.y)/ray.y,520.);
        vec3 acc=vec3(0.);
        float ph=min(mix(hg(mu,.6),hg(mu,-.2),.35)*12.566,2.6);
        float stp=(t1-t0)/64.;float t=t0+stp*fract(52.9829*fract(dot(gl_FragCoord.xy,vec2(.06711,.00583))));
        vec3 horiz=mix(vec3(.98,.66,.62),vec3(1.,.80,.55),pow(max(mu,0.),4.));
        for(int i=0;i<64;i++){
          if(t>t1||T<.03)break;
          vec3 pos=uEye+ray*t;float dd=seaD(pos,t<200.?1.:0.);
          if(dd>.001){
            float ld=0.;for(int j=1;j<=4;j++)ld+=seaD(pos+SUN*float(j*j)*1.1,0.);
            float hh=clamp((pos.y+15.)/14.,0.,1.);
            float beer=exp(-ld*1.6),powder=1.-exp(-dd*4.);
            vec3 sunC=vec3(1.,.68,.45)*2.2;
            vec3 amb=mix(vec3(.42,.30,.52),vec3(.95,.56,.66),hh)*mix(.5,.85,hh);
            vec3 lum=sunC*beer*mix(1.,powder*2.,.5)*ph*.62+amb;
            lum=mix(lum,horiz*1.08,1.-exp(-t*.0045));
            float a=exp(-dd*.85*stp);acc+=T*(lum-lum*a);T*=a;
          }
          t+=stp*(1.+t*.0015);
        }
        sky=sky*T+acc;seaAcc=acc;
      }
      if(uSea==2.){vec3 o=seaAcc*vec3(1.,.88,.92);o=(1.-exp(-o*1.55))/max(1.-T,.001)*(1.-T);o=pow(o,vec3(1.04));o=mix(vec3(dot(o,vec3(.299,.587,.114))),o,1.1);o*=1.-dot(vScreen*.5,vScreen*.5)*.5;gl_FragColor=vec4(o,1.-T);return;}
      // sol, halo e raios (mantidos do atual, refinados)
      vec3 tt=normalize(ray-SUN*mu);float ang=atan(tt.y,tt.x);
      float shafts=pow(max(0.,sin(ang*21.+fbm(vec2(ang*3.,uTime*.04))*1.5)),11.)*.8+pow(max(0.,sin(ang*47.+1.3)),24.)*.4;
      float cr=0.;
      if(mu>.55){for(int k=1;k<=14;k++){float f=float(k)/14.;vec3 q=normalize(mix(ray,SUN,f));
        vec3 pc=pano(vec3(q.x,max(q.y,.0),q.z));cr+=smoothstep(.62,1.,dot(pc,vec3(.33)));}
        cr/=14.;}
      float flick=.85+.15*sin(uTime*.35+ang*5.)*sin(uTime*.21-ang*3.);
      vec3 rayC=vec3(1.,.66,.32);
      
      sky+=vec3(1.,.55,.2)*exp(-d*3.)*.25+vec3(1.,.72,.4)*exp(-d*11.)*.5+vec3(1.,.93,.8)*exp(-d*45.)*1.2+vec3(1.,.98,.92)*exp(-d*160.)*2.5;sky+=vec3(1.,.45,.14)*exp(-abs(ray.y)*16.)*pow(max(mu,0.),5.)*.45;
      float forest = 0.;
      if (ray.y < -.02 && forest>0.) {
        float gd = (-17.-uEye.y)/ray.y;
        vec2 g = (uEye + ray*gd).xz;
        vec4 c1=crowns(g*.42), c2=crowns(g*.42*2.3+11.);
        float r1=clamp(1.-c1.x,0.,1.);
        vec3 nn=normalize(vec3(-c1.y*1.4,sqrt(max(.05,1.-c1.x*c1.x)),-c1.z*1.4));
        vec3 sunD=normalize(vec3(0.,.35,1.));
        float lit=clamp(dot(nn,sunD),0.,1.);
        float leafy=fbm(g*3.1)*.6+fbm(g*7.3)*.4;
        vec3 hue=mix(vec3(.05,.14,.05),vec3(.20,.30,.07),c1.w);hue=mix(hue,vec3(.32,.30,.08),step(.86,c1.w)*.7);
        vec3 trees=hue*(.35+1.25*lit)*(.75+.5*leafy);
        trees*=mix(.35,1.,smoothstep(0.,.35,r1));
        trees=mix(trees,trees*vec3(1.15,1.1,.8),clamp(1.-c2.x,0.,1.)*.4);
        trees+=vec3(1.,.72,.38)*pow(lit,6.)*.18*r1;
        float haze = 1.-exp(-gd*.0065);
        trees = mix(trees,mix(vec3(.98,.66,.62),vec3(1.,.80,.55),pow(max(mu,0.),4.))*vec3(1.,.85,.75),haze);
        float m=forest*(1.-smoothstep(-.06,-.02,ray.y));
        sky = mix(sky,trees*T+(sky-sky*T),m*.0+m);
        sky = mix(sky, sky, 0.);
      }
      // acabamento de câmera: contraste suave, grão e vinheta
      sky=1.-exp(-sky*1.7);sky=pow(sky,vec3(1.04));
      sky=mix(vec3(dot(sky,vec3(.299,.587,.114))),sky,1.06);
      sky+=(hash(gl_FragCoord.xy+fract(uTime*7.)*91.)-.5)*.006;
      sky*=1.-dot(vScreen*.5,vScreen*.5)*.5;
      gl_FragColor = vec4(sky, 1.);
    }`;

  const leafVertex = `
    attribute vec3 aPoint, aTint, aNormal; attribute vec2 aUV;
    uniform mat4 uView; uniform float uTime, uOffset;
    varying vec2 vUV; varying vec3 vTint, vNormal, vWorld; varying float vDistance;
    void main(){
      vec3 p=aPoint;
      p.x+=.12*sin(uTime*1.6+aPoint.z*.7+aPoint.y);
      p.y+=.055*cos(uTime*1.8+aPoint.x*2.);p.z+=uOffset;
      gl_Position=uView*vec4(p,1.);vUV=aUV;vTint=aTint;vNormal=aNormal;vWorld=p;vDistance=gl_Position.w;
    }`;
  const leafFragment = `
    precision highp float;
    uniform sampler2D uLeaf; uniform vec3 uEye; uniform float uTime, uCloud;
    float hash(vec2 p) {
      vec3 q = fract(vec3(p.xyx) * .1031);
      q += dot(q, q.yzx + 33.33);
      return fract((q.x + q.y) * q.z);
    }
    float noise3(vec3 p) {
      vec3 i=floor(p),f=fract(p);
      f=f*f*(3.-2.*f);
      vec2 a=i.xy+vec2(37.,19.)*i.z;
      return mix(
        mix(mix(hash(a),hash(a+vec2(1.,0.)),f.x),mix(hash(a+vec2(0.,1.)),hash(a+1.),f.x),f.y),
        mix(mix(hash(a+vec2(37.,19.)),hash(a+vec2(38.,19.)),f.x),mix(hash(a+vec2(37.,20.)),hash(a+vec2(38.,20.)),f.x),f.y),
        f.z);
    }
    float seaD(vec3 p,float detail){
      vec3 w=p+vec3(uTime*1.4,0.,uTime*.5);
      float cov=noise3(w*vec3(.011,0.,.011)+vec3(3.,0.,1.))*.6+noise3(w*.028)*.4;
      float h=clamp((p.y+15.)/16.,0.,1.);
      float topM=smoothstep(0.,.08,h)*(1.-smoothstep(.22+cov*cov*.7,.36+cov*cov*.72,h));
      float base=noise3(w*.05)*.55+noise3(w*.1)*.3+noise3(w*.2)*.15;
      float d=base*topM-(1.-cov)*.52-.09-smoothstep(380.,620.,uEye.z)*.12;
      if(d<=0.)return 0.;
      float bill=1.-abs(noise3(w*.36)*2.-1.);
      d-=(1.-(bill*.6+noise3(w*.9)*.4))*.18*detail*(1.-h*.3);
      return clamp(d*2.6,0.,1.);
    }

    varying vec2 vUV; varying vec3 vTint, vNormal, vWorld; varying float vDistance;
    void main(){
      vec4 tex=texture2D(uLeaf,vUV);
      if(tex.a<.5)discard;
      vec3 view=normalize(uEye-vWorld);vec3 n=normalize(vNormal);
      if(dot(n,view)<0.)n=-n;
      vec3 sun=normalize(vec3(.1,.25,1.));
      vec3 alb=pow(tex.rgb,vec3(1.15))*vTint;
      float front=max(0.,dot(n,sun));
      float back=pow(max(0.,dot(-view,sun)),1.5)*(.55+.45*(1.-front));
      vec3 c=alb*(vec3(.26,.30,.34)+front*vec3(1.,.82,.55)*.8);
      c+=alb*vec3(1.15,1.0,.35)*back*.75;
      c+=vec3(1.,.85,.55)*pow(max(dot(n,normalize(sun+view)),0.),24.)*.12;
      if(uCloud>.5){
        float haze=1.-exp(-vDistance*.0042);c=mix(c*.95,vec3(.74,.80,.88),haze);
      } else {
        float fog=smoothstep(24.,155.,vDistance)*.9;
        c=mix(c,vec3(1.,.76,.66),fog);
      }
      gl_FragColor=vec4(c,1.);
    }`;
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const scale = (a, k) => a.map(v => v * k);
  const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
  const unit = v => scale(v, 1 / (Math.hypot(...v) || 1));
  const blend = (a, b, k) => a + (b - a) * k;
  const ease = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
  const identity = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  const angleZ = (a, x = 0, y = 0, z = 0) => {
    const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, x,y,z,1]);
  };
  const birdPose = (roll, tilt, yaw, x, y, z) => {
    const c = Math.cos(roll), s = Math.sin(roll), d = Math.cos(tilt), t = Math.sin(tilt);
    const a = Math.cos(yaw), b = Math.sin(yaw);
    return new Float32Array([
      a*c,s,-b*c,0,
      -a*s*d+b*t,c*d,b*s*d+a*t,0,
      a*s*t+b*d,-c*t,-b*s*t+a*d,0,
      x,y,z,1
    ]);
  };

  function triangle(mesh, a, b, c, color, normals) {
    const face = normals || Array(3).fill(unit(cross(sub(b, a), sub(c, a))));
    [a, b, c].forEach((p, i) => mesh.push(...p, ...face[i], ...color));
  }

  function tube(mesh, points, radius, color, sides = 6) {
    const rings = points.map((p, i) => {
      const axis = unit(sub(points[Math.min(i+1, points.length-1)], points[Math.max(0, i-1)]));
      const normal = unit(cross(axis, Math.abs(axis[2]) > .78 ? [0,1,0] : [0,0,1]));
      const binormal = cross(axis, normal);
      const r = typeof radius === 'function' ? radius(i / (points.length-1)) : radius;
      return Array.from({length: sides}, (_, j) => {
        const a = j * Math.PI * 2 / sides;
        return add(p, add(scale(normal, Math.cos(a)*r), scale(binormal, Math.sin(a)*r)));
      });
    });
    for (let i = 1; i < rings.length; i++) {
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        const bark = scale(color, .76 + .24 * Math.cos(j * 1.8 + i * .37) ** 2);
        triangle(mesh, rings[i-1][k], rings[i-1][j], rings[i][j], bark);
        triangle(mesh, rings[i-1][k], rings[i][j], rings[i][k], bark);
      }
    }
  }

  function oval(mesh, center, size, color, rows = 7, slices = 12, yaw = 0) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const turn = p => [p[0]*c + p[2]*s, p[1], p[2]*c - p[0]*s];
    const point = (i, j) => {
      const lat = Math.PI*i/rows, lon = Math.PI*2*j/slices;
      const v = [Math.sin(lat)*Math.cos(lon), Math.cos(lat), Math.sin(lat)*Math.sin(lon)];
      return [add(center, turn(v.map((n, k) => n*size[k]))), unit(turn(v.map((n, k) => n/size[k])))];
    };
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < slices; j++) {
        const a = point(i,j), b = point(i,j+1), c = point(i+1,j), d = point(i+1,j+1);
        if (i > 0) triangle(mesh, a[0], c[0], b[0], color, [a[1], c[1], b[1]]);
        if (i < rows-1) triangle(mesh, b[0], c[0], d[0], color, [b[1], c[1], d[1]]);
      }
    }
  }

  const leafEdge = [
    [0,.72],[.16,.41],[.29,.49],[.24,.26],[.52,.32],[.43,.14],[.66,.07],[.44,-.02],
    [.58,-.21],[.32,-.2],[.28,-.4],[.12,-.27],[0,-.39],[-.12,-.27],[-.28,-.4],
    [-.32,-.2],[-.58,-.21],[-.44,-.02],[-.66,.07],[-.43,.14],[-.52,.32],[-.24,.26],[-.29,.49],[-.16,.41]
  ];

  function leaf(mesh, center, size, angle, tilt, color) {
    const u = [Math.cos(angle), Math.sin(angle), 0];
    const v = [-Math.sin(angle)*Math.cos(tilt), Math.cos(angle)*Math.cos(tilt), Math.sin(tilt)];
    const n = cross(u, v);
    const avg=(color[0]+color[1]+color[2])/3||.3;
    const tint=[.72+.5*color[0]/avg*.45, .9+.1*color[1]/avg, .7+.3*color[2]/avg].map(x=>Math.min(1.25,x));
    const hw=size*1.25, hh=size*.84, cols=4, rows=3, grid=[];
    // stem of the photo sits at ~(.44,.62) of the image: anchor the leaf there
    for(let r=0;r<=rows;r++){grid[r]=[];for(let c=0;c<=cols;c++){
      const s0=c/cols, t0=r/rows, x=(s0-.44)*2*hw, y=(.62-t0)*2*hh;
      const curl=-.32*size*((s0-.5)*2)**2 + .12*size*Math.sin(t0*3.1);
      const p=add(center,add(add(scale(u,x),scale(v,y)),scale(n,curl)));
      grid[r][c]=[p,[s0,t0]];}}
    const push=([p,uv])=>mesh.push(...p,...uv,...tint,...n);
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const A=grid[r][c],B=grid[r][c+1],C=grid[r+1][c],D=grid[r+1][c+1];
      push(A);push(C);push(B);push(B);push(C);push(D);}
  }

  function buildTrees(){
    const mesh=[];let seed=4242;const rnd=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
    const card=(c,size,nrm,tint)=>{const a=rnd()*6.28,tl=rnd()*1.2-.6;
      const u=[Math.cos(a),0,Math.sin(a)],v=unit(add([0,Math.cos(tl),0],scale(u,0)));const w=unit(cross(u,[0,1,0]));
      const vv=unit(add(scale([0,1,0],Math.cos(tl)),scale(w,Math.sin(tl))));
      const P=(x,y)=>add(c,add(scale(u,(x-.44)*2*size*1.25),scale(vv,(.62-y)*2*size*.84)));
      const q=[[0,0],[0,1],[1,0],[1,0],[0,1],[1,1]];q.forEach(([x,y])=>mesh.push(...P(x,y),x,y,...tint,...nrm));};
    for(let i=0;i<950;i++){
      const x=(rnd()-.5)*420,z=rnd()*300,top=-33-rnd()*5,R=3.6+rnd()*3.8;
      const base=[.36+rnd()*.14,.48+rnd()*.16,.26+rnd()*.12].map(v=>v*(rnd()<.12?1.25:1));
      const lobes=3+Math.floor(rnd()*3);
      for(let l=0;l<lobes;l++){
        const la=rnd()*6.28,lr=l?R*.55:0;const cen=[x+Math.cos(la)*lr,top-R*.55-rnd()*R*.4,z+Math.sin(la)*lr];const r=R*(l?.7:.85);
        for(let k=0;k<14;k++){
          const th=Math.acos(1-rnd()*1.3),ph=rnd()*6.28;
          const nrm=[Math.sin(th)*Math.cos(ph),Math.cos(th),Math.sin(th)*Math.sin(ph)];
          const p=add(cen,scale(nrm,r*(.75+rnd()*.3)));
          const sh=.75+.25*nrm[1];
          card(p,1.6+rnd()*1.6,nrm,base.map(v=>v*sh));
        }
      }
    }
    return mesh;
  }

  function buildTunnel() {
    const sections = [];
    let wood, leaves, grapes;
    let seed = 777;
    const rnd = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
    const between = (a,b) => blend(a,b,rnd());
    const palette = [[.35,.42,.062],[.44,.49,.071],[.26,.35,.069],[.73,.58,.082],[.52,.47,.063],[.19,.28,.049]];
    const pitch = 5.9;
    const arch = (a, z, offset = 0) => {
      const r = 4.72 + offset + .1 * Math.cos(a*4 + z*.14);
      return [Math.cos(a)*r, Math.sin(a)*r + .46, z];
    };
    for (let archIndex = 0; archIndex < 23; archIndex++) {
      const z = 4.5 + archIndex * pitch;
      if (archIndex % 3 === 0) {
        wood = [];
        leaves = [];
        grapes = [];
        sections.push({z, meshes: {wood, leaves, grapes}});
      }
      const bend = between(-.7,.7);
      for (let strand = 0; strand < 10; strand++) {
        const offset = between(-.24,.26), phase = between(0,6.2);
        const points = Array.from({length:65}, (_, i) => {
          const a = -Math.PI / 2 + i * Math.PI * 2 / 64;
          const coil = a*8. + phase;
          return arch(a, z + Math.sin(coil)*.28 + Math.cos(a*2)*bend + offset, offset + Math.cos(coil)*.23);
        });
        const radius = strand < 3 ? between(.17,.27) : between(.035,.10);
        tube(wood, points, t => radius*(.85 + .15*Math.sin(t*33+phase)), [.29,.145,.066]);
      }
      for (let j = 0; j < 157; j++) {
        const a = between(-.83,4.04);
        const point = arch(a, z + between(-1.08,1.2), between(-.75,.72));
        leaf(leaves, point, between(.26,.99), between(-3.14,3.14), between(-1.35,1.35), palette[Math.floor(rnd()*palette.length)]);
        if (j % 16 === 0) {
          const stem = arch(a, z, -.32);
          const tip = add(point, [between(-.38,.38), between(-.61,-.21), between(-.27,.3)]);
          tube(wood, [stem, point, tip], t => .04 - .027*t, [.35,.25,.066], 5);
        }
      }
      for (let j = 0; j < 12; j++) {
        const a = -.32 + j*.341 + between(-.1,.1);
        const p = arch(a, z + between(-.54,.46), between(-.35,-.18));
        const stem = add(p, [0,-.29,.025]);
        tube(wood, [p, stem], .028, [.34,.28,.083], 5);
        const tint = between(.75,1.23);
        for (let row = 0; row < 5; row++) {
          const count = 6-row;
          for (let k = 0; k < count; k++) {
            const angle = k*2*Math.PI/count + row*1.07;
            const spread = .20 - .032*row;
            const berry = add(stem, [Math.cos(angle)*spread, -row*.145, Math.sin(angle)*spread]);
            const r = between(.085,.122);
            oval(grapes, berry, [r,r*1.08,r], scale([.34,.07,.16], tint * between(.75,1.25)), 5, 8);
          }
        }
      }
      if (archIndex < 22) {
        for (const a of [-.29,.16,.6,1.21,1.87,2.57,3.04,3.41]) {
          const phase = between(0,6.2);
          const stem = Array.from({length:12}, (_, i) => arch(a + .12*Math.sin(i*.58+phase), z+i*pitch/11, .12*Math.sin(i*.8)));
          tube(wood, stem, .028, [.22,.14,.051], 5);
          for (let j = 1; j < 11; j += 2) {
            leaf(leaves, add(stem[j], [between(-.3,.3),between(-.3,.1),0]), between(.26,.56), between(-3,3), between(-1,1), palette[Math.floor(rnd()*palette.length)]);
          }
        }
      }
    }
    return sections;
  }


  function feather(mesh, base, tip, width, color) {
    const axis = sub(tip, base);
    const across = unit(cross(axis, [0,1,0]));
    const rows = 10, cols = 4;
    const points = [];
    for (let row = 0; row <= rows; row++) {
      const t = row / rows;
      const span = width * (.16 + .86 * Math.sin(Math.PI*t)**.65) * (1-.27*t);
      points[row] = [];
      for (let col = 0; col <= cols; col++) {
        const u = col / cols * 2 - 1;
        const point = add(add(base, scale(axis,t)),scale(across,u*span));
        point[1] += Math.sin(t*Math.PI)*.032 + (1-Math.abs(u))*.018 - Math.abs(u)*width*.17;
        points[row][col] = point;
        if (row && col) {
          const tone = scale(color,.78+.20*(1-Math.abs(u))+.10*t);
          triangle(mesh,points[row-1][col-1],points[row][col-1],point,tone);
          triangle(mesh,points[row-1][col-1],point,points[row-1][col],tone);
        }
      }
    }
  }

  function buildForest() {
    const mesh=[];
    let seed=1777;
    const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    for(let index=0;index<235;index++){
      const z=138+random()*250;
      const x=(random()-.5)*160;
      const top=-10-random()*6;
      const radius=2.2+random()*3.7;
      tube(mesh,[[x,-24,z],[x+.4,top-1,z]],.19,[.18,.12,.067],5);
      oval(mesh,[x,top-3.7,z],[radius*1.15,radius*.85,radius*1.15],[.085,.23,.073],6,10);
      oval(mesh,[x+.7,top-6.0,z+.5],[radius*1.05,radius*.85,radius],[.065,.18,.061],6,10);
      for(let cluster=0;cluster<4;cluster++){
        const angle=cluster*Math.PI*.5+index;
        const color=[.08+random()*.09,.21+random()*.15,.065+random()*.045];
        oval(mesh,[x+Math.cos(angle)*radius*.48,top+random()*1.1,z+Math.sin(angle)*radius*.48],
          [radius*.82,radius*.58,radius*.82],color,7,10);
      }
    }
    return mesh;
  }


  function buildMacaw() {
    const body=[],tail=[],left=[],right=[],leftOuter=[],rightOuter=[],leftTip=[],rightTip=[];
    const blue=[.045,.30,.66], cobalt=[.045,.38,.73], navy=[.022,.11,.30];
    const yellow=[.98,.64,.075], black=[.027,.032,.038], white=[.88,.89,.83];
    oval(body,[0,-.035,.015],[.222,.258,.54],yellow,15,24);
    oval(body,[0,.113,-.07],[.216,.186,.52],blue,14,24);
    oval(body,[0,.105,.35],[.153,.196,.27],yellow,14,22);
    oval(body,[0,.251,.43],[.181,.185,.214],cobalt,15,24);
    oval(body,[0,.314,.528],[.158,.105,.135],[.22,.40,.12],12,22);
    oval(body,[0,.085,.51],[.119,.067,.12],black,10,18);
    // Upper mandible curves downward to a tapered hook.
    tube(body,[[0,.256,.576],[0,.25,.658],[0,.211,.72],[0,.15,.741],[0,.096,.717],[0,.07,.681]],
      t => .087*(1-t)**.63+.003,black,16);
    oval(body,[0,.098,.623],[.067,.047,.075],black,12,18);
    for (const side of [-1,1]) {
      oval(body,[side*.147,.245,.491],[.045,.10,.117],white,12,20);
      for (let line=0;line<5;line++) {
        const y=.184+line*.019;
        tube(body,[[side*.179,y,.553],[side*.190,y+.005,.518],[side*.190,y+.014,.478],[side*.177,y+.027,.447]],
          .0018,[.075,.078,.074],4);
      }
      oval(body,[side*.182,.285,.522],[.014,.020,.022],[.56,.48,.27],10,14);
      oval(body,[side*.192,.287,.528],[.009,.013,.015],black,10,14);
      oval(body,[side*.199,.294,.532],[.003,.004,.004],white,6,8);
      oval(body,[side*.087,-.235,-.20],[.041,.038,.097],[.20,.20,.21],9,14);
      for(let toe=0;toe<3;toe++) {
        const x=side*.085+(toe-1)*.018;
        tube(body,[[x,-.252,-.16],[x,-.268,-.205],[x,-.254,-.25]],.009,[.16,.16,.17],5);
      }
    }
    // Small overlapping coverts follow the dorsal volume.
    for(let row=0;row<7;row++){
      for(let col=-3;col<=3;col++){
        const x=col*.05,z=.29-row*.105;
        const y=.12+.177*Math.sqrt(Math.max(.03,1-(x/.23)**2-((z+.07)/.56)**2));
        feather(body,[x,y,z],[x*1.07,y-.018,z-.148],.042,scale(cobalt,.83+.05*((row+col+9)%3)));
      }
    }
    for(let j=-4;j<=4;j++){
      const length=1.59-Math.abs(j)*.15;
      feather(tail,[j*.025,.015,-.37],[j*.038,-.51,-length],.063,j%2?blue:cobalt);
      feather(tail,[j*.024,-.015,-.37],[j*.036,-.534,-length+.04],.057,scale(yellow,.68));
    }
    for(const side of [-1,1]){
      const inner=side<0?left:right,outer=side<0?leftOuter:rightOuter,tips=side<0?leftTip:rightTip;
      oval(inner,[side*.37,.052,.0],[.40,.075,.27],blue,10,20);
      oval(outer,[side*.80,.035,.0],[.33,.052,.2],blue,9,18);oval(tips,[side*1.08,.022,-.04],[.16,.04,.14],blue,8,14);
      for(let i=0;i<9;i++){
        const x=.20+i*.085;
        const group=i<5?inner:outer;
        feather(group,[side*x,.035,.16-i*.01],[side*(x+.10),-.045,-.62+i*.01],.1,i%2?blue:cobalt);
        feather(group,[side*x,-.027,.10],[side*(x+.09),-.075,-.43+i*.012],.069,scale(yellow,.78));
      }
      for(let i=0;i<10;i++){
        const x=.88+i*.033;
        feather(tips,[side*(x-.06),.013,.12-i*.014],[side*(1.86-i*.072),-.07,-.16-i*.075],.105,scale(i<4?navy:blue,1.12-i*.02));
        feather(tips,[side*(x-.06),-.02,.08-i*.014],[side*(1.78-i*.072),-.10,-.2-i*.07],.08,scale(yellow,.7));
      }
      for(let row=0;row<4;row++){
        for(let col=0;col<13;col++){
          const x=.18+col*.064,z=.20-row*.077;
          feather(col<7?inner:outer,[side*x,.115-row*.009,z],[side*(x+.072),.081-row*.01,z-.18],.046,
            scale(cobalt,.84+((col+row)%3)*.065));
        }
      }
    }
    return {body,tail,left,right,leftOuter,rightOuter,leftTip,rightTip};
  }

  window.createArarasArrivalBird = THREE => {
    const meshes=buildMacaw(),group=new THREE.Group(),parts={};
    for(const [name,data] of Object.entries(meshes)){
      const position=[],normal=[],color=[];
      for(let i=0;i<data.length;i+=9){
        position.push(...data.slice(i,i+3));
        normal.push(...data.slice(i+3,i+6));
        const tone=new THREE.Color(...data.slice(i+6,i+9)).convertSRGBToLinear();
        color.push(tone.r,tone.g,tone.b);
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(color,3));
      const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
        vertexColors:true,side:THREE.DoubleSide,roughness:.73
      }));
      mesh.castShadow=true;group.add(mesh);parts[name]=mesh;
      mesh.matrixAutoUpdate=false;
    }
    const transform=(side,angle,x,yaw=0)=>{
      const rotation=new THREE.Matrix4().makeRotationZ(angle);
      rotation.multiply(new THREE.Matrix4().makeRotationY(yaw));
      return new THREE.Matrix4().makeTranslation(side*x,0,0).multiply(rotation)
        .multiply(new THREE.Matrix4().makeTranslation(-side*x,0,0));
    };
    group.userData.animate=(time,landing)=>{
      const amount=1-landing,stroke=Math.sin(time*6.1+.45);
      for(const side of [-1,1]){
        const prefix=side<0?'left':'right';
        const fold=-side*landing*.08;
        const shoulder=transform(side,side*stroke*.34*amount+fold,.17,side*landing*1.30);
        const elbow=shoulder.clone().multiply(transform(side,side*.12*Math.sin(time*6.1-.4)*amount,.66,side*.22*Math.max(0,Math.cos(time*6.1))*amount));
        const wrist=elbow.clone().multiply(transform(side,side*.13*Math.sin(time*6.1-1)*amount,.98));
        parts[prefix].matrix.copy(shoulder);
        parts[prefix+'Outer'].matrix.copy(elbow);
        parts[prefix+'Tip'].matrix.copy(wrist);
      }
      parts.tail.matrix.makeRotationX(.03*Math.sin(time*2.2)*amount);
    };
    return group;
  };

  function program(gl, vert, frag, attributes, uniforms) {
    const linked = gl.createProgram();
    for (const [kind, source] of [[gl.VERTEX_SHADER,vert],[gl.FRAGMENT_SHADER,frag]]) {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader,source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(linked,shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(linked);
    if (!gl.getProgramParameter(linked,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(linked));
    const locations = {};
    for (const a of attributes) locations[a] = gl.getAttribLocation(linked,a);
    for (const u of uniforms) locations[u] = gl.getUniformLocation(linked,u);
    return {linked,...locations};
  }

  function viewProjection(x, y, z, f, aspect) {
    // Camera faces positive Z. Small screen offsets keep the horizon in the video composition.
    const a = 1.0014, b = -.1701, dx = -.026*x*f, dy = -.10*f;
    return new Float32Array([
      f/aspect,0,0,0, 0,f,0,0, dx,dy,a,1,
      -x*f/aspect-dx*z,-y*f-dy*z,b-a*z,-z
    ]);
  }

  // Câmera orbital: P0 · R(órbita) · T(-olho). Mesma rotação aplicada ao raio do céu.
  function orbitVP(x,y,z,f,aspect){
    const vp=viewProjection(x,y,z,f,aspect),O=window.ARARAS_ORBIT;if(!O||(!O.yaw&&!O.pitch))return vp;
    const P0=viewProjection(0,0,0,f,aspect);
    const cy=Math.cos(O.yaw),sy=Math.sin(O.yaw),cp=Math.cos(O.pitch),sp=Math.sin(O.pitch);
    // inversa da rotação do raio: ray = Ry(yaw)·Rx(pitch)·r  =>  view = Rx(-pitch)·Ry(-yaw)
    const Ry=[cy,0,-sy,0, 0,1,0,0, sy,0,cy,0, 0,0,0,1];          // Ry(-yaw), coluna-maior
    const Rx=[1,0,0,0, 0,cp,-sp,0, 0,sp,cp,0, 0,0,0,1];          // Rx(-pitch)
    const T=[1,0,0,0, 0,1,0,0, 0,0,1,0, -x,-y,-z,1];
    const mul=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];o[c*4+r]=v;}return o;};
    return mul(P0,mul(Rx,mul(Ry,T)));
  }
  window.createVineFlight = canvas => {
    const gl = canvas.getContext('webgl', {alpha:false, antialias:true, powerPreference:'high-performance'});
    if (!gl) return null;
    const sky = program(gl,skyVertex,skyFragment,['aPoint'],['uEye','uAspect','uFov','uTime','uPano','uReady','uFront','uSea','uYaw','uPitch']);
    const treeBuf=(()=>{const m=buildTrees();const id=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,id);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(m),gl.STATIC_DRAW);return {id,count:m.length/11};})();
    const leafP = program(gl,leafVertex,leafFragment,['aPoint','aUV','aTint','aNormal'],['uView','uTime','uLeaf','uEye','uOffset','uCloud']);
    const leafTex=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,leafTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
    const limg=new Image();limg.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,leafTex);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,limg);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);};
    limg.src=(window.ARARAS_LEAF||'assets/grape-leaf-breeze.webp');
    const drawLeaves=({id,count})=>{gl.bindBuffer(gl.ARRAY_BUFFER,id);
      [[leafP.aPoint,3,0],[leafP.aUV,2,12],[leafP.aTint,3,20],[leafP.aNormal,3,32]].forEach(([a,n,o])=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,n,gl.FLOAT,false,44,o);});
      gl.drawArrays(gl.TRIANGLES,0,count);
      [leafP.aUV,leafP.aTint].forEach(a=>gl.disableVertexAttribArray(a));};
    const panoTex=gl.createTexture();let panoReady=0;
    gl.bindTexture(gl.TEXTURE_2D,panoTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([200,160,120]));
    const img=new Image();img.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,panoTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);panoReady=performance.now();};
    img.src=(gl.getParameter(gl.MAX_TEXTURE_SIZE)>=8192&&!matchMedia('(pointer: coarse)').matches)?(window.ARARAS_SKY8K||'assets/sky-8k.jpg'):(window.ARARAS_SKY||'assets/sky-pano.jpg');
    const world = program(gl,vertex,fragment,['aPoint','aNormal','aColor'],['uView','uModel','uWing','uEye','uBird','uShine','uWood','uTime','uPlant','uBark']);
    const loadTex=(src,alpha)=>{const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([90,70,50,255]));
      const im=new Image();im.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,tx);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);};im.src=src;return tx;};
    const barkTex=loadTex(window.ARARAS_BARK||'assets/bark.jpg');
    const buffer = (mesh, step) => {
      const id = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,id);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh),gl.STATIC_DRAW);
      return {id,count:mesh.length/step};
    };
    const skyMesh = buffer([-1,-1, 3,-1, -1,3],2);
    const birdGeometry = buildMacaw();
    const tunnel = buildTunnel().map(({z,meshes}) => ({
      z, meshes: Object.entries(meshes).map(([name,mesh]) => [name,buffer(mesh,name==='leaves'?11:9)])
    }));
    const bird = Object.fromEntries(Object.entries(birdGeometry).map(([name,mesh]) => [name,buffer(mesh,9)]));
    
    const multiply=(a,b)=>{
      const out=new Float32Array(16);
      for(let col=0;col<4;col++)for(let row=0;row<4;row++)
        for(let k=0;k<4;k++)out[col*4+row]+=a[k*4+row]*b[col*4+k];
      return out;
    };
    const joint=(side,angle,x,z=0,yaw=0)=>{
      const rotation=birdPose(angle,0,yaw,0,0,0);
      const pivot=[side*x,0,z];
      for(let row=0;row<3;row++)rotation[12+row]=pivot[row]-
        (rotation[row]*pivot[0]+rotation[4+row]*pivot[1]+rotation[8+row]*pivot[2]);
      return rotation;
    };
    const draw = ({id,count}) => {
      gl.bindBuffer(gl.ARRAY_BUFFER,id);
      [world.aPoint,world.aNormal,world.aColor].forEach((a,i) => {
        gl.enableVertexAttribArray(a);
        gl.vertexAttribPointer(a,3,gl.FLOAT,false,36,12*i);
      });
      gl.drawArrays(gl.TRIANGLES,0,count);
    };
    let w, h;
    return function render(progress, elapsed, reduced) {
      if (gl.isContextLost()) return;
      const ratio = Math.min(devicePixelRatio, 2, 3840 / Math.max(1,canvas.clientWidth)) * (window.ARARAS_QUALITY||1);
      const width = Math.round(canvas.clientWidth * ratio), height = Math.round(canvas.clientHeight * ratio);
      if (!width || !height) return;
      if (w !== width || h !== height) {
        canvas.width = w = width;
        canvas.height = h = height;
        gl.viewport(0,0,w,h);
      }
      const p = progress/100;
      const t = reduced ? 3 : elapsed;
      const x = (reduced ? 0 : .24*Math.sin(p*9) + .035*Math.sin(t*1.6))+(window.ARARAS_FREE?.x||0);
      const descent=ease((p-.60)/.14);
      const y = (reduced ? 0 : .14*Math.sin(p*8) + .035*Math.sin(t*1.18))+(window.ARARAS_FREE?.y||0)-descent*19.;
      const z = p<.42 ? p/.42*150. : 150.+(p-.42)/.58*900.;
      const aspect = w/h, focal = (aspect < 1 ? 1.48 : 1.69)*(window.ARARAS_FOCALK||1);
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(sky.linked);
      gl.bindBuffer(gl.ARRAY_BUFFER,skyMesh.id);
      gl.enableVertexAttribArray(sky.aPoint);
      gl.vertexAttribPointer(sky.aPoint,2,gl.FLOAT,false,0,0);
      gl.uniform3f(sky.uEye,x,y,z);
      gl.uniform1f(sky.uAspect,aspect);
      gl.uniform1f(sky.uFov,1/focal);const OR=window.ARARAS_ORBIT||{yaw:0,pitch:0};gl.uniform1f(sky.uYaw,OR.yaw);gl.uniform1f(sky.uPitch,OR.pitch);
      const openSky=z>142;gl.uniform1f(sky.uSea,openSky?1:0);gl.uniform1f(sky.uFront,0);gl.uniform1f(sky.uTime,t);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,panoTex);gl.uniform1i(sky.uPano,0);gl.uniform1f(sky.uReady,panoReady?Math.min(1,(performance.now()-panoReady)/600):0);
      gl.drawArrays(gl.TRIANGLES,0,skyMesh.count);
      gl.enable(gl.DEPTH_TEST);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(world.linked);
      gl.uniformMatrix4fv(world.uView,false,orbitVP(x,y,z,focal,aspect));
      gl.uniform3f(world.uEye,x,y,z);
      gl.uniformMatrix4fv(world.uModel,false,identity);
      gl.uniformMatrix4fv(world.uWing,false,identity);
      gl.uniform1f(world.uBird,0);
      gl.uniform1f(world.uTime,t);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,barkTex);gl.uniform1i(world.uBark,1);gl.activeTexture(gl.TEXTURE0);
      gl.uniform1f(world.uPlant,0);
      const leafQueue=[];
      for (const section of tunnel) {
        if (section.z < z - 19 || section.z > z + 89) continue;
        for (const [name,mesh] of section.meshes) {
          if(name==='leaves'){leafQueue.push(mesh);continue;}
          gl.uniform1f(world.uShine,name === 'grapes' ? .33 : .023);
          gl.uniform1f(world.uWood,Number(name === 'wood'));
          gl.uniform1f(world.uPlant,Number(name === 'leaves'));
          draw(mesh);
        }
      }
      if(leafQueue.length){gl.useProgram(leafP.linked);gl.uniformMatrix4fv(leafP.uView,false,orbitVP(x,y,z,focal,aspect));
        gl.uniform1f(leafP.uTime,t);gl.uniform3f(leafP.uEye,x,y,z);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,leafTex);gl.uniform1i(leafP.uLeaf,0);
        gl.uniform1f(leafP.uOffset,0);gl.uniform1f(leafP.uCloud,0);leafQueue.forEach(drawLeaves);gl.useProgram(world.linked);}
      if(z>330){gl.useProgram(leafP.linked);gl.uniformMatrix4fv(leafP.uView,false,orbitVP(x,y,z,focal,aspect));
        gl.uniform1f(leafP.uTime,t);gl.uniform3f(leafP.uEye,x,y,z);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,leafTex);gl.uniform1i(leafP.uLeaf,0);
        gl.uniform1f(leafP.uCloud,1);const L=300,k0=Math.floor((z-150)/L);
        for(let k=k0;k<=k0+2;k++){if(k<0)continue;gl.uniform1f(leafP.uOffset,150+k*L);drawLeaves(treeBuf);}
        gl.uniform1f(leafP.uCloud,0);gl.uniform1f(leafP.uOffset,0);gl.useProgram(world.linked);}
      if(openSky){gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(sky.linked);gl.bindBuffer(gl.ARRAY_BUFFER,skyMesh.id);gl.enableVertexAttribArray(sky.aPoint);gl.vertexAttribPointer(sky.aPoint,2,gl.FLOAT,false,0,0);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,panoTex);gl.uniform1f(sky.uSea,2);gl.drawArrays(gl.TRIANGLES,0,skyMesh.count);gl.uniform1f(sky.uSea,0);
        gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.useProgram(world.linked);}
      gl.uniform1f(world.uPlant,0);
      // nuvens passando pela câmera em céu aberto (antes da arara)
      const puffAmt=Math.max(ease((p-.58)/.04)*(1-ease((p-.76)/.04)),ease((p-.76)/.04)*.75);
      if(puffAmt>.01&&!window.ARARAS_NOPUFF){gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(sky.linked);gl.bindBuffer(gl.ARRAY_BUFFER,skyMesh.id);gl.enableVertexAttribArray(sky.aPoint);gl.vertexAttribPointer(sky.aPoint,2,gl.FLOAT,false,0,0);
        gl.uniform1f(sky.uFront,puffAmt);gl.drawArrays(gl.TRIANGLES,0,skyMesh.count);gl.uniform1f(sky.uFront,0);
        gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.useProgram(world.linked);}
      const entrance = ease((t-.25)/2.5);
      const settled = ease((t-2.2)/1.45);
      const sx = (aspect < 1 ? -3.4 : -5.9) * (1-entrance) + Math.sin(t*1.3+p*7)*.36*settled + .63*Math.sin(entrance*Math.PI);
      const sy = blend(-.69,.61,entrance) + .13*Math.sin(t*3.4)*settled;
      const sz = blend(2.85,6.2,entrance) + (aspect < 1 ? Math.max(2.1,3.7/aspect-6.2) : .9)*settled;
      const roll = reduced ? 0 : -.32*Math.sin(entrance*Math.PI) + .10*Math.sin(t*1.7+p*9)*settled;
      const flap = reduced ? .12 : (Math.sin(t*6.1 + .45)*.44+Math.sin(t*12.2)*.075)*(1.-.35*settled);
      gl.uniform1f(world.uBird,1);
      gl.uniform1f(world.uShine,.10);
      gl.uniform1f(world.uWood,0);
      const yaw = reduced ? 0 : .99*(1-entrance) + .16*Math.sin(t*.8+p*7)*settled;
      const birdM=birdPose(roll,-.36-.18*(1-entrance),yaw,sx+x,sy+y,sz+z);
      window.ARARAS_FLIGHT={vp0:viewProjection(x,y,z,focal,aspect),vp:orbitVP(x,y,z,focal,aspect),bird:birdM,t,flap,p,eye:[x,y,z],aspect,focal};
      if(window.ARARAS_HIDE_BIRD) return;
      gl.uniformMatrix4fv(world.uModel,false,birdM);
      draw(bird.body);
      gl.uniformMatrix4fv(world.uWing,false,joint(1,.025*Math.sin(t*3.2),0,-.37,.035*Math.sin(t*1.7)));
      draw(bird.tail);
      const recovery=reduced?0:Math.max(0,Math.cos(t*6.1+.45));
      for(const side of [-1,1]){
        const prefix=side<0?'left':'right';
        const shoulder=joint(side,side*flap,.17);
        const elbow=multiply(shoulder,joint(side,side*.13*Math.sin(t*6.1-.4),.66,0,side*.24*recovery));
        const wrist=multiply(elbow,joint(side,side*.14*Math.sin(t*6.1-1.0),.98,0,side*.19*recovery));
        gl.uniformMatrix4fv(world.uWing,false,shoulder);draw(bird[prefix]);
        gl.uniformMatrix4fv(world.uWing,false,elbow);draw(bird[prefix+'Outer']);
        gl.uniformMatrix4fv(world.uWing,false,wrist);draw(bird[prefix+'Tip']);
      }
    };
  };
})();


