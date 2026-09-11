# PAFF

PAFF est un jeu de cartes et de stratégie pour deux joueurs. Chacun dirige une faction et compose une armée pour s’affronter sur un champ de bataille tactique.

Le site prépare son adaptation numérique : découvrir les cartes, construire ses decks et préparer une partie à deux en temps réel.

## Le site aujourd’hui

- Un catalogue public réparti entre quatre factions, dont 10 unités Gobelins et 10 unités Sephosi avec les profils et capacités du PDF reçu le 10 septembre 2026.
- Un espace joueur privé pour créer, consulter, renommer et supprimer ses decks.
- Une seule faction par deck, avec des quantités de cartes libres et une sauvegarde automatique.
- Un récapitulatif de la composition et des coûts pendant la construction.
- Un lobby à deux joueurs, la préparation privée, l’initiative et le déploiement sur 54 cases, puis un plateau manuel partagé avec déplacements, réserves, engagements, compteurs et dés synchronisés. Vol est pris en compte dans les déplacements ; Blop commence en réserve.

L’état précis du jeu et les écarts encore ouverts sont suivis dans les [règles implémentées](docs/regles-implementees.md).
Les changements du dernier PDF, dont les huit ordres de faction finalisés, sont détaillés dans la [comparaison du 11 septembre](docs/differences-regles-2026-09-11.md).

L’univers visuel mêle illustrations de fantasy, tons sombres et titres inspirés des inscriptions anciennes.

## Choix techniques

- **React et TypeScript** pour l’interface et sa logique.
- **Vite** pour le développement et la compilation.
- **Convex et Convex Auth** pour les données, la synchronisation et les comptes joueurs.
- **Vercel** pour l’hébergement du site.

Le projet est en cours de développement ; les règles et les fonctionnalités évolueront avec les essais des joueurs.

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

La production PAFF est `tough-gecko-249` ; le site Vercel doit utiliser `VITE_CONVEX_URL=https://tough-gecko-249.convex.cloud`. L’application du catalogue conserve les identités des cartes et les decks, ainsi que les profils déjà copiés dans les parties préparées. Vérifier ensuite les cartes sur [le site public](https://paff-web.vercel.app/cards).
