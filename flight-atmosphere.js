(() => {
 const dialog=document.getElementById('flightDialog'),layer=document.getElementById('flightCanvas'),stage=document.querySelector('.portal-stage'),trigger=document.getElementById('portalTrigger');
 const latch=document.createElement('button');
 latch.type='button';latch.className='portal-latch-hit';latch.setAttribute('aria-label','Voar pelo portal');
 latch.onclick=()=>trigger.click();stage.append(latch);
 const caption=dialog.querySelector('.flight-story');
 const sound=document.createElement('button');
 sound.type='button';sound.className='flight-sound';sound.setAttribute('aria-label','Silenciar som do voo');sound.setAttribute('aria-pressed','true');
 sound.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16 8q5 4 0 8M18 5q8 7 0 14"/></svg>';
 dialog.querySelector('.flight-top').prepend(sound);
 sound.onclick=()=>{
  const on=sound.getAttribute('aria-pressed')!=='true';
  sound.setAttribute('aria-pressed',String(on));sound.setAttribute('aria-label',on?'Silenciar som do voo':'Ativar som do voo');
  if(master)master.gain.setTargetAtTime(on ? .13 : 0,context.currentTime,.15);
 };

 const landingAudio=[...document.querySelectorAll('audio')].filter(a=>!dialog.contains(a));
 let playing=[],context,noise,master,chirps,musicTimer,tones=[],visibleFacade=false,previousCaption=-1;
 function startSound(){
  playing=landingAudio.filter(a=>!a.paused);playing.forEach(a=>a.pause());
  try{
   context??=new AudioContext();context.resume();
   master=context.createGain();master.gain.value=sound.getAttribute('aria-pressed')==='true'?.13:0;master.connect(context.destination);
   const length=context.sampleRate*3,buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);
   let last=0;for(let i=0;i<length;i++){last=(last+Math.random()*.02-.01)*.985;data[i]=last;}
   noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true;
   const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=900;noise.connect(filter).connect(master);noise.start();
   function chirp(){
    if(!dialog.open)return;
    const o=context.createOscillator(),g=context.createGain(),pan=context.createStereoPanner(),now=context.currentTime;
    o.type='sine';o.frequency.setValueAtTime(1800+Math.random()*1200,now);o.frequency.exponentialRampToValueAtTime(3800,now+.09);o.frequency.exponentialRampToValueAtTime(2100,now+.21);
    g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.22,now+.035);g.gain.exponentialRampToValueAtTime(.001,now+.25);
    pan.pan.value=Math.random()*1.5-.75;o.connect(g).connect(pan).connect(master);o.start();o.stop(now+.28);
    chirps=setTimeout(chirp,1700+Math.random()*2400);
   }
   chirps=setTimeout(chirp,900);
   // Original ambient harmony, with slow attacks and a soft stereo echo.
   const delay=context.createDelay(3);delay.delayTime.value=.74;
   const feedback=context.createGain();feedback.gain.value=.28;
   delay.connect(feedback).connect(delay);delay.connect(master);
   const chords=[[146.83,220,293.66,369.99],[130.81,196,261.63,329.63],[164.81,246.94,329.63,392],[110,164.81,220,293.66]];
   let chord=0;
   function harmony(){
    if(!dialog.open)return;
    const now=context.currentTime;
    chords[chord++%chords.length].forEach((frequency,index)=>{
     const oscillator=context.createOscillator(),gain=context.createGain(),pan=context.createStereoPanner();
     oscillator.type='sine';oscillator.frequency.value=frequency;oscillator.detune.value=index%2?4:-4;
     gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.26,now+2.5);gain.gain.setTargetAtTime(0,now+5,1.6);
     pan.pan.value=(index-1.5)*.35;
     oscillator.connect(gain).connect(pan);pan.connect(master);pan.connect(delay);
     oscillator.start();oscillator.stop(now+11);tones.push(oscillator);
     oscillator.onended=()=>{tones=tones.filter(t=>t!==oscillator);oscillator.disconnect();gain.disconnect();pan.disconnect();};
    });
    musicTimer=setTimeout(harmony,7200);
   }
   harmony();

  }catch(error){console.warn('Som ambiente indisponível',error);}
 }
 function stopSound(){clearTimeout(musicTimer);tones.forEach(o=>{try{o.stop();}catch{}});tones=[];clearTimeout(chirps);noise?.stop();noise=null;master?.disconnect();playing.forEach(a=>a.play().catch(()=>{}));playing=[];}
 const messages=['A arara conhece o caminho.','Entre parreiras, um novo encontro.','Um lugar feito para receber.','O bar que voa alto.'];
 layer.addEventListener('flightchange',()=>{
  const p=Number(document.getElementById('flightProgress').value);
  const next=p>85?-1:Math.min(3,Math.floor(p/23));
  if(previousCaption!==next){caption.textContent=next<0?'':messages[next];previousCaption=next;}
  const arrived=p>=92;
  if(arrived!==visibleFacade){visibleFacade=arrived;window.showArarasFacade?.(arrived);}
 });
 const observer=new MutationObserver(()=>{
  if(dialog.open){startSound();}
  else{stopSound();visibleFacade=false;previousCaption=-1;caption.textContent='';}
 });
 observer.observe(dialog,{attributes:true,attributeFilter:['open']});
})();
