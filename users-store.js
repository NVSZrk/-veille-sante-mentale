const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'users.json');

function loadUsersFromDisk() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function saveUsers(users) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// Construit la liste des comptes attendus à partir des variables d'environnement :
// ADMIN_EMAIL/ADMIN_PASSWORD (compte principal), puis USER_1_EMAIL/USER_1_PASSWORD,
// USER_2_EMAIL/USER_2_PASSWORD, etc.
function usersFromEnv() {
  const users = [];

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@holismose.fr').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'changez-moi';
  users.push({ email: adminEmail, passwordHash: bcrypt.hashSync(adminPassword, 10) });

  let i = 1;
  while (process.env[`USER_${i}_EMAIL`]) {
    const email = process.env[`USER_${i}_EMAIL`].toLowerCase();
    const password = process.env[`USER_${i}_PASSWORD`] || 'changez-moi';
    users.push({ email, passwordHash: bcrypt.hashSync(password, 10) });
    i++;
  }

  return users;
}

// Initialise data/users.json au démarrage : ajoute les comptes définis dans les
// variables d'environnement s'ils n'existent pas encore, SANS écraser un mot de
// passe déjà changé depuis la plateforme pour un compte existant.
function initUsers() {
  const envUsers = usersFromEnv();
  const diskUsers = loadUsersFromDisk() || [];

  envUsers.forEach((envUser) => {
    const exists = diskUsers.some((u) => u.email === envUser.email);
    if (!exists) diskUsers.push(envUser);
  });

  saveUsers(diskUsers);
  return diskUsers;
}

initUsers();

function findByEmail(email) {
  const users = loadUsersFromDisk() || [];
  return users.find((u) => u.email === (email || '').toLowerCase().trim());
}

function verifyPassword(email, password) {
  const user = findByEmail(email);
  if (!user) return false;
  return bcrypt.compareSync(password || '', user.passwordHash);
}

// Change le mot de passe d'un utilisateur après vérification de l'actuel.
// Renvoie { ok: true } ou { ok: false, error: '...' }.
function changePassword(email, currentPassword, newPassword) {
  const users = loadUsersFromDisk() || [];
  const user = users.find((u) => u.email === (email || '').toLowerCase().trim());

  if (!user) return { ok: false, error: 'Utilisateur introuvable.' };
  if (!bcrypt.compareSync(currentPassword || '', user.passwordHash)) {
    return { ok: false, error: 'Le mot de passe actuel est incorrect.' };
  }
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' };
  }

  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  saveUsers(users);
  return { ok: true };
}

module.exports = { findByEmail, verifyPassword, changePassword };
