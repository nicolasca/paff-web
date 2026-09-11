import type { EngineState } from './battleEngine'
import { MANUAL_RULES_VERSION, type ManualState } from './manualBattle'
export const RULES_VERSION = MANUAL_RULES_VERSION

import { orderDefinitions, type OrderDefinition } from './orders'
export { orderDefinitions, type OrderDefinition } from './orders'

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
