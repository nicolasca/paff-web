# PAFF — règles implémentées

**État du 8 septembre 2026 · version de partie `2026-09-08-manual-1` · catalogue `2026-09-08-wip`.**

Ce document décrit le comportement du site de cette version. Il sert de référence pour comparer l’application avec les prochaines versions du Drive. Il ne remplace pas les règles du créateur : les points encore provisoires sont indiqués explicitement.

Sources : PDF « PAFF 2026 – Règles », huit captures du Drive du 6 septembre 2026 (12:22:29 à 12:23:34) et décisions de Nicolas : sélection privée avant initiative, placement obligatoire de toute la sélection, décors reportés, correction des placements, « Bande du chef », remplacement des Meneurs de Troll par Trolls et points stratégiques déclarés manuellement pour l’ancienne démo. Nouvelle référence : PDF « PAFF 2026 – Règles (1).pdf » transmis le 6 septembre 2026, pages 1–6. Arbitrages de Nicolas pour cette version : portée de tir en **cases**, **T contre DT, puis 1 R perdu par touche**, sans sauvegarde.

Référence catalogue du 8 septembre 2026 : tableau transmis par Nicolas dans la conversation, colonnes Faction, Nom, Type, Pts déploiement, R, Dés, Cac/Tir, A, DC, DT, Capacités et Statut. Seules les lignes **OK** sont ajoutées ou actualisées. Cette révision est préparée sur la branche de travail ; elle sera appliquée aux données Convex au prochain import du catalogue.

## 1. Catalogue et profils

| Référence | Comportement appliqué |
| --- | --- |
| CAT-01 | Le catalogue possède quatre factions. Les listes Gobelins et Sephosi de cette révision comptent 15 unités (7 Gobelins, 8 Sephosi) : 11 profils OK du 8 septembre et 4 profils WIP conservés de la version précédente. Orcs et Gaeli conservent leurs anciennes cartes et leurs profils estimés. |
| CAT-02 | Une unité possède un nom, un coût, un type, R (points de Régiment), un nombre de dés, un mode offensif unique C ou T, une valeur offensive, DC et DT. Le nombre de dés est indépendant de C/T. L’affichage du 7 septembre remplace DA par DC et regroupe score et mode, par exemple `4C` ou `3T` ; les valeurs et calculs restent identiques. |
| CAT-03 | Types disponibles : Troupe, Tir, Cavalerie, Artillerie, Élite, Unique. Cavalerie et Artillerie ont leurs limites de mouvement ; le mode C ou T détermine la défense utilisée par l’aide au combat. |
| CAT-04 | Les capacités des nouvelles unités sont affichées avec un intitulé et une infobulle indiquant que leur effet reste à définir/implémenter. Elles n’ont aucun effet en jeu. |
| CAT-05 | Les identifiants des cartes renommées sont conservés pour préserver les decks. Les autres anciennes cartes Gobelins/Sephosi, y compris les cartes Action, sont archivées : elles restent lisibles dans les anciens decks mais ne sont plus ajoutables ni utilisables pour sélectionner un deck dans une nouvelle partie. L’éditeur permet de les retirer. |
| CAT-06 | Une partie conserve une copie des cartes au choix du deck. Les mises à jour ultérieures du catalogue ou du deck ne modifient pas ces copies. Les ordres sont également figés dans la partie au début du tour 1. |

### Présentation des cartes — décision de Nicolas du 7 septembre

- Types abrégés à droite du nom : **B** Troupe, **T** Tir, **C** Cavalerie, **A** Artillerie, **E** Élite, **U** Unique. Le nom complet reste accessible au survol et aux lecteurs d’écran. Ces lettres n’ajoutent aucun type ni effet.
- Catalogue et decks présentent les cartes dans cet ordre de types, puis par nom ; les anciennes cartes Action viennent ensuite. Le catalogue s’ouvre sur Sephosi lorsqu’elle est publiée.
- Profils : R, Dés, attaque score + **C/T**, **DC**, DT, capacité courte. Le type de l’unité et son mode offensif restent deux informations distinctes.
- Le survol ou le focus d’une unité du plateau ouvre la carte complète près du pointeur, avec ses R courants. Un clic conserve la sélection pour les actions ou la correction du déploiement ; le panneau de correction reste disponible. Le coût n’est pas superposé au visuel du plateau ou à cet aperçu.
- La réserve personnelle apparaît sous le plateau, avec les coûts sous les illustrations. Le recrutement se fait par glisser-déposer ou sélection puis clic sur une case libre, sans ordre à activer ni paiement automatique. La réserve adverse reste privée.
- Le plateau manuel demandé après la démo est décrit au §4. La préparation commune du §3 reste structurée et synchronisée.

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
| LOB-04 | Quitter une partie lancée la ferme pour les deux joueurs. Dans le salon, l’invité peut simplement libérer sa place. La fermeture libère les deux joueurs pour une nouvelle table. |

## 3. Préparation commune

Parcours : **decks → sélection privée des unités → initiative → déploiement alterné → tour 1**. Chaque étape attend les validations nécessaires des deux joueurs.

| Référence | Comportement appliqué |
| --- | --- |
| PREP-01 | Chacun choisit 0 à tous les exemplaires des unités de son deck avant l’initiative. Les cartes Action ne sont pas sélectionnables. Les unités non choisies constituent la réserve, accessible ensuite par glisser-déposer sur le plateau. Aucune pioche aléatoire. |
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

## 4. Plateau manuel

Source : retours de démo de Nicolas, précisions sur R, autonomie et absence de restrictions au tir, puis confirmation du **8 septembre 2026** de conserver la limite de mouvement lors du glisser-déposer. Ce mode remplace les phases de bataille automatisées, pas la préparation.

| Référence | Comportement implémenté |
| --- | --- |
| MAN-TURN | Après le déploiement, plateau commun sans joueur actif, phase d’ordre ni validation de fin de tour. Les deux joueurs peuvent agir. Compteur de tour partagé, +/− accessibles aux deux joueurs, départ à 1, sans limite de huit tours ni conséquence automatique. |
| MAN-ORD | Liste des ordres à droite, noms non cliquables et définitions au survol ou au focus. Ordres communs : Mouvement, Défense, Assaut, Tir, Tir Artillerie, Tir Magique, Recrutement. Gobelins : Déchainement Shamanique et WAAAGGGHHH. Pas d’ordre inventé pour les lignes sans nom du Drive. |
| MAN-STOCK | Les ordres illimités affichent ∞. Compteurs d’exemplaires restants réglés par leur propriétaire : Recrutement commence à 3 (dernier PDF), WAAAGGGHHH à 1 (capture des ordres). Les autres joueurs voient les compteurs. Aucun stock n’est consommé automatiquement ni contrôlé pour autoriser une action. Les limites 4/2/1 des ordres de faction incomplets ne sont pas extrapolées. |
| MAN-MOVE | Glisser une de ses unités avec le bouton gauche éclaire les destinations possibles. Le dépôt valide le mouvement. Annuler le geste ou lâcher hors d’une case autorisée ne déplace rien. Alternative clavier/tactile : sélectionner l’unité puis une case ; Échap annule la sélection de déplacement. |
| MAN-RANGE | Limite par geste : Troupe, Tir, Élite, Unique = 1 point ; Cavalerie = 3 ; Artillerie = 0. Déplacement orthogonal par cases libres, changement d’axe coûte un point supplémentaire, pas de retour dans la zone de départ après l’avoir quittée dans un même geste. Même géométrie que le moteur précédent, conformément à la demande de conserver le mouvement. |
| MAN-FREE | Pas de consommation de mouvement pour le tour, blocage après un tir, blocage d’engagement ou attaque gratuite de désengagement. Un joueur peut effectuer plusieurs gestes successifs. Le respect du nombre d’actions et des ordres appartient aux joueurs. |
| MAN-RESERVE | Réserve personnelle visible sous son côté du plateau, avec quantité et coût sous l’illustration. Son contenu n’est jamais transmis à l’adversaire : seul le total est public. Glisser un exemplaire ou utiliser Recruter puis choisir une case vide le fait entrer. Aucun budget, paiement de PS, zone imposée ni contrainte de type pour les renforts dans ce mode. |
| MAN-INSTANCES | Chaque exemplaire entré possède une identité. Une entrée diminue la réserve une seule fois ; déposer deux fois le même exemplaire ou sur une case devenue occupée est refusé. Un exemplaire retiré du plateau ne retourne pas en réserve. |
| MAN-PS | Chaque joueur ajuste ses points stratégiques par +/− ; l’adversaire voit la valeur. Aucun calcul de contrôle, gain, dépense ou bonus d’ordres automatique. |
| MAN-R | Cliquer une unité alliée affiche son compteur de R dans les outils à droite. Son propriétaire peut augmenter ou diminuer R, y compris au-dessus du profil initial. À 0 R, l’unité reste sur le plateau jusqu’au retrait explicite. Aucun jet ne modifie R. |
| MAN-DISCARD | Retirer du plateau place l’exemplaire dans la défausse et supprime ses liens d’engagement et sa comparaison active. On peut le remettre sur une case vide depuis sa défausse, avec ses R conservés, sans recréer un exemplaire ni modifier la réserve. |
| MAN-DUEL | Clic droit sur une unité : attaquant ; clic droit sur une unité du camp opposé : défenseur. Cliquer à nouveau l’attaquant efface la comparaison ; après une paire complète, un nouveau clic droit commence une comparaison. Alternative : touche C sur une carte, ou sélecteurs Attaquant/Défenseur. Les deux joueurs voient la même paire et ses repères sur le plateau. |
| MAN-HIT | L’aide affiche le nombre de D6 du profil et le seuil du tableau des touches : C contre DC ou T contre DT selon le mode de l’attaquant. Seuil = 4 − (attaque − défense), borné à 2+ / 6+. Écart ≥ 3 : indication de relance des échecs ; écart ≤ −4 : indication de confirmation des réussites. Score offensif absent : aucun seuil. Source : tableau des touches du PDF p. 5 et arbitrage T contre DT. |
| MAN-ADVICE | Comparaison possible entre n’importe quelles unités de camps opposés déjà révélées, sans contrôle ni avertissement de portée, d’engagement ou de type. Les bonus de charge, surnombre, effets et pertes sont arbitrés par les joueurs. La comparaison n’exécute aucune attaque. |
| MAN-DICE | Lanceur indépendant : le joueur choisit 1 à 100 D6 et déclenche le jet. Bouton facultatif pour reprendre le nombre de dés du profil de l’attaquant. Les dés sont tirés côté serveur et visibles des deux joueurs, avec auteur et tour. Les 20 derniers jets sont conservés. Pas de relance, comptage de touches ou application des dégâts automatique. |
| MAN-ENGAGE | Sur une paire attaquant/défenseur, Marquer un engagement crée un lien explicite ; Retirer l’engagement le supprime. Les deux unités ont une bordure rouge et une ligne rouge les relie. Plusieurs liens sont possibles. Ni contrôle d’adjacence, ni charge ni dégâts automatiques ; les liens persistent quand les unités sont déplacées, jusqu’à retrait manuel ou défausse. |
| MAN-SYNC | Convex contrôle l’appartenance à la partie, la propriété pour déplacer/recruter/modifier R/retirer/remettre une unité, la géométrie de mouvement, les cases libres et les exemplaires disponibles. Compteurs par deltas atomiques ; mouvement contrôlé sur la case de départ, recrutement sur le nombre déjà entré. Une action indépendante adverse ne rend pas tous les boutons obsolètes. |
| MAN-PERSIST | Positions, R, réserves, défausse, compteurs, comparaison, engagements et jets sont enregistrés et repris après reconnexion. L’interface bloque les actions pendant la perte de connexion. |
| MAN-LOG | Journal public des déplacements, recrutements, engagements, retraits et corrections de tour : 150 événements conservés, 20 affichés. Aucune identité de réserve non révélée n’y figure. |
| MAN-END | Pas de score final ou de victoire imposée. Les joueurs concluent la partie et quittent la table ; le départ ferme la table aux deux joueurs et libère leurs places. |

Les compteurs sont bornés techniquement à 0–999 (tour : 1–999), et le lanceur à 100 dés par jet. Ce sont des limites d’interface et de stockage, pas des quotas de jeu.

## 5. WIP, règles laissées aux joueurs et éléments reportés

- **Préparation conservée** : deck de faction unique, budgets et quotas du §2, sélection privée et placement de toutes les unités choisies du §3. Les demandes de simplification portent sur le plateau après cette préparation.
- **Arbitrage manuel** : ordres exécutés, nombre d’actions, coûts de recrutement, points stratégiques, légalité des tirs/combats, modificateurs, relances, blessures et victoire. Le moteur automatique précédent est supprimé.
- **Décors et événements** : toujours reportés. Pas de placement de décor, ligne de tir obstruée ou événement automatique.
- **Capacités et ordres de faction** : définitions WIP conservées pour consultation. Aucune capacité n’exécute un effet automatique. Les nouveaux ordres sans nom, effet ou stock défini restent à documenter.
- **Réserve** : le coût est indicatif ; les joueurs choisissent eux-mêmes où et combien recruter. Seuls l’espace libre et la possession réelle de l’exemplaire sont imposés.
- **Profils** : les valeurs WIP du catalogue ne sont pas arbitrées par ce lot ; se référer au §1.

## 6. Suivi de l’implémentation

- Un seul fonctionnement de partie : préparation commune puis plateau manuel, identifié par `2026-09-08-manual-1`. Les anciennes phases, actions automatiques, schémas et écrans ont été supprimés à la demande de Nicolas le 8 septembre. Aucun mode de compatibilité n’est maintenu.
- La [référence précédente](archive/regles-actions-2026-09-06.md) est conservée uniquement comme historique documentaire pour comparer les règles ; elle ne décrit plus un moteur disponible.
- Les cartes et ordres d’une partie sont copiés depuis le catalogue lors de sa préparation ; leurs profils restent stables pendant cette partie.
- Ce document décrit la branche qui le contient, pas nécessairement la production. La preview du lot utilise Convex dev ; la production n’est pas modifiée par sa publication.
- Vérifications : [mutations manuelles](../convex/manual.ts), [tests serveur](../convex/manual.test.ts), [parcours fonctionnel à deux joueurs](../src/functional/manualBattle.test.tsx), [parcours complet de préparation](../src/functional/gameFlow.test.tsx), [géométrie et tableau des touches](../shared/battleEngine.test.ts). Les tests propres aux anciens moteurs sont supprimés ; les tests de préparation suivent le parcours unique.
