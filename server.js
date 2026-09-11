require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cron = require('node-cron');
const db = require('./db');
const store = require('./store');
const usersStore = require('./users-store');
const { run: runIngestion, resummarizeAll } = require('./ingest');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ok = await usersStore.verifyPassword(email, password);

    if (!ok) {
      return res.render('login', { error: 'Identifiants incorrects.' });
    }
    const user = await usersStore.findByEmail(email);
    req.session.authenticated = true;
    req.session.email = user.email;
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// --- Dashboard ---
app.get('/', requireAuth, async (req, res, next) => {
  try {
    const { keyword, category, q, saved } = req.query;
    const articles = await store.queryArticles({ keyword, category, q, savedOnly: saved === '1' });
    const keywords = await store.getDistinctKeywords();
    const categories = await store.getDistinctCategories();

    res.render('dashboard', {
      articles,
      keywords,
      categories,
      filters: { keyword, category, q, saved },
      email: req.session.email
    });
  } catch (err) {
    next(err);
  }
});

// --- Espace favoris (raccourci vers le dashboard filtré) ---
app.get('/favoris', requireAuth, (req, res) => {
  res.redirect('/?saved=1');
});

// --- Enregistrer / retirer un article des favoris ---
app.post('/api/articles/:id/save', requireAuth, async (req, res, next) => {
  try {
    const newState = await store.toggleSaved(req.params.id);
    if (newState === null) return res.status(404).json({ ok: false, error: 'Article introuvable.' });
    res.json({ ok: true, saved: newState });
  } catch (err) {
    next(err);
  }
});

// --- Mettre à jour les notes d'un article ---
app.post('/api/articles/:id/notes', requireAuth, async (req, res, next) => {
  try {
    const ok = await store.updateNotes(req.params.id, req.body.notes);
    if (!ok) return res.status(404).json({ ok: false, error: 'Article introuvable.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
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

// --- Régénérer les résumés de tous les articles déjà en base ---
// Lancé en arrière-plan : on ne fait pas attendre la requête HTTP jusqu'à la
// fin (ça peut prendre plusieurs minutes s'il y a beaucoup d'articles), on
// confirme juste que c'est parti.
app.post('/api/resummarize', requireAuth, (req, res) => {
  resummarizeAll().catch((err) => console.error('Erreur régénération résumés :', err.message));
  res.json({ ok: true, started: true });
});

// --- Mon compte : changement de mot de passe ---
app.get('/compte', requireAuth, (req, res) => {
  res.render('compte', { email: req.session.email, error: null, success: null });
});

app.post('/compte/mot-de-passe', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    if (new_password !== confirm_password) {
      return res.render('compte', {
        email: req.session.email,
        error: 'Les deux nouveaux mots de passe ne correspondent pas.',
        success: null
      });
    }

    const result = await usersStore.changePassword(req.session.email, current_password, new_password);

    if (!result.ok) {
      return res.render('compte', { email: req.session.email, error: result.error, success: null });
    }

    res.render('compte', {
      email: req.session.email,
      error: null,
      success: 'Mot de passe mis à jour avec succès.'
    });
  } catch (err) {
    next(err);
  }
});

// --- Planification automatique (toutes les 6h par défaut) ---
const CRON_SCHEDULE = process.env.INGEST_CRON || '0 */6 * * *';
cron.schedule(CRON_SCHEDULE, () => {
  console.log('Ingestion planifiée en cours...');
  runIngestion().catch((err) => console.error('Erreur ingestion planifiée :', err));
});

// --- Démarrage : on s'assure que la base est prête avant d'accepter des requêtes ---
async function start() {
  await db.init();
  await usersStore.initUsers();
  app.listen(PORT, () => {
    console.log(`Plateforme de veille lancée sur http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Erreur au démarrage (connexion base de données ?) :', err.message);
  process.exit(1);
});
