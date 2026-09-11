const bcrypt = require('bcryptjs');
const { pool } = require('./db');

// Construit la liste des comptes attendus à partir des variables d'environnement :
// ADMIN_EMAIL/ADMIN_PASSWORD (compte principal), puis USER_1_EMAIL/USER_1_PASSWORD,
// USER_2_EMAIL/USER_2_PASSWORD, etc.
function usersFromEnv() {
  const users = [];

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@holismose.fr').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'changez-moi';
  users.push({ email: adminEmail, password: adminPassword });

  let i = 1;
  while (process.env[`USER_${i}_EMAIL`]) {
    const email = process.env[`USER_${i}_EMAIL`].toLowerCase();
    const password = process.env[`USER_${i}_PASSWORD`] || 'changez-moi';
    users.push({ email, password });
    i++;
  }

  return users;
}

// Crée en base les comptes définis dans les variables d'environnement s'ils
// n'existent pas déjà. N'écrase JAMAIS le mot de passe d'un compte déjà
// présent (pour ne pas effacer un mot de passe changé depuis la plateforme).
async function initUsers() {
  const envUsers = usersFromEnv();
  for (const u of envUsers) {
    const passwordHash = bcrypt.hashSync(u.password, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING`,
      [u.email, passwordHash]
    );
  }
}

async function findByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [
    (email || '').toLowerCase().trim()
  ]);
  return result.rows[0] || null;
}

async function verifyPassword(email, password) {
  const user = await findByEmail(email);
  if (!user) return false;
  return bcrypt.compareSync(password || '', user.password_hash);
}

// Change le mot de passe d'un utilisateur après vérification de l'actuel.
// Renvoie { ok: true } ou { ok: false, error: '...' }.
async function changePassword(email, currentPassword, newPassword) {
  const user = await findByEmail(email);

  if (!user) return { ok: false, error: 'Utilisateur introuvable.' };
  if (!bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return { ok: false, error: 'Le mot de passe actuel est incorrect.' };
  }
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' };
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [newHash, user.email]);
  return { ok: true };
}

module.exports = { initUsers, findByEmail, verifyPassword, changePassword };
