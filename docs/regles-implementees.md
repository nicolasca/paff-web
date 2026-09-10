# PAFF — règles implémentées

**État du 10 septembre 2026 · version de partie `2026-09-10-manual-1` · catalogue `2026-09-10`.**

Ce document décrit le comportement du site de cette version. Il sert de référence pour comparer l’application avec les prochaines versions du Drive. Il ne remplace pas les règles du créateur : les points encore provisoires sont indiqués explicitement.

Sources : PDF « PAFF 2026 – Règles », huit captures du Drive du 6 septembre 2026 (12:22:29 à 12:23:34) et décisions de Nicolas : sélection privée avant initiative, placement obligatoire de toute la sélection, décors reportés, correction des placements, « Bande du chef », remplacement des Meneurs de Troll par Trolls et points stratégiques déclarés manuellement pour l’ancienne démo. Nouvelle référence : PDF « PAFF 2026 – Règles (1).pdf » transmis le 6 septembre 2026, pages 1–6. Arbitrages de Nicolas pour cette version : portée de tir en **cases**, **T contre DT, puis 1 R perdu par touche**, sans sauvegarde.

Référence catalogue du 8 septembre 2026 : tableau transmis par Nicolas dans la conversation, colonnes Faction, Nom, Type, Pts déploiement, R, Dés, Cac/Tir, A, DC, DT, Capacités et Statut. Seules les lignes **OK** sont ajoutées ou actualisées. Cette ancienne référence est conservée dans l’[état du 8 septembre](archive/regles-manuel-2026-09-08.md).

Nouvelle référence du 10 septembre : **PAFF 2026.pdf**, 10 pages, fourni par Nicolas. Pages 1–6 : règles générales ; p. 7 : ordres ; p. 8 : unités et tableau des touches ; p. 10 : capacités. Les profils Gobelins et Sephosi sont annoncés terminés. Précision finale de Nicolas : les `x` du Maréchal Vallardi signifient qu’il ne possède ni dés ni attaque. La [comparaison détaillée](differences-regles-2026-09-10.md) conserve les valeurs avant/après.

## 1. Catalogue et profils

| Référence | Comportement appliqué |
| --- | --- |
| CAT-01 | Le catalogue possède quatre factions. Les listes Gobelins et Sephosi de cette révision comptent 20 unités (10 Gobelins, 10 Sephosi), toutes marquées OK dans le PDF p. 8. Orcs et Gaeli conservent leurs anciennes cartes et leurs profils estimés. |
| CAT-02 | Une unité possède un nom, un coût, un type, R (points de Régiment), un nombre de dés, un mode offensif C, T ou aucun, une valeur offensive éventuelle, DC et DT. Vallardi et les Porte-ordres n’ont ni dés ni attaque ; leur carte affiche « — », sans mode C/T fictif. Le nombre de dés est indépendant de C/T. L’affichage du 7 septembre remplace DA par DC et regroupe score et mode, par exemple `4C` ou `3T` ; les valeurs et calculs restent identiques. |
| CAT-03 | Types disponibles : Troupe, Tir, Cavalerie, Artillerie, Élite, Unique. Cavalerie et Artillerie ont leurs limites de mouvement ; le mode C ou T détermine la défense utilisée par l’aide au combat. |
| CAT-04 | Les 12 capacités attribuées aux unités sont affichées avec leur définition du PDF p. 10. Vol est pris en compte dans la géométrie de mouvement et Meuteur ! interdit le déploiement initial de Blop. Les autres effets sont arbitrés par les joueurs sur le plateau manuel ; ils ne sont plus présentés comme des définitions manquantes. Voir CAP-01 à CAP-04 ci-dessous. |
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

Les valeurs viennent du PDF p. 8. Tous les DT sont numériques, sans ancien signe `+`. Les `x` de Vallardi et les tirets des Porte-ordres représentent l’absence d’attaque : zéro dé en données, score `null`, mode `none`, affichage « — ». Ils ne sont pas des profils offensifs en attente.

| Faction | Unité | Coût | Type | R | Dés | C/T | DC | DT | Capacité |
| --- | --- | ---: | --- | ---: | ---: | --- | ---: | ---: | --- |
| Gobelins | Bande de Gobelins | 1 | Troupe | 2 | 3 | C 2 | 2 | 1 | — |
| Gobelins | Archers Gobelins | 1 | Tir | 2 | 3 | T 1 | 1 | 1 | Tir en mêlée |
| Gobelins | Shamans Gobelins | 1 | Tir | 1 | 1 | T 3 | 1 | 1 | Tir magique |
| Gobelins | Chevaucheurs de Skrans Gobelins | 1 | Cavalerie | 2 | 2 | C 2 | 2 | 1 | — |
| Gobelins | Katapult à gobs | 2 | Artillerie | 1 | 1 | T 5 | 1 | 1 | Pluie de gobs |
| Gobelins | Trolls | 3 | Élite | 2 | 2 | C 4 | 5 | 5 | Trollitude |
| Gobelins | Gros tarrés de gobelins | 2 | Élite | 1 | 1 | C 5 | 1 | 1 | — |
| Gobelins | Bande du chef | 3 | Élite | 5 | 4 | C 3 | 3 | 2 | — |
| Gobelins | Le Danzereu | 2 | Unique | 1 | 2 | T 3 | 1 | 1 | Ligne Verte |
| Gobelins | Blop, le Meuteur | 2 | Unique | 3 | 2 | C 3 | 2 | 1 | Meuteur ! |
| Sephosi | Lanciers Sephosiens | 3 | Troupe | 3 | 2 | C 3 | 4 | 3 | Mur de lance |
| Sephosi | Epéistes Sephosiens | 3 | Troupe | 3 | 3 | C 4 | 3 | 2 | — |
| Sephosi | Arbalétriers Sephosiens | 2 | Tir | 2 | 2 | T 3 | 1 | 2 | — |
| Sephosi | Cavalerie lourde Sephosienne | 3 | Cavalerie | 2 | 1 | C 4 | 3 | 2 | Charge puissante |
| Sephosi | Arbalétriers Montés | 2 | Cavalerie | 1 | 1 | T 3 | 1 | 1 | Tir en mouvement |
| Sephosi | Balistes Sephosiennes | 2 | Artillerie | 1 | 1 | T 6 | 1 | 1 | — |
| Sephosi | Anges Protecteurs de la Sephosi | 4 | Élite | 2 | 2 | C 4 | 3 | 2 | Vol |
| Sephosi | Porte-ordres Sephosiens | 2 | Élite | 1 | — | — | 1 | 1 | Appui stratégique |
| Sephosi | Maréchal Vallardi | 2 | Unique | 1 | — | — | 1 | 1 | Stratège |
| Sephosi | Régiment de la Salamandre | 4 | Unique | 3 | 3 | C 4 | 4 | 4 | — |

**Noms et identités conservés :** « Bande du Sef » est affichée « Bande du chef », conformément à la correction de Nicolas du 6 septembre. « Baliste Sephosiennes » est harmonisé en « Balistes Sephosiennes ». « Pluie de Gob » (p. 10) et « Pluie de gobs » (p. 8) désignent la même capacité, affichée « Pluie de gobs ». Troupe de Gobelins, Shaman Gobelin, Meneurs de Troll, Arbalétriers avec Pavois et Arbalétriers Montés conservent leurs identifiants historiques. Aides de camp devient Porte-ordres avec le même identifiant. Le Bon gros tarré et le Régiment de la Salamandre sont réactivés sur leur carte existante, sans dupliquer les références des decks.

**Illustrations :** les Porte-ordres conservent l’ancienne illustration des Aides de camp ; les Gros tarrés et la Salamandre reprennent leur visuel existant. Les images `catagob.png` et `danzereux.png` fournies le 10 septembre illustrent la Katapult à gobs et Le Danzereu. Après validation du nouveau plateau, Nicolas a remplacé les illustrations des Shamans (`gobelins-shaman-gobelin-2.jpg`), des Chevaucheurs de Skrans (`nouveaux-skrans.png`, qui remplace `skrans.png`) et de la Bande de Gobelins (`troupe-gobelins.png`). Elles sont converties en WebP sans recadrage, aux mêmes chemins pour actualiser aussi les cartes déjà présentes dans les decks et les parties. Seuls Blop et Vallardi utilisent encore l’illustration d’attente parmi les 20 profils finalisés.

### Capacités du PDF p. 10

| Référence | Traitement dans l’application |
| --- | --- |
| CAP-01 | **Vol** : mouvement de cavalerie (3 points), survol des cases occupées par un allié ou un ennemi, arrivée sur une case libre seulement. Surcoût de changement d’axe et interdiction de retour dans la zone de départ conservés. Même calcul dans l’interface et au serveur. Les décors ne sont pas encore représentés. |
| CAP-02 | **Meuteur !** : Blop doit rester en réserve pendant la préparation et ne peut pas être placé avec l’armée initiale. Contrôle à la sélection, à sa validation et au placement. Son entrée ultérieure passe par le recrutement manuel normal. Le 1D3 de Skrans gratuits est arbitré par les joueurs ; aucune unité supplémentaire n’est générée automatiquement. |
| CAP-03 | Définitions complètes consultables pour **Appui stratégique, Charge puissante, Ligne Verte, Mur de lance, Pluie de gobs, Stratège, Tir en mêlée, Tir en mouvement, Tir magique et Trollitude**. Les joueurs appliquent les bonus, malus, cibles, relances, sacrifices, blessures et ordres supplémentaires avec les outils manuels existants. Le profil de base de l’aide au combat n’intègre pas ces modificateurs. |
| CAP-04 | **Repli stratégique** figure dans le référentiel de capacités mais n’est attribué à aucune unité du tableau p. 8. Aucun dé P ni effet automatique ajouté. Les identifiants de capacités sont copiés avec les profils ; les anciennes copies WIP sans identifiant ne reçoivent pas rétroactivement Vol ou Meuteur !. |

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
| MAN-ORD | Liste des ordres à droite, noms non cliquables et définitions au survol ou au focus. Ordres communs du PDF p. 7 : Mouvement, Tir, Tir Artillerie, Recrutement. Défense, Assaut et l’ordre Tir Magique sont retirés des nouvelles parties ; Tir magique reste une capacité du Shaman. Gobelins : Déchainement Shamanique et WAAAGGGHHH, explicitement signalés « à mettre à jour » comme dans le PDF p. 7. Pas d’ordre inventé pour les lignes sans nom du Drive. |
| MAN-STOCK | Les ordres illimités affichent ∞. Compteurs d’exemplaires restants réglés par leur propriétaire : Recrutement commence à 3 (dernier PDF), WAAAGGGHHH à 1 (capture des ordres). Les autres joueurs voient les compteurs. Aucun stock n’est consommé automatiquement ni contrôlé pour autoriser une action. Recrutement indique 3 points par sélection, cumulables à 6 ou 9 dans la même phase, avec interdiction de tirer pour les recrues ce tour-ci. Les stocks des lignes de faction sans nom ne sont pas extrapolés ; la divergence entre p. 3 (4/2/1) et p. 7 (3/3/unique, à maj) reste ouverte. |
| MAN-MOVE | Glisser une de ses unités avec le bouton gauche éclaire les destinations possibles. L’entrée sur une case autorisée accepte immédiatement le dépôt, y compris lors d’un geste rapide. Le dépôt valide le mouvement. Annuler le geste ou lâcher hors d’une case autorisée ne déplace rien. Alternative clavier/tactile : sélectionner l’unité puis une case ; Échap annule la sélection de déplacement. |
| MAN-RANGE | Limite par geste : Troupe, Tir, Élite, Unique = 1 point ; Cavalerie = 3 ; Artillerie = 0. Exception Vol : 3 points et survol des cases occupées (CAP-01). Déplacement orthogonal, arrivée libre, changement d’axe coûte un point supplémentaire, pas de retour dans la zone de départ après l’avoir quittée dans un même geste. Même géométrie que le moteur précédent, conformément à la demande de conserver le mouvement. |
| MAN-FREE | Pas de consommation de mouvement pour le tour, blocage après un tir, blocage d’engagement ou attaque gratuite de désengagement. Un joueur peut effectuer plusieurs gestes successifs. Le respect du nombre d’actions et des ordres appartient aux joueurs. |
| MAN-RESERVE | Réserve personnelle visible sous son côté du plateau, avec quantité et coût sous l’illustration. Son contenu n’est jamais transmis à l’adversaire : seul le total est public. Glisser un exemplaire ou utiliser Recruter puis choisir une case vide le fait entrer. Aucun budget, paiement de PS, zone imposée ni contrainte de type pour les renforts dans ce mode. |
| MAN-INSTANCES | Chaque exemplaire entré possède une identité. Une entrée diminue la réserve une seule fois ; déposer deux fois le même exemplaire ou sur une case devenue occupée est refusé. Un exemplaire retiré du plateau ne retourne pas en réserve. |
| MAN-PS | Chaque joueur ajuste ses points stratégiques par +/− ; l’adversaire voit la valeur. Aucun calcul de contrôle, gain, dépense ou bonus d’ordres automatique. |
| MAN-R | Cliquer une unité alliée affiche son compteur de R dans les outils à droite. Son propriétaire peut augmenter ou diminuer R à tout moment sur le plateau, sans attaquant ni défenseur sélectionné, y compris au-dessus du profil initial. À 0 R, l’unité reste sur le plateau jusqu’au retrait explicite. Aucun jet ne modifie R. Ce fonctionnement préexistant est confirmé par le parcours à deux joueurs ; l’aide et le compteur sur l’unité indiquent comment y accéder. |
| MAN-DISCARD | Retirer du plateau place l’exemplaire dans la défausse et supprime ses liens d’engagement et sa comparaison active. On peut le remettre sur une case vide depuis sa défausse, avec ses R conservés, sans recréer un exemplaire ni modifier la réserve. |
| MAN-DUEL | Clic droit sur une unité : attaquant ; clic droit sur une unité du camp opposé : défenseur. Cliquer à nouveau l’attaquant efface la comparaison ; après une paire complète, un nouveau clic droit commence une comparaison. Alternative : touche C sur une carte, ou sélecteurs Attaquant/Défenseur. Les deux joueurs voient la même paire et ses repères sur le plateau. |
| MAN-HIT | L’aide affiche le nombre de D6 du profil et le seuil du tableau des touches : C contre DC ou T contre DT selon le mode de l’attaquant. Seuil = 4 − (attaque − défense), borné à 2+ / 6+. Écart ≥ 3 : indication de relance des échecs ; écart ≤ −4 : indication de confirmation des réussites. Score offensif absent : aucun seuil. Source : tableau des touches du PDF p. 5 et arbitrage T contre DT. |
| MAN-ADVICE | Comparaison possible entre n’importe quelles unités de camps opposés déjà révélées, sans contrôle ni avertissement de portée, d’engagement ou de type. Les bonus de charge, surnombre, effets et pertes sont arbitrés par les joueurs. La comparaison n’exécute aucune attaque. |
| MAN-DICE | Lanceur indépendant : le joueur choisit 1 à 100 D6 et déclenche le jet. Bouton facultatif pour reprendre le nombre de dés du profil de l’attaquant. Les dés sont tirés côté serveur et visibles des deux joueurs, avec auteur et tour. Les 20 derniers jets sont conservés. Pas de relance, comptage de touches ou application des dégâts automatique. |
| MAN-ENGAGE | Sur une paire attaquant/défenseur, Marquer un engagement crée un lien explicite ; Retirer l’engagement le supprime. Une ligne rouge relie les unités, accompagnées d’un petit repère d’engagement. Les cadres conservent la couleur de leur faction. Plusieurs liens sont possibles. Ni contrôle d’adjacence, ni charge ni dégâts automatiques ; les liens persistent quand les unités sont déplacées, jusqu’à retrait manuel ou défausse. |
| MAN-IDENTITY | Sur le plateau et pendant le déploiement, cadre épais permanent selon la faction de la carte, indépendant du joueur qui regarde, de la sélection, de l’attaque et de la défense. Sélection et survol : éclaircissement ; focus clavier : repère clair supplémentaire. Les rôles Att./Déf. utilisent des étiquettes neutres. Les bannières de camp rappellent faction et joueur, y compris pour deux armées de même faction. |
| MAN-SYNC | Convex contrôle l’appartenance à la partie, la propriété pour déplacer/recruter/modifier R/retirer/remettre une unité, la géométrie de mouvement, les cases libres et les exemplaires disponibles. Compteurs par deltas atomiques ; mouvement contrôlé sur la case de départ, recrutement sur le nombre déjà entré. Une action indépendante adverse ne rend pas tous les boutons obsolètes. |
| MAN-PERSIST | Positions, R, réserves, défausse, compteurs, comparaison, engagements et jets sont enregistrés et repris après reconnexion. L’interface bloque les actions pendant la perte de connexion. |
| MAN-LOG | Journal public des déplacements, recrutements, engagements, retraits et corrections de tour : 150 événements conservés, 20 affichés. Aucune identité de réserve non révélée n’y figure. |
| MAN-END | Pas de score final ou de victoire imposée. Les joueurs concluent la partie et quittent la table ; le départ ferme la table aux deux joueurs et libère leurs places. |

Les compteurs sont bornés techniquement à 0–999 (tour : 1–999), et le lanceur à 100 dés par jet. Ce sont des limites d’interface et de stockage, pas des quotas de jeu.

## 5. WIP, règles laissées aux joueurs et éléments reportés

- **Préparation conservée** : deck de faction unique, budgets et quotas du §2, sélection privée et placement de toutes les unités choisies du §3. Les demandes de simplification portent sur le plateau après cette préparation.
- **Arbitrage manuel** : ordres exécutés, nombre d’actions, coûts de recrutement, points stratégiques, légalité des tirs/combats, modificateurs, relances, blessures et victoire. Le moteur automatique précédent est supprimé.
- **Décors et événements** : toujours reportés. Pas de placement de décor, ligne de tir obstruée ou événement automatique.
- **Capacités** : les définitions sont finalisées ; Vol et la restriction de déploiement de Blop sont appliqués. Les autres effets restent à la main des joueurs (CAP-03), conformément au plateau manuel. **Ordres de faction** : encore marqués « à maj » dans le PDF p. 7 ; les lignes sans nom restent exclues.
- **Réserve** : le coût est indicatif ; les joueurs choisissent eux-mêmes où et combien recruter. Seuls l’espace libre et la possession réelle de l’exemplaire sont imposés.
- **Profils** : les 20 profils Gobelins/Sephosi sont définis, y compris l’absence d’attaque de Vallardi. Les estimations Orcs/Gaeli sont conservées. **Points de règle restant ambigus dans le PDF** : protection P de Repli stratégique, origine des Skrans de Meuteur ! (réserve ou création), détails de portée de Ligne Verte ; aucun comportement automatique n’est inventé pour ces points.

## 6. Suivi de l’implémentation

- **Habillage du 10 septembre, validé par Nicolas sur `codex/plateau-cadres-factions`** : terrain herbeux et terre battue, encadrement de table de campagne, zones lisibles et cadres de faction permanents. Le terrain est uniquement décoratif : aucune case bloquée, aucun couvert, aucun changement de mouvement. Ce lot accompagne le remplacement des trois illustrations gobelines. Les lignes d’engagement sont également rétablies dès le premier affichage après reconnexion.

- Un seul fonctionnement de partie : préparation commune puis plateau manuel, identifié par `2026-09-10-manual-1` pour les nouvelles parties. Les anciennes phases, actions automatiques, schémas et écrans ont été supprimés à la demande de Nicolas le 8 septembre. Aucun mode de compatibilité n’est maintenu.
- La [référence précédente](archive/regles-actions-2026-09-06.md) est conservée uniquement comme historique documentaire pour comparer les règles ; elle ne décrit plus un moteur disponible.
- Les cartes et ordres d’une partie sont copiés depuis le catalogue lors de sa préparation ; leurs profils restent stables pendant cette partie.
- Le 10 septembre 2026, les fonctions et le catalogue ont été appliqués à Convex dev, puis à la production `tough-gecko-249` après publication de l’interface sur Vercel : 3 cartes créées, 17 mises à jour, aucune archivée en production. Les 20 profils et les illustrations fournies sont publiés. L’application est idempotente. Les parties préparées conservent leurs cartes figées et les batailles commencées leurs ordres.
- Validation de ce lot : 188 tests réussis, analyse statique et compilation réussies ; contrôle visuel des cartes et des capacités dans le catalogue de développement.
- Vérifications : [mutations manuelles](../convex/manual.ts), [tests serveur](../convex/manual.test.ts), [parcours fonctionnel à deux joueurs](../src/functional/manualBattle.test.tsx), [parcours complet de préparation](../src/functional/gameFlow.test.tsx), [géométrie et tableau des touches](../shared/battleEngine.test.ts). Les tests propres aux anciens moteurs sont supprimés ; les tests de préparation suivent le parcours unique.
