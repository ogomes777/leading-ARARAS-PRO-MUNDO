(() => {
  const trigger=document.getElementById('portalTrigger');
  const stage=trigger.closest('.portal-stage');
  const ambient=document.getElementById('portalAmbient');
  const dialog=document.getElementById('flightDialog');
  const intro=dialog.querySelector('.portal-intro');
  const video=document.getElementById('portalIntroVideo');
  const canvas=document.getElementById('vineScene');
  const layer=document.getElementById('flightCanvas');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let renderer,frame=0,start=null,last=0,shown=0,session=0,timer=0;
  let opening=false,transitioning=false,inView=false,prepared=false;
  ambient.muted=true;
  video.muted=true;

  function playAmbient(){
    if(inView&&!dialog.open&&!document.hidden&&!reduce.matches)ambient.play().catch(()=>{});
    else ambient.pause();
  }
  function prepare(){
    if(prepared)return;
    prepared=true;
    video.preload='auto';
    video.load();
    const init=()=>{
      try{renderer=window.createVineFlight?.(canvas);canvas.hidden=!renderer;}
      catch(error){console.warn('Araras: cena indisponível',error);}
    };
    if('requestIdleCallback' in window)requestIdleCallback(init,{timeout:1000});
    else setTimeout(init,60);
  }
  new IntersectionObserver(([entry])=>{
    inView=entry.isIntersecting;
    stage.toggleAttribute('data-in-view',inView);
    playAmbient();
    if(inView)prepare();
  },{rootMargin:'180px'}).observe(stage);
  trigger.addEventListener('pointerenter',prepare,{once:true});
  trigger.addEventListener('focus',prepare,{once:true});

  function draw(now){
    frame=-1;
    if(!dialog.open||start===null||document.hidden){frame=0;return;}
    const dt=last?Math.min((now-last)/1000,.045):0;
    last=now;
    const elapsed=(now-start)/1000;
    // The opening keeps its forward velocity as the viewer takes over scrolling.
    if(!reduce.matches&&flight<100)setFlight(Math.min(100,flight+dt*(elapsed<2.5?5.8:1.1)));
    shown=reduce.matches?flight:shown+(flight-shown)*(1-Math.exp(-7*dt));
    renderer?.(shown,elapsed,reduce.matches);
    frame=reduce.matches?0:requestAnimationFrame(draw);
  }
  function resumeDraw(){
    if(!frame&&start!==null&&dialog.open&&!document.hidden){last=0;frame=requestAnimationFrame(draw);}
  }
  function handoff(){
    if(transitioning||!dialog.open)return;
    transitioning=true;
    if(!renderer){
      intro.style.setProperty('--video-zoom','1.06');
      opening=false;
      dialog.classList.remove('showing-portal');
      return;
    }
    start=performance.now();
    shown=0;
    renderer(0,0,reduce.matches);
    resumeDraw();
    layer.inert=false;
    intro.classList.add('dissolving');
    timer=setTimeout(()=>{
      if(!dialog.open)return;
      video.pause();
      intro.hidden=true;
      opening=false;
      dialog.classList.remove('showing-portal');
    },reduce.matches?0:1250);
  }
  trigger.onclick=()=>{
    if(dialog.open)return;
    prepare();
    const token=++session;
    opening=true;transitioning=false;shown=0;start=null;
    setFlight(0);
    ambient.pause();
    video.currentTime=0;
    intro.hidden=false;
    intro.classList.remove('dissolving');
    intro.style.removeProperty('--video-zoom');
    layer.inert=true;
    dialog.classList.add('showing-portal');
    dialog.showModal();
    document.getElementById('closeFlight').focus({preventScroll:true});
    video.play().catch(()=>{if(token===session)handoff();});
  };
  video.addEventListener('timeupdate',()=>{
    if(opening&&Number.isFinite(video.duration)&&video.currentTime>=video.duration-.65)handoff();
  });
  video.addEventListener('ended',handoff);
  video.addEventListener('error',()=>{if(opening)handoff();});
  layer.addEventListener('flightchange',()=>{
    if(!renderer&&transitioning)intro.style.setProperty('--video-zoom',String(1.06+flight*.004));
    resumeDraw();
  });
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    renderer=null;
    cancelAnimationFrame(frame);frame=0;
    canvas.hidden=true;
    layer.style.background="center / cover url('assets/portal-opening-last.jpg')";
  });
  dialog.addEventListener('wheel',event=>{
    if(opening&&!transitioning){event.preventDefault();event.stopImmediatePropagation();}
  },{capture:true,passive:false});
  dialog.addEventListener('keydown',event=>{
    if(opening)return;
    if(['ArrowDown','PageDown',' '].includes(event.key)){event.preventDefault();setFlight(flight+5);}
    if(['ArrowUp','PageUp'].includes(event.key)){event.preventDefault();setFlight(flight-5);}
  });
  dialog.addEventListener('close',()=>{
    session++;clearTimeout(timer);cancelAnimationFrame(frame);frame=0;start=null;
    opening=false;transitioning=false;
    video.pause();intro.hidden=true;dialog.classList.remove('showing-portal');
    playAmbient();
  });
  new ResizeObserver(()=>{if(start!==null)renderer?.(shown,(performance.now()-start)/1000,reduce.matches);}).observe(layer);
  document.addEventListener('visibilitychange',()=>{
    playAmbient();
    if(document.hidden){cancelAnimationFrame(frame);frame=0;video.pause();}
    else if(dialog.open){
      if(opening&&!transitioning)video.play().catch(handoff);
      resumeDraw();
    }
  });
  reduce.addEventListener('change',playAmbient);
})();
