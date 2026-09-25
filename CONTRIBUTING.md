# Contribuer à PAFF

PAFF est un jeu privé entre amis dont le dépôt de code est public. Ce guide explique comment proposer une contribution par pull request. Il ne crée pas, à lui seul, de protection technique contre les push sur `main`.

Le [README](README.md) décrit le projet et sa publication. Les assistants de code, notamment Claude et Codex, doivent aussi lire [AGENTS.md](AGENTS.md) : ses consignes de travail et ses liens vers le contexte du projet font référence.

## Avant de commencer

- La création publique de compte est désactivée côté serveur (`convex/auth.ts`) ; les comptes joueurs sont provisionnés séparément. Contribuer au code ne donne pas accès au jeu.
- Sans accès en écriture au dépôt, créez un fork. Avec cet accès, travaillez sur une branche dédiée du dépôt.
- Pour une évolution importante des règles, de l'interface ou de la structure, échangez avec Nicolas sur l'objectif avant d'y consacrer du temps.

## Process proposé

1. Partez d'un `main` à jour et créez une branche au nom descriptif. Le préfixe `codex/<sujet>` est la convention de Codex dans l'espace de travail de Nicolas ; il n'est pas imposé aux autres contributeurs.
2. Faites un changement ciblé, avec des messages de commit clairs. Gardez les textes visibles dans le jeu en français.
3. Ouvrez une pull request vers `nicolasca/paff-web:main`. Décrivez le comportement modifié, son impact sur les règles, l'interface ou Convex, les vérifications effectuées et les éventuelles étapes de publication.
4. Laissez à Nicolas la revue et la décision de fusion. Cette pratique n'est pas une protection de branche GitHub ; elle doit être configurée séparément pour devenir obligatoire.

## Vérifications avant de proposer une PR

```sh
npm run check
```

Cette commande lance le lint, les tests et le build. Pour toute modification touchant `convex/`, ajoutez aussi :

```sh
npx tsc --noEmit -p convex/tsconfig.json
```

## Points spécifiques au projet

- **Règles du jeu** : toute modification des règles ou du déroulement d'une partie doit mettre à jour `docs/regles-implementees.md` dans le même lot, en distinguant ce qui est implémenté de ce qui reste provisoire.
- **Décisions durables** : les choix d'interface ou de structure qui doivent survivre à la PR vont dans `docs/contexte-projet.md`.
- **Déploiement Convex séparé de l'interface** : Vercel construit et publie l'interface après un push sur `main`, mais ne déploie **pas** les fonctions Convex. Leur déploiement et l'application des mises à jour du catalogue sont des actions distinctes du responsable de la publication. La procédure et les cibles actuelles sont dans la section « Publication » du [README](README.md#publication).
- **Environnements** : le développement Convex (`grateful-warthog-543`) et la production (`tough-gecko-249`) ont des données distinctes. Ne pas supposer qu'elles sont synchronisées.
- **Preview d'un fork** : Vercel peut demander l'autorisation d'un membre de l'équipe avant de déployer une PR venue d'un fork. Cette attente ne signifie pas, à elle seule, que le code ou les tests ont échoué.
