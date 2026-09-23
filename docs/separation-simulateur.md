# Séparation du site et du simulateur — 20 septembre 2026

Nicolas demande de publier les illustrations, unités et descriptions validées, et de poursuivre les bots dans un autre dépôt **local pour l'instant**.

- **Site :** `/Users/nicolasca/Documents/workspace/paff-web`, branche de publication `codex/publication-regles-2026-09-20` créée depuis `main` (`e382f4a`). Les branches expérimentales ne sont pas fusionnées. Le lot contient les règles du 18 septembre avec arbitrages, les profils Djil/Skrans/Gros tarrés, l’archivage de la Bande du Sef et les illustrations de Djil et des Gros tarrés.
- **Bots :** `/Users/nicolasca/Documents/workspace/paff-simulator`, branche `codex/extraction-simulateur`, aucun distant GitHub. Moteur, dashboard, Python/TorchRL, modèles, rapports et sorties locales sont conservés ; pas de nouvelle campagne ni entraînement.
- **Préservation :** 12836 fichiers de recherche/données vérifiés par SHA-256, soit 558777025 octets, hors environnements copiés. Manifeste détaillé dans `paff-simulator/docs/migration-2026-09-20.json`. Les manifestes npm et les sources des protocoles sont identiques pour conserver les clés des expériences.
- **Historique :** bundle Git et patch de l’état non commité dans `analysis/backups/separation-2026-09-20/`, également copiés dans le nouveau dépôt. Sauvegarde Git locale de l’état non commité : `c53ce44253c3125c60c2919c93a7f318d48d1847`. Les anciens commits et branches restent présents ; aucun historique réécrit. La restauration de cette sauvegarde se ferait sur `codex/bot-apprentissage`, jamais sur la branche de publication.
- **Interface au 20 septembre :** l’atelier privé du site gardait encore ses anciens rapports et relectures. Le laboratoire d’apprentissage est dans le dépôt séparé, accessible localement sur le port 5181. Les statistiques concernent les bots uniquement. Cette copie du site a été retirée le 23 septembre.
- **Règles communes :** `shared/` est copié indépendamment dans les deux dépôts. Les changements futurs se synchronisent explicitement et se versionnent ; pas de lien vers des fichiers vivants qui invaliderait silencieusement les modèles/caches. La référence D reste figée.

Au 20 septembre, les fichiers ignorés laissés dans l’ancien dossier `analysis/` servaient de sauvegarde locale et n’étaient pas publiés avec le site. Ils ont été retirés après comparaison le 23 septembre. Le nouveau dépôt ne contient ni `.env.local`, ni configuration Convex/Vercel, ni données de joueurs.

## Validation et publication

Site : 257 tests réussis, lint sans avertissement, types Convex et compilation réussis. Commit fonctionnel `e3ef6e395f24a52edfa58946d818b5e8cd868119` poussé sur `main`. [Déploiement Vercel](https://vercel.com/nicolas-castejons-projects/paff-web/6ZdccQk4P64dSL6fHpcjhf1Zf8i6) terminé avec succès. Fonctions Convex déployées sur `tough-gecko-249`, sans suppression d’index ; application du catalogue en production : **1 création, 19 mises à jour, 1 archivage**.

Contrôle du [catalogue public](https://paff-web.vercel.app/cards) : dix Gobelins, Djil à 4 points avec le visuel fourni, Gros tarrés à 1, Skrans à 2 ; les deux images chargent en 1254 × 1254 et Djil a été vérifié visuellement. Recrutement, Pause-déjeuner, La gross Invokation, Tir concentré et Fureur divine affichent les nouveaux textes. Les parties déjà préparées conservent leurs copies de profils et d’ordres.

Simulateur : 308 tests Vitest et compilation du laboratoire réussis ; huit contrôles Node de sélection/rapport réussis. Les derniers contrôles Python et de reprise restent à faire : la commande de vérification a été refusée, puis Nicolas demande explicitement de reprendre le simulateur plus tard. Ne pas présenter cette extraction comme une reprise Python complète validée. Le dépôt local reste non commité, sans distant, et son tableau de bord n’est pas démarré. Continuer uniquement la publication du site dans cette tâche.

## Correction du 23 septembre 2026

Nicolas précise que le site ne doit plus contenir l’ancien atelier d’équilibrage. La route et la page, les queries Convex, le droit d’accès du profil, les copies de rapports et les anciens documents `docs/equilibrage/` sont retirés de `paff-web` ; ces ressources restent dans `paff-simulator`. Le dossier local ignoré `analysis/` du site a été comparé par sommes de contrôle à celui du simulateur avant son retrait ; le seul fichier absent y a été recopié. Les environnements Python diffèrent seulement par leurs scripts de lancement propres à chaque dossier.
