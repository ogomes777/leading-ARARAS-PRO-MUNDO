(()=>{
const journey = document.querySelector('.opening-journey');
const stage = journey.querySelector('.opening-stage');
const header = document.querySelector('#experience > header');
const cards = [...document.querySelectorAll('.card')];
const indicator = document.querySelector('.progress span');
const caption = document.querySelector('.opening-title em');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let frame = 0;
let headerHeight = 0;

function render() {
  frame = 0;
  const top = header.offsetHeight;
  if (top !== headerHeight) {
    headerHeight = top;
    document.documentElement.style.setProperty('--header-offset', `${top}px`);
  }
  const travel = Math.max(1, journey.offsetHeight - stage.offsetHeight);
  const distance = headerHeight - journey.getBoundingClientRect().top;
  const progress = Math.max(0, Math.min(1, distance / travel));
  const position = progress * (cards.length - 1);
  const spacing = Math.min(stage.clientWidth * .29, 300);
  const focus = Math.round(position);
  const translations = {
    en: ['Our home.', 'Made to share.', 'A toast.', 'Art on the street.', 'Our corner of Araxá.'],
    es: ['Nuestra casa.', 'Para compartir.', 'Un brindis.', 'Arte en la calle.', 'Nuestro rincón de Araxá.']
  };
  const title = translations[document.documentElement.lang]?.[focus] ?? cards[focus].dataset.title;
  if (caption.textContent !== title) caption.textContent = title;

  cards.forEach((card, index) => {
    const distance = index - (reduced.matches ? focus : position);
    const offset = Math.max(-1.55, Math.min(1.55, distance));
    const depth = Math.abs(offset);
    card.style.transform = `translate(-50%, -50%) translate(${offset * spacing}px, ${depth * 24}px) rotate(${offset * 11}deg) scale(${1 - depth * .18})`;
    card.style.opacity = String(depth < 1.55 ? Math.max(0, 1 - Math.abs(distance) * .64) : 0);
    card.style.zIndex = String(100 - Math.round(depth * 50));
    card.setAttribute('aria-hidden', String(index !== focus));
  });
  indicator.style.transform = `scaleX(${progress})`;
}
function scheduleRender() {
  if (!frame) frame = requestAnimationFrame(render);
}
addEventListener('scroll', scheduleRender, { passive: true });
addEventListener('resize', scheduleRender);
reduced.addEventListener('change', scheduleRender);
render();
if ('ResizeObserver' in window) new ResizeObserver(scheduleRender).observe(header);

new MutationObserver(scheduleRender).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
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
