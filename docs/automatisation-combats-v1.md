# Automatisation des tirs et combats — V1

Document de travail évolutif, arrêté avec Nicolas le **29 septembre 2026**, complété le **30 septembre** pour la portée. Référence courante : `2026-09-30-portee-1`. Les arbitrages de cette discussion priment sur les descriptions historiques du catalogue. Ce lot conserve les profils figés des parties et ne modifie pas le simulateur.

**Historique remplacé le 2 octobre 2026 :** la demande d’implémentation des fiches AUTO remplace les mécanismes V1 ci-dessous. Référence actuelle : [règles AUTO implémentées, §4.1](regles-implementees.md#41-tirs-et-corps-à-corps--règles-auto-du-2-octobre), version `2026-10-02-auto-1`. Pluie, Tir en mêlée, Tir magique, Chant des Ancêtres et l’ancien bonus du Chef sont retirés du calcul. Ce document conserve les choix, tests et captures de la V1 comme historique.

## Périmètre retenu

- Automatiser les dés, capacités applicables, touches, pertes de R et défausses. Depuis le 30 septembre, contrôler aussi la distance de tir et l’axe ; conserver aux joueurs le choix des cibles et l'arbitrage des autres règles de zones, engagements, ordres et calendrier.
- Les ordres spéciaux sont exclus du calcul, sauf **La gross Invokation !**, intégrée ensuite à la demande de Nicolas. **Les capacités des unités restent prises en compte** lorsqu'elles concernent le tir ou le corps à corps.
- Hors essais : Druides, Grand Gardien. Hors calcul : Ligne Verte et Trollitude. Le tir ordinaire du Danzereu reste disponible ; ignorer Trollitude signifie utiliser le profil normal du Troll, sans jet de comportement ni bonus. Aucun autre profil n'est rééquilibré.
- Aucun bonus de charge, y compris Charge puissante ; Mur de lance n'a donc aucun effet. Les déplacements existants, dont cavalerie et Vol à trois points, sont conservés.
- Aucun engagement créé par la simple proximité de deux unités. Aucune riposte ni attaque supplémentaire déduite automatiquement du nombre d'adversaires.

## Tir

1. Le joueur annonce oralement l'ordre, la zone de ses tireurs et la zone visée. Appui stratégique, disponibilité des ordres et Tir en mouvement sont arbitrés oralement.
2. En mode **Tir**, il choisit un de ses tireurs : les ennemis à portée sont éclairés en bleu avec leur distance en cases ; les autres sont atténués. Il choisit ensuite une cible éclairée, par clic, clic droit ou clavier. Une flèche bleue apparaît, partagée avec les deux joueurs et les spectateurs. Une cible par tireur ; plusieurs tireurs peuvent viser la même unité. Une flèche peut être remplacée ou retirée avant résolution. La sélection et sa surbrillance restent locales à chaque joueur ; Échap ou changer de mode les efface.
3. Pour Tir en mêlée, s'il existe plusieurs alliés engagés avec la cible, le propriétaire du tireur choisit l'allié exposé avant de lancer. S'il n'y en a qu'un, il est retenu automatiquement.
4. **TIR** résout toutes les flèches de tir du joueur qui lance, simultanément. Les flèches de l'autre joueur ne sont pas exécutées avec les siennes. Aucune validation adverse n'est requise pour cet ordre.
5. Le calcul utilise l'état au début de cette résolution. Toutes les attaques sont lancées avant d'appliquer les pertes cumulées ; tuer une cible n'annule pas les autres tirs prévus contre elle. Les flèches résolues sont ensuite effacées. Le tir ne crée pas d'engagement.

### Portée — décision du 30 septembre

- Tir normal : **3 cases**, artillerie : **4 cases**, dans le **même axe**. Distance = somme des écarts de ligne et de colonne ; une diagonale adjacente compte 2. Une cible dans la même zone est possible et les unités intermédiaires ne font pas écran. Source : réponse du créateur Adrien Q03 après l’audit du 15 septembre, conservée dans `paff-simulator/docs/equilibrage/retours-adrien-01.md`, reprise dans [le diff du 18 septembre, §5](differences-regles-2026-09-18.md#5-passages-inchangés-à-ne-pas-confondre-avec-de-nouvelles-décisions). Cet arbitrage en cases prime sur « zones » dans le PDF du 21 septembre p. 3.
- **Tir longue portée devient une capacité des Archers longs Gaeliens**, et quitte les ordres. Nicolas confirme : tir habituel à 3 cases conservé, plus une quatrième case **droit devant, dans la même colonne**, vers le camp adverse. Siège 0 : lignes décroissantes ; siège 1 : lignes croissantes. Source du sens de tir : PDF du 21 septembre p. 7, conversion et caractère permanent décidés le 30 septembre.
- Le même calcul est utilisé par la surbrillance, le choix de la flèche et le serveur. Une cible hors portée ou dans un autre axe est refusée. Au lancement, toutes les flèches sont revérifiées sur les positions actuelles : si une seule est invalide, **aucun dé ni dégât du lot** n’est appliqué. L’interface signale les flèches devenues hors portée et désactive TIR jusqu’à leur correction.
- Compatibilité : les cartes et catalogues de bataille figés ne sont pas réécrits. Les anciens Archers longs bénéficient aussi de l’extension grâce à leur identité stable. L’ancien ordre copié est masqué dans les listes joueurs/spectateur ; son enregistrement historique est conservé. Les nouveaux profils portent la capacité et les nouveaux catalogues n’ont que trois ordres Gaeli. Version catalogue et nouvelles batailles : `2026-09-30-portee-1`.
- Les autres restrictions de tir (mouvement, engagement, tour de recrutement, effets d’ordres) restent arbitrées par les joueurs ; la surbrillance indique les cibles géométriquement disponibles dans le périmètre des essais.

## Corps à corps

1. En mode **Corps à corps**, chacun trace les flèches de ses propres unités capables de combattre. Ces flèches définissent les attaques ; elles créent également les liens d'engagement nécessaires aux capacités.
2. Chaque unité attaque une seule cible. Si A et B combattent et que C attaque B, **B continue d'attaquer A** : la flèche de C ne change jamais celle de B. Les deux sens A → B et B → A sont choisis par leurs propriétaires respectifs.
3. Chaque joueur valide avec **Je suis prêt**. Le bouton **COMBAT** devient disponible quand les deux joueurs sont prêts ; l'un ou l'autre peut alors le lancer. Cette validation est un choix d'UX pour éviter les départs prématurés.
4. **Une seule résolution simultanée pour tout le plateau et les deux camps.** Une unité détruite dans cette résolution effectue quand même son attaque prévue. Les sources de bonus présentes au début restent actives pendant toute la résolution.
5. Les flèches entre survivants sont conservées pour les combats suivants. Aucune nouvelle cible n'est choisie automatiquement après une mort. Les joueurs peuvent corriger les flèches ou désengager manuellement.
6. Retirer une flèche enlève le lien de cette paire si aucune flèche réciproque ne subsiste. Retirer explicitement un engagement retire les flèches de corps à corps de cette paire.

## Calcul et capacités

Seuil pour toucher : `4 − (C − DC)` au corps à corps, `4 − (T − DT)` au tir, borné entre 2+ et 6+. Une touche retire 1 R, sans sauvegarde. Les blessures ne réduisent pas les dés du profil. À 0 R, l'unité est défaussée après le calcul de toutes les attaques.

| Capacité | Traitement V1 |
| --- | --- |
| Ethérés | −1 dé, minimum 1 si le lot avait au moins un dé. N'ajoute jamais de dé à un lot vide. |
| Tir magique | Ignore Ethérés ; aucun bonus de dégâts inventé. Les décors ne sont pas représentés. |
| Tir en mêlée | Un jet d'orientation par dé : 1–3 vers l'allié choisi, 4–6 vers l'ennemi. Puis jets pour toucher contre le DT du destinataire réel. La réduction Ethérés est appliquée au lot dirigé vers l'unité éthérée, jamais au lot de l'autre destinataire. |
| Pluie de gobs | Une attaque qui touche l'ennemi lui donne −2 dés, sans dégâts. Une seule application par attaque, quel que soit le nombre de touches ; les attaques distinctes cumulent leurs malus. Les autres bonus/réductions s'appliquent d'abord, puis Pluie, jusqu'à zéro dé. Effet visible et valable pendant le tour courant ; il ne modifie pas les attaques simultanées déjà calculées. |
| Pour la Gaeli ! | +1 dé aux autres unités alliées de la même zone, uniquement au corps à corps, par source présente. |
| Chant des Ancêtres | Une relance par Gardien des Cen' non engagé dans la même zone, uniquement au corps à corps. **Un dé ne peut être relancé qu'une fois.** Pour accélérer la résolution, le site relance automatiquement les échecs, dans la limite des relances disponibles. Deux Gardiens permettent de relancer deux dés distincts. |

Les autres capacités de déplacement, recrutement, sélection d'ordres et arrivée de renforts conservent leur traitement existant ; elles ne sont pas des bonus de dés implicites.

Interaction à réévaluer lors des essais : pour un tireur affecté par Pluie de gobs qui utilise Tir en mêlée, la V1 réduit son lot de dés avant les jets d’orientation, puis applique Ethérés à chaque lot concerné. Ce choix d’implémentation évite de choisir arbitrairement des dés alliés ou ennemis à retirer après la répartition ; il n’a pas fait l’objet d’un arbitrage spécifique du créateur.

## La gross Invokation ! — extension du 29 septembre

Nicolas demande un ordre cliquable et un effet vert sur les unités renforcées avant COMBAT, puis confirme **l’automatisation de l’ordre complet avec son jet**, et non l’activation manuelle du bonus. Référence : ordre du PDF du 18 septembre p. 7 et arbitrages du 18 septembre, inchangés dans `shared/orders.ts`.

1. Précision de Nicolas le 30 septembre : le joueur choisit **une de ses unités de Shamans vivantes sur le plateau** avec son bouton illustré (case et axe). L’axe concerné est déduit de sa position côté serveur au lancement, sans choix d’axe indépendant. Le bouton **La gross Invokation !** lance un D6 côté serveur et consomme un exemplaire du stock de cet ordre (1 au départ). Un ordre épuisé, un Shaman inexistant, retiré, mort ou adverse, un spectateur ou une vue obsolète sont refusés avant tout jet.
2. **1** : toutes ses unités gobelines des trois axes perdent 1 R. **2–3** : seules celles de l’axe du Shaman choisi perdent 1 R. À zéro, elles sont défaussées ; les engagements et flèches impossibles sont nettoyés. Les Shamans subissent eux aussi ces pertes.
3. **4–5** : ses unités gobelines dans l’axe du Shaman choisi gagnent le bonus. **6** : toutes ses unités gobelines sur le plateau le gagnent. **Trolls et Djil sont exclus**, comme les ennemis, y compris gobelins.
4. Le bonus double **uniquement les dés du profil**, au tir et au corps à corps, jusqu’au changement de tour. Les bonus additionnels sont ajoutés ensuite, puis les réductions. Le bonus ne se multiplie pas avec lui-même. Les noms des axes restent liés aux mêmes colonnes des deux côtés du plateau, y compris après rotation pour le second joueur. Le résultat et les unités affectées sont figés au lancement ; hypothèse d’implémentation à confirmer en essai : le bonus suit ces unités si elles se déplacent, sans s’étendre aux renforts arrivés après le jet. Une unité retirée puis remise ne récupère pas le bonus.
5. Le panneau de l’ordre devient vert lors d’un résultat favorable. Les unités renforcées ont un halo et des particules verts, avec un badge **×2 D** ; leurs illustrations d’origine restent intactes. Les unités engagées sont immédiatement repérables avant COMBAT. Le marquage concerne également les tireurs puisque la règle leur donne le même bonus. L’animation respecte la préférence de mouvement réduit.
6. Le D6, le Shaman invoquant avec sa case au lancement, la portée du résultat et le détail des unités/pertes sont partagés avec les deux joueurs et les spectateurs. Les vingt derniers jets d’invocation sont conservés ; le panneau montre le dernier de chaque joueur. Le rapport TIR/COMBAT explique aussi le doublement des dés.
7. Jouer l’ordre annule les deux validations « prêt ». Le combat exige de nouveau les deux validations. Changer le tour efface le bonus sans effacer l’historique, et revenir au tour précédent ne le restaure pas. Les compteurs manuels restent corrigeables ; les remonter n’annule pas le jet ni ses conséquences. Pas d’annulation automatique d’une invocation.

## Suivi visuel et sécurité des actions

- Couleurs et pointes de flèches distinguent tirs, attaques de chaque camp et engagements. La sélection locale de la première unité n'interrompt pas celle de l'autre joueur.
- Liste des attaques avec noms, coordonnées, possibilité de suppression et choix de l'allié exposé. Les deux validations sont visibles.
- Compte rendu partagé : attaquant, cible réelle, capacités appliquées, jets d'orientation, dés initiaux et relancés, seuil, touches, R avant/après, destructions et malus. Historique des dix dernières résolutions ; journal texte partagé en complément.
- Toute modification de flèche ou de l'état de combat (déplacement, R, engagement, entrée/sortie, tour, résolution) annule les validations. Les actions de lancement sont protégées contre les doubles clics et les vues obsolètes.
- Les anciennes parties peuvent utiliser l'outil sans migration des cartes. Les flèches, rapports et effets sont persistants. Les spectateurs ne peuvent pas intervenir.
- Le lanceur **Dés libres** reste accessible aux deux joueurs dans les trois modes. Un seul grand dé cliquable, de forme et de couleur propres à la faction, déclenche un D6 aléatoire, sans saisie de quantité ; la face décorative ne détermine pas le résultat. Le bouton accepte le clic, le toucher et le clavier. Résultat et vingt derniers jets partagés avec les spectateurs, en lecture seule. Chaque résultat reprend le style de la faction de son auteur. Les jets libres ne changent pas les validations ni les attaques.
- Les outils manuels restent disponibles pour les corrections. Changer de tour efface les malus Pluie et les bonus d’invocation ; revenir en arrière ne les recrée pas. Pas d'annulation automatique d'une résolution dans cette V1.

## À réévaluer après les essais

Lisibilité des flèches croisées, confort sur téléphone, taille de l'historique, éventuel retour arrière conservant les jets ; puis réintégration des éléments exclus et évolution des règles avec le créateur. Les choix d'UX et l'automatisation des relances ci-dessus sont des choix d'implémentation révisables, pas une refonte des profils.

## Livraison et vérification

Branche `codex/automatisation-combats-v1`, travail dans le dossier courant, changements initialement laissés non commités pour revue. Le 1er octobre, Nicolas autorise un premier commit local de tout ce lot, sans push, fusion ni publication. Vérifications réalisées : `npm run check` (330 tests, lint, build) et types Convex. Développement `grateful-warthog-543` synchronisé, catalogue appliqué en développement (30 mises à jour, aucune création/archivage ni modification de deck) ; aucun déploiement de production.

Tests unitaires des capacités et de la simultanéité, tests serveur d’autorisation, choix d’allié, invalidation et protection des résolutions, parcours à deux joueurs et spectateur avec reconnexion. Extension invocation : les six résultats, choix de la source parmi plusieurs Shamans, refus des sources adverses/mortes/retirées, déplacement et requêtes obsolètes, contrôle du stock, exclusions, pertes et défausses, expiration, doublement avant bonus/malus, anciens rapports sans source et affichage partagé sont couverts. Les dés libres sont vérifiés dans les trois modes, pour les deux joueurs et les spectateurs, avec un seul dé aléatoire par clic, contrôle au clavier, historique et validations de combat préservées. Vérification visuelle dans Chrome, dont format 390 px sans débordement de la page. Le plateau conserve son défilement horizontal sur mobile.

Les captures proviennent d’une table **fictive locale** exécutant les vrais handlers avec stockage en mémoire ; les jets y sont reproductibles. Elles ne représentent pas une partie réelle sur Convex. La table de démonstration et les images restent dans `combat-preview.local/`, ignoré par Git :

- `captures/01-preparation.png` — flèches du premier joueur ;
- `captures/02-combat-pret.png` — flèches des deux camps, validations et bouton COMBAT ;
- `captures/03-resultat-combat.png` — jets et pertes de R ;
- `captures/04-tirs-prepares.png` — tirs simultanés ;
- `captures/05-resultat-tir.png` — touches et Pluie de gobs ;
- `captures/06-mobile.png` — commandes sur petit écran ;
- `captures/07-avant-invocation.png` — ordre disponible, choix de l’axe ;
- `captures/08-invocation-active.png` — jet favorable et halo vert ;
- `captures/09-invocation-combat-pret.png` — six flèches, deux validations et bonus visibles avant COMBAT ;
- `captures/10-invocation-mobile.png` — panneau et tuiles renforcées sur téléphone ;
- `captures/11-invocation-resultat-combat.png` — résultat du combat et détail du bonus avant Ethérés ;
- `captures/12-des-gobelins.png` — ancienne proposition à six faces, Gobelins ;
- `captures/13-des-gaeli.png` — ancienne proposition à six faces, Gaeli ;
- `captures/14-de-unique-gobelins.png` — dé unique gobelin et résultat partagé sur le plateau ;
- `captures/15-de-unique-gaeli.png` — dé unique Gaeli, lancé au clavier ;
- `captures/16-des-uniques-factions.png` — aperçu des trois formes, avec le vrai composant et des données fictives ;
- `captures/17-de-unique-mobile.png` — aperçu du dé unique sur un écran de 390 pixels, sans débordement ;
- `captures/18-invocation-cas-1.jpg` — 8 R perdus sur les trois axes et 4 unités détruites ;
- `captures/19-invocation-cas-2-3.jpg` — 4 R perdus au Centre et 2 unités détruites, flancs préservés ;
- `captures/20-invocation-cas-4-5.jpg` — 4 unités du Centre renforcées ;
- `captures/21-invocation-cas-6.jpg` — 8 unités renforcées sur les trois axes ;
- `captures/22-portee-tirs-gobelins.jpg` — Archers E5 sélectionnés, trois cibles à 3 cases éclairées, autres ennemis atténués et flèche Shaman F5 → F3 préparée ;
- `captures/23-portee-tirs-gaeli.jpg` — vue du second joueur, Archers E2 sélectionnés, cible D4 à 3 cases et E6 à 4 droit devant, cibles hors colonne/axe atténuées et flèche F2 → F5 préparée.

Les captures des quatre cas du 30 septembre utilisent le Shaman E5 du Centre, le même état initial et les vrais composants plateau/ordre côte à côte dans une vue locale d’illustration. Les Trolls (2 R), Djil (3 R) et les ennemis conservent leur état. Le D6 est fixé à 1, 2, 4 ou 6 uniquement dans cette table fictive pour rendre les issues reproductibles.

Aucun compte ni partie réelle créé ou modifié pour ces captures. Les essais d’une vraie partie réseau à deux restent à faire avec les joueurs.

Les tests de portée vérifient les limites 3/4, la somme des écarts, les axes, les deux sièges et les profils figés des Archers longs. Les parcours UI couvrent la surbrillance locale, le refus d’un clic hors portée sans mutation, le changement de source, Échap, le changement de mode et les flèches rendues invalides après déplacement. Les tests serveur vérifient qu’un lot comprenant une flèche invalide est refusé avant tout dé ou perte, même lorsqu’une autre flèche reste valable.
