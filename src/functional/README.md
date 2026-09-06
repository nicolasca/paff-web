# Tests fonctionnels

`npm run test:functional` parcourt le lobby, le choix des decks et des unités, l’initiative, le déploiement puis le plateau avec deux vues joueur. Les clics utilisent les vrais écrans, routes, requêtes et mutations ; le transport Convex, l’authentification et la base sont remplacés par un environnement de test en mémoire, sans compte ni service externe.

Le scénario vérifie la synchronisation des écrans, les validations des deux joueurs, la reprise après rechargement, la réserve adverse masquée et le placement obligatoire du sous-ensemble choisi. Les tests des mutations complètent ce parcours avec les refus côté serveur et les contraintes de capacité.

Ces tests ne remplacent pas un essai réseau sur Convex. Ils font partie de `npm test` et de `npm run check`. Vercel exécute cette dernière commande avant chaque déploiement automatique : un échec des tests bloque la publication.
