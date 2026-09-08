# PAFF — règles implémentées

**État du 8 septembre 2026 · version de partie `2026-09-06-actions-1` · catalogue `2026-09-08-wip`.**

Ce document décrit le comportement du site pour les nouvelles parties de cette version. Il sert de référence pour comparer l’application avec les prochaines versions du Drive. Il ne remplace pas les règles du créateur : les points encore provisoires sont indiqués explicitement.

Sources : PDF « PAFF 2026 – Règles », huit captures du Drive du 6 septembre 2026 (12:22:29 à 12:23:34) et décisions de Nicolas : sélection privée avant initiative, placement obligatoire de toute la sélection, décors reportés, correction des placements, « Bande du chef », remplacement des Meneurs de Troll par Trolls et points stratégiques déclarés manuellement pour l’ancienne démo. Nouvelle référence : PDF « PAFF 2026 – Règles (1).pdf » transmis le 6 septembre 2026, pages 1–6. Arbitrages de Nicolas pour cette version : portée de tir en **cases**, **T contre DT, puis 1 R perdu par touche**, sans sauvegarde.

Référence catalogue du 8 septembre 2026 : tableau transmis par Nicolas dans la conversation, colonnes Faction, Nom, Type, Pts déploiement, R, Dés, Cac/Tir, A, DC, DT, Capacités et Statut. Seules les lignes **OK** sont ajoutées ou actualisées. Cette révision est préparée sur la branche de travail ; elle sera appliquée aux données Convex au prochain import du catalogue.

## 1. Catalogue et profils

| Référence | Comportement appliqué |
| --- | --- |
| CAT-01 | Le catalogue possède quatre factions. Les listes Gobelins et Sephosi de cette révision comptent 15 unités (7 Gobelins, 8 Sephosi) : 11 profils OK du 8 septembre et 4 profils WIP conservés de la version précédente. Orcs et Gaeli conservent leurs anciennes cartes et leurs profils estimés. |
| CAT-02 | Une unité possède un nom, un coût, un type, R (points de Régiment), un nombre de dés, un mode offensif unique C ou T, une valeur offensive, DC et DT. Le nombre de dés est indépendant de C/T. L’affichage du 7 septembre remplace DA par DC et regroupe score et mode, par exemple `4C` ou `3T` ; les valeurs et calculs restent identiques. |
| CAT-03 | Types disponibles : Troupe, Tir, Cavalerie, Artillerie, Élite, Unique. Cavalerie et Artillerie ont désormais leurs règles de mouvement/portée ; le mode C ou T détermine les attaques possibles. |
| CAT-04 | Les capacités des nouvelles unités sont affichées avec un intitulé et une infobulle indiquant que leur effet reste à définir/implémenter. Elles n’ont aucun effet en jeu. |
| CAT-05 | Les identifiants des cartes renommées sont conservés pour préserver les decks. Les autres anciennes cartes Gobelins/Sephosi, y compris les cartes Action, sont archivées : elles restent lisibles dans les anciens decks mais ne sont plus ajoutables ni utilisables pour sélectionner un deck dans une nouvelle partie. L’éditeur permet de les retirer. |
| CAT-06 | Une partie conserve une copie des cartes au choix du deck. Les mises à jour ultérieures du catalogue ou du deck ne modifient pas ces copies. Les ordres sont également figés dans la partie au début du tour 1. |

### Présentation des cartes — décision de Nicolas du 7 septembre

- Types abrégés à droite du nom : **B** Troupe, **T** Tir, **C** Cavalerie, **A** Artillerie, **E** Élite, **U** Unique. Le nom complet reste accessible au survol et aux lecteurs d’écran. Ces lettres n’ajoutent aucun type ni effet.
- Catalogue et decks présentent les cartes dans cet ordre de types, puis par nom ; les anciennes cartes Action viennent ensuite. Le catalogue s’ouvre sur Sephosi lorsqu’elle est publiée.
- Profils : R, Dés, attaque score + **C/T**, **DC**, DT, capacité courte. Le type de l’unité et son mode offensif restent deux informations distinctes.
- Le survol ou le focus d’une unité du plateau ouvre la carte complète près du pointeur, avec ses R courants. Un clic conserve la sélection pour les actions ou la correction du déploiement ; le panneau de correction reste disponible. Le coût n’est pas superposé au visuel du plateau ou à cet aperçu.
- La réserve personnelle apparaît sous le plateau, avec les coûts sous les illustrations. Le bouton Recruter reste soumis à l’ordre et aux contrôles existants. La réserve adverse reste privée.
- Ce lot modifie la présentation. Le mode de bataille entièrement manuel, les compteurs libres et le glisser-déposer demandés lors du retour de démo restent à réaliser dans un lot distinct ; les règles d’action ci-dessous restent appliquées.

### Valeurs du catalogue courant

Les 11 profils OK reprennent les valeurs du tableau du 8 septembre, sans `+` dans DT. Les quatre profils WIP conservent leurs anciennes valeurs, y compris le signe `+` ; la valeur numérique reste utilisée comme DT dans la comparaison T contre DT, sans jet de sauvegarde (arbitrage de Nicolas). `—` représente l’absence de valeur offensive des Aides de camp.

| Faction | Unité | Coût | Type | R | Dés | C/T | DC | DT | Capacité |
| --- | --- | ---: | --- | ---: | ---: | --- | ---: | --- | --- |
| Gobelins | Bande de Gobelins | 1 | Troupe | 3 | 3 | C 2 | 2 | 1 | — |
| Gobelins | Archers Gobelins | 1 | Tir | 2 | 3 | T 1 | 1 | 1 | Tir en mêlée |
| Gobelins | Shamans Gobelins | 1 | Tir | 1 | 1 | T 3 | 1 | 1 | Tir magique |
| Gobelins | Chevaucheurs de Skrans Gobelins | 1 | Cavalerie | 2 | 2 | C 2 | 2 | 1 | — |
| Gobelins | Katapult à gobs | 2 | Artillerie | 1 | 1 | T 5 | 1 | 1 | Pluie de gobs |
| Gobelins | Trolls | 4 | Élite | 3 | 2 | C 6 | 3 | 2+ | Trollitude |
| Gobelins | Bande du chef | 3 | Élite | 2 | 3 | C 3 | 3 | 5+ | — |
| Sephosi | Lanciers Sephosiens | 3 | Troupe | 3 | 2 | C 3 | 4 | 3 | Mur de lance |
| Sephosi | Epéistes Sephosiens | 3 | Troupe | 3 | 3 | C 4 | 3 | 2 | — |
| Sephosi | Arbalétriers Sephosiens | 2 | Tir | 2 | 2 | T 3 | 1 | 2 | — |
| Sephosi | Cavalerie lourde Sephosienne | 3 | Cavalerie | 2 | 1 | C 4 | 3 | 2 | Charge puissante |
| Sephosi | Arbalétriers Montés | 2 | Cavalerie | 1 | 1 | T 3 | 1 | 1 | Tir en mouvement |
| Sephosi | Balistes Sephosiennes | 2 | Artillerie | 1 | 1 | T 6 | 1 | 1 | — |
| Sephosi | Anges Protecteurs de la Sephosi | 4 | Élite | 1 | 3 | C 4 | 5 | 3+ | Vol |
| Sephosi | Aides de camp Sephosiens | 2 | Élite | 1 | 0 | C — | 1 | 6+ | Appui stratégique |

**Périmètre du 8 septembre :** Katapult à gobs et Epéistes Sephosiens sont ajoutés ; les Arbalétriers Montés sont réactivés avec leur ancien identifiant. Les lignes OK existantes sont actualisées. Les nouvelles capacités « Mur de lance », « Pluie de gobs » et « Tir en mouvement » sont des intitulés affichés, sans effet supplémentaire implémenté (CAT-04).

**Profils WIP conservés :** Trolls, Bande du chef, Anges Protecteurs et Aides de camp restent identiques à la version du 6 septembre. En particulier, la Bande du chef reste à **2 R** : les 4 R de « Bande du Sef » sont exclus car cette ligne est « à MAJ ». Les Aides de camp ne sont pas renommés « Porte-ordres » à ce stade. Les Gros tarrés, Le Danzereu, Blop et Maréchal Deliamonte ne sont pas ajoutés ; le Régiment de la Salamandre reste archivé.

**Interprétations WIP conservées :** `2C`, `3C`, etc. des anciens profils donnent respectivement 2, 3 dés et le mode corps à corps. Les lignes OK du 8 septembre distinguent désormais explicitement dés et mode C/T. La colonne offensive intitulée A fournit la valeur de C ou T selon le mode. Aucun score de protection P supplémentaire n’a été ajouté. « Bande du Sef » reste corrigé en « Bande du chef » ; « Baliste Sephosiennes » reste harmonisé en « Balistes Sephosiennes ».

Correspondances conservant l’identité de carte : Troupe de Gobelins → Bande de Gobelins ; Shaman Gobelin → Shamans Gobelins ; Meneurs de Troll → Trolls ; Arbalétriers avec Pavois → Arbalétriers Sephosiens ; Arbalétriers Montés Sephosiens → Arbalétriers Montés. La carte Action Tirs de Balistes reste archivée ; Balistes Sephosiennes est une unité distincte. Les illustrations carrées reçues le 7 septembre remplacent celles de la Bande de Gobelins, des Archers, des Shamans, des Lanciers, des Arbalétriers et de la Cavalerie Sephosi. Celles du 8 septembre sont associées à la Bande du chef (`chef-gob.png`), aux Anges (`anges-2.png`), aux Aides de camp (`messager.png`) et aux Epéistes (`epeistes.png`). `sala-7.png` remplace seulement l’illustration de la carte archivée Régiment de la Salamandre. Skrans et Katapult utilisent l’illustration d’attente ; les Arbalétriers Montés conservent leur ancienne illustration.

## 2. Decks et lobby

| Référence | Comportement appliqué |
| --- | --- |
| DECK-01 | Un joueur connecté peut créer, consulter, renommer, modifier et supprimer ses decks. Le nom est choisi par le joueur (1 à 60 caractères après nettoyage des espaces). |
| DECK-02 | Une seule faction par deck. Un deck peut être vide. Les exemplaires sont des quantités entières positives, sans blocage de sauvegarde pour les quotas de type ou de points. La conformité est contrôlée avant de jouer (DECK-04). Zéro retire la carte du deck. |
| DECK-03 | Le récapitulatif indique les quantités, unités/actions, coût total et moyen et répartition par type. Les dépassements de budget et de quotas sont signalés dans le récapitulatif. |
| DECK-04 | Pour sélectionner un deck dans une nouvelle partie : unités uniquement, au maximum **33 points** ; Cavalerie 6 / Artillerie 4 / Élite 4 / Unique 1 exemplaires maximum ; Troupe et Tir sans quota de nombre. Coûts connus exigés. Contrôles côté serveur et indications dans le choix de deck. Source : PDF p. 1. |
| LOB-01 | Deux joueurs exactement par partie. L’hôte lance quand les deux places sont occupées. Un joueur ne peut participer qu’à une partie active. |
| LOB-02 | Chacun choisit un de ses decks disponibles ; il peut changer tant que les deux choix ne sont pas terminés. La sélection des unités commence lorsque les deux decks sont choisis. Un deck vide doté d’une faction est accepté. |
| LOB-03 | Les étapes et actions sont enregistrées par Convex et synchronisées. Un rechargement reprend l’état enregistré. Seuls les participants peuvent lire leur partie ou y agir. |
| LOB-04 | Quitter une partie lancée la ferme pour les deux joueurs. Dans le salon, l’invité peut simplement libérer sa place. Après la fin de partie, les joueurs peuvent créer une autre table et consulter encore l’ancienne partie par son lien. |

## 3. Préparation commune

Parcours : **decks → sélection privée des unités → initiative → déploiement alterné → tour 1**. Chaque étape attend les validations nécessaires des deux joueurs.

| Référence | Comportement appliqué |
| --- | --- |
| PREP-01 | Chacun choisit 0 à tous les exemplaires des unités de son deck avant l’initiative. Les cartes Action ne sont pas sélectionnables. Les unités non choisies constituent la réserve, accessible ensuite via l’ordre Recrutement. Aucune pioche aléatoire. |
| PREP-02 | Valider sa sélection la verrouille. L’initiative s’ouvre après les deux validations. Toutes les unités choisies devront être placées. |
| PREP-03 | **21 points maximum** sélectionnés pour le déploiement et **12 points maximum** laissés en réserve (PDF p. 1). Également : 18 cases dans le camp, dont 9 arrière. Toutes ces contraintes sont contrôlées à la validation. Le quota de 4 artilleries est déjà vérifié au choix du deck. |
| PREP-04 | Avant placement, l’adversaire voit uniquement le nombre d’unités choisies et des dos de cartes. Il ne reçoit ni leurs identités ni les quantités par type. Les unités placées deviennent publiques une par une. Les cartes restantes ne sont jamais transmises à l’adversaire ; le nombre de cartes dans sa réserve est public à partir du plateau. |
| INIT-01 | Un D6 par joueur tiré sur le serveur. Le plus haut résultat prend l’initiative. En cas d’égalité, les deux relancent ; les jets récents sont consultables. Les deux joueurs confirment avant d’ouvrir le déploiement. |
| BOARD-01 | Plateau de 54 cases, 9 colonnes × 6 rangées, réparties en 15 zones. Axes « Flanc coco », « Centre », « Flanc aux pommes » de 2 / 5 / 2 cases. Bandes Arrière, Base, Centre sur deux rangées, Base, Arrière. Une unité maximum par case. |
| BOARD-02 | Chaque joueur voit son camp en bas ; le plateau pivote de 180° pour l’invité. Les coordonnées A1–I6 identifient les mêmes cases pour les deux joueurs. |
| DEP-01 | Placement alterné, une unité à la fois, en commençant par le joueur ayant l’initiative. La première unité de chaque joueur doit être en Centre Base. Les suivantes vont dans les zones Base ou Arrière de leur camp. |
| DEP-02 | Artillerie uniquement à l’Arrière. Exception provisoire : si seules des artilleries ont été choisies, la première commence aussi à l’Arrière. Avec une sélection mixte, la première unité doit être non-artillerie. |
| DEP-03 | Les cases arrière nécessaires aux artilleries restant à placer sont réservées : une autre unité ne peut pas occuper leur dernière place disponible. |
| DEP-04 | Correction d’un clic : sélectionner une unité déjà placée, puis « Changer de case », puis une case éclairée. Possible même pendant le tour adverse jusqu’à la validation de son propre déploiement. Aucun exemplaire ajouté/retiré, aucun changement du joueur dont c’est le tour. |
| DEP-05 | Une correction reste dans le camp, sur une case libre ; une artillerie reste à l’Arrière. La première unité non-artillerie reste en Centre Base. La réservation de place pour les artilleries est conservée. Aucun déplacement des unités adverses. |
| DEP-06 | On termine son déploiement à son tour uniquement après avoir placé toutes les unités choisies. Avec zéro sélection, on peut terminer immédiatement à son premier tour. Le joueur restant peut ensuite placer ses unités sans alternance. Les deux validations ouvrent le tour 1. |

## 4. Tours et ordres jouables

| Référence | Comportement appliqué / source |
| --- | --- |
| TURN-01 | Jusqu’à huit tours : **Ordres & actions → Charges → Combats → Fin du tour**. Choisir un ordre ouvre immédiatement son exécution. Il n’y a plus de draft suivi d’une phase Actions séparée. PDF p. 2–4. |
| TURN-02 | Initiative initiale au tour 1, puis changement de joueur à chaque tour, sans relancer de dé. |
| ORD-01 | Trois ordres de base par joueur et par tour. Au-delà, chaque ordre supplémentaire coûte immédiatement **1 PS** épargné. Le joueur peut terminer après ses trois ordres et conserver ses PS. PDF p. 2–3. |
| ORD-02 | Le joueur ayant l’initiative choisit un ordre, l’exécute sur le plateau puis clique « Terminer cet ordre ». L’autre joueur fait de même. Si l’autre a terminé ses ordres, le joueur continue seul. |
| ORD-03 | Mouvement et Tir illimités ; **Recrutement : 3 sélections par joueur pour toute la partie**. Le stock est consommé au choix, même sans effet. Aucun autre ordre n’est proposé dans cette version. PDF p. 2 ; portée du stock sur la partie conservée de la démo. |
| ORD-04 | Les nouveaux effets de faction ne figurent pas dans ce PDF : les anciens ordres sans moteur ne sont plus proposés aux nouvelles parties. Les ordres choisis et leur état restent visibles des deux joueurs. |
| ACT-01 | Mouvement et Tir activent une ou plusieurs unités d’une même zone de départ, une fois par unité et par ordre. Chaque unité est sélectionnée puis sa destination/cible est choisie sur le plateau. Hypothèse WIP conservée du tableau détaillé du 6 septembre ; voir §7. |
| ACT-02 | « Terminer cet ordre » conserve les effets déjà appliqués et consomme l’ordre. Sans activation, il est marqué « Sans effet ». Il ne peut pas être annulé ou rejoué. |

## 5. Effets, combats et fin de partie

| Référence | Comportement appliqué / source |
| --- | --- |
| MVT-01 | Déplacement vers une case libre partageant un bord, dans la même zone ou une zone adjacente. Pas de diagonale, pas de passage à travers une unité, pas de sortie du plateau. PDF p. 3. |
| MVT-02 | Troupe, Tir, Élite et Unique : 1 point de mouvement. Cavalerie : jusqu’à 3 ; changer d’axe coûte 1 point supplémentaire. Le chemin d’une activation ne revient pas dans la zone de départ après l’avoir quittée. Artillerie immobile. PDF p. 3. |
| MVT-03 | Une unité ayant tiré ne peut plus se déplacer ce tour ; une unité ayant bougé ne peut plus tirer ce tour. Une nouvelle activation dans un autre ordre du même type reste possible. |
| MVT-04 | Désengagement : chaque ennemi de corps à corps engagé attaque gratuitement avec **+2 aux résultats des dés**. Dégâts appliqués avant le mouvement ; une unité tuée ne rejoint pas la destination. Les liens d’engagement sont supprimés après retrait ou déplacement. PDF p. 3. |
| TIR-01 | Mode T requis. Portée **1–2 cases**, au plus une diagonale dans la mesure, même axe uniquement. Artillerie : 1–3 cases avec au plus une diagonale, ou 4 cases en ligne droite. Arbitrage de Nicolas + PDF p. 3. |
| TIR-02 | Cible engagée interdite, tireur ayant bougé interdit. Un tireur lui-même engagé est également bloqué (hypothèse WIP). PDF p. 3 et §7. |
| TIR-03 | Nombre de D6 du profil ; comparaison **T contre DT** avec le tableau des touches ; **1 R perdu par touche**, sans sauvegarde. Les unités à 0 R sont retirées immédiatement. Arbitrage explicite de Nicolas, qui remplace A/DA du paragraphe Tir p. 4. |
| RECR-01 | Sélection d’un exemplaire de sa réserve, paiement de son coût, placement sur une case libre d’une zone Base/Arrière de son camp sans aucun ennemi. Un ordre reste dans la même zone. Artillerie à l’Arrière. PDF p. 4 + hypothèses §7. |
| RECR-02 | Budget **provisoire de 4 points par ordre** ; les points inutilisés expirent en terminant l’ordre. Des PS sont dépensés à raison de 1 pour 1 pour couvrir le coût supplémentaire. Les renforts peuvent recevoir un autre ordre le même tour. Le budget de base manque dans le PDF : hypothèse à confirmer. |
| RECR-03 | Chaque exemplaire possède une identité indépendante. Son entrée est comptée définitivement : une unité détruite ne retourne pas en réserve. L’adversaire voit le nombre restant et les unités entrées, jamais le contenu non révélé. |
| COMBAT-01 | Charges alternées, initiative en premier. Une unité non engagée choisit un ennemi adjacent ; elle gagne **+1 dé** pour le combat de ce tour. Terminer ses charges renonce aux suivantes pour ce tour. PDF p. 4. |
| COMBAT-02 | Une charge crée un lien d’engagement entre les unités, sans déplacement de case. Être simplement adjacent ne crée pas de lien automatiquement. Les engagements persistent aux tours suivants jusqu’à destruction ou désengagement. Interprétation WIP. |
| COMBAT-03 | Après les charges, le joueur ayant l’initiative choisit le prochain groupe d’unités reliées par des engagements. Chaque joueur attribue une cible engagée à chacune de ses unités de corps à corps ; une cible unique est présélectionnée. Les deux valident avant les jets. |
| COMBAT-04 | C contre DC (anciens intitulés A contre DA), nombre de dés du profil, +1 dé si l’unité a chargé ce tour. Les unités T ne lancent aucun dé de corps à corps mais subissent les dégâts. Toutes les attaques du groupe sont calculées avant d’appliquer simultanément les pertes de R, même si une unité est tuée. 1 R par touche. PDF p. 4–5 ; résolution en groupes précisée §7. |
| COMBAT-05 | Surnombre si la cible a plusieurs ennemis engagés et si chacun est engagé uniquement avec elle : chaque attaquant peut relancer jusqu’à N−1 dés ratés, N étant le nombre d’ennemis de la cible. Automatique, non cumulable avec les relances du tableau. PDF p. 4. |
| DICE-01 | Tableau p. 5 : seuil = 4 − (valeur offensive − défense), borné entre 2+ et 6+. Écart ≥ 3 : relance une fois chaque échec. Écart ≤ −4 : toute réussite doit être confirmée par une relance. Les autres cas permettent la relance de surnombre si applicable. Le serveur produit tous les dés. |
| END-01 | Après les combats : **1 PS par zone centrale contrôlée**. Il faut au moins une unité alliée non engagée et aucune unité ennemie dans la zone. Le calcul est automatique ; il remplace la déclaration manuelle de la démo. PDF p. 5. |
| END-02 | Les PS sont ajoutés au stock conservé du joueur. Après les deux validations : historique du tour enregistré, initiative inversée, trois nouveaux ordres de base. Aucun gain automatique d’ordres sans dépense de PS. PDF p. 3–5. |
| VICT-01 | À la fin d’un tour, élimination de toute l’armée adverse, réserves incluses ; ou occupation de la Base Centre ennemie par une unité alliée libre alors qu’aucune unité ennemie libre ne s’y trouve : victoire totale. PDF p. 6 ; inclusion des réserves = WIP. |
| VICT-02 | Sinon à la fin du tour 8 : celui qui contrôle le plus de zones stratégiques gagne une victoire mineure. Égalité ou victoires totales simultanées : match nul provisoire. PDF p. 6 ; égalités non précisées. |
| SYNC-01 | Convex contrôle participant, phase, joueur actif, propriété de l’unité, destination, cible, budget et stock. Chaque activation porte une révision, chaque confirmation un identifiant de combat ou de tour : un ancien clic ne s’applique pas au suivant. Les anciennes mutations de démo sont refusées sur le nouveau moteur. |
| SYNC-02 | Positions, R courants, engagements, ordre actif et validations sont persistés et repris après reconnexion. Le journal public conserve les 150 derniers événements, dont les dés initiaux, relances, seuils et touches ; l’écran montre les 20 derniers. |

## 6. Principaux changements depuis `demo-1`

| Avant | Maintenant | Référence |
| --- | --- | --- |
| Budgets non définis | Deck 33 / déploiement 21 / réserve 12, quotas de types contrôlés | DECK-04, PREP-03 |
| Choisir tous les ordres, puis les passer | Choisir et exécuter un ordre, en alternance | ORD-02 |
| 7 ordres communs et 2 gobelins sans effet | 3 ordres communs jouables, Recrutement limité à 3 | ORD-03/04 |
| Plateau immobile, sans blessures | Mouvements, tirs, renforts, engagements, dégâts et retraits | MVT, TIR, RECR, COMBAT |
| Points manuels, bonus automatique au tour suivant | Contrôle calculé, stock de PS conservé et dépensable | END-01/02 |
| Fin de démo après 8 tours | Conditions de victoire et résultat enregistré | VICT-01/02 |

## 7. Hypothèses WIP et écarts restants

**Hypothèses appliquées à confirmer avec le créateur :**

- Budget de recrutement : **4 points par ordre**, faute de valeur dans le PDF. Ce choix est provisoire, pas une règle validée par Nicolas.
- Un ordre active une zone, avec une activation maximum par unité ; plusieurs ordres peuvent réactiver la même unité dans le tour. Ce périmètre vient des captures précédentes, le nouveau PDF ne détaille plus les effets de chaque ordre.
- Recrutement dans une seule zone par ordre ; restriction arrière de l’artillerie conservée pour les renforts. Un nouveau renfort peut agir lors d’un ordre suivant, conformément à l’ancien tableau Réserve.
- Tireur engagé interdit de tir ; aucun effet de « Tir en mêlée » ne lève encore ces contraintes.
- Charges déclarées d’abord, puis résolution simultanée **par groupe connecté d’engagements**. Pas de seconde attaque distincte pour une unité qui a chargé. L’ordre de résolution des groupes appartient au joueur ayant l’initiative. Le PDF ne détaille pas les cibles en combat multiple ni la granularité exacte de simultanéité.
- Les relances favorables et de surnombre sont prises automatiquement sur les échecs. Pas d’interface permettant de les refuser.
- Une armée avec des unités encore en réserve n’est pas éliminée. Conditions de victoire simultanées et égalités au tour 8 donnent un match nul.

| Référence | Non encore appliqué |
| --- | --- |
| TODO-DECOR | Tirage, placement et effets forêt/lac/colline/ruines : explicitement reportés par Nicolas. Aucune obstruction de ligne de tir n’est simulée. |
| TODO-TIR | Malus « −2 aux jets des défenseurs contre l’artillerie » : le PDF conserve cette phrase, mais la règle validée de tir ne prévoit aucun jet de défense. **Aucun malus supplémentaire n’est appliqué** ; ne pas transformer arbitrairement ce texte en −2 DT. |
| TODO-EFFETS | Capacités spéciales de toutes les unités, ordres de faction et leurs stocks 4/2/1, effets magiques particuliers. Les noms de capacités restent consultables mais leurs effets ne sont pas exécutés. |
| TODO-EVENT | Événements optionnels aux tours 2, 4 et 6 et table des événements absente. Aucune phase vide ajoutée. |
| TODO-PROFILES | Profils WIP conservés de la version précédente, notamment DT avec `+`, valeurs estimées Orcs/Gaeli et effets non définis. Le PDF transmis ici n’inclut pas de nouveau catalogue. |

## 8. Compatibilité et suivi

- Les parties `2026-09-06-demo-1` gardent le draft, les passages sans effet et les points manuels. Les parties plus anciennes conservent aussi leur déroulé. Aucun nouveau moteur n’est injecté dans une bataille en cours.
- Une nouvelle table, ou une table encore au salon lors du déploiement de cette version, reçoit `2026-09-06-actions-1` à son lancement. **Créer une nouvelle partie pour tester les actions.** Les copies de cartes restent figées au choix du deck.
- Cette documentation décrit la branche qui la contient, pas nécessairement la production. Les états précédents sont conservés dans Git ; garder les références lors des prochains changements et mettre à jour hypothèses/écarts dans le même lot.
- Vérifications : [moteur](../shared/battleEngine.ts), [actions Convex](../convex/actions.ts), [tests du moteur](../shared/battleEngine.test.ts), [tests serveur](../convex/actions.test.ts), [parcours fonctionnel des actions à deux joueurs](../src/functional/actions.test.tsx), [parcours de préparation et compatibilité démo](../src/functional/gameFlow.test.tsx).
