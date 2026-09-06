# PAFF — règles implémentées

**État du 6 septembre 2026 · version de partie `2026-09-06-demo-1` · catalogue `2026-09-06-wip`.**

Ce document décrit le comportement du site pour les nouvelles parties de cette version. Il sert de référence pour comparer l’application avec les prochaines versions du Drive. Il ne remplace pas les règles du créateur : les points encore provisoires sont indiqués explicitement.

Sources : PDF « PAFF 2026 – Règles », huit captures du Drive du 6 septembre 2026 (12:22:29 à 12:23:34) et décisions de Nicolas : sélection privée avant initiative, placement obligatoire de toute la sélection, décors reportés, correction des placements, « Bande du chef », remplacement des Meneurs de Troll par Trolls et points stratégiques déclarés manuellement pour la démo.

## 1. Catalogue et profils

| Référence | Comportement appliqué |
| --- | --- |
| CAT-01 | Le catalogue public possède quatre factions. Les listes Gobelins et Sephosi utilisent les 12 unités ci-dessous. Orcs et Gaeli conservent leurs anciennes cartes et leurs profils estimés. |
| CAT-02 | Une unité possède un nom, un coût, un type, R (points de Régiment), un nombre de dés, un mode offensif unique A ou T, une valeur offensive, DA et DT. Le nombre de dés est indépendant de A/T. |
| CAT-03 | Types disponibles : Troupe, Tir, Cavalerie, Artillerie, Élite, Unique. Le type Artillerie intervient dans le déploiement ; aucun type ne produit encore d’effet de combat ou de mouvement. |
| CAT-04 | Les capacités des nouvelles unités sont affichées avec un intitulé et une infobulle indiquant que leur effet reste à définir/implémenter. Elles n’ont aucun effet en jeu. |
| CAT-05 | Les identifiants des cartes renommées sont conservés pour préserver les decks. Les autres anciennes cartes Gobelins/Sephosi, y compris les cartes Action, sont archivées : elles restent lisibles dans les anciens decks mais ne sont plus ajoutables ni utilisables pour sélectionner un deck dans une nouvelle partie. L’éditeur permet de les retirer. |
| CAT-06 | Une partie conserve une copie des cartes au choix du deck. Les mises à jour ultérieures du catalogue ou du deck ne modifient pas ces copies. Les ordres sont également figés dans la partie au début du tour 1. |

### Valeurs du catalogue courant

Le signe `+` dans DT est conservé tel que visible dans la capture ; il ne déclenche pas encore de mécanique de sauvegarde. `—` représente l’absence de valeur offensive des Aides de camp.

| Faction | Unité | Coût | Type | R | Dés | A/T | DA | DT | Capacité |
| --- | --- | ---: | --- | ---: | ---: | --- | ---: | --- | --- |
| Gobelins | Bande de Gobelins | 1 | Troupe | 3 | 3 | A 2 | 2 | 1 | — |
| Gobelins | Archers Gobelins | 1 | Tir | 2 | 3 | T 1 | 1 | 1 | Tir en mêlée |
| Gobelins | Shamans Gobelins | 1 | Tir | 1 | 1 | T 3 | 1 | 1 | Tir magique |
| Gobelins | Chevaucheurs de Skrans Gobelins | 1 | Cavalerie | 2 | 3 | A 2 | 1 | 6+ | — |
| Gobelins | Trolls | 4 | Élite | 3 | 2 | A 6 | 3 | 2+ | Trollitude |
| Gobelins | Bande du chef | 3 | Élite | 2 | 3 | A 3 | 3 | 5+ | — |
| Sephosi | Lanciers Sephosiens | 3 | Troupe | 3 | 2 | A 3 | 4 | 3+ | Repli stratégique |
| Sephosi | Arbalétriers Sephosiens | 2 | Tir | 1 | 2 | T 3 | 2 | 5+ | — |
| Sephosi | Cavalerie lourde Sephosienne | 2 | Cavalerie | 2 | 2 | A 3 | 3 | 4+ | Charge puissante |
| Sephosi | Balistes Sephosiennes | 2 | Artillerie | 1 | 1 | T 6 | 1 | 6+ | — |
| Sephosi | Anges Protecteurs de la Sephosi | 4 | Élite | 1 | 3 | A 4 | 5 | 3+ | Vol |
| Sephosi | Aides de camp Sephosiens | 2 | Élite | 1 | 0 | A — | 1 | 6+ | Appui stratégique |

**Interprétations WIP du tableau :** `2C`, `3C`, etc. dans la colonne Dés donnent respectivement 2, 3 dés. Le mode T des Arbalétriers et des Balistes est déduit de leur type, malgré les `2C`/`1C` du tableau. La colonne offensive intitulée A fournit aussi la valeur T des tireurs. Aucun score de protection P supplémentaire n’a été ajouté. « Bande du Sef » est corrigé en « Bande du chef » ; « Baliste Sephosiennes » est harmonisé en « Balistes Sephosiennes ».

Correspondances conservant l’identité de carte : Troupe de Gobelins → Bande de Gobelins ; Shaman Gobelin → Shamans Gobelins ; Meneurs de Troll → Trolls ; Arbalétriers avec Pavois → Arbalétriers Sephosiens. La carte Action Tirs de Balistes est archivée ; Balistes Sephosiennes est une nouvelle unité. Les illustrations existantes sont réutilisées quand disponibles ; Skrans, Bande du chef, Anges et Aides de camp ont une illustration d’attente.

## 2. Decks et lobby

| Référence | Comportement appliqué |
| --- | --- |
| DECK-01 | Un joueur connecté peut créer, consulter, renommer, modifier et supprimer ses decks. Le nom est choisi par le joueur (1 à 60 caractères après nettoyage des espaces). |
| DECK-02 | Une seule faction par deck. Un deck peut être vide. Les exemplaires sont des quantités entières positives, sans quota de type, de rareté, de doublons ou de points. Zéro retire la carte du deck. |
| DECK-03 | Le récapitulatif indique les quantités, unités/actions, coût total et moyen et répartition par type. Ce sont des statistiques, pas des restrictions de construction. |
| LOB-01 | Deux joueurs exactement par partie. L’hôte lance quand les deux places sont occupées. Un joueur ne peut participer qu’à une partie active. |
| LOB-02 | Chacun choisit un de ses decks disponibles ; il peut changer tant que les deux choix ne sont pas terminés. La sélection des unités commence lorsque les deux decks sont choisis. Un deck vide doté d’une faction est accepté. |
| LOB-03 | Les étapes et actions sont enregistrées par Convex et synchronisées. Un rechargement reprend l’état enregistré. Seuls les participants peuvent lire leur partie ou y agir. |
| LOB-04 | Quitter une partie lancée la ferme pour les deux joueurs. Dans le salon, l’invité peut simplement libérer sa place. À la fin des huit tours, les joueurs peuvent créer une autre table et consulter encore l’ancienne partie par son lien. |

## 3. Préparation commune

Parcours : **decks → sélection privée des unités → initiative → déploiement alterné → tour 1**. Chaque étape attend les validations nécessaires des deux joueurs.

| Référence | Comportement appliqué |
| --- | --- |
| PREP-01 | Chacun choisit 0 à tous les exemplaires des unités de son deck avant l’initiative. Les cartes Action ne sont pas sélectionnables. Les cartes non choisies restent dans la pile appelée « Pioche » à l’écran ; aucune pioche ou entrée de réserve n’est exécutée pour l’instant. |
| PREP-02 | Valider sa sélection la verrouille. L’initiative s’ouvre après les deux validations. Toutes les unités choisies devront être placées. |
| PREP-03 | Aucune limite de points. Limites de capacité du plateau : 18 unités choisies, dont 9 artilleries maximum. Ces limites évitent une préparation impossible ; elles ne sont pas les quotas de construction du Drive. |
| PREP-04 | Avant placement, l’adversaire voit uniquement le nombre d’unités choisies et des dos de cartes. Il ne reçoit ni leurs identités ni les quantités par type. Les unités placées deviennent publiques une par une. Les cartes restantes ne sont jamais transmises à l’adversaire ; le nombre de cartes dans sa pioche est public à partir du plateau. |
| INIT-01 | Un D6 par joueur tiré sur le serveur. Le plus haut résultat prend l’initiative. En cas d’égalité, les deux relancent ; les jets récents sont consultables. Les deux joueurs confirment avant d’ouvrir le déploiement. |
| BOARD-01 | Plateau de 54 cases, 9 colonnes × 6 rangées, réparties en 15 zones. Axes « Flanc coco », « Centre », « Flanc aux pommes » de 2 / 5 / 2 cases. Bandes Arrière, Base, Centre sur deux rangées, Base, Arrière. Une unité maximum par case. |
| BOARD-02 | Chaque joueur voit son camp en bas ; le plateau pivote de 180° pour l’invité. Les coordonnées A1–I6 identifient les mêmes cases pour les deux joueurs. |
| DEP-01 | Placement alterné, une unité à la fois, en commençant par le joueur ayant l’initiative. La première unité de chaque joueur doit être en Centre Base. Les suivantes vont dans les zones Base ou Arrière de leur camp. |
| DEP-02 | Artillerie uniquement à l’Arrière. Exception provisoire : si seules des artilleries ont été choisies, la première commence aussi à l’Arrière. Avec une sélection mixte, la première unité doit être non-artillerie. |
| DEP-03 | Les cases arrière nécessaires aux artilleries restant à placer sont réservées : une autre unité ne peut pas occuper leur dernière place disponible. |
| DEP-04 | Correction d’un clic : sélectionner une unité déjà placée, puis « Changer de case », puis une case éclairée. Possible même pendant le tour adverse jusqu’à la validation de son propre déploiement. Aucun exemplaire ajouté/retiré, aucun changement du joueur dont c’est le tour. |
| DEP-05 | Une correction reste dans le camp, sur une case libre ; une artillerie reste à l’Arrière. La première unité non-artillerie reste en Centre Base. La réservation de place pour les artilleries est conservée. Aucun déplacement des unités adverses. |
| DEP-06 | On termine son déploiement à son tour uniquement après avoir placé toutes les unités choisies. Avec zéro sélection, on peut terminer immédiatement à son premier tour. Le joueur restant peut ensuite placer ses unités sans alternance. Les deux validations ouvrent le tour 1. |

## 4. Tours et ordres — démo

| Référence | Comportement appliqué |
| --- | --- |
| TURN-01 | Huit tours, chacun avec les phases Ordres → Actions → Combats → Fin du tour. Après le huitième : fin de démo, sans vainqueur calculé. |
| TURN-02 | Le gagnant du jet initial a l’initiative au tour 1. L’initiative change de joueur à chaque nouveau tour, sans nouveau jet. |
| ORD-01 | Chaque joueur sélectionne 3 ordres au premier tour. À partir du tour 2 : 3 + les points stratégiques déclarés au tour précédent (donc 3 à 6 ordres pour la démo). Ce bonus ne s’accumule pas entre les tours. |
| ORD-02 | Choix visibles immédiatement, alternés, joueur ayant l’initiative en premier. Si un joueur a rempli son quota, l’autre termine ses choix seul. La phase Actions commence quand les deux quotas sont remplis. |
| ORD-03 | Un ordre illimité peut être sélectionné plusieurs fois, y compris pendant le même tour. Pour cette version, les exemplaires limités sont un stock personnel pour toute la partie, consommé dès la sélection, sans remboursement si l’ordre est passé. |
| ORD-04 | Les sept ordres communs du tableau détaillé sont disponibles à toutes les factions. Seuls les ordres de faction nommés dans ce tableau sont proposés ; les lignes sans nom/effet ne sont pas inventées. |
| ACT-01 | Le joueur ayant l’initiative passe un de ses ordres sélectionnés, puis l’adversaire fait de même. Chaque joueur peut choisir l’ordre de passage. Un ordre ne peut être passé qu’une fois. Le joueur ayant encore des ordres continue seul si nécessaire. |
| ACT-02 | Le bouton « Passer … (démo) » n’exécute aucun effet : pas de ciblage, de déplacement, de tir, de renfort ou de modification de profil. L’état passé est public. La phase Combats commence lorsque tous les ordres sont passés. |
| COMBAT-01 | Chaque joueur clique « Passer les combats (démo) ». Aucun jet, dégât, destruction ou retrait d’unité n’est effectué. Les deux confirmations ouvrent la fin du tour. |
| END-01 | Chacun déclare manuellement 0, 1, 2 ou 3 points stratégiques. Valeur initiale : 0 à chaque fin de tour. La déclaration est visible de l’autre joueur et modifiable jusqu’à sa propre validation. Aucun contrôle de zone n’est calculé. |
| END-02 | Le tour suivant commence uniquement après les deux validations. Les ordres du tour écoulé et les points déclarés sont conservés dans l’historique. Le huitième tour se clôt de la même manière. |
| SYNC-01 | Le serveur contrôle participant, phase, joueur actif, exemplaires et quotas. Un ancien clic de sélection/passage/placement envoyé avec une révision périmée est refusé ; les confirmations de fin de phase et points portent le numéro de tour. |

### Ordres proposés

Ces descriptions présentent les effets prévus par la capture ; **aucun effet n’est exécuté** dans cette version.

| Faction | Ordre | Stock par joueur / partie | Effet décrit |
| --- | --- | --- | --- |
| Commun | Mouvement | Illimité | Déplacer les unités d’une zone. |
| Commun | Défense | Illimité | +1 dé pour défendre dans une zone jusqu’à la fin du tour. |
| Commun | Assaut | Illimité | +1 dé de corps à corps dans une zone jusqu’à la fin du tour. |
| Commun | Tir | Illimité | Faire tirer les unités d’une zone, hors artillerie. |
| Commun | Tir Artillerie | Illimité | Faire tirer les artilleries d’une zone. |
| Commun | Tir Magique | Illimité | Faire tirer les unités avec Magie d’une zone. |
| Commun | Réserve | Illimité | Faire entrer des unités en Base/Arrière sans ennemi ; elles peuvent recevoir d’autres ordres ce tour. |
| Gobelins | Déchainement Shamanique ! | Illimité | Shaman non engagé, cible alliée non élite à portée. D6 : 1 → −2 R ; 2–3 → −1 R ; 4–5 → dés d’attaque doublés ; 6 → dés doublés et propagation à une unité alliée adjacente. |
| Gobelins | WAAAGGGHHH ! | 1 | Effet non renseigné dans le document. |

**Choix provisoire :** le tableau détaillé fait foi pour les sept ordres communs (dont Réserve), malgré le texte qui ne cite que Mouvement, Tir et Recrutement. Les catégories et stocks contradictoires 4/2/1 versus « 3 exemplaires » ne sont pas extrapolés aux lignes de faction sans nom. Le seul ordre limité actuellement utilisable est WAAAGGGHHH !, une fois par joueur gobelin et par partie.

## 5. Ce qui n’est pas implémenté

| Référence | Écart restant avec le Drive |
| --- | --- |
| TODO-DECK | Budget maximum de deck, quotas Cavalerie 6 / Artillerie 4 / Élite 4 / Unique 1, budget d’unités mises en réserve. Les valeurs `**` du Drive restent non définies. |
| TODO-DECOR | Tirage, placement et effets des décors (forêt, lac, colline, ruines) : explicitement reportés. |
| TODO-MVT | Adjacence, engagement/désengagement, cavalerie jusqu’à 3 cases, surcoût de changement d’axe, immobilité de l’artillerie, incompatibilité mouvement/tir. |
| TODO-TIR | Portées, diagonale, ligne de vue, cibles engagées, malus de défense contre l’artillerie, dés de tir, tableau des touches. |
| TODO-CAC | Engagements, choix/résolution des combats, simultanéité des dégâts, surnombre, sauvegardes, destruction et défausse d’unités. |
| TODO-EFFETS | Effets des ordres et capacités, entrée de réserve, pioche, ordre de recrutement distinct et effets de faction non définis. |
| TODO-STRAT | Contrôle automatique des trois zones stratégiques et calcul des points. La déclaration manuelle ne vérifie pas le plateau. |
| TODO-EVENT | Événements aux tours 2, 4 et 6 et table des événements. Aucune phase vide ne les simule. |
| TODO-VICT | Victoire mineure au tour 8, destruction de toute l’armée adverse, occupation de la base-centre ennemie, égalités. Fin de démo uniquement. |

## 6. Compatibilité et suivi des écarts

- Les parties déjà lancées sans `rulesVersion` conservent leurs cartes et leur ancien déroulé. Elles ne reçoivent pas rétroactivement le catalogue ou les huit tours. La correction des cases fonctionne sur leurs déploiements positionnés encore ouverts.
- Les nouvelles tables et celles encore dans le salon lors de leur lancement utilisent cette version. Les parties enregistrent la version et leurs données ; pour tester le nouveau lot, créer une nouvelle partie et mettre à jour les decks contenant des cartes retirées.
- La mise à jour du catalogue est idempotente et ne supprime ni decks ni parties. Un réimport de l’ancien CSV ne remplace pas les cartes mises à jour ou archivées par le catalogue 2026.
- Pour chaque prochain changement : conserver les références de règles ci-dessus, actualiser le comportement, les hypothèses et la liste des écarts dans le même commit que le code. Changer la version de partie quand le déroulé change. Git conserve les états précédents pour les comparaisons.
- Le document décrit la branche qui le contient. Sa présence sur la preview ne signifie pas qu’il est déjà déployé en production.

Points de vérification dans le dépôt : [profils](../shared/catalogue2026.ts), [plateau](../shared/board.ts), [ordres](../shared/battle.ts), [mutations de partie](../convex/games.ts), [parcours fonctionnel à deux joueurs](../src/functional/gameFlow.test.tsx), [tests des tours](../convex/battle.test.ts), [tests du catalogue](../convex/catalogue2026.test.ts).
