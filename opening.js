(()=>{
 const journey=document.querySelector('.opening-journey');
 const stage=journey.querySelector('.opening-stage');
 const deck=stage.querySelector('.deck');
 const header=document.querySelector('#experience > header');
 const cards=[...deck.querySelectorAll('.card')];
 const exit=stage.querySelector('.opening-continue');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const angles=[-7,5,-4,8,-5],heights=[-9,14,-15,10,-4];
 let desired=0,position=0,frame=0,last=0,drag=null,inView=false;
 function labels(){
  const lang=document.documentElement.lang;
  const translations={
   en:['Our home.','Made to share.','A toast.','Art on the street.','Our corner of Araxá.'],
   es:['Nuestra casa.','Para compartir.','Un brindis.','Arte en la calle.','Nuestro rincón de Araxá.']
  };
  cards.forEach((card,index)=>{
   const caption=card.querySelector('figcaption'),text=translations[lang]?.[index]??card.dataset.title;
   caption.setAttribute('aria-label',text);caption.textContent='';
   Array.from(text).forEach((letter,i)=>{
    const span=document.createElement('span');span.setAttribute('aria-hidden','true');span.textContent=letter===' '?' ':letter;
    span.style.setProperty('--letter-delay',i*.018+'s');caption.append(span);
   });
  });
  exit.setAttribute('aria-label',lang==='en'?'Continue to the next section':lang==='es'?'Continuar a la siguiente sección':'Continuar para a próxima seção');
 }
 function layout(){
  document.documentElement.style.setProperty('--header-offset',header.offsetHeight+'px');
  const rect=stage.getBoundingClientRect();
  const visibleTop=Math.max(rect.top,header.offsetHeight);
  const visibleHeight=Math.max(100,Math.min(rect.bottom,innerHeight)-visibleTop);
  stage.style.setProperty('--opening-visible-height',visibleHeight+'px');
  stage.style.setProperty('--opening-center-y',(Math.max(0,visibleTop-rect.top)+visibleHeight*.45)+'px');
  const hiddenBottom=Math.max(0,rect.bottom-innerHeight);
  exit.style.bottom=(20+hiddenBottom)+'px';request();
 }
 function render(now){
  frame=0;
  const dt=last?Math.min((now-last)/1000,.05):.016;last=now;
  position=reduced.matches?desired:position+(desired-position)*(1-Math.exp(-dt*8));
  const width=cards[0].offsetWidth,spacing=width+Math.max(48,width*.25);
  cards.forEach((card,index)=>{
   const offset=((index-position+cards.length/2)%cards.length+cards.length)%cards.length-cards.length/2;
   const depth=Math.abs(offset),active=index===((Math.round(position)%cards.length+cards.length)%cards.length);
   card.style.transform='translate(-50%,-50%) translate('+offset*spacing+'px,'+(heights[index]+depth*12)+'px) rotate('+(angles[index]+offset*4)+'deg) scale('+(1-Math.min(depth,2)*.08)+')';
   card.style.opacity=String(Math.max(0,Math.min(1,(cards.length/2-depth)/.35)));
   card.style.zIndex=String(10-Math.round(depth*3));
   card.setAttribute('aria-hidden',String(!active));
   card.style.setProperty('--word-opacity',active?'1':'0');
   card.style.setProperty('--word-y',active?'0px':'8px');
  });
  if(inView&&Math.abs(desired-position)>.001)frame=requestAnimationFrame(render);
  else last=0;
 }
 function request(){if(!frame)frame=requestAnimationFrame(render);}
 function move(delta){
  desired+=delta;
  if(Math.abs(desired)>1000){
   const cycles=Math.trunc(desired/cards.length)*cards.length;
   desired-=cycles;position-=cycles;
  }
  request();
 }
 stage.addEventListener('wheel',event=>{
  if(document.querySelector('dialog[open]'))return;
  event.preventDefault();
  const top=journey.getBoundingClientRect().top;
  if(top>header.offsetHeight+2)window.scrollTo({top:scrollY+top-header.offsetHeight,behavior:'instant'});
  const factor=event.deltaMode===1?16:event.deltaMode===2?400:1;
  const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
  move(Math.max(-180,Math.min(180,delta*factor))*.0035);
 },{passive:false});
 deck.onpointerdown=event=>{
  drag={id:event.pointerId,x:event.clientX,y:event.clientY};
  deck.setPointerCapture(event.pointerId);
 };
 deck.onpointermove=event=>{
  if(drag?.id!==event.pointerId)return;
  const x=event.clientX-drag.x,y=event.clientY-drag.y;
  move(-(Math.abs(x)>Math.abs(y)?x:y)/Math.max(180,deck.clientWidth*.46));
  drag.x=event.clientX;drag.y=event.clientY;
 };
 deck.onpointerup=deck.onpointercancel=()=>{
  drag=null;desired=Math.round(desired);request();
 };
 stage.addEventListener('keydown',event=>{
  if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();move(['ArrowDown','ArrowRight'].includes(event.key)?1:-1);
 });
 exit.onclick=event=>{
  event.preventDefault();
  const next=document.getElementById('voo');
  window.scrollTo({top:scrollY+next.getBoundingClientRect().top-header.offsetHeight,behavior:reduced.matches?'instant':'smooth'});
  document.getElementById('portalTrigger').focus({preventScroll:true});
 };
 addEventListener('scroll',layout,{passive:true});
 addEventListener('resize',()=>{layout();request();});
 new ResizeObserver(()=>{layout();request();}).observe(header);
 new IntersectionObserver(([entry])=>{
  inView=entry.isIntersecting;stage.classList.toggle('is-in-view',inView);
  if(inView)request();else{cancelAnimationFrame(frame);frame=0;last=0;}
 }).observe(stage);
 new MutationObserver(()=>{labels();request();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 reduced.addEventListener('change',request);
 labels();layout();request();
})();

(() => {
  const tracks = [
    { title: 'Eyes Without a Face', artist: 'Billy Idol', file: 'assets/eyes-without-a-face.mp3', source: 'https://youtu.be/9OFpfTd0EIs', credit: 'Ver no YouTube' },
    { title: 'AcidJazz', artist: 'Kevin MacLeod', file: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Kevin_MacLeod_-_AcidJazz.ogg', source: 'https://commons.wikimedia.org/wiki/File:Kevin_MacLeod_-_AcidJazz.ogg', credit: 'Créditos · CC BY 3.0' }
  ];
  const suggestions = [
    ['Ordinary World', 'Duran Duran'],
    ['Everybody Wants to Rule the World', 'Tears for Fears'],
    ['Never Tear Us Apart', 'INXS'],
    ['More Than This', 'Roxy Music'],
    ['Thinking of You', 'Sister Sledge'],
    ['Do I Do', 'Stevie Wonder']
  ];
  const radio = document.querySelector('#radio');
  const speaker = document.querySelector('#audioToggle');
  const find = selector => radio.querySelector(selector);
  const audio = find('audio');
  const play = find('.play');
  const seek = find('.seek');
  const note = find('.note');
  const wave = find('.wave');
  const meter = [...speaker.querySelectorAll('.speaker-meter i')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let playing = false;
  let attempted = false;
  let frame = 0;
  let context;
  let analyser;
  let samples;

  const bars = Array.from({ length: 35 }, () => wave.appendChild(document.createElement('i')));
  const buttons = tracks.map(({ title }, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = title;
    button.onclick = () => select(index, true);
    return find('.slots').appendChild(button);
  });
  for (const [title, artist] of suggestions) {
    const link = document.createElement('a');
    link.href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(artist + ' ' + title);
    link.textContent = artist + ' – ' + title;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    find('.suggestions').append(link);
  }
  function draw(time = 0) {
    frame = 0;
    const live = playing && !motion.matches;
    if (live && analyser) analyser.getByteFrequencyData(samples);
    const levelAt = (bin, index) => live
      ? (analyser ? samples[bin] / 255 : .4 + .3 * Math.sin(time / (170 + index * 18) + index))
      : .22;
    meter.forEach((bar, index) => {
      const level = Math.max(.26, Math.min(1, levelAt([2, 8, 17][index], index) * 1.4));
      bar.style.transform = 'scaleY(' + level + ')';
    });
    if (!radio.hidden) bars.forEach((bar, index) => {
      const taper = Math.sin(Math.PI * (index + .5) / bars.length);
      bar.style.setProperty('--level', taper * Math.max(.13, levelAt(index + 2, index)));
    });
    if (live) frame = requestAnimationFrame(draw);
  }
  function redraw() {
    cancelAnimationFrame(frame);
    draw(performance.now());
  }
  function syncProgress() {
    const available = Number.isFinite(audio.duration) && audio.duration > 0;
    seek.disabled = !available;
    seek.value = available ? Math.round(1000 * audio.currentTime / audio.duration) : 0;
  }
  function setPlaying(value) {
    playing = value;
    speaker.dataset.playing = String(value);
    play.textContent = value ? 'Pausar' : 'Tocar';
    redraw();
  }
  function start() {
    attempted = true;
    note.textContent = '';
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!context && AudioContext) {
      try {
        context = new AudioContext();
        const spectrum = context.createAnalyser();
        spectrum.fftSize = 256;
        spectrum.connect(context.destination);
        context.createMediaElementSource(audio).connect(spectrum);
        analyser = spectrum;
        samples = new Uint8Array(analyser.frequencyBinCount);
      } catch {
        analyser = undefined;
      }
    }
    context?.resume().catch(() => {});
    audio.play().catch(error => {
      if (error.name === 'AbortError') return;
      if (error.name === 'NotAllowedError') attempted = false;
      note.textContent = 'Toque em Tocar para iniciar o áudio.';
    });
  }
  function select(index, shouldPlay) {
    if (index !== current || !audio.getAttribute('src')) {
      current = index;
      setPlaying(false);
      audio.src = tracks[current].file;
      syncProgress();
    }
    const { title, artist, source, credit } = tracks[current];
    find('.number').textContent = (current + 1) + ' / ' + tracks.length;
    find('h3').textContent = title;
    find('.artist').textContent = artist;
    const link = find('.source');
    link.href = source;
    link.textContent = credit;
    buttons.forEach((button, i) => button.setAttribute('aria-current', String(current === i)));
    if (shouldPlay) start();
  }
  function move(step, shouldPlay) {
    select((current + step + tracks.length) % tracks.length, shouldPlay);
  }
  function toggle(open) {
    radio.hidden = !open;
    speaker.setAttribute('aria-expanded', String(open));
    speaker.setAttribute('aria-label', open ? 'Fechar Playlist Araras' : 'Abrir Playlist Araras');
    (open ? find('.close') : speaker).focus({ preventScroll: true });
    redraw();
  }
  document.addEventListener('click', event => {
    if (event.isTrusted && !attempted && !radio.contains(event.target)) start();
  }, { capture: true });
  speaker.onclick = () => toggle(radio.hidden);
  document.querySelector('#menuSound').onclick = () => {
    document.querySelector('#menu').close();
    toggle(true);
  };
  find('.close').onclick = () => toggle(false);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !radio.hidden) toggle(false);
  });
  find('.back').onclick = () => move(-1, true);
  find('.next').onclick = () => move(1, true);
  play.onclick = () => {
    if (audio.paused) start();
    else audio.pause();
  };
  audio.addEventListener('playing', () => setPlaying(true));
  for (const event of ['pause', 'waiting', 'error']) {
    audio.addEventListener(event, () => setPlaying(false));
  }
  audio.addEventListener('ended', () => move(1, true));
  for (const event of ['timeupdate', 'loadedmetadata', 'emptied']) {
    audio.addEventListener(event, syncProgress);
  }
  seek.oninput = () => {
    if (!seek.disabled) audio.currentTime = Number(seek.value) * audio.duration / 1000;
  };
  motion.addEventListener('change', redraw);
  select(0, false);
})();



