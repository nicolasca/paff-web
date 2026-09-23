# PAFF

PAFF est un jeu de cartes et de stratégie pour deux joueurs. Chacun dirige une faction et compose une armée pour s’affronter sur un champ de bataille tactique.

Le site prépare son adaptation numérique : découvrir les cartes, construire ses decks et préparer une partie à deux en temps réel.

Le [contexte de travail](docs/contexte-projet.md) rassemble le vocabulaire, les choix d’interface et les environnements à relire pour reprendre le projet.

## Le site aujourd’hui

- Un catalogue public de trois factions, avec 10 unités chacune : Gobelins, Sephosi et Gaeli. Gaeli reprend les unités, ordres et capacités du PDF reçu le 21 septembre 2026, avec dix illustrations carrées celtiques et druidiques. Les arbitrages du 18 septembre restent appliqués aux Gobelins et Sephosi. Les Orcs sont masqués et leurs cartes retirées des decks.
- Un journal public et des profils communautaires, avec deux avatars de faction, le nombre de decks total et par faction, et le badge « Premier jour » pour les cinq membres initiaux ; voir la [mise en service](docs/journal-profils.md).
- Un espace joueur privé pour créer, consulter, renommer et supprimer ses decks.
- Une seule faction par deck, avec des quantités de cartes libres et une sauvegarde automatique.
- Un récapitulatif de la composition et des coûts pendant la construction.
- Un lobby à deux joueurs, la préparation privée, l’initiative et le déploiement sur 54 cases, puis un plateau manuel partagé avec déplacements, réserves, engagements, compteurs et dés synchronisés. Vol est pris en compte dans les déplacements ; Blop et le Grand Gardien commencent en réserve.

L’état précis du jeu et les écarts encore ouverts sont suivis dans les [règles implémentées](docs/regles-implementees.md).
Les derniers changements sont détaillés dans le [lot Gaeli du 21 septembre](docs/differences-regles-2026-09-21.md) et la [comparaison du 18 septembre](docs/differences-regles-2026-09-18.md). Les anciens documents d’équilibrage sont dans le dépôt local `paff-simulator`. Djil utilise l’illustration fournie le 20 septembre ; les Gros tarrés celle du 16 septembre.

L’univers visuel mêle illustrations de fantasy, tons sombres et titres inspirés des inscriptions anciennes.

## Choix techniques

- **React et TypeScript** pour l’interface et sa logique.
- **Vite** pour le développement et la compilation.
- **Convex et Convex Auth** pour les données, la synchronisation et les comptes joueurs.
- **Vercel** pour l’hébergement du site.

Le projet est en cours de développement ; les règles et les fonctionnalités évolueront avec les essais des joueurs.

## Salon vocal

Chaque table propose un salon vocal aux deux joueurs et, après le lancement, aux spectateurs connectés. Chacun choisit de rejoindre l’audio ; le micro reste coupé jusqu’à son activation. Le son et le micro peuvent être coupés séparément, et l’audio se ferme lorsque l’on quitte la page ou que la partie est fermée.

La voix passe par LiveKit Cloud avec l’**offre gratuite Build**, sans carte bancaire. Cette offre inclut actuellement 5 000 minutes WebRTC par mois et applique un plafond dur : l’audio n’accepte plus de nouvelles connexions une fois le quota atteint. Aucun abonnement payant n’est nécessaire pour PAFF ; vérifier les [quotas actuels](https://livekit.com/pricing) si l’usage augmente.

Créer un projet LiveKit gratuit, puis renseigner **dans chaque déploiement Convex concerné** `LIVEKIT_URL` (adresse `wss://…`), `LIVEKIT_API_KEY` et `LIVEKIT_API_SECRET`. Ne pas exposer ces deux dernières valeurs dans Vite ou dans le dépôt. Le backend vérifie l’accès à la partie avant de délivrer un jeton temporaire propre à sa table. Le développement `grateful-warthog-543` et la production `tough-gecko-249` ont des variables séparées ; configurer d’abord le développement pour les essais.

## Simulateur séparé

Les bots, l’apprentissage Python/TorchRL, les campagnes et leur tableau de bord sont désormais dans le dépôt local **`../paff-simulator`**, indépendant et sans dépôt GitHub. Les développer là-bas, sans les intégrer à la publication du site. Voir [la séparation](docs/separation-simulateur.md).

Les rapports et relectures historiques sont aussi dans `paff-simulator`. Le site ne contient plus de page d’équilibrage, de fonctions Convex ou de données de simulation.

`npm run check` vérifie le site (lint, tests, build). Pour Convex, compléter par `npx tsc --noEmit -p convex/tsconfig.json`. Le simulateur dispose de ses propres vérifications.

## Publication

Vercel exécute `npm run check` et publie l’interface lors d’un push sur `main`. Cette étape ne déploie pas les fonctions Convex et ne met pas à jour les cartes enregistrées en base.

Pour publier les changements de règles validés, déployer également Convex en production :

```sh
npx convex deploy
```

Si les profils ou les cartes du catalogue ont changé, appliquer ensuite leur mise à jour. Cette étape n’est pas nécessaire pour une modification des ordres seuls :

```sh
npx convex run catalogue2026:apply --prod
```

La production PAFF est `tough-gecko-249` ; le site Vercel doit utiliser `VITE_CONVEX_URL=https://tough-gecko-249.convex.cloud`. L’application du catalogue conserve les identités des cartes et les profils déjà copiés dans les parties préparées. Depuis le 21 septembre, elle retire explicitement toutes les cartes Orcs des decks, en conservant leurs noms et propriétaires ; les decks vidés peuvent choisir une autre faction. Les autres cartes retirées du catalogue restent dans les anciens decks, où le joueur peut les supprimer. Vérifier ensuite les cartes sur [le site public](https://paff-web.vercel.app/cards).

Une preview du lot Gaeli utilise le backend de développement `grateful-warthog-543`, distinct de la production. Synchroniser ce backend et appliquer le catalogue en développement avant de la partager. Une preview ne met pas à jour les decks de production.
