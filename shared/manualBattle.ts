import { legalMoves, type BattleUnit, type EngineState } from './battleEngine'
import type { UnitProfile } from './unitProfile'
import type { CombatState } from './combat'

export const MANUAL_RULES_VERSION = '2026-09-30-portee-1'
export const GOBLIN_REINFORCEMENTS_ORDER_ID = 'goblin-reinforcements'
export const GOBLIN_BAND_CARD_ID = 'gobelins-troupe-de-gobelins'
export type ManualState = {
  combat?: CombatState
  stocks: { seat: number; orderId: string; remaining: number }[]
  duel?: { attackerId: string; targetId?: string }
  discarded: BattleUnit[]
  dice: { id: number; seat: number; turn: number; values: number[] }[]
}

export function manualMoves(engine: EngineState, unit: BattleUnit, profile: UnitProfile) {
  // Retain physical movement only: no order, turn, shooting or engagement lock.
  return legalMoves(engine, unit, profile).map((move) => move.cell)
}
