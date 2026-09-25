# Branche de travail

Pour toute modification, travailler sur une branche dédiée différente de `main`. Si le dépôt est sur `main`, créer une branche avant de modifier les fichiers. Pour les tâches Codex dans l'espace de travail de Nicolas, utiliser le préfixe `codex/<sujet>`.

Travailler directement dans le dossier du projet disponible dans l'environnement courant pour que l’utilisateur puisse suivre les diffs. Sur le poste de Nicolas, ce dossier est `/Users/nicolasca/Documents/workspace/paff-web`. Ne pas déplacer le travail dans une autre copie ou un worktree sauf demande explicite. Préférer des changements non commités pendant la revue interactive demandée par l’utilisateur.

# Contexte à charger au démarrage

Avant de modifier le projet, lire `README.md` et `docs/contexte-projet.md`, puis vérifier la branche et l’état Git. Pour le journal et les profils, lire aussi `docs/journal-profils.md`. Pour le jeu, lire `docs/regles-implementees.md` et les modules concernés. Les fichiers du dépôt font référence ; ne pas supposer une architecture ou reprendre aveuglément une transcription d’une ancienne conversation.

- PAFF est un jeu privé entre amis, en français, sans compétition entre profils joueurs : pas de classement, Elo, winrate, bilan victoires/défaites ni compteur de parties.
- Le projet utilise **React, Vite, React Router et Convex**, pas Next.js.
- Orthographe des factions de la première version : **Gobelins** et **Sephosi**. Vérifier les noms d’unités/factions dans le catalogue existant.
- Réutiliser les comptes `users` / `playerProfiles`, les composants, les styles et les illustrations du projet. Rester simple et responsive.
- Les profils peuvent afficher le **nombre de decks total et par faction**, demandé explicitement par l’utilisateur. Ces compteurs de collection n’autorisent pas des statistiques de parties ou des comparaisons. Avatars : un seul choix par faction, actuellement Gobelins et Sephosi uniquement.
- Consigner les nouvelles décisions durables dans `docs/contexte-projet.md` au fil des évolutions pour que les prochaines conversations les retrouvent.

# Vérifications et environnements

Exécuter `npm run check` pour le lint, les tests et le build. Pour les modifications Convex, vérifier aussi `npx tsc --noEmit -p convex/tsconfig.json`. Ne pas confondre tests en mémoire, essais sur le développement et vérification en production.

Le développement et la production Convex ont des données distinctes. Vérifier l’environnement ciblé avant une écriture ; ne pas créer des comptes manquants pour contourner une différence de données. Les changements d’interface et les fonctions Convex ont des déploiements séparés. Les détails et commandes sont dans `README.md` et `docs/contexte-projet.md`.

- Pour développer et essayer une fonctionnalité, utiliser par défaut **`grateful-warthog-543`** : `npx convex dev --once` synchronise le backend de développement, puis `npm run dev` lance l’interface locale. Vérifier la cible de `.env.local` et les éventuelles variables de déploiement déjà définies sans afficher de secrets.
- **`npx convex deploy` cible la production `tough-gecko-249` dans notre configuration**, même si `.env.local` indique le développement. `--dry-run` ne transforme pas cette commande en essai sur le développement. Ne pas en faire un préalable au travail sur la dev.
- `npx convex run …` utilise l’environnement configuré ; `--prod` vise la production. Une mutation exécutée en dev ne met pas à jour les joueurs de production. Déployer en production et publier Vercel lorsque la demande l’autorise.
- Après un refus d’exécution, préciser la commande, l’environnement et le motif réellement renvoyé. Un refus visant la production ne suffit pas à conclure que le développement est inaccessible. Continuer les travaux indépendants autorisés ; si les permissions bloquent aussi la dev, le signaler distinctement. Ne pas contourner un refus par un autre outil et ne pas présenter ces consignes comme une levée des restrictions de la session.
- À chaque reprise, relire les fichiers de contexte depuis le disque. Les décisions conservées seulement dans une autre conversation ou dans une autre copie du dépôt ne sont pas un contexte acquis. Les consignes doivent être versionnées avec le lot pour être disponibles dans les autres branches et copies.

# Suivi des règles

Toute modification des règles ou du déroulement d’une partie doit mettre à jour `docs/regles-implementees.md` dans le même lot. Distinguer les comportements implémentés, les hypothèses WIP et les règles non encore appliquées. Conserver les références des règles pour faciliter les comparaisons avec les versions du Drive.

# Simulateur séparé

Depuis le 20 septembre 2026, les bots, l’apprentissage et les campagnes se développent dans le dépôt local voisin `paff-simulator`, avec ses propres instructions. Ne pas les réintroduire ici ni fusionner les anciennes branches de simulation pour publier le site. Depuis le 23 septembre, `paff-web` n’expose plus d’atelier, de route, de fonctions Convex ni de données de simulation. `shared/` se synchronise explicitement entre les dépôts ; préserver les références historiques des règles. Voir `docs/separation-simulateur.md`.
