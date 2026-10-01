import { axisOf, type BattleUnit } from './battleEngine'
import { colOf, isCell, rowOf } from './board'
import type { UnitProfile } from './unitProfile'

export const STANDARD_SHOOTING_RANGE = 3
export const ARTILLERY_SHOOTING_RANGE = 4
export const LONG_RANGE_ARCHERS_ID = 'gaeli-archers-longs-gaeliens'
export const shootingDistance = (from: number, to: number) => Math.abs(rowOf(to) - rowOf(from)) + Math.abs(colOf(to) - colOf(from))
// The stable identity covers frozen profiles without migrating games.
export const hasLongRangeFire = (attacker: Pick<BattleUnit, 'cardStableId'>, profile: UnitProfile) => profile.ability?.id === 'long-range-fire' || attacker.cardStableId === LONG_RANGE_ARCHERS_ID

/** Geometry only: ownership, attack availability and other shooting rules are checked by callers. */
export function isWithinShootingRange(attacker: Pick<BattleUnit, 'seat' | 'cell' | 'cardStableId'>, target: Pick<BattleUnit, 'cell'>, profile: UnitProfile) {
  if (!isCell(attacker.cell) || !isCell(target.cell) || attacker.cell === target.cell || axisOf(attacker.cell) !== axisOf(target.cell)) return false
  // Adrien Q03: count horizontal and vertical steps, within the same axis.
  // Intervening units do not block a shot and the target may share the shooter's zone.
  const rowDelta = rowOf(target.cell) - rowOf(attacker.cell)
  const columnDelta = colOf(target.cell) - colOf(attacker.cell)
  const distance = shootingDistance(attacker.cell, target.cell)
  const range = profile.unitType === 'artillery' ? ARTILLERY_SHOOTING_RANGE : STANDARD_SHOOTING_RANGE
  if (distance <= range) return true
  const forward = attacker.seat === 0 ? rowDelta < 0 : attacker.seat === 1 && rowDelta > 0
  return hasLongRangeFire(attacker, profile) && forward && columnDelta === 0 && distance === 4
}
