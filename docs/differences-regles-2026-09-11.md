# Comparaison des exports du 10 et du 11 septembre 2026

Sources : `PAFF 2026.pdf` transmis le 10 septembre et `PAFF 2026 (1).pdf` transmis le 11 septembre, 10 pages chacun. Comparaison textuelle de toutes les pages, avec vérification visuelle des tableaux d’ordres, d’unités et de capacités.

## Changements des règles générales

Le nouvel astérisque après Recrutement p. 2 renvoie à une précision ajoutée en haut de la p. 3 : **premier recrutement accessible à partir du tour 3, deuxième à partir du tour 4, troisième à partir du tour 5**.

Le total reste de trois sélections par partie, à trois points chacune. Le cumul de deux ou trois cartes reste possible pour six ou neuf points dans une même phase, en respectant leur disponibilité. Les recrues peuvent suivre d’autres ordres mais ne peuvent pas tirer pendant ce tour (p. 7).

Les autres différences des pages 1–6 sont des sauts de page : début du paragraphe Tir des unités de type Artillerie déplacé en p. 4 ; titre Conditions de victoire déplacé en p. 6. Budgets, quotas, préparation, mouvement, tir, combat, événements et conditions de victoire sont inchangés. Le texte p. 2 annonce encore « trois ordres » alors que la liste en compte quatre ; l’application conserve les quatre entrées explicites.

## Ordres finalisés — page 7

| Faction | Ordre | Catégorie du PDF | Limite |
| --- | --- | --- | --- |
| Gobelins | Tiens, des gobelins... | Commun | Illimité |
| Gobelins | Invokation shamanique | Avancé | 4 |
| Gobelins | Pause-déjeuner | Rare | 2 |
| Gobelins | La gross Invokation ! | Unique | 1 |
| Sephosi | Repli stratégique | Commun | Illimité |
| Sephosi | Tir concentré | Avancé | 4 |
| Sephosi | Fureur divine | Rare | 2 |
| Sephosi | Protéger la Salamandre ! | Unique | 1 |

Ces huit lignes sont marquées OK. Elles remplacent les lignes provisoires, dont Déchainement Shamanique et WAAAGGGHHH. Le nouveau texte d’Invokation shamanique est un tir renforcé suivi d’un jet ; l’ancien effet de Déchainement sur un allié n’est pas réutilisé. Les quatre ordres communs restent Mouvement, Tir, Tir Artillerie et Recrutement.

Les catégories et limites sont désormais cohérentes avec la p. 3 : illimité, quatre, deux et une sélection. « Commun » dans une ligne Gobelins ou Sephosi n’étend pas l’ordre aux autres factions. Chaque joueur obtient ses propres compteurs, même dans un affrontement entre deux armées de même faction.

**Correction transmise par Nicolas le 11 septembre :** le « 3–4 » d’Invokation shamanique dans le PDF est une coquille ; il faut lire **2–3**. Les résultats **4–5 n’ont aucun effet supplémentaire**. La définition intégrée suit donc le tableau complet : 1, défausser deux Shamans ; 2–3, défausser une unité de Shamans ; 4–5, aucun effet supplémentaire ; 6, répéter la même attaque sur la même cible (sans effet si elle a été détruite). Cette correction explicite prévaut sur le PDF.

L’ordre Repli stratégique p. 7 (désengagement sans attaque gratuite) reste distinct de la capacité homonyme p. 9 (dé de P), dont le texte n’a pas changé. Fureur divine permet de recruter et déployer des Anges dans n’importe quelle zone ; aucune gratuité n’est ajoutée, car le PDF n’en prévoit pas explicitement.

## Unités, capacités et autres pages

- **Page 8 :** vingt profils et tableau des touches inchangés. La précision de Nicolas sur les valeurs `x` de Vallardi reste appliquée : aucun dé ni attaque. Noms harmonisés et illustrations conservés.
- **Page 9 :** reprend exactement les capacités de l’ancienne p. 10. Aucun effet ni profil à migrer.
- **Page 10 :** reprend la note d’attente de l’ancienne p. 9, sans nouvelle règle d’événement.

## Intégration et portée

Le [suivi des règles implémentées](regles-implementees.md) décrit les douze ordres et leurs effets. Les descriptions et les compteurs sont intégrés au plateau manuel. Les joueurs continuent à appliquer eux-mêmes les bonus, sacrifices, pertes, soins, recrutements gratuits et calendrier de recrutement, avec les outils existants. Le compteur Recrutement commence à trois : il suit les sélections restantes sur la partie, pas leur déblocage au tour courant.

Version des nouvelles parties : `2026-09-11-manual-1`. Les ordres sont copiés au début de la bataille et la version est enregistrée à ce moment, y compris pour une préparation commencée avant la mise à jour. Les batailles déjà commencées gardent leurs définitions et leurs stocks, même après une correction ou une reconnexion. Aucune remise à zéro des stocks existants.

Les fonctions ont été déployées sur Convex de développement `grateful-warthog-543`, puis sur la production `tough-gecko-249` après accord de Nicolas le 11 septembre. Les nouvelles batailles publiques reçoivent les ordres finalisés, avec la correction d’Invokation shamanique. Aucune application de `catalogue2026:apply` n’est nécessaire : le catalogue d’unités reste à la version `2026-09-10`.

Validation : analyse statique, 194 tests et compilation réussis. Les tests couvrent les limites, la répartition par faction, les compteurs séparés entre deux joueurs, la synchronisation après correction/reconnexion, la conservation des ordres des batailles antérieures et la transition d’une ancienne préparation vers le nouveau catalogue d’ordres.
