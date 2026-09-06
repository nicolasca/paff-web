# Profils historiques et estimations de compatibilité

La référence courante est [Règles implémentées](../../docs/regles-implementees.md), section 1, avec les 12 profils Gobelins/Sephosi du Drive du 6 septembre. Les estimations ci-dessous concernent les anciens profils, notamment Orcs/Gaeli, et les anciennes parties.

Structure confirmée par Nicolas : nom, coût de recrutement, type, R (points de Régiment), nombre de dés, un seul score offensif A ou T, DA, DT et une capacité avec intitulé court et définition. Le nombre de dés est indépendant de la valeur offensive. Les nouvelles listes Gobelins/Sephosi remplacent leurs anciennes cartes publiées ; les cartes Action des autres factions sont conservées.

Les valeurs initiales sont des estimations autorisées, identifiées par `profile.source = "estimated"`. Un profil corrigé utilise `"defined"`. Les champs historiques restent disponibles pour assurer la compatibilité des decks et des parties.

## Hypothèses provisoires

- R reprend l’ancienne vie, avec 1 par défaut et un minimum de 1.
- Le nombre de dés reprend l’ancienne attaque, avec 1 par défaut. Un ancien zéro reste zéro.
- Le score A ou T vaut le nombre de dés + 2, borné entre 1 et 6.
- DA et DT valent la moitié de R arrondie au supérieur + 1, bornée entre 1 et 6. L’ancien type D ajoute 1 à DA ; un pavois ajoute 1 à DT.
- Un ancien type T ou un nom d’archer, d’arbalétrier ou d’artillerie donne le mode Tir ; les autres utilisent A.
- Classement, par priorité : limite individuelle de 1 → Unique ; baliste/catapulte/canon → Artillerie ; ancien C ou unité montée → Cavalerie ; tireur → Tir ; R ≥ 3 et dés ≥ 2 → Élite ; sinon Troupe. Le type ne force pas le mode offensif : une cavalerie peut tirer.
- Les anciens textes de capacité sont conservés sous des intitulés de trois mots au maximum. Leur adaptation mécanique sera faite avec les combats.

Les six types sont disponibles. Le catalogue courant comprend les Balistes Sephosiennes de type Artillerie. Les quotas du PDF restent provisoires et ne sont pas imposés ici.

La migration complète seulement les profils absents, par lots de 100, dans `cards` puis `gameCards`. Une partie utilise ses propres valeurs figées. Un import ultérieur du CSV conserve les profils déjà enregistrés.
