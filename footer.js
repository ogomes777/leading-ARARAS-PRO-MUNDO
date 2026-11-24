Object.assign(translations.en, {
  footerNews: 'News from Araras', footerEmail: 'Your email', footerSubmit: 'Keep me posted',
  footerDemo: 'Sign-up preview. No email is sent.', footerExplore: 'Explore', footerVisit: 'Visit',
  footerCredit: 'BRAND STRATEGY · CREATIVE DIRECTION<br>EXPERIENCE DESIGN · DESIGN ENGINEERING'
});
Object.assign(translations.es, {
  footerNews: 'Novedades de Araras', footerEmail: 'Tu correo', footerSubmit: 'Quiero recibirlas',
  footerDemo: 'Vista previa del registro. No se envía ningún correo.', footerExplore: 'Explora', footerVisit: 'Visita',
  footerCredit: 'ESTRATEGIA DE MARCA · DIRECCIÓN CREATIVA<br>DISEÑO DE EXPERIENCIA · INGENIERÍA DE DISEÑO'
});
const footerSpin = document.getElementById('footer-spin');
footerSpin.addEventListener('click', () => {
  const paused = footerSpin.getAttribute('aria-pressed') !== 'true';
  footerSpin.setAttribute('aria-pressed', String(paused));
  footerSpin.setAttribute('aria-label', paused ? 'Retomar rotação do símbolo SET77' : 'Pausar rotação do símbolo SET77');
});
document.getElementById('footer-newsletter').addEventListener('submit', event => {
  event.preventDefault();
  document.getElementById('footer-news-status').textContent = {
    pt: 'E-mail válido. Este cadastro é uma prévia.',
    en: 'Valid email. This sign-up is a preview.',
    es: 'Correo válido. Este registro es una vista previa.'
  }[state.lang];
});

