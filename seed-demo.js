require('dotenv').config();
// Insère quelques articles fictifs pour visualiser la plateforme
// avant d'avoir configuré de vrais flux Google Alerts.
const db = require('./db');
const store = require('./store');

const demo = [
  {
    title: "Santé mentale au travail : les entreprises face à l'urgence du sujet",
    url: 'https://example.com/article-demo-1',
    source: 'Les Echos',
    keyword: 'santé mentale au travail',
    category: 'article',
    published_at: new Date().toISOString(),
    summary: "L'article revient sur la montée des arrêts liés à l'épuisement professionnel en France et interroge plusieurs DRH sur les dispositifs mis en place. Il souligne le rôle croissant de la prévention primaire face aux risques psychosociaux.",
    raw_excerpt: ''
  },
  {
    title: 'Interview : « La QVCT ne doit pas rester un supplément d\u2019âme »',
    url: 'https://example.com/article-demo-2',
    source: 'Le Monde',
    keyword: 'QVCT',
    category: 'interview',
    published_at: new Date(Date.now() - 86400000).toISOString(),
    summary: "Une psychologue du travail explique pourquoi la qualité de vie et des conditions de travail doit être intégrée aux décisions stratégiques et non traitée comme une action ponctuelle de communication interne.",
    raw_excerpt: ''
  },
  {
    title: 'Risques psychosociaux : ce que dit la nouvelle recommandation de l\u2019Anact',
    url: 'https://example.com/article-demo-3',
    source: 'Anact',
    keyword: 'risques psychosociaux',
    category: 'presse',
    published_at: new Date(Date.now() - 172800000).toISOString(),
    summary: "L'Anact publie un guide actualisé sur l'identification des risques psychosociaux en entreprise, avec une grille d'auto-diagnostic destinée aux PME et un focus sur le rôle du management de proximité.",
    raw_excerpt: ''
  }
];

async function run() {
  await db.init();
  let count = 0;
  for (const a of demo) {
    if (await store.insertArticleIfNew(a)) count++;
  }
  console.log(`${count} article(s) de démonstration inséré(s).`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
