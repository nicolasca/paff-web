import { legalMoves, type BattleUnit, type EngineState } from './battleEngine'
import type { UnitProfile } from './unitProfile'

export const MANUAL_RULES_VERSION = '2026-09-26-manual-1'
export const GOBLIN_REINFORCEMENTS_ORDER_ID = 'goblin-reinforcements'
export const GOBLIN_BAND_CARD_ID = 'gobelins-troupe-de-gobelins'
export type ManualState = {
  stocks: { seat: number; orderId: string; remaining: number }[]
  duel?: { attackerId: string; targetId?: string }
  discarded: BattleUnit[]
  dice: { id: number; seat: number; turn: number; values: number[] }[]
}

export function manualMoves(engine: EngineState, unit: BattleUnit, profile: UnitProfile) {
  // Retain physical movement only: no order, turn, shooting or engagement lock.
  return legalMoves(engine, unit, profile).map((move) => move.cell)
}
