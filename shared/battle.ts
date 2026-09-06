import { ACTION_RULES_VERSION, type EngineState } from './battleEngine'
export const RULES_VERSION = ACTION_RULES_VERSION
export const MAX_TURNS = 8
export const BASE_ORDERS = 3
export const MAX_STRATEGY_POINTS = 3

export type OrderDefinition = {
  id: string; name: string; faction: string; category: 'common' | 'classic' | 'advanced' | 'rare' | 'legendary'; description: string; limit?: number
}
export const orderDefinitions: OrderDefinition[] = [
  { id: 'movement', name: 'Mouvement', faction: 'common', category: 'common', description: 'Déplacer les unités d’une zone selon les conditions de déplacement.' },
  { id: 'defense', name: 'Défense', faction: 'common', category: 'common', description: 'Une zone alliée bénéficie d’un dé supplémentaire pour défendre jusqu’à la fin du tour.' },
  { id: 'assault', name: 'Assaut', faction: 'common', category: 'common', description: 'Une zone alliée bénéficie d’un dé supplémentaire au corps à corps jusqu’à la fin du tour.' },
  { id: 'shooting', name: 'Tir', faction: 'common', category: 'common', description: 'Faire tirer les unités d’une même zone, hors artillerie.' },
  { id: 'artillery', name: 'Tir Artillerie', faction: 'common', category: 'common', description: 'Faire tirer les artilleries d’une même zone.' },
  { id: 'magic', name: 'Tir Magique', faction: 'common', category: 'common', description: 'Faire tirer les unités d’une même zone possédant la capacité Magie.' },
  { id: 'reserve', name: 'Réserve', faction: 'common', category: 'common', description: 'Faire entrer des unités de réserve dans une zone Base ou Arrière sans ennemi. Elles peuvent recevoir d’autres ordres ce tour-ci.' },
  { id: 'shamanic', name: 'Déchainement Shamanique !', faction: 'gobelins', category: 'classic', description: 'Un Shaman non engagé cible une unité alliée non élite à portée : D6, 1 = −2 R ; 2–3 = −1 R ; 4–5 = dés d’attaque doublés ; 6 = dés doublés et propagation à une unité alliée adjacente.' },
  { id: 'waaagh', name: 'WAAAGGGHHH !', faction: 'gobelins', category: 'legendary', limit: 1, description: 'Ordre unique. Son effet sera défini avec le créateur.' },
]

export type ChosenOrder = { id: string; seat: number; orderId: string; status: 'selected' | 'passed' | 'resolved' }
export type BattleState = {
  engine?: EngineState
  revision: number; turn: number; phase: 'orders' | 'actions' | 'combat' | 'end_turn' | 'finished'
  initiativeSeat: number; actingSeat: number; allowance: number[]; strategyPoints: number[]; draftPoints: number[]; readySeats: number[]
  catalog: (OrderDefinition & { seats: number[] })[]
  orders: ChosenOrder[]
  used: { seat: number; orderId: string; count: number }[]
  history: { turn: number; initiativeSeat: number; orders: ChosenOrder[]; strategyPoints: number[] }[]
}

export function initialBattle(initiativeSeat: number, factions: { seat: number; faction: string }[], live = false): BattleState {
  return {
    revision: 0, turn: 1, phase: 'orders', initiativeSeat, actingSeat: initiativeSeat,
    allowance: [BASE_ORDERS, BASE_ORDERS], strategyPoints: [0, 0], draftPoints: [0, 0], readySeats: [], orders: [], used: [], history: [],
    ...(live ? { engine: { units: [], engagements: [], endedSeats: [], chargesPassed: [], combatStep: 'charges' as const, resolvedUnits: [], log: [] } } : {}),
    catalog: (live ? liveOrderDefinitions : orderDefinitions).map((order) => ({ ...order, seats: factions.filter((player) => order.faction === 'common' || player.faction === order.faction).map((player) => player.seat) })).filter((order) => order.seats.length > 0),
  }
}

export function remainingStock(battle: BattleState, order: OrderDefinition, seat: number) {
  return order.limit === undefined ? Infinity : Math.max(0, order.limit - (battle.used.find((item) => item.seat === seat && item.orderId === order.id)?.count ?? 0))
}
export function nextActor(current: number, needsAction: (seat: number) => boolean) {
  return needsAction(1 - current) ? 1 - current : current
}

export const liveOrderDefinitions: OrderDefinition[] = [
  { id: 'movement', name: 'Mouvement', faction: 'common', category: 'common', description: 'Déplacer une ou plusieurs unités d’une même zone. Une unité agit une fois par ordre.' },
  { id: 'shooting', name: 'Tir', faction: 'common', category: 'common', description: 'Faire tirer une ou plusieurs unités d’une même zone, artillerie comprise. Choisissez chaque tireur et sa cible.' },
  { id: 'recruitment', name: 'Recrutement', faction: 'common', category: 'common', limit: 3, description: 'Faire entrer des unités de réserve dans une zone de votre camp, en payant leur coût. Trois ordres par partie.' },
]
