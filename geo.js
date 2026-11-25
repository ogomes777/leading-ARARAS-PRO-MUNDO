(() => {
  // OSM requires an HTTP page referrer. A file URL cannot provide one.
  if (location.protocol === 'file:') {
    const preview = 'http://127.0.0.1:8765/';
    const hint = document.getElementById('geo-hint');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    fetch(preview + '__araras_preview__', {signal: controller.signal})
      .then(response => {
        if (!response.ok) throw new Error('Preview unavailable');
        return response.json();
      })
      .then(result => {
        if (result.project !== 'araras-local') throw new Error('Unexpected preview');
        location.replace(preview + location.search + location.hash);
      })
      .catch(() => {
        hint.replaceChildren(document.createTextNode('Abra a prévia pelo arquivo Abrir-Araras.ps1 para carregar o mapa.'));
      })
      .finally(() => clearTimeout(timeout));
    return;
  }

  const section = document.querySelector('.geo-journey');
  const stage = section.querySelector('.geo-stage');
  const canvas = section.querySelector('#geo-globe');
  const mapCanvas = section.querySelector('#geo-map');
  const cartography = mapCanvas.getContext('2d');
  const mapPlane = section.querySelector('.map-plane');
  const model = section.querySelector('.model');
  const range = section.querySelector('#journey-range');
  range.addEventListener('input', () => {
    const offset = parseFloat(getComputedStyle(stage).top) || 0;
    window.scrollTo({
      top: window.scrollY + section.getBoundingClientRect().top - offset +
        (section.offsetHeight - stage.offsetHeight) * Number(range.value) / 1000,
      behavior: 'instant'
    });
  });
  const ctx = canvas.getContext('2d');
  const place = section.querySelector('#geo-place');
  const hint = section.querySelector('#geo-hint');
  const arrival = section.querySelector('#geo-arrival');
  const credit = section.querySelector('#geo-credit');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const rad = Math.PI / 180;
  const clamp = x => Math.max(0, Math.min(1,x));
  const mix = (a,b,t) => a+(b-a)*t;
  const smooth = x => { const t=clamp(x); return t*t*(3-2*t); };
  const destination = [-46.9212734,-19.5716529];
  const stops = [
    [.15,-53,-14,3.8], [.30,-53,-14,4.7], [.48,-45.8,-18.8,7.4],
    [.67,-46.944,-19.59,12.5], [.84,-46.922,-19.573,16], [1,...destination,19]
  ];
  const labels = {
    pt:['Terra','Brasil','Minas Gerais','Araxá','Jardim das Oliveiras','Araras Bar','Arraste para girar · Role para aproximar','Carregando mapa…','Mapa indisponível no momento.','Abrir Araras Bar no Google Maps','Percurso'],
    en:['Earth','Brazil','Minas Gerais','Araxá','Jardim das Oliveiras','Araras Bar','Drag to rotate · Scroll to zoom','Loading map…','Map currently unavailable.','Open Araras Bar in Google Maps','Journey'],
    es:['Tierra','Brasil','Minas Gerais','Araxá','Jardim das Oliveiras','Araras Bar','Arrastra para girar · Desplázate para acercarte','Cargando mapa…','Mapa no disponible.','Abrir Araras Bar en Google Maps','Recorrido']
  };
  const rangeLabel = section.querySelector('label[for="journey-range"]');
  const houseLink = model.querySelector('a');
  const houseHint = model.querySelector('figcaption');
  const houseHints = {pt:'Clique na fachada para abrir no Google Maps', en:'Click the façade to open Google Maps', es:'Pulsa la fachada para abrir Google Maps'};
  let currentLanguage;
  const fallback = [
    [[-168,66],[-142,62],[-125,52],[-124,34],[-105,20],[-86,19],[-80,8],[-78,23],[-78,35],[-60,49],[-58,55],[-78,64],[-87,76],[-125,73]],
    [[-81,9],[-73,12],[-59,9],[-48,0],[-35,-6],[-40,-19],[-52,-31],[-63,-45],[-68,-55],[-74,-44],[-73,-30],[-70,-19],[-78,-9]],
    [[-71,76],[-47,83],[-20,77],[-32,62],[-46,60],[-59,68]],
    [[-17,15],[-9,35],[11,37],[33,31],[51,11],[43,0],[39,-14],[29,-33],[19,-35],[12,-23],[10,-8],[2,5],[-9,5]],
    [[-9,37],[-8,47],[22,71],[54,69],[98,76],[155,67],[178,64],[151,50],[130,36],[110,19],[103,5],[92,21],[79,8],[68,24],[49,27],[43,13],[35,32],[19,40],[9,44]],
    [[113,-22],[122,-14],[137,-12],[150,-22],[153,-29],[146,-39],[132,-33],[115,-35]]
  ];
  function sample(rings) {
    const points=[];
    const limits=rings.map(ring=>ring.reduce((b,[x,y])=>[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)],[180,90,-180,-90]));
    for(let lat=-83;lat<84;lat+=1.7){
      const cos=Math.cos(lat*rad);
      for(let lon=-179;lon<180;lon+=1.7/Math.max(.25,cos)){
        const land=rings.some((ring,k)=>{
          const [west,south,east,north]=limits[k];
          if(lon<west||lon>east||lat<south||lat>north)return false;
          let inside=false;
          for(let i=0,j=ring.length-1;i<ring.length;j=i++){
            const [a,b]=ring[i], [c,d]=ring[j];
            if((b>lat)!==(d>lat)&&lon<(c-a)*(lat-b)/(d-b)+a)inside=!inside;
          }
          return inside;
        });
        if(land)points.push([lon*rad,Math.sin(lat*rad),cos]);
      }
    }
    return points;
  }
  let dots=sample(fallback);
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
    .then(response=>response.json()).then(data=>{
      const [sx,sy]=data.transform.scale,[tx,ty]=data.transform.translate;
      const arcs=data.arcs.map(arc=>{
        let x=0,y=0;
        return arc.map(([a,b])=>{ x+=a;y+=b;return [x*sx+tx,y*sy+ty]; });
      });
      const rings=data.objects.land.geometries.flatMap(g=>
        (g.type==='Polygon'?[g.arcs]:g.arcs).map(([outer])=>
          outer.flatMap(i=>i<0?[...arcs[~i]].reverse():arcs[i])));
      dots=sample(rings);
    }).catch(()=>{});

  let rotation=-91,inertia=0,drag=null,progress=0;
  canvas.onpointerdown=event=>{
    if(progress>.24)return;
    drag={id:event.pointerId,x:event.clientX,time:performance.now()};
    canvas.setPointerCapture(event.pointerId);
  };
  canvas.onpointermove=event=>{
    if(drag?.id!==event.pointerId)return;
    const now=performance.now(), delta=(drag.x-event.clientX)*.65;
    rotation+=delta;
    inertia=Math.max(-260,Math.min(260,delta*1000/Math.max(8,now-drag.time)));
    drag.x=event.clientX;drag.time=now;
  };
  canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=event=>{
    if(drag?.id!==event.pointerId)return;
    if(event.type==='pointercancel'||performance.now()-drag.time>90)inertia=0;
    drag=null;
  };
  canvas.onkeydown=event=>{
    if(progress>.24||!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();
    event.stopPropagation();
    rotation+=event.key==='ArrowRight'?14:-14;
  };
  function globe(x,y,r,opacity,gold){
    const align=smooth((progress-.07)/.18);
    const turn=(rotation+(((-48-rotation)%360+540)%360-180)*align)*rad;
    const tilt=mix(-7,-17,align)*rad, ct=Math.cos(tilt),st=Math.sin(tilt);
    function project(lon,n,c){
      const a=lon-turn,z=c*Math.cos(a);
      return [x+r*c*Math.sin(a),y-r*(n*ct-z*st),n*st+z*ct];
    }
    ctx.save();
    ctx.globalAlpha=opacity;
    const gradient=ctx.createRadialGradient(x-r*.4,y-r*.4,0,x,y,r);
    (gold?['#fff1aa','#eebd40','#aa7024']:['#56a6c7','#174e80','#061f40'])
      .forEach((color,i)=>gradient.addColorStop([0,.56,1][i],color));
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=gradient;ctx.fill();ctx.clip();
    ctx.strokeStyle=gold?'#634324':'#d2e2ee';
    ctx.globalAlpha=opacity*.25;ctx.lineWidth=.8;
    function grid(start,end,point){
      ctx.beginPath();
      let past=false;
      for(let i=start;i<=end;i+=3){
        const [lon,lat]=point(i);
        const [px,py,z]=project(lon*rad,Math.sin(lat*rad),Math.cos(lat*rad));
        if(z<0){past=false;continue;}
        if(past)ctx.lineTo(px,py);else ctx.moveTo(px,py);
        past=true;
      }
      ctx.stroke();
    }
    for(let lat=-60;lat<=60;lat+=30)grid(-180,180,i=>[i,lat]);
    for(let lon=-180;lon<180;lon+=30)grid(-90,90,i=>[lon,i]);
    ctx.fillStyle=gold?'#153f72':'#f5c84d';
    const size=Math.max(1,r*.017);
    for(const point of dots){
      const [px,py,z]=project(...point);
      if(z<=0)continue;
      ctx.globalAlpha=opacity*(.35+z*.65);
      ctx.fillRect(px-size/2,py-size/2,size,size);
    }
    const lat=destination[1]*rad;
    const [px,py,z]=project(destination[0]*rad,Math.sin(lat),Math.cos(lat));
    if(z>0){
      ctx.globalAlpha=opacity*clamp(z*4);
      ctx.fillStyle=gold?'#153f72':'#fff5cc';
      ctx.beginPath();ctx.arc(px,py,4.5,0,2*Math.PI);ctx.fill();
    }
    ctx.restore();
  }

  const tiles=new Map();
  function tile(level,x,y){
    const n=2**level;
    if(y<0||y>=n)return null;
    const key=[level,((x%n)+n)%n,y].join('/');
    if(!tiles.has(key)){
      if(tiles.size>400)tiles.delete(tiles.keys().next().value);
      const image=new Image();
      image.decoding='async';
      image.referrerPolicy='strict-origin-when-cross-origin';
      image.retryAt=0;image.attempt=0;
      image.onload=()=>{image.retryAt=0;image.attempt=0;};
      image.onerror=()=>{image.retryAt=performance.now()+Math.min(30000,1500*2**image.attempt++);};
      image.src='https://tile.openstreetmap.org/'+key+'.png';
      tiles.set(key,image);
    }
    const image=tiles.get(key);
    if(image.retryAt && performance.now()>image.retryAt && navigator.onLine){
      image.retryAt=0;image.src='https://tile.openstreetmap.org/'+key+'.png';
    }
    return image;
  }
  addEventListener('online',()=>{
    for(const [key,image] of tiles)if(!image.naturalWidth)tiles.delete(key);
  });
  function mercator(lon,lat){return [(lon+180)/360,(1-Math.asinh(Math.tan(lat*rad))/Math.PI)/2];}
  function cameraAt(p){
    const i=stops.findIndex(stop=>stop[0]>=p);
    if(i<=0)return stops[i===0?0:stops.length-1].slice(1);
    const a=stops[i-1],b=stops[i],t=(p-a[0])/(b[0]-a[0]);
    return [mix(a[1],b[1],t),mix(a[2],b[2],t),mix(a[3],b[3],t)];
  }
  function map(w,h,alpha,ratio){
    const [lon,lat,z]=cameraAt(progress),[cx,cy]=mercator(lon,lat);
    const anchorY = h * mix(.54,.62,smooth((progress-.80)/.19));
    const target=Math.floor(z);
    let painted=false;
    cartography.setTransform(ratio,0,0,ratio,0,0);
    cartography.clearRect(0,0,w,h);
    if (alpha > 0) {
      for(const layer of [Math.max(2,target-2),target]){
        const n=2**layer,size=256*2**(z-layer), x0=cx*n-w/2/size, y0=cy*n-anchorY/size;
        for(let y=Math.floor(y0);y<=Math.floor(y0+h/size);y++){
          for(let x=Math.floor(x0);x<=Math.floor(x0+w/size);x++){
            const image=tile(layer,x,y);
            if(!image?.naturalWidth)continue;
            cartography.drawImage(image,(x-x0)*size,(y-y0)*size,size+.7,size+.7);
            painted=true;
          }
        }
      }
    }
    const [u,v]=mercator(...destination), scale=256*2**z;
    mapPlane.style.opacity=painted?alpha:0;
    return {painted,x:w/2+(u-cx)*scale,y:anchorY+(v-cy)*scale};
  }

  function drawPin({x,y},gold,opacity) {
    ctx.save();
    ctx.globalAlpha=opacity;
    ctx.fillStyle=gold?'#193f6a':'#ffe08b';
    ctx.strokeStyle=ctx.fillStyle;
    ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(x,y,15,8,0,0,2*Math.PI);ctx.stroke();
    ctx.beginPath();ctx.arc(x,y,4,0,2*Math.PI);ctx.fill();
    ctx.restore();
  }
  let visible=false,frame=0,last=0,loadSince=0;
  function render(now){
    frame=0;
    const dt=last?Math.min(.05,(now-last)/1000):0;
    last=now;
    const w=canvas.clientWidth,h=canvas.clientHeight,d=Math.min(devicePixelRatio||1,2);
    const pw=Math.round(w*d),ph=Math.round(h*d);
    if(canvas.width!==pw||canvas.height!==ph){
      canvas.width=mapCanvas.width=pw;
      canvas.height=mapCanvas.height=ph;
    }
    if(!w||!h)return;
    ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);
    const top=parseFloat(getComputedStyle(stage).top)||0;
    progress=clamp((top-section.getBoundingClientRect().top)/Math.max(1,section.offsetHeight-stage.offsetHeight));
    if(!drag&&!motion.matches){rotation+=(15+inertia)*dt;inertia*=Math.exp(-2.6*dt);}
    const gold=document.body.classList.contains('yellow-theme'),blend=smooth((progress-.15)/.16);
    const destinationPoint = map(w,h,blend,d);
    const {painted,x,y} = destinationPoint;
    const rise = smooth((progress-.91)/.075);
    if((!painted&&rise<1)||blend<1)globe(w/2,h*.57,Math.min(w*.365,h*.19,215)*mix(1,painted?1.7:1.12,blend),painted?1-blend:1-rise,gold);
    const strings = labels[state.lang] || labels.pt;
    if (currentLanguage !== state.lang) {
      currentLanguage = state.lang;
      houseLink.setAttribute('aria-label', strings[9]);
      rangeLabel.textContent = strings[10];
      houseHint.textContent = houseHints[currentLanguage] || houseHints.pt;
    }
    const index=[.22,.39,.57,.75,.92].filter(stop=>progress>=stop).length;
    if(place.textContent!==strings[index]){
      place.textContent=strings[index];
      range.setAttribute('aria-valuetext',strings[index]);
    }
    range.value=Math.round(progress*1000);
    if(blend>0&&!painted){if(!loadSince)loadSince=now;}else loadSince=0;
    hint.hidden=painted||progress>=.92;
    const message=blend===0?strings[6]:now-loadSince>5000?strings[8]:strings[7];
    if(hint.textContent!==message)hint.textContent=message;
    arrival.hidden=progress<.92;
    credit.hidden=!painted;
    const pin = smooth((progress-.81)/.12);
    if (pin>0 && (painted || rise>0)) drawPin(destinationPoint,gold,painted?pin:rise);
    model.hidden = rise<=0;
    if (!model.hidden) {
      model.style.setProperty('--pin-x',x+'px');
      model.style.setProperty('--pin-y',y+'px');
      model.style.setProperty('--rise',rise);
    }
    canvas.style.cursor=drag?'grabbing':progress<.24?'grab':'default';
    if(visible)frame=requestAnimationFrame(render);
  }
  new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;
    if(visible&&!frame){last=0;frame=requestAnimationFrame(render);}
    else if(!visible&&frame){cancelAnimationFrame(frame);frame=0;}
  }).observe(stage);
})();

