# Champs de bataille — 1er octobre 2026

Trois ambiances purement visuelles remplacent le terrain herbeux commun : **Camp de la Ferraille** (Gobelins), **Cour de la Salamandre** (Sephosi) et **Sanctuaire des Racines** (Gaeli). Les objets dessinés sur les bords ne représentent ni obstacles, ni couverts, ni cases bloquées.

Au lancement du salon, le serveur tire un décor parmi les trois, avec la même probabilité pour chacun, indépendamment des factions jouées. Ce choix est enregistré avec la partie et partagé par les deux joueurs et les spectateurs pendant le déploiement et le combat. Reconnexion, changement de tour et résolution d’attaque ne provoquent aucun nouveau tirage. Les anciennes parties sans champ enregistré reçoivent un décor stable calculé à partir de leur identifiant, sans modifier leurs données.

La grille reste composée de **54 cases, 15 zones et 3 axes**. Ses règles, les orientations des joueurs, les cadres de faction des unités et les outils d’attaque restent identiques. Les noms du lieu et les bordures identifient le décor indépendamment des armées présentes. L’interface conserve le défilement horizontal sur téléphone et respecte la préférence de réduction des animations.

## Illustrations et provenance

Illustrations originales produites avec **l’outil ImageGen intégré**, puis encodées en WebP à qualité 88, sans recadrage ni retouche. Les originaux PNG restent dans le dossier de génération de Codex ; seuls les assets utilisés par le jeu sont dans le dépôt.

| Décor | Asset |
| --- | --- |
| Gobelins | [battlefield-gobelins-v1.webp](../public/art/battlefield-gobelins-v1.webp) |
| Sephosi | [battlefield-sephosi-v1.webp](../public/art/battlefield-sephosi-v1.webp) |
| Gaeli | [battlefield-gaeli-v1.webp](../public/art/battlefield-gaeli-v1.webp) |

Les captures et la table fictive de revue restent locales dans `combat-preview.local/`, ignoré par Git. Elles ne modifient aucune partie réelle.

## Vérifications

`npm run check` réussi : **341 tests**, lint et build. Types Convex vérifiés séparément. Backend synchronisé uniquement en développement **grateful-warthog-543**. Nicolas autorise un **commit local le 1er octobre**, après la revue des trois captures. Aucun push ni publication en production demandé pour ce lot.

Revue visuelle sur la table fictive utilisant le vrai `TacticalBoard` et les vrais handlers en mémoire : trois captures complètes, orientation des deux joueurs, vue spectateur, 54 cases conservées et défilement horizontal fonctionnel sur un écran de 390 px sans débordement de la page. Cela ne constitue pas un essai à deux comptes sur le backend distant.

## Prompts finaux

### gobelins

```text
Use case: stylized-concept.
Asset type: production background texture for an online medieval fantasy tactical board.
Create a richly illustrated top-down battlefield terrain, landscape 3:2 format. Orthographic overhead view, no perspective horizon. Painterly detailed materials, sophisticated dark fantasy tabletop art, warm/cool balanced lighting, crisp craft details. The central 82% of the width and 85% of the height must stay quiet, flat, unobstructed textured ground: a separate application overlays 54 playing cells and unit cards there. All identifiable decorative objects cluster in the narrow outer perimeter and corners, several small props rather than huge landmarks. No actual board grid, cells, UI, letters, text, numbers, cards, people, creatures, weapons crossing the center, logos or watermark. Not a framed painting: terrain fills the complete canvas.
Scene/backdrop: a mischievous goblin encampment made of scavenged timber, rusted iron, cracked ochre dirt and dark slate.
Color palette: dirty amber, olive green, charcoal wood, rusty copper, restrained acid-green magic.
Materials/textures: dense compacted earth with fine cracks and scuffs, only sparse straw, almost no grass.
Perimeter details: small broken wheels and crooked wood stakes, chained rusty shields, a few red-capped mushrooms, chipped pottery, scattered tiny bones, scraps of rough green cloth, one small glowing green shaman bowl. Handcrafted and irregular, atmospheric but readable. Quiet dusty center, brighter warm texture than corners.
```

### sephosi

```text
Use case: stylized-concept.
Asset type: production background texture for an online medieval fantasy tactical board.
Create a richly illustrated top-down battlefield terrain, landscape 3:2 format. Orthographic overhead view, no perspective horizon. Painterly detailed materials, sophisticated dark fantasy tabletop art, warm/cool balanced lighting, crisp craft details. The central 82% of the width and 85% of the height must stay quiet, flat, unobstructed textured ground: a separate application overlays 54 playing cells and unit cards there. All identifiable decorative objects cluster in the narrow outer perimeter and corners, several small props rather than huge landmarks. No actual board grid, cells, UI, letters, text, numbers, cards, people, creatures, weapons crossing the center, logos or watermark. Not a framed painting: terrain fills the complete canvas.
Scene/backdrop: an imperial fortress courtyard built from pale worn limestone and charcoal stone.
Color palette: blue-grey slate, ivory stone, wine burgundy fabric, antique brass, warm embers.
Materials/textures: broad closely fitted worn stone paving slabs, faint shallow geometric engravings; central pale slate ground unobstructed.
Perimeter details: elegant cut stone ledges, bronze shield and sheathed spear laid near corners, tightly rolled burgundy banner with brass trim, two compact bronze braziers with restrained warm embers, a few dry laurel leaves. Disciplined fortress elegance, ordered small props. No visible buildings or towers, no grassy lawn.
```

### gaeli

```text
Use case: stylized-concept.
Asset type: production background texture for an online medieval fantasy tactical board.
Create a richly illustrated top-down battlefield terrain, landscape 3:2 format. Orthographic overhead view, no perspective horizon. Painterly detailed materials, sophisticated dark fantasy tabletop art, warm/cool balanced lighting, crisp craft details. The central 82% of the width and 85% of the height must stay quiet, flat, unobstructed textured ground: a separate application overlays 54 playing cells and unit cards there. All identifiable decorative objects cluster in the narrow outer perimeter and corners, several small props rather than huge landmarks. No actual board grid, cells, UI, letters, text, numbers, cards, people, creatures, weapons crossing the center, logos or watermark. Not a framed painting: terrain fills the complete canvas.
Scene/backdrop: an ancient Celtic woodland ritual clearing, ground of blue-green weathered stone and earth, surrounded by roots.
Color palette: deep teal, muted blue-green, pale mineral grey, old gold, subtle turquoise glow.
Materials/textures: flat slate clearing with fine natural fissures and delicate worn curved knotwork carvings, quiet center; moss confined to edges.
Perimeter details: gnarled roots hugging the edge, small ferns, a few tiny pale flowers, several low upright carved stones with subtle teal rune-like non-letter engravings, fallen acorns, weathered wood, one small bronze offering bowl. Cool moonlight with tasteful glints. Center must be flat light muted teal/slate rather than a dense grassy lawn. A magical quiet sanctuary, not cluttered forest.
```
