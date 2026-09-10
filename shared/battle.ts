import type { EngineState } from './battleEngine'
import { MANUAL_RULES_VERSION, type ManualState } from './manualBattle'
export const RULES_VERSION = MANUAL_RULES_VERSION

export type OrderDefinition = {
  id: string; name: string; faction: string; category: 'common' | 'classic' | 'advanced' | 'rare' | 'legendary'; description: string; limit?: number
}
export const orderDefinitions: OrderDefinition[] = [
  { id: 'movement', name: 'Mouvement', faction: 'common', category: 'common', description: 'Déplacer les unités d’une zone selon les conditions de déplacement.' },
  { id: 'shooting', name: 'Tir', faction: 'common', category: 'common', description: 'Faire tirer les unités d’une même zone, hors artillerie.' },
  { id: 'artillery', name: 'Tir Artillerie', faction: 'common', category: 'common', description: 'Faire tirer les artilleries d’une même zone.' },
  { id: 'recruitment', name: 'Recrutement', faction: 'common', category: 'common', limit: 3, description: 'Recruter des unités de la réserve pour 3 points de recrutement, selon les conditions de recrutement. Elles peuvent suivre d’autres ordres ce tour-ci, mais ne peuvent pas tirer. Dans la même phase d’ordre, cumuler deux ou trois cartes Recrutement permet de disposer de 6 ou 9 points. Trois sélections par partie.' },
  { id: 'shamanic', name: 'Déchainement Shamanique !', faction: 'gobelins', category: 'classic', description: 'À mettre à jour (PDF p. 7). Un Shaman non engagé cible une unité alliée non élite à portée : D6, 1 = −2 R ; 2–3 = −1 R ; 4–5 = dés d’attaque doublés ; 6 = dés doublés et propagation à une unité alliée adjacente.' },
  { id: 'waaagh', name: 'WAAAGGGHHH !', faction: 'gobelins', category: 'legendary', limit: 1, description: 'Ordre unique, à mettre à jour (PDF p. 7). Son effet n’est pas encore défini.' },
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
