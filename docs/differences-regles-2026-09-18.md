# Comparaison des règles reçues le 18 septembre 2026

**Mise à jour après le lot B :** les réponses du créateur remplacent les quatre hypothèses ci-dessous. Ce diff conserve la chronologie ; les arbitrages et leur référence consolidée sont conservés dans le dépôt local `paff-simulator`. Le vocal précise le départ de Ligne Verte dans la zone suivante ; les quatre questions sont résolues.

**Statut : comparaison terminée, puis mise à jour du catalogue et des aides du site autorisée par Nicolas avec quatre hypothèses provisoires.** Le moteur V2 reste historique ; sa mise en conformité appartient au lot V3 suivant. Voir le bilan d’application en section 8. Travail poursuivi sur `codex/bande-du-sef-illustration-tarres`. La correction précédente du nom Bande du Sef et de l’illustration des Gros tarrés est conservée. Aucune campagne ni publication lancée.

## Sources et méthode

- Nouvelle source : **PAFF 2026 (3).pdf**, 10 pages, transmis par Nicolas le 18 septembre. SHA-256 : `7eb3b911c27c60aff60115d38dd3103c0ab55d99c0f8049c401fc793dcc0cde9`.
- Comparaison directe : **PAFF 2026 (2).pdf**, 9 pages, reçu le 15 septembre. SHA-256 : `23e59c8767924b83861b6f57bf9cd7bd91e22ad289f247c88567846826022ae0`.
- Comparaison avec les arbitrages consolidés dans `paff-simulator`, les [comportements du site](regles-implementees.md), le catalogue partagé et le moteur de simulation.
- Texte comparé en neutralisant les changements de pagination et d’espacement. Contrôle visuel des règles, des ordres, des unités, des capacités et des images du tableau des touches. Ce contrôle est nécessaire : **la ligne barrée de la Bande du Sef et le nouveau tableau des touches ne ressortent pas du seul diff textuel**.

Les pages ci-dessous désignent le nouvel export, sauf mention contraire. Règles générales : p. 1–6 ; ordres : p. 7 ; unités : p. 8 ; capacités : p. 9 ; note d’attente : p. 10. La date du 18 septembre est celle de réception, pas une date de rédaction certifiée.

## 1. Unités — page 8

| Unité | PDF précédent / catalogue actuel | Nouveau PDF | État à prévoir |
| --- | --- | --- | --- |
| Chevaucheurs de Skrans Gobelins | Coût **1** | Coût **2** | Mettre à jour le coût ; profil, type et absence de capacité inchangés. |
| Gros tarrés de gobelins | Coût **2** | Coût **1** | Mettre à jour le coût ; conserver la nouvelle illustration fournie séparément. Autres caractéristiques inchangées. |
| Bande du Sef | Élite, coût 3, R 5, 4 dés, C 3, DC 3, DT 2 | Même profil, mais **ligne rouge barrée**, statut MAJ | **Retrait du catalogue actif confirmé par Nicolas**, en conservant les anciennes parties. Ne pas interpréter cette ligne comme une simple mise à jour du nom. |
| Djil, meneur de Trolls | Absent | **Unique, coût 4, R 3, 2 dés, C 4, DC 5, DT 5** ; capacité vide | Nouvelle identité distincte des Trolls et de la Bande du Sef. Interaction avec les exclusions « Trolls » à préciser en Q4. Le PDF indique « illu à trouver ». |

**Aucun changement de caractéristiques des dix unités Sephosi.** Les autres profils Gobelins sont inchangés. Avec le retrait confirmé de la Bande du Sef et l’ajout de Djil, le catalogue actif restera à **20 unités : 10 Gobelins et 10 Sephosi**.

Le nom « Bande du Sef » figurait déjà dans le PDF précédent ; sa correction dans le projet précède ce diff. Les annotations anciennes « Rajouter style 2 en R ? », « WTF » et « Stratégie et solidité » disparaissent, sans nouvelle modification des valeurs correspondantes.

## 2. Ordres — page 7

Les **12 ordres**, leurs catégories et leurs limites de sélection restent identiques. Trois descriptions changent :

| Ordre | Avant | Maintenant | Écart avec le projet |
| --- | --- | --- | --- |
| Pause-déjeuner | Sacrifice adjacent pour rendre 1 R à un Troll, applicable à plusieurs Trolls. | Ajout explicite : **ne fonctionne pas pour Djil**. | Exclusion à afficher et à formaliser. Le sens de « Troll » pour les sacrifices reste à préciser en Q4. Conserver l’arbitrage : un sacrifice / +1 R par Troll et par ordre, dépassement des R initiaux autorisé. |
| Tir concentré | Bonus si **plusieurs unités** tirent sur une cible pendant le tour. | Choisir une cible ennemie et **une zone** ; les unités de cette zone peuvent immédiatement tirer sur cette cible avec **+1 dé**. | Zone et résolution immédiate déjà consolidées ; le texte public est en retard. La condition de plusieurs tireurs disparaît du PDF : confirmer le cas d’un seul tireur en Q3, car le moteur exige actuellement au moins deux tireurs par zone. |
| Fureur divine | Recruter et déployer des Anges dans toute zone, sans coût explicité dans cette ligne. | Ajout : **payer le coût en points de recrutement**. | Déjà confirmé par Adrien et appliqué au moteur hors ligne ; description publique à compléter. Les PS restent utilisables et aucun ordre Recrutement commun supplémentaire n’est requis, selon les réponses précédentes. |

Pour Tir concentré, les conditions ordinaires de tir restent requises : unités capables de tirer, portée, même axe, interdiction de tirer le tour du recrutement, etc. L’artillerie reste admise selon l’arbitrage d’Adrien. « Toutes vos unités » ne donne pas une attaque de tir aux unités C.

Les textes d’Invokation shamanique (dont le résultat 2–3), de La gross Invokation, de Meuteur ! et de Protéger la Salamandre ne sont pas modifiés. La mention « en dépensant son coût » à droite de Fureur divine est une annotation qui répète la modification, pas un deuxième paiement.

## 3. Capacités — page 9

| Capacité | Différence | Conséquence |
| --- | --- | --- |
| Stratège — Vallardi | Le bonus s’applique explicitement **dès le tour d’arrivée et jusqu’à la fin du tour de destruction**. | Déjà consolidé et géré par le simulateur. Mettre à jour le texte partagé encore limité à « à chaque tour ». La réserve ne donne pas de bonus. |
| Repli stratégique — ancienne capacité | La ligne « lancer un dé de P lorsqu’elle se désengage » **disparaît**. | Référence sans unité porteuse dans l’ancien catalogue, encore présente dans `shared/unitAbilities.ts`. Retirer cette définition obsolète du référentiel courant sans casser les copies historiques. **L’ordre Sephosi Repli stratégique reste présent et inchangé.** |

Les onze autres définitions, dont Charge puissante, Ligne Verte et Trollitude, conservent leur texte. Aucune capacité n’est attribuée à Djil dans le tableau des unités.

## 4. Règles générales et combats

| Sujet | Ancien PDF | Nouveau PDF | Comparaison avec les arbitrages / le code |
| --- | --- | --- | --- |
| **Colline** — p. 1 | La charge contre une unité sur une colline ne bénéficie pas du bonus de charge. | L’attaquant qui charge cette unité lance **1 dé de moins au premier jet de combat**. Le +1 dé aux tirs depuis une colline reste. | Vrai changement : malus de dés, au lieu de supprimer le bonus de charge. Lecture littérale : conserver le bonus de cavalerie applicable puis retirer un dé ; aucun décor n’est encore représenté dans le moteur ou sur le plateau manuel. |
| **Ruines** — p. 1 | +1 aux dés de défense. | **−1 dé à l’attaquant**, en combat comme au tir. | Déjà confirmé par Adrien et consigné ; le PDF rattrape cet arbitrage. Décors toujours hors du périmètre implémenté. |
| **Réserve initiale** — p. 1 | Plafond séparé de 12 points. | **Toutes les unités non déployées vont en réserve** ; plafond séparé supprimé. | Déjà appliqué sur demande de Nicolas : jusqu’à 21 points déployés, sans minimum, deck de 33 maximum. |
| **Zone de recrutement** — p. 4 | Toute présence ennemie empêche le recrutement ordinaire. | Seule la présence d’une unité ennemie **non engagée** l’empêche. | Vrai changement. Une case libre de Base/Arrière devient utilisable si tous les ennemis de la zone sont engagés. `legalRecruitCell` interdit encore toute présence ennemie ; ce contrôle sert aussi aux renforts gratuits. |
| **Définition de la charge** — p. 4 | La charge exige l’adjacence et une unité attaquante non engagée ; note marginale sur la fin du bonus générique. | Précise que la charge **crée l’engagement**, avec **+1 dé pour la cavalerie** contre la cible chargée. | Correspond aux règles déjà consolidées : pas de déplacement ni de bonus générique. La répétition du +1 de cavalerie dans deux phrases ne donne pas +2. Charge puissante reste +3 au lieu de +1 si déplacement préalable. |
| **Surnombre** — p. 4–5 | Paragraphe accordant des relances au camp en surnombre. | **Paragraphe entièrement absent**. | **Suppression des relances confirmée par Nicolas** le 18 septembre, remplaçant l’arbitrage précédent d’Adrien. Le moteur les applique encore : correction à faire. |
| **Tableau des touches** — p. 4–5 | Cases 2+(r), 6+(r) et légende des relances/confirmations. | **Toutes les mentions (r) et la légende disparaissent.** Les 36 seuils de base restent identiques. | Déjà conforme au socle consolidé et au calcul courant, qui utilise des seuils entre 2+ et 6+. Cette suppression des relances du tableau est distincte de la nouvelle suppression du surnombre. |

**La simultanéité des dégâts sur toute la phase, charges comprises, était déjà écrite dans l’ancien PDF.** L’alternance des charges puis la résolution des combats restants restent écrites dans les deux versions. Le nouveau texte ne réintroduit ni une deuxième attaque pour une unité qui a chargé, ni une attaque annulée par une destruction pendant la même phase. Les arbitrages reçus restent nécessaires pour ces précisions.

## 5. Passages inchangés à ne pas confondre avec de nouvelles décisions

Le nouveau PDF ne réécrit pas toutes les précisions d’Adrien ou de Nicolas. Les formulations suivantes existaient déjà dans le précédent export ; leur présence seule ne justifie pas d’annuler une réponse explicite :

- **Recrutement :** la ligne de l’ordre indique encore 3 points par sélection et le cumul de deux/trois ordres pour 6/9 points. Conserver le **stock +3 aux tours 2/4/5**, conservé et librement dépensable, déjà adopté. Le déblocage distinct des trois sélections aux tours **2/3/4** est bien maintenu p. 3 ; seule la note marginale « au lieu de tour 3-4-5 » disparaît. Ne pas redemander l’adoption du stock déjà confirmée.
- **Portée :** le texte emploie encore « zones », alors que le projet et la réponse d’Adrien retiennent **3 cases / 4 pour l’artillerie**, distance horizontale et verticale dans le même axe.
- **Élimination :** la p. 6 indique encore une victoire en fin de tour ; Adrien a explicitement retenu la défaite dès qu’une armée est vide, après résolution complète de l’effet, et l’égalité si les deux sont détruites simultanément.
- **Première pose et axes :** conserver la première unité sur la case centrale E5/E2 et l’interdiction des combats entre axes, précisées par Nicolas. Le schéma du plateau est identique entre les PDF ; le surcoût du changement d’axe et l’interdiction des tirs entre axes sont inchangés.
- **Événements :** encore présents en tant que règles optionnelles dans le PDF, mais explicitement exclus par Adrien pour le périmètre retenu.
- **Défense :** le texte emploie encore DA, tandis que les profils distinguent DC/DT ; maintenir C contre DC et T contre DT. La mention « trois ordres communs » en liste quatre : incohérence rédactionnelle déjà présente.

La construction à 33 points, les quotas par type, les huit tours, l’alternance des ordres et de l’initiative, le contrôle des zones, les gains de PS et la victoire par Base Centre ne présentent pas de nouveau changement. La note d’attente de dernière page est inchangée.

## 6. Réponses et hypothèses de travail

Réponses explicites reçues pendant la comparaison ; aucune option proposée dans l’interface ne vaut validation automatique.

1. **Bande du Sef — confirmé :** Nicolas demande son retrait du catalogue actif, en conservant les anciennes parties.
2. **Surnombre — confirmé :** Nicolas demande la suppression de ses relances. Cette décision remplace la précédente confirmation d’Adrien.
3. **Tir concentré — hypothèse autorisée :** un seul tireur éligible suffit pour jouer l’ordre et obtenir +1 dé, conformément à la lecture littérale du nouveau texte.
4. **Djil — hypothèse autorisée :** Troll sans Trollitude, donc non affecté par La gross Invokation et non sacrifiable avec Ligne Verte / Pause-déjeuner. L’interdiction de le soigner avec Pause-déjeuner est, elle, explicite dans le PDF. Ce choix s’appuie sur son profil proche des Trolls ; il reste révisable, son nom seul ne constituant pas une preuve.

Le PDF **ne répond pas** aux anciennes questions sur le doublement des dés supplémentaires par La gross Invokation et la poursuite de Ligne Verte après la mort du Danzereu. Nicolas autorise des hypothèses : **doubler aussi les dés supplémentaires, puis retirer Pluie** ; **arrêter Ligne Verte après résolution complète des dégâts qui détruisent le Danzereu**. Ce ne sont pas des réponses du créateur. La question précédente sur le calcul du surnombre avec les charges ultérieures est désormais **sans objet**, puisque Nicolas confirme sa suppression.

## 7. Plan établi à l’issue du diff

- **Catalogue et textes :** `shared/catalogue2026.ts`, `shared/orders.ts`, `shared/unitAbilities.ts`, métadonnées et vérifications de `convex/catalogue2026.ts` / `convex/catalogue2026.test.ts`. Versionner les nouvelles valeurs. Attribuer une nouvelle identité à Djil ; ne pas réutiliser l’identifiant historique `gobelins-meneurs-de-troll`, qui désigne les Trolls actuels. L’illustration de Djil reste à fournir/choisir.
- **Archivage de la Bande du Sef :** utiliser le mécanisme existant, qui conserve la carte dans les anciens decks et les copies des parties. Aucune suppression de données ni conversion automatique de cette unité en Djil.
- **Moteur :** mettre à jour les conditions de recrutement, Tir concentré et supprimer les relances de surnombre dans `analysis/simulation/orders.ts` et `combat.ts`. La distinction Troll/Gobelin est actuellement déduite de Trollitude pour plusieurs effets ; Djil impose de la rendre explicite selon Q4. Les décors nécessitent un lot distinct puisqu’ils ne sont pas modélisés.
- **Decks de test :** les trois decks Gobelins de `analysis/simulation/decks.ts` contiennent chacun quatre Bandes du Sef et sont donc tous à reconstruire. Le seul changement de coût des Skrans ferait par ailleurs passer les decks 3/6 Skrans de 33 à **36/39**, et leurs sélections initiales de 21 à **24/27**, avant retrait des Bandes du Sef. Il faut revoir leur composition avant toute nouvelle campagne.
- **Historique des simulations :** le moteur lit actuellement le catalogue partagé courant. Préserver la version et les données de référence V2 ; ne pas relancer ses traces avec des coûts ou des identités différents. Comparer ensuite V2/V3 sur un même nouveau socle de règles et de decks validés, sans mélanger les anciens résultats avec ceux de cette révision.
- **Références et validation :** mettre à jour les règles consolidées et le suivi d’implémentation dans le lot effectif ; vérifier les changements par des situations ciblées et les contrôles habituels du dépôt. Le diff initial était documentaire. L’application autorisée ensuite est détaillée ci-dessous ; aucune campagne d’équilibrage n’est relancée.


## 8. Application autorisée le 18 septembre

Nicolas demande d’avancer avec les hypothèses les plus logiques, de commiter les règles/unités/ordres, puis d’ouvrir une branche V3. La mise à jour garde le fonctionnement manuel du site : elle ne transforme pas ses ordres en actions automatisées.

- **Catalogue `2026-09-18` :** coûts Skrans/Gros tarrés actualisés ; Djil créé sans capacité, avec l’illustration existante des Trolls provisoirement ; Bande du Sef archivée avec son nom corrigé, références de decks et copies des parties conservées. Les identités ne sont pas réaffectées.
- **Ordres et capacités :** descriptions révisées de Recrutement, Tir concentré, Pause-déjeuner, Fureur divine, Stratège, Ligne Verte et La gross Invokation. Retrait de l’ancienne capacité Repli stratégique, conservation de l’ordre. Les quatre hypothèses sont décrites en section 6 et dans la référence consolidée ; les autres précisions déjà arbitrées restent acquises.
- **Aide au combat :** suppression de toute suggestion de relance/confirmation du tableau pour les joueurs et spectateurs. Seuils numériques inchangés. Aucun calcul automatique de surnombre n’existait sur le site. L’aide commune actualise aussi les anciennes parties, sans mutation de leurs cartes, ordres, jets ou dégâts. Les nouveaux catalogues d’ordres et profils ne remplacent pas les copies des parties déjà préparées.
- **Version de partie :** `2026-09-18-manual-1`. Colline et ruines documentées, sans ajout d’un système de décors. Le recrutement dans une zone avec ennemis tous engagés est indiqué dans l’ordre ; le placement reste libre sur le plateau manuel, comme auparavant.
- **Historique V2 :** catalogue et ordres figés dans `analysis/reference/`, repris depuis `e382f4a` pour garder les noms, coûts, capacités et compositions utilisés dans les anciennes campagnes. Les imports et empreintes des scripts suivent ces références. Les calculs historiques du tableau avec (r) restent disponibles pour l’audit comparatif, indépendamment de l’aide du site. Aucun JSON, résultat ou rejeu publié n’est régénéré.
- **Suite V3 :** porter ces règles dans le moteur, corriger les écarts connus du 16 septembre, reconstruire les decks, couvrir les capacités et améliorer les pilotes. Le moteur historique conserve encore le surnombre et l’ancienne restriction de recrutement. Les tests V2 ne prouvent donc pas l’application du nouveau socle au simulateur. La branche `codex/simulateur-v3` doit partir du commit du présent lot, sans fusion ni publication implicite.

### Validation du lot

`npm run check` réussi : lint, types de l’analyse, **329 tests dans 34 fichiers**, types et build du client. `npx tsc --noEmit -p convex/tsconfig.json` réussi. Les contrôles couvrent les 36 seuils de touche sans relance, l’archivage de la Bande du Sef sans conversion des anciennes copies, la possibilité de la retirer d’un deck et la conservation des coûts/compositions V2. Liens documentaires et `git diff --check` vérifiés.

Développement **grateful-warthog-543** : `npx convex dev --once` réussi, puis `npx convex run catalogue2026:apply` : **1 création, 19 mises à jour, 1 archivage**. Lecture du catalogue : dix Gobelins actifs, Djil à 4 points sans capacité, Skrans à 2, Gros tarrés à 1, Bande du Sef absente du catalogue public. Aucune modification des données de production, aucune fusion dans main, aucun push ni campagne de simulation pour ce lot.
