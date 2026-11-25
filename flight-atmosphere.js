(() => {
 const dialog=document.getElementById('flightDialog');
 const layer=document.getElementById('flightCanvas');
 const stage=document.querySelector('.portal-stage');
 const trigger=document.getElementById('portalTrigger');
 const video=document.getElementById('portalIntroVideo');
 const caption=dialog.querySelector('.flight-story');
 const latch=document.createElement('button');
 latch.type='button';latch.className='portal-latch-hit';latch.setAttribute('aria-label','Voar pelo portal');
 latch.onclick=()=>trigger.click();stage.append(latch);

 const sound=document.createElement('button');
 sound.type='button';sound.className='flight-sound';
 sound.setAttribute('aria-label','Silenciar som do voo');sound.setAttribute('aria-pressed','true');
 sound.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16 8q5 4 0 8M18 5q8 7 0 14"/></svg>';
 dialog.querySelector('.flight-top').prepend(sound);

 const landingAudio=[...document.querySelectorAll('audio')].filter(audio=>!dialog.contains(audio));
 const music=document.createElement('audio');
 music.id='flightMusic';music.src='assets/flight-maybe-in-another-life.mp3';
 music.preload='none';music.loop=true;music.hidden=true;
 music.setAttribute('aria-label','Trilha do voo · maybe in another life');
 dialog.append(music);

 let playing=[],context,output,master,noise,musicBus,effectBus,openingBus,windBuffer;
 let chirps,musicTimer,tones=[],sessionSources=new Set(),previousCaption=-1,takeoff=false,resumeMusic=false;
 const playedCues=new Set();
 function remember(source,cleanup){
  sessionSources.add(source);
  source.onended=()=>{sessionSources.delete(source);cleanup();};
 }
 function setupAudio(){
  if(context)return;
  const AudioEngine=window.AudioContext||window.webkitAudioContext;
  context=new AudioEngine();
  output=context.createGain();
  const limiter=context.createDynamicsCompressor();
  limiter.threshold.value=-10;limiter.ratio.value=4;limiter.attack.value=.012;limiter.release.value=.22;
  output.connect(limiter).connect(context.destination);
  musicBus=context.createGain();musicBus.gain.value=0;musicBus.connect(output);
  openingBus=context.createGain();openingBus.gain.value=.55;openingBus.connect(output);
  effectBus=context.createGain();effectBus.gain.value=.35;effectBus.connect(output);
  context.createMediaElementSource(music).connect(musicBus);
  context.createMediaElementSource(video).connect(openingBus);
  windBuffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate);
  const data=windBuffer.getChannelData(0);
  let last=0;
  for(let i=0;i<data.length;i++){last=(last+Math.random()*.02-.01)*.985;data[i]=last;}
 }
 function syncMute(){
  const on=sound.getAttribute('aria-pressed')==='true';
  sound.setAttribute('aria-label',on?'Silenciar som do voo':'Ativar som do voo');
  if(context)output.gain.setTargetAtTime(on?1:0,context.currentTime,.12);
 }
 sound.onclick=()=>{
  const on=sound.getAttribute('aria-pressed')!=='true';
  sound.setAttribute('aria-pressed',String(on));syncMute();
  if(on&&dialog.open){context?.resume();music.play().catch(()=>{});}
 };

 function tone(frequency,endFrequency,duration,volume,type='sine'){
  const now=context.currentTime,oscillator=context.createOscillator(),gain=context.createGain();
  oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,now);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency,now+duration);
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  oscillator.connect(gain).connect(effectBus);oscillator.start();oscillator.stop(now+duration+.02);
  remember(oscillator,()=>{oscillator.disconnect();gain.disconnect();});
 }
 function rustle(duration,frequency,volume){
  const now=context.currentTime,source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
  source.buffer=windBuffer;source.loop=true;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.65;
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.045);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  source.connect(filter).connect(gain).connect(effectBus);source.start();source.stop(now+duration+.02);
  remember(source,()=>{source.disconnect();filter.disconnect();gain.disconnect();});
 }
 // Cues follow the video clock, including pauses and repeated openings.
 const cues=[
  {at:.18,play:()=>{tone(1750,890,.10,.45,'triangle');rustle(.12,2100,2.2);}},
  {at:.74,play:()=>{tone(420,150,.19,.34,'triangle');rustle(.24,900,2.0);}},
  {at:1.23,play:()=>{tone(128,68,1.85,.16,'triangle');rustle(2.2,380,2.3);}},
  {at:3.7,play:()=>rustle(2.1,1250,2.6)}
 ];
 video.addEventListener('timeupdate',()=>{
  if(!dialog.open||!context)return;
  for(const cue of cues){
   if(!playedCues.has(cue.at)&&video.currentTime>=cue.at){
    playedCues.add(cue.at);
    if(video.currentTime-cue.at<.45)cue.play();
   }
  }
 });

 function startSound(){
  playing=landingAudio.filter(audio=>!audio.paused);playing.forEach(audio=>audio.pause());
  previousCaption=-1;takeoff=false;playedCues.clear();updateStory();
  try{
   setupAudio();context.resume();syncMute();
   music.currentTime=0;musicBus.gain.cancelScheduledValues(context.currentTime);musicBus.gain.value=0;
   // Start silently in the trusted click so the track is ready at takeoff.
   music.play().catch(()=>{});
   master=context.createGain();master.gain.value=.11;master.connect(output);
   noise=context.createBufferSource();noise.buffer=windBuffer;noise.loop=true;
   const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=900;
   noise.connect(filter).connect(master);noise.start();
   function chirp(){
    if(!dialog.open)return;
    if(!document.hidden){
     const oscillator=context.createOscillator(),gain=context.createGain(),pan=context.createStereoPanner(),now=context.currentTime;
     oscillator.frequency.setValueAtTime(1800+Math.random()*1200,now);
     oscillator.frequency.exponentialRampToValueAtTime(3800,now+.09);oscillator.frequency.exponentialRampToValueAtTime(2100,now+.21);
     gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.22,now+.035);
     gain.gain.exponentialRampToValueAtTime(.001,now+.25);pan.pan.value=Math.random()*1.5-.75;
     oscillator.connect(gain).connect(pan).connect(master);oscillator.start();oscillator.stop(now+.28);
     remember(oscillator,()=>{oscillator.disconnect();gain.disconnect();pan.disconnect();});
    }
    chirps=setTimeout(chirp,1700+Math.random()*2400);
   }
   chirps=setTimeout(chirp,900);
   const delay=context.createDelay(3),feedback=context.createGain();
   delay.delayTime.value=.74;feedback.gain.value=.28;delay.connect(feedback).connect(delay);delay.connect(master);
   const chords=[[146.83,220,293.66,369.99],[130.81,196,261.63,329.63],[164.81,246.94,329.63,392],[110,164.81,220,293.66]];
   let chord=0;
   function harmony(){
    if(!dialog.open)return;
    const now=context.currentTime;
    chords[chord++%chords.length].forEach((frequency,index)=>{
     const oscillator=context.createOscillator(),gain=context.createGain(),pan=context.createStereoPanner();
     oscillator.type='sine';oscillator.frequency.value=frequency;oscillator.detune.value=index%2?4:-4;
     gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.26,now+2.5);gain.gain.setTargetAtTime(0,now+5,1.6);
     pan.pan.value=(index-1.5)*.35;oscillator.connect(gain).connect(pan);pan.connect(master);pan.connect(delay);
     oscillator.start();oscillator.stop(now+11);tones.push(oscillator);
     oscillator.onended=()=>{tones=tones.filter(tone=>tone!==oscillator);oscillator.disconnect();gain.disconnect();pan.disconnect();};
    });
    musicTimer=setTimeout(harmony,7200);
   }
   harmony();
  }catch(error){console.warn('Som do voo indisponível',error);}
 }
 function stopSound(){
  clearTimeout(musicTimer);clearTimeout(chirps);
  music.pause();music.currentTime=0;resumeMusic=false;
  tones.forEach(oscillator=>{try{oscillator.stop();}catch{}});tones=[];
  sessionSources.forEach(source=>{try{source.stop();}catch{}});sessionSources.clear();
  if(noise){noise.stop();noise.disconnect();noise=null;}
  master?.disconnect();context?.suspend();
  playing.forEach(audio=>audio.play().catch(()=>{}));playing=[];
  previousCaption=-1;caption.textContent='';
 }
 dialog.addEventListener('flightstart',startSound);
 dialog.addEventListener('flighttakeoff',()=>{
  if(!context||takeoff)return;
  takeoff=true;music.currentTime=0;music.play().catch(()=>{});
  const now=context.currentTime;
  musicBus.gain.cancelScheduledValues(now);musicBus.gain.setValueAtTime(0,now);
  musicBus.gain.linearRampToValueAtTime(.32,now+2.8);
 });
 dialog.addEventListener('close',stopSound);

 const messages={
  pt:[
   'Se puder, coloque os fones. Sinta o voo.',
   'Uma homenagem à arara que deu nome à nossa casa.',
   'Na lembrança, ela volta para casa.',
   'Siga o voo. O encontro está logo adiante.',
   'O sabor de Minas espera por você.',
   'Queijo Canastra. Receitas com a nossa assinatura.',
   'Drinks autorais. Novas histórias à mesa.',
   'Um lugar feito para receber.',
   'Araras. O bar que voa alto.'
  ],
  en:['Put on your headphones, if you can. Feel the flight.','A tribute to the macaw that gave our home its name.','In our memories, she flies home.','Follow the flight. A new encounter is just ahead.','The taste of Minas is waiting for you.','Canastra cheese. Recipes with our signature.','Original cocktails. New stories at the table.','A place made to welcome you.','Araras. The bar that soars.'],
  es:['Si puedes, ponte los auriculares. Siente el vuelo.','Un homenaje a la guacamaya que dio nombre a nuestra casa.','En el recuerdo, vuelve a casa.','Sigue el vuelo. El encuentro está cerca.','El sabor de Minas te espera.','Queso Canastra. Recetas con nuestra firma.','Cócteles de autor. Nuevas historias a la mesa.','Un lugar hecho para recibirte.','Araras. El bar que vuela alto.']
 };
 function updateStory(){
  const p=Number(document.getElementById('flightProgress').value);
  const next=p>96?-1:[8,28,45,60,66,72,78,84].filter(stop=>p>=stop).length;
  const language=state.lang||'pt',key=language+next;
  if(previousCaption!==key){caption.textContent=next<0?'':(messages[language]||messages.pt)[next];previousCaption=key;}
 }
 layer.addEventListener('flightchange',updateStory);
 new MutationObserver(updateStory).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 document.addEventListener('visibilitychange',()=>{
  if(!dialog.open||!context)return;
  if(document.hidden){resumeMusic=!music.paused;music.pause();context.suspend();}
  else{context.resume();if(resumeMusic)music.play().catch(()=>{});}
 });
})();
