require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
const store = require('./store');
const { run: runIngestion } = require('./ingest');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@holismose.fr';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'changez-moi', 10);

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-moi-dans-le-.env',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 } // 8h
  })
);

// --- Middleware d'authentification ---
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  return res.redirect('/login');
}

// --- Routes d'authentification ---
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const ok = email === ADMIN_EMAIL && bcrypt.compareSync(password || '', ADMIN_PASSWORD_HASH);
  if (!ok) {
    return res.render('login', { error: 'Identifiants incorrects.' });
  }
  req.session.authenticated = true;
  req.session.email = email;
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// --- Dashboard ---
app.get('/', requireAuth, (req, res) => {
  const { keyword, category, q } = req.query;
  const articles = store.queryArticles({ keyword, category, q });
  const keywords = store.getDistinctKeywords();
  const categories = store.getDistinctCategories();

  res.render('dashboard', {
    articles,
    keywords,
    categories,
    filters: { keyword, category, q },
    email: req.session.email
  });
});

// --- Déclenchement manuel de l'ingestion ---
app.post('/api/ingest', requireAuth, async (req, res) => {
  try {
    await runIngestion();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Planification automatique (toutes les 6h par défaut) ---
const CRON_SCHEDULE = process.env.INGEST_CRON || '0 */6 * * *';
cron.schedule(CRON_SCHEDULE, () => {
  console.log('Ingestion planifiée en cours...');
  runIngestion().catch((err) => console.error('Erreur ingestion planifiée :', err));
});

app.listen(PORT, () => {
  console.log(`Plateforme de veille lancée sur http://localhost:${PORT}`);
});
