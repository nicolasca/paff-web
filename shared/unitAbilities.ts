import type { UnitProfile } from './unitProfile'

// PAFF 2026 - Capacités AUTO.pdf, p. 1, received 2026-10-01.
// Nicolas's October 2 rulings are recorded in docs/regles-implementees.md §5.1.
// IDs and descriptions travel with frozen game profiles.
export const unitAbilities = {
  longRangeFire: { id: 'long-range-fire', name: 'Tir longue portée', description: 'Cette unité peut tirer à portée 4 uniquement droit devant elle, dans la même colonne. Elle conserve les possibilités de tir normal à portée 3.' },
  guardianCharge: { id: 'guardian-charge', name: 'Charge du Gardien', description: 'Cette unité ne peut pas être déployée avec l’armée initiale. Quand vous la déployez, désignez une de vos unités de Druides non engagée en combat dans votre zone Arrière. Le Grand Gardien se déploie dans la colonne de ces Druides en chargeant la première unité ennemie de cette colonne, à condition qu’il n’y ait que des emplacements vides entre les Druides et cette unité ennemie. Il ne peut pas aller plus loin qu’un emplacement de la zone Centre et doit engager le combat ce tour-ci.' },
  ethereal: { id: 'ethereal', name: 'Ethérés', description: 'Les unités qui attaquent ou tirent sur cette unité lancent 1 dé en moins, jusqu’à un minimum de 1.' },
  forGaeli: { id: 'for-gaeli', name: 'Pour la Gaeli !', description: 'Vos autres unités détruites au tir dans la même zone que cette unité peuvent rester et combattre jusqu’à la fin du tour. La présence du Chef et la zone sont vérifiées au moment de la destruction ; ce maintien persiste même si le Chef meurt ensuite. Une unité ainsi conservée peut seulement combattre : elle ne peut pas se déplacer, tirer ou être soignée. Le Chef ne bénéficie pas de sa propre protection.' },
  strategicSupport: { id: 'strategic-support', name: 'Appui stratégique', description: 'Lorsque vous jouez un ordre dans un axe, vous pouvez également appliquer cet ordre dans un autre axe contenant un Porte-ordres Sephosiens.' },
  shamanicConcentration: { id: 'shamanic-concentration', name: 'Concentration shamanique', description: 'Cette unité conserve son tir normal et effectue un tir supplémentaire par unité de Shamans Gobelins non engagée en combat dans son axe. Tous ces Shamans sont utilisés. Vous choisissez la cible de chaque tir ; les tirs sont simultanés. Après leur résolution, lancez 1D6 par Shaman utilisé : sur 1–3, défaussez-le. Un Shaman survivant peut soutenir une nouvelle activation durant le même tour.' },
  ammunition: { id: 'ammunition', name: 'Des munitions !', description: 'Pour effectuer un tir, défaussez une unité de votre armée sur un emplacement adjacent, dans la même zone ou une zone voisine. Les Trolls, Djil et les Katapult à gobs ne peuvent pas être sacrifiés. Un sacrifice permet un tir, quel que soit le nombre de dés lancés.' },
  packmaster: { id: 'packmaster', name: 'Meuteur !', description: 'Cette unité ne peut pas être déployée avec l’armée initiale. Quand vous déployez Blop, le Meuteur, vous pouvez déployer gratuitement 1D3 unités de Chevaucheurs de Skrans.' },
  strategist: { id: 'strategist', name: 'Stratège', description: 'Tant que Vallardi est déployé et vivant, vous pouvez sélectionner un ordre supplémentaire à chaque tour, y compris le tour de son recrutement. S’il est détruit, vous conservez cet ordre supplémentaire jusqu’à la fin du tour.' },
  movingShot: { id: 'moving-shot', name: 'Tir en mouvement', description: 'Cette unité peut se déplacer et tirer dans un même tour.' },
  trollitude: { id: 'trollitude', name: 'Trollitude', description: 'Lorsque vous engagez cette unité en combat, lancez 1D6 : sur 1, le Troll engage le combat avec une unité alliée adjacente ; sur 2–3, il n’attaque pas ; sur 4–6, il attaque normalement. Ne relancez pas ce dé lors des combats suivants tant qu’il reste engagé avec cette même unité.' },
  flight: { id: 'flight', name: 'Vol', description: 'Cette unité se déplace comme une unité de cavalerie et peut passer au-dessus des décors et des unités alliées ou ennemies.' },
} as const

export type UnitAbility = keyof typeof unitAbilities
export function hasUnitAbility(profile: UnitProfile | undefined, ability: UnitAbility) {
  return profile?.ability?.id === unitAbilities[ability].id
}
