# PAFF

Socle web de **PAFF**, future adaptation numérique d’un jeu de cartes tactique privé.

Ce premier slice fournit une application React responsive, un routage avec page 404, et un indicateur de connexion alimenté par une fonction Convex. Il ne contient aucune fonctionnalité métier.

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

Les fichiers locaux d’environnement sont ignorés par Git. `.env.example` ne contient que des valeurs d’exemple et peut être versionné.

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

### 2. Vercel

1. Importer ce dépôt dans Vercel.
2. Conserver le framework **Vite**, la commande `npm run build` et le dossier de sortie `dist` ; `vercel.json` les renseigne déjà.
3. Ajouter `VITE_CONVEX_URL` aux variables des environnements concernés.
4. Déployer.

La réécriture définie dans `vercel.json` renvoie les routes applicatives vers `index.html`, ce qui permet à React Router de gérer aussi les accès directs aux URL inconnues.
