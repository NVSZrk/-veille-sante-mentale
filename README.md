# Veille — Santé mentale au travail

Plateforme sécurisée qui centralise les interviews, articles de presse et
publications sur la santé mentale au travail, détectés via Google Alerts,
avec résumé automatique de chaque article.

## Fonctionnalités

- Authentification (email + mot de passe, session sécurisée)
- Plusieurs comptes possibles, chacun avec son propre identifiant
- Chaque personne peut changer son mot de passe depuis "Mon compte"
- Tableau de bord filtrable par mot-clé, catégorie, recherche texte
- Espace "Mes favoris" : marquer les articles intéressants (⭐), avec un
  champ de notes personnelles par article (sauvegarde automatique)
- Script d'ingestion : lit des flux RSS Google Alerts → récupère le texte de
  chaque article → génère un résumé → stocke tout dans un fichier JSON local
- Résumé automatique via l'API Claude (si une clé est configurée), avec un
  repli simple si aucune clé n'est fournie
- Bouton "Actualiser maintenant" + planification automatique (cron) toutes
  les 6h par défaut
- Charte graphique inspirée du secteur bien-être/QVCT (vert sauge, crème,
  terracotta) — voir la note en fin de document

## Démarrage rapide (en local)

```bash
npm install
cp .env.example .env      # puis éditez .env (identifiants admin, etc.)
npm start
```

Sous Windows, sans terminal : double-cliquez sur `lancer-le-site.bat`.

Ouvrez http://localhost:3000 et connectez-vous avec l'email/mot de passe
définis dans `.env`. Pour voir tout de suite à quoi ressemble le tableau
de bord avec des articles d'exemple :

```bash
node seed-demo.js
```

## Configurer vos vrais flux Google Alerts

1. Sur https://www.google.com/alerts, créez une alerte par mot-clé
   ("santé mentale au travail", "QVCT", "risques psychosociaux"...).
2. Dans "Livrer à", choisissez **Flux RSS** (pas e-mail).
3. Clic droit sur l'icône RSS orange de l'alerte → "Copier l'adresse du lien".
4. Collez cette URL dans `config/feeds.json`, à la place de
   `REMPLACER_PAR_URL_FLUX_GOOGLE_ALERTS_x`.
5. Lancez l'ingestion manuellement (`node ingest.js`) ou via le bouton
   "Actualiser maintenant" une fois connecté.

## Ajouter plusieurs comptes

En plus du compte principal (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), ajoutez des
variables d'environnement supplémentaires (sur Render : Environment →
Add Environment Variable) :

```
USER_1_EMAIL=collegue@example.com
USER_1_PASSWORD=motdepasse2

USER_2_EMAIL=autrepersonne@example.com
USER_2_PASSWORD=motdepasse3
```

Numérotez à la suite (`USER_1_`, `USER_2_`...). Chaque personne peut ensuite
changer son propre mot de passe depuis "Mon compte" une fois connectée — la
variable d'environnement ne sert alors plus qu'à créer le compte au tout
premier démarrage.

## Configurer la base de données (obligatoire)

Cette version stocke tout dans une vraie base de données PostgreSQL, pour
que les articles, favoris, notes et mots de passe survivent aux
redémarrages/redéploiements. Il faut une base PostgreSQL accessible via une
URL de connexion, dans la variable d'environnement `DATABASE_URL`.

**Option recommandée : Neon (gratuit, sans carte bancaire)**

1. Allez sur https://neon.tech → "Sign up" (avec GitHub par exemple).
2. Créez un nouveau projet (nom libre).
3. Sur le tableau de bord du projet, copiez la "Connection string" affichée
   (commence par `postgresql://...`).
4. Collez-la comme valeur de `DATABASE_URL` :
   - en local, dans votre fichier `.env`
   - sur Render, dans Environment → Add Environment Variable

Au premier démarrage, la plateforme crée automatiquement les tables
nécessaires — rien d'autre à faire manuellement.

## Limites à connaître

- **Extraction de contenu** : fonctionne bien sur des pages simples ; les
  sites de presse avec paywall ou fort JavaScript peuvent échouer. Dans ce
  cas l'article reste visible mais sans résumé riche.
- **Droits d'auteur** : la plateforme n'affiche que le résumé + un lien vers
  l'article original, jamais le texte intégral.
- **Tous les comptes partagent le même tableau de bord** et les mêmes
  favoris — il n'y a pas de favoris "privés" par personne pour l'instant.

## Charte graphique — à propos de holismose.fr

Les couleurs exactes du site n'ont pas pu être extraites automatiquement.
La palette actuelle (vert sauge, crème, touche terracotta) est une
approximation cohérente avec l'univers du site. Pour un rendu fidèle,
donnez les codes couleur hexadécimaux exacts et la police utilisée, ou un
extrait du CSS du site, et `public/css/style.css` sera ajusté en conséquence.

## Déploiement

Toute plateforme Node.js convient (Render, VPS classique...). Définissez les
variables d'environnement du `.env` sur la plateforme choisie, et changez
`SESSION_SECRET` et le mot de passe admin par défaut.
