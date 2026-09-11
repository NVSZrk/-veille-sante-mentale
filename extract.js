const cheerio = require('cheerio');

// Récupère le HTML d'une page et en extrait un texte "propre" (sans nav,
// scripts, styles, etc.). Extraction volontairement simple : suffisante
// pour nourrir le résumé, pas destinée à republier l'article.
async function extractArticleText(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (VeilleSanteMentaleBot/0.1)' }
  });

  if (!res.ok) {
    throw new Error(`Impossible de récupérer l'article (HTTP ${res.status})`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  $('script, style, nav, header, footer, aside, noscript, form, iframe').remove();

  let text = $('article').text();
  if (!text || text.trim().length < 200) {
    text = $('main').text();
  }
  if (!text || text.trim().length < 200) {
    text = $('body').text();
  }

  return text.replace(/\s+/g, ' ').trim();
}

module.exports = { extractArticleText };
