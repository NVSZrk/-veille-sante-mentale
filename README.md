# Veille — Santé mentale au travail

Plateforme sécurisée qui centralise les interviews, articles de presse et
publications sur la santé mentale au travail, détectés via Google Alerts,
avec résumé automatique de chaque article.

## Ce que contient cette première version

- Authentification (email + mot de passe, session sécurisée)
- Tableau de bord filtrable par mot-clé, catégorie, recherche texte
- Script d'ingestion : lit des flux RSS Google Alerts → récupère le texte de
  chaque article → génère un résumé → stocke tout en base SQLite
- Résumé automatique via l'API Claude (si une clé est configurée), avec un
  repli simple si aucune clé n'est fournie
- Bouton "Actualiser maintenant" + planification automatique (cron) toutes
  les 6h par défaut
- Charte graphique inspirée du secteur bien-être/QVCT (vert sauge, crème,
  terracotta) — **à ajuster avec les vraies couleurs/polices de votre site**
  (voir la note plus bas)

## Démarrage rapide

```bash
npm install
cp .env.example .env      # puis éditez .env (identifiants admin, etc.)
npm start
```

Ouvrez http://localhost:3000 — connectez-vous avec l'email/mot de passe
définis dans `.env` (ou les valeurs par défaut si vous n'avez rien changé).

Pour voir tout de suite à quoi ressemble le tableau de bord avec des
articles d'exemple :

```bash
node seed-demo.js
```

## Configurer vos vrais flux Google Alerts

1. Sur https://www.google.com/alerts, créez une alerte par mot-clé
   ("santé mentale au travail", "QVCT", "risques psychosociaux"...).
2. Dans "Options" → "Livrer via", choisissez **Flux RSS** (pas e-mail).
3. Copiez l'URL du flux généré.
4. Collez-la dans `config/feeds.json` à la place de
   `REMPLACER_PAR_URL_FLUX_GOOGLE_ALERTS_x`.
5. Lancez l'ingestion manuellement (`node ingest.js`) ou via le bouton
   "Actualiser maintenant" une fois connecté.

## Limites à connaître (première version)

- **Extraction de contenu** : fonctionne bien sur des pages simples ; les
  sites de presse avec paywall ou fort JavaScript peuvent échouer. Dans ce
  cas l'article reste visible mais sans résumé riche.
- **Droits d'auteur** : la plateforme n'affiche que le résumé + un lien vers
  l'article original, jamais le texte intégral — à conserver pour rester
  dans un usage raisonnable au regard du droit d'auteur.
- **Un seul compte admin** créé automatiquement au premier lancement. Pour
  plusieurs utilisateurs, il faudra ajouter une gestion multi-comptes.
- **Base SQLite** : très bien pour démarrer, à migrer vers PostgreSQL si le
  volume ou le nombre d'utilisateurs grossit.

## Charte graphique — à propos de holismose.fr

Je n'ai pas pu extraire automatiquement les couleurs exactes et la police
du site (le contenu de la page m'est accessible en texte mais pas sa
feuille de style). J'ai donc appliqué une palette cohérente avec
l'univers du site (vert sauge, crème, touche terracotta), à ajuster.

Pour un rendu fidèle, le plus simple : donnez-moi les codes couleur
(hexadécimaux) et le nom de la police utilisés sur holismose.fr — ou
collez-moi un extrait du CSS du site — et j'ajuste `public/css/style.css`
en conséquence.

## Déploiement

Toute plateforme Node.js convient (Railway, Render, VPS classique). Pensez
à définir les variables d'environnement du `.env` sur la plateforme choisie,
et à changer `SESSION_SECRET` et le mot de passe admin par défaut.
