import type { EngineState } from './battleEngine'
import { MANUAL_RULES_VERSION, type ManualState } from './manualBattle'
export const RULES_VERSION = MANUAL_RULES_VERSION

export type OrderDefinition = {
  id: string; name: string; faction: string; category: 'common' | 'classic' | 'advanced' | 'rare' | 'legendary'; description: string; limit?: number
}
// PAFF 2026 (1).pdf received 2026-09-11: orders p. 7, recruitment timing p. 3.
// Nicolas corrected Invokation shamanique: 2–3 discards one unit; 4–5 adds no effect.
// References for the manual tabletop: effects, limits and timing are player-managed.
export const orderDefinitions: OrderDefinition[] = [
  { id: 'movement', name: 'Mouvement', faction: 'common', category: 'common', description: 'Déplacer les unités d’une zone selon les conditions de déplacement.' },
  { id: 'shooting', name: 'Tir', faction: 'common', category: 'common', description: 'Faire tirer les unités d’une même zone, hors artillerie.' },
  { id: 'artillery', name: 'Tir Artillerie', faction: 'common', category: 'common', description: 'Faire tirer les artilleries d’une même zone.' },
  { id: 'recruitment', name: 'Recrutement', faction: 'common', category: 'common', limit: 3, description: 'Trois sélections par partie : la première est accessible à partir du tour 3, la deuxième à partir du tour 4, la troisième à partir du tour 5. Recruter des unités de la réserve pour 3 points de recrutement. Elles peuvent suivre d’autres ordres ce tour-ci, mais ne peuvent pas tirer. Dans la même phase d’ordre, cumuler deux ou trois cartes Recrutement permet de disposer de 6 ou 9 points.' },
  { id: 'goblin-reinforcements', name: 'Tiens, des gobelins...', faction: 'gobelins', category: 'common', description: 'Vous pouvez recruter gratuitement une Bande de Gobelins.' },
  { id: 'shamanic-invocation', name: 'Invokation shamanique', faction: 'gobelins', category: 'advanced', limit: 4, description: 'Sélectionnez une de vos unités de Shamans. Elle peut tirer sur une unité ennemie en ajoutant un dé par unité de Shamans à portée de tir. Après le tir, lancez 1D6 : sur 1, défaussez deux Shamans ; sur 2–3, défaussez une unité de Shamans ; sur 4–5, aucun effet supplémentaire ; sur 6, refaites la même attaque sur la même unité (si elle a été détruite, cette attaque ne donne rien).' },
  { id: 'lunch-break', name: 'Pause-déjeuner', faction: 'gobelins', category: 'rare', limit: 2, description: 'Vous pouvez sacrifier une unité de gobelins adjacente à une unité de Trolls (même engagée en combat) pour ajouter 1 point de R à cette dernière. Vous pouvez effectuer cette manœuvre pour toutes vos unités de Trolls présentes.' },
  { id: 'great-invocation', name: 'La gross Invokation !', faction: 'gobelins', category: 'legendary', limit: 1, description: 'Si vous avez un Shaman dans un axe, lancez 1D6 : sur 1, toutes vos unités de gobelins perdent 1 point de R dans les trois axes ; sur 2–3, elles perdent 1 point de R dans cet axe ; sur 4–5, elles doublent leur nombre de dés en attaque et au tir jusqu’à la fin du tour dans cet axe ; sur 6, elles doublent leur nombre de dés en attaque et au tir jusqu’à la fin du tour dans les trois axes.' },
  { id: 'strategic-retreat', name: 'Repli stratégique', faction: 'sephosi', category: 'common', description: 'Vous pouvez désengager l’une de vos unités sans subir d’attaque gratuite.' },
  { id: 'concentrated-fire', name: 'Tir concentré', faction: 'sephosi', category: 'advanced', limit: 4, description: 'Désignez une unité ennemie. Si plusieurs unités tirent dessus ce tour-ci, ces unités peuvent lancer un dé supplémentaire.' },
  { id: 'divine-fury', name: 'Fureur divine', faction: 'sephosi', category: 'rare', limit: 2, description: 'Vous pouvez recruter et déployer une ou plusieurs unités d’Anges Protecteurs de la Sephosi dans n’importe quelle zone de l’aire de jeu.' },
  { id: 'protect-salamander', name: 'Protéger la Salamandre !', faction: 'sephosi', category: 'legendary', limit: 1, description: 'Si votre unité de la Salamandre est engagée en combat dans une zone, toutes vos autres unités ont un bonus de +2 aux dés si elles attaquent des unités dans cette zone.' },
]

export type BattleState = {
  manual: ManualState; engine: EngineState
  revision: number; turn: number; strategyPoints: number[]
  catalog: (OrderDefinition & { seats: number[] })[]
}

export function initialBattle(factions: { seat: number; faction: string }[]): BattleState {
  const catalog = orderDefinitions.map((order) => ({ ...order, seats: factions.filter((player) => order.faction === 'common' || player.faction === order.faction).map((player) => player.seat) })).filter((order) => order.seats.length > 0)
  return {
    revision: 0, turn: 1, strategyPoints: [0, 0], catalog,
    engine: { units: [], engagements: [], log: [] },
    manual: { stocks: catalog.flatMap((order) => order.limit === undefined ? [] : order.seats.map((seat) => ({ seat, orderId: order.id, remaining: order.limit! }))), discarded: [], dice: [] },
  }
}
