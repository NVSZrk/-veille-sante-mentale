require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const store = require('./store');
const { extractArticleText } = require('./extract');
const { summarize } = require('./summarize');

const parser = new Parser();
const feedsPath = path.join(__dirname, 'config', 'feeds.json');

async function ingestFeed(feed) {
  if (!feed.rss_url || feed.rss_url.startsWith('REMPLACER_PAR_URL')) {
    console.log(`[skip] "${feed.keyword}" : aucune URL de flux configurée dans config/feeds.json`);
    return;
  }

  console.log(`[fetch] ${feed.keyword} -> ${feed.rss_url}`);
  const parsed = await parser.parseURL(feed.rss_url);

  for (const item of parsed.items) {
    let text = '';
    try {
      text = await extractArticleText(item.link);
    } catch (err) {
      console.warn(`  ! extraction impossible pour ${item.link} : ${err.message}`);
    }

    const summary = await summarize(item.title, text || item.contentSnippet || '');

    const added = store.insertArticleIfNew({
      title: item.title,
      url: item.link,
      source: item.creator || parsed.title || null,
      keyword: feed.keyword,
      category: feed.category || 'article',
      published_at: item.pubDate || null,
      summary: summary,
      raw_excerpt: (text || item.contentSnippet || '').slice(0, 2000)
    });

    if (added) console.log(`  + ajouté : ${item.title}`);
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

if (require.main === module) {
  run().then(() => process.exit(0));
}

module.exports = { run };
