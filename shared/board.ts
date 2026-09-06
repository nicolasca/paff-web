import type { UnitProfile } from './unitProfile'

export type Seat = 0 | 1
export type PlacedUnit = { seat: number; cardStableId: string; cell: number }
export type GameSetup = {
  version: 2 | 3
  revision: number
  initiativeRound: number
  initiativeRolls: { seat: number; result: number; round: number }[]
  initiativeWinner?: number
  initiativeReady: number[]
  deploymentTurn: number
  units: PlacedUnit[]
}

export function initialSetup(): GameSetup {
  return { version: 3, revision: 0, initiativeRound: 1, initiativeRolls: [], initiativeReady: [], deploymentTurn: 0, units: [] }
}

export function deploymentLimit(card: { kind: string; quantity: number; selectedQuantity?: number }, setup: GameSetup) {
  return card.kind === 'unit' ? setup.version === 3 ? card.selectedQuantity ?? 0 : card.quantity : 0
}

// Each camp has 18 cells, of which 9 are in the rear (the only artillery positions).
export function preparationCapacityError(cards: { selectedQuantity?: number; profile?: UnitProfile }[]) {
  if (cards.reduce((sum, card) => sum + (card.selectedQuantity ?? 0), 0) > 18) return 'PREPARATION_TOO_LARGE'
  if (cards.filter((card) => card.profile?.unitType === 'artillery').reduce((sum, card) => sum + (card.selectedQuantity ?? 0), 0) > 9) return 'TOO_MUCH_ARTILLERY'
  return null
}

// Canonical coordinates: seat 0 is at the bottom; seat 1 sees a 180° rotation.
export const cells = Array.from({ length: 54 }, (_, cell) => cell)
export const rowOf = (cell: number) => Math.floor(cell / 9)
export const colOf = (cell: number) => cell % 9
export const isCell = (cell: number) => Number.isInteger(cell) && cell >= 0 && cell < 54
export const displayCell = (cell: number, seat: number) => seat === 0 ? cell : 53 - cell
export const cellCoordinate = (cell: number) => `${'ABCDEFGHI'[colOf(cell)]}${rowOf(cell) + 1}`
export const zoneOf = (cell: number) => `${[0, 1, 2, 2, 3, 4][rowOf(cell)]}-${colOf(cell) < 2 ? 0 : colOf(cell) < 7 ? 1 : 2}`
export const isRear = (cell: number, seat: number) => rowOf(cell) === (seat === 0 ? 5 : 0)
export const isBase = (cell: number, seat: number) => rowOf(cell) === (seat === 0 ? 4 : 1)
export const isHome = (cell: number, seat: number) => isRear(cell, seat) || isBase(cell, seat)
export const isCenterBase = (cell: number, seat: number) => isBase(cell, seat) && colOf(cell) >= 2 && colOf(cell) <= 6
export function canDeployUnit(cell: number, seat: number, profile: UnitProfile, setup: GameSetup, artilleryOnly = false, artilleryRemaining = 0) {
  if (!isCell(cell) || !isHome(cell, seat) || setup.units.some((unit) => unit.cell === cell)) return false
  const first = !setup.units.some((unit) => unit.seat === seat)
  // A selection containing only artillery has no unit eligible for Centre Base.
  // In that case the first artillery piece starts in the rear as well.
  if (profile.unitType === 'artillery') return isRear(cell, seat) && (!first || artilleryOnly)
  // Every chosen unit must fit: leave enough rear cells for unplaced artillery.
  if (setup.version === 3 && isRear(cell, seat) && 9 - setup.units.filter((unit) => isRear(unit.cell, seat)).length <= artilleryRemaining) return false
  return !first || isCenterBase(cell, seat)
}

export function canRepositionUnit(from: number, to: number, seat: number, profile: UnitProfile, setup: GameSetup, artilleryOnly = false, artilleryRemaining = 0) {
  const unit = setup.units.find((item) => item.cell === from && item.seat === seat)
  if (!unit || from === to) return false
  const first = setup.units.find((item) => item.seat === seat) === unit
  if (first && profile.unitType !== 'artillery' && !isCenterBase(to, seat)) return false
  return canDeployUnit(to, seat, profile, { ...setup, units: setup.units.filter((item) => item !== unit) }, artilleryOnly, artilleryRemaining)
}
