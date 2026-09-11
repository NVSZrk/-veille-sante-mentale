require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const cheerio = require('cheerio');
const store = require('./store');
const { extractArticleText } = require('./extract');
const { summarize } = require('./summarize');

const parser = new Parser();
const feedsPath = path.join(__dirname, 'config', 'feeds.json');

// Les flux Google Alerts encodent parfois deux fois les caractères spéciaux
// (ex: l'apostrophe devient "&#39;" au lieu de "'"). On les décode proprement.
function decodeEntities(str) {
  if (!str) return str;
  return cheerio.load(`<div>${str}</div>`, { decodeEntities: true })('div').text();
}

async function ingestFeed(feed) {
  if (!feed.rss_url || feed.rss_url.startsWith('REMPLACER_PAR_URL')) {
    console.log(`[skip] "${feed.keyword}" : aucune URL de flux configurée dans config/feeds.json`);
    return;
  }

  console.log(`[fetch] ${feed.keyword} -> ${feed.rss_url}`);
  const parsed = await parser.parseURL(feed.rss_url);

  for (const item of parsed.items) {
    const title = decodeEntities(item.title);

    let text = '';
    try {
      text = await extractArticleText(item.link);
    } catch (err) {
      console.warn(`  ! extraction impossible pour ${item.link} : ${err.message}`);
    }

    const summary = await summarize(title, text || item.contentSnippet || '');

    const added = await store.insertArticleIfNew({
      title: title,
      url: item.link,
      source: decodeEntities(item.creator || parsed.title || null),
      keyword: feed.keyword,
      category: feed.category || 'article',
      published_at: item.pubDate || null,
      summary: decodeEntities(summary),
      raw_excerpt: decodeEntities((text || item.contentSnippet || '').slice(0, 2000))
    });

    if (added) console.log(`  + ajouté : ${title}`);
  }
}

async function run() {
  const feeds = JSON.parse(fs.readFileSync(feedsPath, 'utf-8'));
  for (const feed of feeds) {
    try {
      await ingestFeed(feed);
    } catch (err) {
      console.error(`[erreur] flux "${feed.keyword}" :`, err.message);
    }
  }
  console.log('Ingestion terminée.');
}

// Régénère le résumé de tous les articles déjà en base, à partir du texte
// déjà stocké (raw_excerpt). N'appelle pas les flux RSS, ne retélécharge rien.
async function resummarizeAll() {
  const articles = await store.getAllForResummarize();
  let count = 0;
  for (const a of articles) {
    try {
      const summary = await summarize(decodeEntities(a.title), a.raw_excerpt);
      await store.updateSummary(a.id, decodeEntities(summary));
      count++;
    } catch (err) {
      console.error(`[erreur] résumé article #${a.id} :`, err.message);
    }
  }
  console.log(`${count} résumé(s) régénéré(s).`);
  return count;
}

if (require.main === module) {
  const db = require('./db');
  db.init()
    .then(() => run())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Erreur :', err.message);
      process.exit(1);
    });
}

module.exports = { run, resummarizeAll };
