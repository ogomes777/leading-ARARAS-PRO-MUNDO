(()=>{
 const menu=document.getElementById('menu');
 function decorate(){
  menu.querySelectorAll('nav a,nav button').forEach((link,index)=>{
   const text=link.querySelector('.menu-current')?.textContent??link.textContent;
   link.setAttribute('aria-label',text);
   const roll=document.createElement('span');roll.className='menu-roll';
   roll.setAttribute('aria-hidden','true');roll.style.setProperty('--item',index);
   for(const name of ['menu-current','menu-next']){
    const line=document.createElement('span');line.className=name;
    Array.from(text).forEach((letter,i)=>{
     const span=document.createElement('span');span.textContent=letter;
     span.style.setProperty('--roll-delay',Math.abs(i-(text.length-1)/2)*.035+'s');
     line.append(span);
    });
    roll.append(line);
   }
   link.replaceChildren(roll);
  });
 }
 const previousRender=render;
 render=()=>{previousRender();decorate();};
 render();
 menu.addEventListener('close',()=>{if(document.getElementById('radio').hidden&&!document.querySelector('dialog[open]'))document.getElementById('menuToggle').focus({preventScroll:true});});
})();


