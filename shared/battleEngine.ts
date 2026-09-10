import { cells, colOf, isCell, rowOf, zoneOf } from './board'
import type { UnitProfile } from './unitProfile'
import { hasUnitAbility } from './unitAbilities'

export type BattleUnit = { id: string; seat: number; cardStableId: string; cell: number; regiment: number }
export type Engagement = { a: string; b: string }
export type EngineState = {
  units: BattleUnit[]; engagements: Engagement[]
  log: { id: number; turn: number; text: string }[]
}
export type UnitCard = { stableId: string; seat: number; name: string; cost: number; profile: UnitProfile; quantity: number; entered: number }
export const axisOf = (cell: number) => colOf(cell) < 2 ? 0 : colOf(cell) < 7 ? 1 : 2
export const adjacent = (a: number, b: number) => isCell(a) && isCell(b) && Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b)) === 1
export const enemiesOf = (engine: EngineState, unitId: string) => engine.engagements.flatMap((edge) => edge.a === unitId ? [edge.b] : edge.b === unitId ? [edge.a] : []).filter((id) => engine.units.some((unit) => unit.id === id))
export const isEngaged = (engine: EngineState, unitId: string) => enemiesOf(engine, unitId).length > 0
export const zoneName = (cell: number) => `${['Arrière nord', 'Base nord', 'Centre', 'Base sud', 'Arrière sud'][Number(zoneOf(cell).split('-')[0])]} · ${['Flanc coco', 'Centre', 'Flanc aux pommes'][axisOf(cell)]}`

export function legalMoves(engine: EngineState, unit: BattleUnit, profile: UnitProfile) {
  const flying = hasUnitAbility(profile, 'flight')
  if (profile.unitType === 'artillery' && !flying) return []
  const max = flying || profile.unitType === 'cavalry' ? 3 : 1
  const occupied = new Set(engine.units.filter((item) => item.id !== unit.id).map((item) => item.cell))
  const result = new Map<number, { cell: number; path: number[]; cost: number }>()
  const startZone = zoneOf(unit.cell)
  const walk = (current: number, path: number[], cost: number, leftZone: boolean) => {
    for (const next of cells.filter((cell) => adjacent(current, cell))) {
      const nextCost = cost + 1 + (axisOf(next) !== axisOf(current) ? 1 : 0)
      if (nextCost > max || (!flying && occupied.has(next)) || next === unit.cell || path.includes(next) || (leftZone && zoneOf(next) === startZone)) continue
      const nextPath = [...path, next]
      if (!occupied.has(next) && (!result.has(next) || result.get(next)!.cost > nextCost)) result.set(next, { cell: next, path: nextPath, cost: nextCost })
      walk(next, nextPath, nextCost, leftZone || zoneOf(next) !== startZone)
    }
  }
  walk(unit.cell, [], 0, false)
  return [...result.values()]
}

export function hitRule(attack: number, defense: number) {
  const difference = attack - defense
  return { threshold: Math.max(2, Math.min(6, 4 - difference)), reroll: difference >= 3 ? 'fail' as const : difference <= -4 ? 'success' as const : 'none' as const }
}
