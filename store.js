const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'articles.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]', 'utf-8');

function loadArticles() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function saveArticles(articles) {
  fs.writeFileSync(FILE, JSON.stringify(articles, null, 2), 'utf-8');
}

let nextId = 1;
function initNextId() {
  const arts = loadArticles();
  nextId = arts.reduce((max, a) => Math.max(max, a.id || 0), 0) + 1;
}
initNextId();

// Insère un article s'il n'existe pas déjà (dédoublonnage par URL). Renvoie true si ajouté.
function insertArticleIfNew(article) {
  const articles = loadArticles();
  if (articles.some((a) => a.url === article.url)) return false;

  articles.push({
    id: nextId++,
    title: article.title,
    url: article.url,
    source: article.source || null,
    keyword: article.keyword || null,
    category: article.category || 'article',
    published_at: article.published_at || null,
    summary: article.summary || null,
    raw_excerpt: article.raw_excerpt || '',
    created_at: new Date().toISOString()
  });

  saveArticles(articles);
  return true;
}

// Filtre + trie (plus récent en premier) + limite à 100 résultats
function queryArticles({ keyword, category, q } = {}) {
  let articles = loadArticles();

  if (keyword) articles = articles.filter((a) => a.keyword === keyword);
  if (category) articles = articles.filter((a) => a.category === category);
  if (q) {
    const needle = q.toLowerCase();
    articles = articles.filter(
      (a) =>
        (a.title || '').toLowerCase().includes(needle) ||
        (a.summary || '').toLowerCase().includes(needle)
    );
  }

  articles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return articles.slice(0, 100);
}

function getDistinctKeywords() {
  const set = new Set(loadArticles().map((a) => a.keyword).filter(Boolean));
  return [...set].sort().map((keyword) => ({ keyword }));
}

function getDistinctCategories() {
  const set = new Set(loadArticles().map((a) => a.category).filter(Boolean));
  return [...set].sort().map((category) => ({ category }));
}

module.exports = {
  insertArticleIfNew,
  queryArticles,
  getDistinctKeywords,
  getDistinctCategories
};
