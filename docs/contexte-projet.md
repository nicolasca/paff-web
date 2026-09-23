# Contexte de PAFF

Ce document rassemble les repères durables à relire à chaque nouvelle tâche. `AGENTS.md` demande cette lecture au démarrage. Maintenir ce document lorsque le produit ou la manière de travailler change.

## Produit et vocabulaire

PAFF est un jeu de cartes et de stratégie privé développé pour un groupe d’amis. L’interface est en français, avec des tons sombres, du bronze, du parchemin et des illustrations fantasy. Conserver un ton simple et personnel ; les textes exacts fournis par l’utilisateur priment sur la reformulation.

La première version jouable date du **11 septembre 2026** et comprend **Gobelins** et **Sephosi** (clé technique `sephosi`). Le lot du 21 septembre ajoute les profils définis de **Gaeli** et masque les **Orcs** ; le journal raconte l’histoire du projet et ne doit pas être déduit automatiquement de l’état courant du catalogue. Les noms et profils d’unités sont à vérifier dans `shared/catalogue2026.ts` et les données du catalogue.

Les cinq membres initiaux sont **Nicolas, Adrien, Bru, Pierre et Quentin**. Les profils sont communautaires : pas de statistiques de parties, victoires/défaites, classement, comparaison, Elo ni progression compétitive. Ne pas confondre cette contrainte avec les compteurs déjà nécessaires au déroulement d’une partie.

## Architecture et sources

- **React 19 + TypeScript, Vite, React Router**. Routes dans `src/app/App.tsx`, pages dans `src/pages/`, fonctions et composants métier dans `src/features/`.
- **Convex + Convex Auth**. `users` identifie le compte ; `playerProfiles` porte le pseudo, l’accès, l’avatar et les badges. `gamePlayers` est l’appartenance à une partie, pas une seconde identité permanente.
- **Styles et assets** : variables dans `src/styles/global.css`, navigation dans `src/components/SiteHeader.tsx`, illustrations et logo dans `public/`. Réutiliser l’existant, sans dépendances lourdes.
- **Jeu** : état courant documenté dans `docs/regles-implementees.md`. Les comparaisons de règles datées sont dans `docs/differences-regles-*.md`.
- **Journal et profils** : `docs/journal-profils.md`, `src/features/journal/entries.ts`, `shared/playerBadges.ts`, `shared/playerAvatars.ts`, `convex/players.ts`.

## Décisions d’interface

- Journal public `/journal`, dans un groupe de navigation distinct « À propos de PAFF », séparé de Cartes / Mes decks / Lobby.
- Profils `/players/:userId` réservés aux membres actifs. Avatar, pseudo, badges et **nombre de decks total et par faction** (précision utilisateur du 13 septembre 2026) ; pas de lien de retour au lobby dans le contenu du profil. Les compteurs sont calculés depuis les decks existants, sans publier leurs noms ou leur contenu et sans statistiques de parties.
- Présentation compacte des profils : petit avatar à gauche du nom, contenu près du haut, decks et badges visibles ensemble sans défilement sur les formats usuels. Le changement d’avatar s’ouvre dans une petite fenêtre modale, sans rallonger la page. Ne pas réintroduire un grand avatar central ni de grandes marges supérieures.
- Chaque membre peut changer son propre avatar : **un choix par faction, seulement Gobelins et Sephosi pour l’instant**. Gobelins utilise le shaman, Sephosi l’ange protecteur ; Gobelins est le choix par défaut. Les anciens avatars sont ramenés à ces deux choix à l’affichage, en conservant leur faction lorsqu’elle est reconnue. La mutation détermine le propriétaire depuis la session et ne permet pas de modifier les badges.
- Le badge **« Premier jour »** (`first-version`) indique la présence dès le lancement ; il est attribué explicitement aux cinq membres initiaux. Son illustration est locale. Pas de système de déblocage automatique.
- Le logo apparaît dans la navigation et comme favicon ; ne pas le dupliquer dans le bloc principal de l’accueil.
- Les futures préférences de faction/carte et les decks publics ne doivent pas apparaître comme des sections vides.

## Retours de partie du 15 septembre 2026

- Référence précédente : `PAFF 2026 (2).pdf`, 9 pages, reçue le 15 septembre. Trois profils révisés : Bande de Gobelins 2 dés ; Archers Gobelins 1 R / 2 dés ; Epéistes Sephosiens 3 DT. Valeurs versionnées dans `shared/catalogue2026.ts`, comparaison dans `docs/differences-regles-2026-09-15.md`.
- Déploiement initial : jusqu’à 21 points **sans minimum**, réserve égale au reste du deck (33 points maximum). La consigne de Nicolas autorisant 18 + 15 prime sur la limite de réserve à 12 encore présente dans le PDF. Conserver les contraintes de cases, de types et de Blop.
- Compteur Recrutement : +/− interdits au tour 1 côté interface et serveur, disponibles dès le tour 2. Calendrier de référence 2/3/4 ; les autres disponibilités et les effets restent manuels. Ne pas confondre ce compteur avec l’entrée d’une unité de réserve, qui peut provenir d’un ordre de faction.
- Spectateurs : partie visible dès son lancement, avec suivi des préparatifs sans révéler les choix privés, puis plateau public au déploiement et au combat. Toujours aucune place de joueur ni droit d’action.
- Salon vocal : un salon LiveKit par partie, accessible aux deux joueurs dès le salon d’attente et aux membres actifs qui regardent après le lancement. Tout le monde peut parler. Entrée volontaire, micro coupé au départ, commandes micro/écoute/sortie indépendantes. Les jetons sont délivrés par Convex après vérification de l’accès ; les secrets LiveKit restent dans l’environnement Convex de chaque déploiement. La fermeture ou la sortie de la page coupe la connexion locale. Le service vocal est distinct de la synchronisation de la partie. Nicolas demande exclusivement une solution gratuite : utiliser l’offre Build gratuite à plafond dur, sans abonnement payant.
- Le 23 septembre 2026, les trois variables LiveKit ont été configurées sur les Convex de développement `grateful-warthog-543` et de production `tough-gecko-249`. Les identifiants initialement montrés en clair ont été remplacés, puis les deux anciennes clés audio révoquées. Une requête en lecture seule à LiveKit a validé la nouvelle clé après révocation. Le projet LiveKit utilise le plan gratuit **Build** ; son écran de facturation affichait 0 $ au contrôle. Les fonctions Convex de production ont été déployées le même jour ; la publication de l’interface Vercel dépend du push sur `main`.
- Plateau : flancs davantage séparés, liens d’engagement rouge vif continus, aperçu de carte survolable avec capacité consultable et accès clavier. Aucun changement des coordonnées ou des déplacements.

## Règles et illustrations du 18–20 septembre 2026

**Publication réalisée le 20 septembre :** commit fonctionnel `e3ef6e395f24a52edfa58946d818b5e8cd868119` poussé sur `main`, déploiement Vercel terminé, fonctions déployées sur **tough-gecko-249** puis `catalogue2026:apply --prod` : **1 création, 19 mises à jour, 1 archivage**. Catalogue public vérifié : Djil et son image propre, Gros tarrés à 1 point avec la nouvelle image, Skrans à 2, dix Gobelins actifs. Descriptions de Recrutement, Pause-déjeuner, La gross Invokation, Tir concentré et Fureur divine relues sur le site publié. Site : 257 tests, lint, types Convex et build réussis. Nicolas demande ensuite de reprendre le simulateur plus tard ; sa copie locale est préservée, sans entraînement ni push.

Référence de cette publication : `paff-2026-09-18-arbitrages-2`, catalogue `2026-09-18-arbitrages-2`, nouvelles batailles `2026-09-18-manual-2`. Voir les [règles implémentées](regles-implementees.md) et le [diff du 18 septembre](differences-regles-2026-09-18.md) ; les arbitrages détaillés sont conservés dans `paff-simulator`. Skrans à 2 points, Gros tarrés à 1, Djil créé avec sa propre identité, Bande du Sef archivée sans conversion des decks. Les anciennes parties conservent leurs profils et ordres figés.

Le stock reçoit +3 points de recrutement aux tours 2/4/5, conservés ; les trois sélections se débloquent aux tours 2/3/4. Tir concentré exige deux tireurs par zone ; Djil est Troll sans Trollitude, exclu des sacrifices et de La gross Invokation. Seuls les dés du profil doublent ; Pluie vise les ennemis. Ligne Verte commence dans la zone suivante, ignore celle du Danzereu, et ses dégâts collatéraux ne le tuent pas. Les descriptions sont actualisées ; le plateau reste manuel. Les relances du tableau ne sont plus proposées dans l’aide, ni le surnombre dans les règles.

Nicolas fournit le 20 septembre `Image Codex 20 sept. 2026, 12_17_35.png` pour Djil : gobelin dirigeant des Trolls. Conversion WebP sans recadrage sous `public/cards/gobelins/gobelins-djil-meneur-de-trolls.webp`, distincte des Trolls ordinaires. Les Gros tarrés reprennent l’image fournie le 16 septembre au chemin existant.

## Gaeli et retrait des Orcs — 21 septembre 2026

Source : **PAFF 2026 (4).pdf** transmis par Nicolas, p. 7 (ordres), p. 8 (unités), p. 9 (capacités). Catalogue `2026-09-21-gaeli-1`, nouvelles batailles `2026-09-21-manual-1`. Les arbitrages du 18 septembre concernant les Gobelins/Sephosi restent prioritaires sur les formulations anciennes encore présentes dans le PDF. [Détail du lot](differences-regles-2026-09-21.md).

- Trois factions actives de dix unités chacune : Gobelins, Sephosi, Gaeli. Quatre ordres et cinq capacités Gaeli ajoutés. Les Druides et les Gardiens des Cen' ont zéro dé et aucune attaque malgré leur type Tir.
- Le Grand Gardien commence obligatoirement en réserve, avec contrôle à chaque étape de préparation. Les conditions de sa charge et les autres effets Gaeli sont consultables et appliqués manuellement, comme les autres effets du jeu.
- Quatre identités Gaeli conservées : Combattants des Vlands, Druides, Esprits des Bois, Chefs de Clan de la Gaeli. Six nouvelles unités ; Sorl Caleit et les anciennes cartes Action Gaeli archivés. Les anciennes références Gaeli restent retirables dans les decks.
- **Orcs : masqués, non sélectionnables, toutes leurs cartes supprimées des decks**, même celles déjà archivées. Les decks vidés conservent leur nom/propriétaire et peuvent choisir une nouvelle faction. Les cartes source sont archivées et les copies des parties existantes restent intactes. Un import historique ne doit pas réactiver les Orcs.
- **Illustrations obligatoirement carrées 1:1**, précision de Nicolas dans cette conversation. Direction Gaeli : celtique, druidique, énergie et tatouages bleus. Sept nouvelles illustrations et trois recompositions carrées des visuels existants, en WebP sans recadrage supplémentaire. Les descriptions artistiques du PDF servent seulement aux images. Les prompts et chemins sont conservés dans [le manifeste](illustrations-gaeli-2026-09-21.json). Le générateur intégré n’expose pas de sélecteur de version du modèle.
- Nicolas autorise explicitement, pour cette conversation, le push GitHub et le déploiement/vérification d’une **preview accessible à Adrien**, sans nouvelle confirmation. La preview cible le développement ; cette demande ne publie pas le lot sur `main` ni les données de production.

Développement **grateful-warthog-543** synchronisé et catalogue appliqué : **6 créations, 24 mises à jour, 12 archivages, 1 faction désactivée, 13 entrées Orcs retirées de 2 decks**. Deuxième application : tous les compteurs à zéro. Catalogue public local : trois factions et dix Gaeli, illustrations carrées et ordres consultables. Aucun changement de données en production.

Le 22 septembre, Nicolas remplace les Archers longs Gaeliens par `Image Codex 22 sept. 2026, 10_49_29.png`, les Longues Lames par `Image Codex 22 sept. 2026, 10_54_23.png` et les Druides par `Image Codex 22 sept. 2026, 11_03_23.png`. Conversion en WebP sans recadrage aux chemins existants, carré 1:1 conservé.

Le 23 septembre, les Esprits des Bois reprennent `Image Codex 23 sept. 2026, 05_01_43.png`, les Servlanders la dernière version fournie `Image Codex 23 sept. 2026, 09_24_47.png` (volutes bleues), et le Grand Gardien `Image Codex 23 sept. 2026, 08_52_21.png` (grand cerf). Même conversion WebP sans recadrage ni redimensionnement, en carré 1:1.

La bannière Gaeli reçoit une accroche dédiée : « Les clans se lèvent. La forêt répond. », la devise « Clans · Esprits · Puissance druidique » et l’illustration du Grand Gardien.

Le journal annonce « La Gaeli rejoint PAFF » à la date du **24 septembre 2026**, choisie explicitement par Nicolas, qui confirme l’orthographe « Gaeli ». Après la revue locale, Nicolas autorise le 23 septembre la fusion de ce lot sur `main`, la fermeture de la preview et sa publication en production, y compris la mise à jour de Convex.

## Simulateur indépendant — décision du 20 septembre

Nicolas autorise la publication des règles/unités/illustrations du site et demande que les expérimentations se poursuivent dans **`/Users/nicolasca/Documents/workspace/paff-simulator`**, dépôt local sans GitHub. Ne plus développer les bots ici. Extraction des sources, modèles, dashboard, résultats et caches vérifiée ; historique et état non commité sauvegardés. [Organisation et reprise](separation-simulateur.md).

Les anciennes branches `codex/simulateur-v3` et `codex/bot-apprentissage` sont conservées localement mais ne sont pas fusionnées pour publier le site. Le nouveau lot de publication part de `main` et reprend seulement les changements du site. Les modules `shared/` du simulateur sont des copies autonomes : synchroniser explicitement les futures règles, avec leurs empreintes, sans modifier les références D historiques.

Le 23 septembre 2026, Nicolas confirme que le simulateur ne doit plus être dans `paff-web`. La route `/admin/equilibrage`, sa page, ses fonctions Convex, son droit d’accès, les copies de rapports `data/simulation/`, le dossier local `analysis/` et les anciens documents `docs/equilibrage/` sont retirés du site. Ces ressources restent dans `paff-simulator`. Aucune statistique de joueur n’est créée.

## Environnements et travail local

Le dossier habituel de Nicolas est `/Users/nicolasca/Documents/workspace/paff-web`. Travailler dedans, sur une branche `codex/<sujet>`, et laisser les diffs consultables avant commit. Une nouvelle conversation doit être ouverte dans ce projet pour charger son `AGENTS.md` ; un échange sans accès au dépôt ne récupère pas automatiquement ces fichiers.

- Développement Convex configuré localement : `grateful-warthog-543`. Au contrôle du 13 septembre 2026, il contient Nicolas, Adrien et le compte de test Nicolas 2.
- Production Convex : `tough-gecko-249`. Au même contrôle, elle contient les cinq comptes initiaux. Toujours relire l’état réel avant une écriture ; ne pas supposer que les données de développement et de production sont identiques.
- Site public : <https://paff-web.vercel.app>. Vercel construit et publie l’interface depuis `main`, avec `npm run check` ; cela ne déploie pas Convex.
- Ne pas publier ni intégrer une branche implicitement. Une demande explicite d’attribution de badges autorise la mise à jour des profils ciblés, en conservant identifiants, accès, avatars choisis et autres données.

### Procédure de développement

La configuration locale vérifiée le 13 septembre 2026 contient `CONVEX_DEPLOYMENT=dev:grateful-warthog-543` et `VITE_CONVEX_URL=https://grateful-warthog-543.convex.cloud`. Relire ces deux valeurs à la reprise et vérifier qu’aucune variable de déploiement du processus ne change la cible ; ne jamais imprimer de clé ni de mot de passe.

| Besoin | Commande et cible |
| --- | --- |
| Synchroniser les fonctions, le schéma et les types pour essayer une fonctionnalité | `npx convex dev --once` : instance de développement configurée, puis arrêt de la commande. |
| Travailler avec synchronisation continue du backend | `npx convex dev` : instance de développement configurée. |
| Ouvrir l’interface locale | `npm run dev` : Vite utilise `VITE_CONVEX_URL`. |
| Lire l’état de service en développement | `npx convex run health:check` : requête sans modification de données. |
| Exécuter une fonction pour un essai en développement | `npx convex run module:fonction '…'` : vérifier si la fonction lit ou modifie les données et utiliser les identifiants réellement présents en dev. |
| Publier le backend en production lorsque demandé | `npx convex deploy` : production du projet, **pas** l’instance de développement indiquée par `.env.local`. |
| Exécuter une fonction en production lorsque demandé | `npx convex run module:fonction '…' --prod`. |

`npx convex deploy --dry-run` reste une simulation de déploiement vers la cible de `deploy` ; ce n’est ni un test hors réseau ni une synchronisation de la dev. Référence : [CLI Convex](https://docs.convex.dev/cli/overview), sections développement et déploiement ; options vérifiées dans la version installée du CLI.

Pour les badges, l’initialisation des cinq membres du lancement exige leurs cinq profils existants. Leur absence en dev ne bloque pas l’essai du profil, de l’avatar ou du rendu d’un badge sur un compte de développement existant. Suivre `docs/journal-profils.md` et garder l’attribution aux cinq comptes de production comme une étape distincte.

### Reprise entre conversations et permissions

Les repères durables vont dans `AGENTS.md` et ce document ; l’état d’une fonctionnalité va dans sa documentation dédiée. Indiquer l’environnement réellement utilisé, ce qui a été vérifié, ce qui a été publié et ce qui reste à faire. Un résultat en mémoire, en dev ou en production ne prouve pas les deux autres.

À la reprise d’une conversation déjà ouverte, relire ces fichiers depuis le disque. Tant que les modifications ne sont pas commitées puis intégrées, elles ne sont disponibles que dans la copie de travail qui les contient. La lecture des instructions au démarrage est décrite dans la [documentation Codex sur AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

Une restriction de permissions est indépendante de ces documents. Après un refus, distinguer un déploiement de production refusé d’un accès réseau de développement également refusé. Continuer le travail indépendant qui reste autorisé et rapporter le motif exact pour les étapes bloquées ; ne pas changer d’outil pour exécuter l’action refusée. La réussite d’un déploiement dans une ancienne session ne garantit pas les permissions d’une nouvelle session.

## Vérifications

`npm run check` : lint, tests unitaires/fonctionnels et build. `npx tsc --noEmit -p convex/tsconfig.json` : backend strict. Les tests fonctionnels utilisent les vrais handlers et écrans, avec transport et base en mémoire ; compléter par un essai réseau lorsque le lot le nécessite.
