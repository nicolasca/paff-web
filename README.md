# PAFF

Application web privée de **PAFF**, future adaptation numérique d’un jeu de cartes tactique.

L’application fournit une authentification par identifiant et mot de passe pour cinq joueurs préautorisés. Il n’existe ni inscription publique, ni OAuth, ni récupération automatique du mot de passe.

## Prérequis

- Node.js `20.19+` ou `22.12+` ;
- npm ;
- un compte Convex pour relier le projet à un déploiement cloud ;
- un compte Vercel pour la mise en ligne.

## Installation

```bash
npm install
```

Initialiser ou rattacher ensuite le backend Convex :

```bash
npx convex dev
```

La commande propose de créer ou de sélectionner un projet Convex, génère les fichiers de `convex/_generated/` et écrit `.env.local`. Gardez-la active pendant le développement.

Configurer ensuite les clés Convex Auth sur ce déploiement :

```bash
npx @convex-dev/auth --web-server-url http://localhost:5173
```

Cette commande enregistre `SITE_URL`, `JWT_PRIVATE_KEY` et `JWKS` dans l’environnement sécurisé du déploiement Convex. Les clés ne sont pas écrites dans le dépôt.

Dans un second terminal, lancer le frontend :

```bash
npm run dev
```

Vite affiche l’URL locale, généralement `http://localhost:5173`.

### Développement local sans compte Convex

Convex permet aussi un backend local anonyme :

```bash
CONVEX_AGENT_MODE=anonymous npx convex dev
```

Cette option est pratique pour une vérification rapide, mais le projet doit être rattaché à un compte avant un déploiement partagé.

## Variables d’environnement

Copier `.env.example` vers `.env.local` uniquement si Convex ne l’a pas déjà créé :

```bash
cp .env.example .env.local
```

| Variable | Utilisation | Où la définir |
| --- | --- | --- |
| `CONVEX_DEPLOYMENT` | Identifie le déploiement utilisé par la CLI Convex | `.env.local`, générée par Convex |
| `VITE_CONVEX_URL` | URL publique interrogée par le client React | `.env.local` et Vercel |
| `SITE_URL` | Origine autorisée de l’application | environnement Convex, configuré par Convex Auth |
| `JWT_PRIVATE_KEY` | Signature des sessions | environnement Convex, configuré par Convex Auth |
| `JWKS` | Vérification des sessions | environnement Convex, configuré par Convex Auth |
| `PAFF_PROVISIONING_ACCOUNTS` | Lot temporaire des cinq comptes initiaux | environnement Convex, à supprimer après provisionnement |

Les fichiers locaux d’environnement sont ignorés par Git. `.env.example` ne contient que des valeurs d’exemple et peut être versionné.

## Comptes privés

### Format de provisionnement

`PAFF_PROVISIONING_ACCOUNTS` doit contenir un tableau JSON de **cinq** objets au format suivant :

```json
[
  {
    "loginId": "<identifiant>",
    "password": "<mot-de-passe-d-au-moins-12-caracteres>",
    "displayName": "<nom affiche>",
    "role": "player",
    "active": true
  }
]
```

L’exemple montre la structure d’un objet : il faut en fournir exactement cinq. Les identifiants acceptent 3 à 32 caractères (`a-z`, chiffres, point, tiret et underscore) et sont normalisés en minuscules. Le rôle est `player` ou `admin`.

Ne placez jamais cette valeur dans un fichier versionné ou directement dans une commande. Préparez le JSON dans un gestionnaire de mots de passe, copiez-le, puis utilisez l’entrée standard pour éviter l’historique du shell.

### Développement

Avec le backend de développement actif :

```bash
pbpaste | npx convex env set PAFF_PROVISIONING_ACCOUNTS
npx convex run provisioning:provisionAccounts '{}'
npx convex env remove PAFF_PROVISIONING_ACCOUNTS
```

Sous un système sans `pbpaste`, définissez temporairement la variable depuis **Convex Dashboard → Settings → Environment Variables**, lancez la fonction interne `provisioning:provisionAccounts`, puis supprimez immédiatement la variable.

Le résultat ne contient que les compteurs `created`, `existing` et `total`. La procédure est idempotente : les comptes existants sont ignorés et aucun mot de passe n’est affiché par le code applicatif.

### Production

Après avoir déployé les fonctions Convex, configurez Convex Auth avec l’URL Vercel définitive :

```bash
npx @convex-dev/auth --prod --web-server-url https://<domaine-vercel>
```

Dans le déploiement **Production** du Dashboard Convex, ajoutez temporairement `PAFF_PROVISIONING_ACCOUNTS`, puis exécutez :

```bash
npx convex run provisioning:provisionAccounts '{}' --prod
npx convex env remove PAFF_PROVISIONING_ACCOUNTS --prod
```

Vérifiez que le résultat indique `total: 5`. Une seconde exécution doit indiquer les cinq comptes dans `existing`.

### Désactiver ou réactiver un joueur

La fonction est interne et n’est donc pas appelable par le frontend :

```bash
npx convex run players:setActive '{"loginId":"<identifiant>","active":false}'
```

Ajoutez `--prod` pour la production et utilisez `true` pour réactiver le compte. La désactivation bloque immédiatement les fonctions privées côté serveur ; le frontend détruit aussi la session locale dès qu’il détecte ce statut.

### Limite actuelle des mots de passe

Il n’existe pas encore de récupération ou de modification automatique du mot de passe. Un joueur qui l’oublie doit contacter l’administrateur ; la procédure sécurisée de réinitialisation administrative sera ajoutée dans un slice ultérieur. Ne supprimez pas manuellement les tables Convex Auth pour contourner cette limite.

## Commandes utiles

```bash
npm run dev          # frontend Vite
npm run dev:backend  # backend Convex
npm run lint         # analyse statique
npm run test         # tests automatisés
npm run build        # compilation TypeScript et build de production
npm run check        # lint + tests + build
npm run preview      # aperçu local du build de production
```

## Structure

```text
convex/                 fonctions et schéma du backend
src/app/                composition de l’application et routage
src/auth/               état de session et intégration Convex Auth
src/features/           modules fonctionnels isolés
src/pages/              pages associées aux routes
src/styles/             styles globaux et fondations visuelles
src/test/               configuration des tests
```

## Déploiement

### 1. Convex

Depuis un environnement rattaché au projet Convex :

```bash
npx convex deploy
```

La commande fournit l’URL de production à utiliser pour `VITE_CONVEX_URL`.

Configurez ensuite Convex Auth et provisionnez séparément les cinq comptes de production en suivant la procédure ci-dessus.

### 2. Vercel

1. Importer ce dépôt dans Vercel.
2. Conserver le framework **Vite**, la commande `npm run build` et le dossier de sortie `dist` ; `vercel.json` les renseigne déjà.
3. Ajouter `VITE_CONVEX_URL` aux variables des environnements concernés.
4. Déployer.

La réécriture définie dans `vercel.json` renvoie les routes applicatives vers `index.html`, ce qui permet à React Router de gérer aussi les accès directs aux URL inconnues.
