# Différences — règles reçues le 10 septembre 2026

Comparaison de `PAFF 2026.pdf` (10 pages) avec `PAFF 2026 - Règles (1).pdf` (6 pages, reçu le 6 septembre), le tableau de profils transmis le 8 septembre et l’[état implémenté du 8 septembre](archive/regles-manuel-2026-09-08.md). Source de la mise à jour : PDF fourni par Nicolas ; les annotations « modif éventuelle » ne remplacent pas les valeurs des colonnes du tableau.

## Règles générales et ordres

L’extraction textuelle des pages 1 à 6 montre une seule différence : l’ajout de **Tir Artillerie, illimité**, dans la liste des ordres communs (p. 2). Le texte annonce toujours « trois ordres » alors que la liste et le tableau p. 7 en comptent quatre. Les budgets 33/21/12, les quotas de types, le déploiement, la géométrie de mouvement, le tableau des touches, les huit tours du jeu papier et les conditions de victoire sont conservés. Le plateau et le tableau des touches ont aussi été vérifiés visuellement.

Le PDF regroupe désormais les ordres (p. 7), les profils (p. 8) et les capacités (p. 10). La p. 9 est une note d’attente, sans règle supplémentaire.

Dans l’application, les quatre ordres communs deviennent **Mouvement, Tir, Tir Artillerie, Recrutement**. Les anciennes entrées Défense, Assaut et Tir Magique sont retirées des nouvelles parties. La capacité Tir magique du Shaman est conservée. Recrutement précise les 3 points par sélection, cumulables à 6 ou 9 dans une même phase, et l’interdiction de tirer pour les recrues ce tour-ci. Le compteur commence toujours à 3.

Déchainement Shamanique et WAAAGGGHHH restent visibles avec leur statut « à mettre à jour ». Les autres ordres de faction sans nom ne sont pas créés. Les limites de la p. 3 (4/2/1) et des lignes WIP de la p. 7 (3/3/unique) restent divergentes : aucun stock fictif n’est attribué à une ligne vide.

## Unités modifiées

Les deux factions passent de **15 à 20 cartes publiées : 10 Gobelins et 10 Sephosi**. Toutes les lignes de la p. 8 sont marquées OK.

| Unité | Avant (8 septembre) | Maintenant (PDF p. 8) |
| --- | --- | --- |
| Bande de Gobelins | 3 R | **2 R** ; autres valeurs identiques |
| Trolls | Coût 4 ; 3 R ; 2 dés ; 6C ; DC 3 ; DT 2+ | **Coût 3 ; 2 R ; 2 dés ; 4C ; DC 5 ; DT 5** |
| Bande du chef (« Bande du Sef » dans le PDF) | 2 R ; 3 dés ; DT 5+ | **5 R ; 4 dés ; DT 2** ; coût 3, 3C, DC 3 conservés |
| Anges Protecteurs | 1 R ; 3 dés ; DC 5 ; DT 3+ | **2 R ; 2 dés ; DC 3 ; DT 2** ; coût 4 et 4C conservés |
| Aides de camp | 0 dé ; attaque absente mais mode C ; DT 6+ | Renommés **Porte-ordres Sephosiens** ; **aucun dé ni mode d’attaque ; DT 1** ; autres valeurs conservées |

Les dix autres profils déjà publiés conservent leurs valeurs numériques. Les descriptions de leurs capacités sont remplacées par les définitions du nouveau PDF lorsqu’une capacité est attribuée.

## Unités ajoutées ou réactivées

| Unité | Type | Coût | R | Dés | Attaque | DC | DT | Capacité |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | --- |
| Gros tarrés de gobelins | Élite | 2 | 1 | 1 | 5C | 1 | 1 | — |
| Le Danzereu | Unique | 2 | 1 | 2 | 3T | 1 | 1 | Ligne Verte |
| Blop, le Meuteur | Unique | 2 | 3 | 2 | 3C | 2 | 1 | Meuteur ! |
| Maréchal Vallardi | Unique | 2 | 1 | — | — | 1 | 1 | Stratège |
| Régiment de la Salamandre | Unique | 4 | 3 | 3 | 4C | 4 | 4 | — |

**Précision finale de Nicolas :** les `x` offensifs de Vallardi signifient « valeurs nulles, il n’en possède pas ». Ils sont donc représentés par zéro dé, aucun mode offensif et un score absent, comme les Porte-ordres. L’interface affiche « — », sans inventer de C/T ni de seuil d’attaque.

Le Gros tarré et la Salamandre réutilisent leurs anciennes cartes archivées. Le renommage des Porte-ordres conserve l’identité des Aides de camp. Le nom « Bande du chef » conserve la correction déjà demandée par Nicolas. Les références de decks et les illustrations existantes sont conservées. Les illustrations des Skrans, de la Katapult et du Danzereu, fournies ensuite par Nicolas le 10 septembre, remplacent leurs visuels d’attente. Seuls Blop et Vallardi conservent le visuel d’attente.

## Capacités définies et application

Le PDF p. 10 définit treize capacités ; douze sont attribuées aux unités de la p. 8. Les textes complets deviennent consultables sur les cartes.

| Capacité | Effet de référence | Traitement dans ce lot |
| --- | --- | --- |
| Vol | Mouvement de cavalerie en survolant décors et unités | **Implémenté** pour la portée de 3 points et le passage au-dessus des unités ; arrivée libre et coût de changement d’axe contrôlés. Décors toujours reportés. |
| Meuteur ! | Blop absent du déploiement initial ; 1D3 Skrans gratuits à son arrivée | **Interdiction initiale implémentée** en interface et au serveur. Recrutement de Blop et Skrans gérés par les joueurs, sans génération automatique. |
| Appui stratégique | Répéter un ordre dans un autre axe contenant des Porte-ordres | Définition affichée ; arbitrage manuel. |
| Charge puissante | Après mouvement ce tour, +3 dés de charge au lieu de +1 | Définition affichée ; modificateur manuel. |
| Ligne Verte | Sacrifice d’un gobelin adjacent ; tirs successifs en ligne, +1 dé/+1 A ; dégâts adjacents sur un 6 | Définition complète affichée ; cibles, jets et pertes manuels. |
| Mur de lance | Annuler les dés supplémentaires de l’unité qui charge | Définition affichée ; modificateur manuel. |
| Pluie de gobs | Une touche impose −2 aux dés ce tour, sans dégâts | Définition affichée ; malus manuel. « Pluie de Gob » p. 10 est harmonisé avec p. 8. |
| Stratège | Un ordre supplémentaire par tour | Définition affichée ; le plateau ne limite déjà pas le nombre d’ordres. |
| Tir en mêlée | Chaque résultat de 3 ou moins au jet préalable redirige le dé de tir vers l’allié | Définition affichée ; jets et cibles manuels. |
| Tir en mouvement | Déplacer et tirer durant le même tour | Définition affichée ; le plateau manuel n’impose pas de verrou après mouvement/tir. |
| Tir magique | Ignorer capacités défensives et protections des décors | Définition affichée ; arbitrage manuel. |
| Trollitude | D6 : attaque alliée / inaction / attaque normale / dé supplémentaire | Définition affichée ; jet et conséquence manuels. |
| Repli stratégique | Dé P au désengagement | Référencé mais non attribué à une unité du tableau ; aucun dé P inventé. |

## Préservation du plateau manuel

Les décisions de Nicolas du 8 septembre sur le plateau manuel restent en place : tours, ordres, bonus, jets, pertes, points stratégiques et victoire sont arbitrés par les joueurs. Cette mise à jour ne rétablit pas le moteur de combat automatique supprimé. Elle met à jour le catalogue, les textes d’ordres, les capacités, la géométrie de Vol et la préparation de Blop.

Les profils et capacités déjà copiés dans une partie restent figés. Les nouvelles capacités possèdent un identifiant dans cette copie ; une ancienne mention WIP « Vol » n’acquiert donc pas un nouvel effet rétroactivement. Le catalogue d’ordres d’une bataille commencée reste lui aussi inchangé. La migration du catalogue est idempotente et ne supprime ni decks ni parties.

La version courante est documentée dans [Règles implémentées](regles-implementees.md). Catalogue : `2026-09-10` ; nouvelles parties : `2026-09-10-manual-1`.
