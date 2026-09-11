const { pool } = require('./db');

// Insère un article s'il n'existe pas déjà (dédoublonnage par URL). Renvoie true si ajouté.
async function insertArticleIfNew(article) {
  const result = await pool.query(
    `INSERT INTO articles (title, url, source, keyword, category, published_at, summary, raw_excerpt)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (url) DO NOTHING
     RETURNING id`,
    [
      article.title,
      article.url,
      article.source || null,
      article.keyword || null,
      article.category || 'article',
      article.published_at || null,
      article.summary || null,
      article.raw_excerpt || ''
    ]
  );
  return result.rowCount > 0;
}

// Filtre + trie (plus récent en premier) + limite à 100 résultats
async function queryArticles({ keyword, category, q, savedOnly } = {}) {
  const conditions = [];
  const params = [];

  if (keyword) {
    params.push(keyword);
    conditions.push(`keyword = $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }
  if (savedOnly) {
    conditions.push('saved = TRUE');
  }
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const idx = params.length;
    conditions.push(`(LOWER(title) LIKE $${idx} OR LOWER(summary) LIKE $${idx} OR LOWER(notes) LIKE $${idx})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM articles ${where} ORDER BY created_at DESC LIMIT 100`,
    params
  );
  return result.rows;
}

function getDistinctKeywords() {
  return pool
    .query('SELECT DISTINCT keyword FROM articles WHERE keyword IS NOT NULL ORDER BY keyword')
    .then((r) => r.rows);
}

function getDistinctCategories() {
  return pool
    .query('SELECT DISTINCT category FROM articles WHERE category IS NOT NULL ORDER BY category')
    .then((r) => r.rows);
}

// Bascule l'état "enregistré" d'un article. Renvoie le nouvel état, ou null si introuvable.
async function toggleSaved(id) {
  const result = await pool.query(
    'UPDATE articles SET saved = NOT saved WHERE id = $1 RETURNING saved',
    [id]
  );
  return result.rowCount > 0 ? result.rows[0].saved : null;
}

// Met à jour les notes personnelles d'un article. Renvoie true si trouvé.
async function updateNotes(id, notes) {
  const result = await pool.query('UPDATE articles SET notes = $1 WHERE id = $2', [
    (notes || '').slice(0, 5000),
    id
  ]);
  return result.rowCount > 0;
}

// Renvoie tous les articles ayant du texte source stocké, pour régénérer leur résumé.
async function getAllForResummarize() {
  const result = await pool.query(
    "SELECT id, title, raw_excerpt FROM articles WHERE raw_excerpt IS NOT NULL AND raw_excerpt != ''"
  );
  return result.rows;
}

// Remplace le résumé stocké d'un article existant (sans toucher au reste).
async function updateSummary(id, summary) {
  await pool.query('UPDATE articles SET summary = $1 WHERE id = $2', [summary, id]);
}

module.exports = {
  insertArticleIfNew,
  queryArticles,
  getDistinctKeywords,
  getDistinctCategories,
  toggleSaved,
  updateNotes,
  getAllForResummarize,
  updateSummary
};
