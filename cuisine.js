(()=>{
 const updates={
  pt:{flavorKicker:'EXPERIÊNCIA GASTRONÔMICA',flavorTitle:'O sabor de Minas.<br><em>Do jeito do Araras.</em>',flavorIntro:'Receitas mineiras, porções originais e o queijo da Canastra que dá identidade à nossa cozinha.',navFlavors:'Experiência gastronômica'},
  en:{flavorKicker:'GASTRONOMIC EXPERIENCE',flavorTitle:'The taste of Minas.<br><em>The Araras way.</em>',flavorIntro:'Original sharing dishes and Canastra cheese at the heart of our kitchen.',navFlavors:'Gastronomic experience'},
  es:{flavorKicker:'EXPERIENCIA GASTRONÓMICA',flavorTitle:'El sabor de Minas.<br><em>Al estilo Araras.</em>',flavorIntro:'Recetas de Minas, porciones originales y queso Canastra en nuestra cocina.',navFlavors:'Experiencia gastronómica'}
 };
 Object.entries(updates).forEach(([language,values])=>Object.assign(translations[language],values));
 const food=document.getElementById('pairing-food'),drink=document.getElementById('pairing-drink');
 function update(){document.getElementById('pairing-result').textContent=food.value+' + '+drink.value;}
 food.onchange=drink.onchange=update;update();render();
})();
