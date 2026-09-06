import { cells, colOf, isCell, isHome, isRear, rowOf, zoneOf } from './board'
import type { UnitProfile } from './unitProfile'

export const ACTION_RULES_VERSION = '2026-09-06-actions-1'
export const RECRUITMENT_POINTS = 4 // WIP: base allowance is not specified in the supplied PDF.
export type BattleUnit = { id: string; seat: number; cardStableId: string; cell: number; regiment: number; movedTurn?: number; shotTurn?: number; chargedTurn?: number }
export type Engagement = { a: string; b: string }
export type AttackRoll = { attacker: string; target: string; dice: number[]; rerolls: { index: number; result: number }[]; threshold: number; modifier: number; hits: number }
export type ActiveOrder = { chosenId: string; orderId: string; seat: number; zone?: string; usedUnits: string[]; recruitmentSpent: number; recruitmentBonus: number }
export type Fight = { id: string; unitIds: string[]; targets: { unitId: string; targetId: string }[]; readySeats: number[] }
export type EngineState = {
  units: BattleUnit[]; engagements: Engagement[]; endedSeats: number[]; chargesPassed: number[]; combatStep: 'charges' | 'fights'; resolvedUnits: string[]
  activeOrder?: ActiveOrder; fight?: Fight; result?: { winner: number | null; reason: 'annihilation' | 'base' | 'strategy' | 'draw' }
  log: { id: number; turn: number; text: string; rolls: AttackRoll[] }[]
}
export type UnitCard = { stableId: string; seat: number; name: string; cost: number; profile: UnitProfile; quantity: number; entered: number }
export const cardFor = (unit: BattleUnit, cards: UnitCard[]) => cards.find((card) => card.seat === unit.seat && card.stableId === unit.cardStableId)!
export const axisOf = (cell: number) => colOf(cell) < 2 ? 0 : colOf(cell) < 7 ? 1 : 2
export const adjacent = (a: number, b: number) => isCell(a) && isCell(b) && Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b)) === 1
export const enemiesOf = (engine: EngineState, unitId: string) => engine.engagements.flatMap((edge) => edge.a === unitId ? [edge.b] : edge.b === unitId ? [edge.a] : []).filter((id) => engine.units.some((unit) => unit.id === id))
export const isEngaged = (engine: EngineState, unitId: string) => enemiesOf(engine, unitId).length > 0
export const zoneName = (cell: number) => `${['Arrière nord', 'Base nord', 'Centre', 'Base sud', 'Arrière sud'][Number(zoneOf(cell).split('-')[0])]} · ${['Flanc coco', 'Centre', 'Flanc aux pommes'][axisOf(cell)]}`

export function legalMoves(engine: EngineState, unit: BattleUnit, profile: UnitProfile, turn: number) {
  if (unit.shotTurn === turn || profile.unitType === 'artillery') return []
  const max = profile.unitType === 'cavalry' ? 3 : 1
  const occupied = new Set(engine.units.filter((item) => item.id !== unit.id).map((item) => item.cell))
  const result = new Map<number, { cell: number; path: number[]; cost: number }>()
  const startZone = zoneOf(unit.cell)
  const walk = (current: number, path: number[], cost: number, leftZone: boolean) => {
    for (const next of cells.filter((cell) => adjacent(current, cell))) {
      const nextCost = cost + 1 + (axisOf(next) !== axisOf(current) ? 1 : 0)
      if (nextCost > max || occupied.has(next) || next === unit.cell || path.includes(next) || (leftZone && zoneOf(next) === startZone)) continue
      const nextPath = [...path, next]
      if (!result.has(next) || result.get(next)!.cost > nextCost) result.set(next, { cell: next, path: nextPath, cost: nextCost })
      walk(next, nextPath, nextCost, leftZone || zoneOf(next) !== startZone)
    }
  }
  walk(unit.cell, [], 0, false)
  return [...result.values()]
}

// Range currently measured in cells. One diagonal may replace two orthogonal steps.
export function inShootingRange(from: number, to: number, artillery: boolean) {
  if (from === to || axisOf(from) !== axisOf(to)) return false
  const dx = Math.abs(colOf(from) - colOf(to)); const dy = Math.abs(rowOf(from) - rowOf(to))
  const distance = dx + dy - (dx && dy ? 1 : 0)
  return distance <= (artillery ? 3 : 2) || (artillery && distance === 4 && (dx === 0 || dy === 0))
}
export function legalTargets(engine: EngineState, unit: BattleUnit, profile: UnitProfile, turn: number) {
  if (profile.offense.kind !== 'ranged' || profile.offense.score === null || profile.dice === 0 || unit.movedTurn === turn || isEngaged(engine, unit.id)) return []
  return engine.units.filter((target) => target.seat !== unit.seat && !isEngaged(engine, target.id) && inShootingRange(unit.cell, target.cell, profile.unitType === 'artillery'))
}
export function legalRecruitmentCells(engine: EngineState, seat: number, profile: UnitProfile, zone?: string) {
  return cells.filter((cell) => isHome(cell, seat) && (profile.unitType !== 'artillery' || isRear(cell, seat)) && (!zone || zoneOf(cell) === zone) && !engine.units.some((unit) => unit.cell === cell || (unit.seat !== seat && zoneOf(unit.cell) === zoneOf(cell))))
}

export function hitRule(attack: number, defense: number) {
  const difference = attack - defense
  return { threshold: Math.max(2, Math.min(6, 4 - difference)), reroll: difference >= 3 ? 'fail' as const : difference <= -4 ? 'success' as const : 'none' as const }
}
export function rollAttack(attacker: BattleUnit, target: BattleUnit, profile: UnitProfile, defense: number, random: () => number, bonusDice = 0, modifier = 0, outnumber = 0): AttackRoll {
  const rule = hitRule(profile.offense.score ?? 0, defense)
  const roll = () => Math.floor(random() * 6) + 1
  const dice = Array.from({ length: profile.offense.score === null ? 0 : Math.max(0, profile.dice + bonusDice) }, roll)
  const success = (value: number) => value + modifier >= rule.threshold
  const rerolls: AttackRoll['rerolls'] = []
  let remaining = rule.reroll === 'fail' ? dice.length : rule.reroll === 'success' ? 0 : outnumber
  let hits = 0
  for (const [index, first] of dice.entries()) {
    let value = first
    if ((rule.reroll === 'success' && success(value)) || (!success(value) && remaining > 0)) {
      value = roll(); rerolls.push({ index, result: value }); remaining--
    }
    if (success(value)) hits++
  }
  return { attacker: attacker.id, target: target.id, dice, rerolls, threshold: rule.threshold, modifier, hits }
}
export function applyDamage(engine: EngineState, rolls: AttackRoll[]) {
  const units = engine.units.map((unit) => ({ ...unit, regiment: Math.max(0, unit.regiment - rolls.filter((roll) => roll.target === unit.id).reduce((sum, roll) => sum + roll.hits, 0)) })).filter((unit) => unit.regiment > 0)
  const alive = new Set(units.map((unit) => unit.id))
  return { ...engine, units, engagements: engine.engagements.filter((edge) => alive.has(edge.a) && alive.has(edge.b)) }
}
export function combatGroups(engine: EngineState) {
  const eligible = new Set(engine.units.filter((unit) => !engine.resolvedUnits.includes(unit.id) && isEngaged(engine, unit.id)).map((unit) => unit.id))
  const groups: string[][] = []
  while (eligible.size) {
    const group = [eligible.values().next().value!]; eligible.delete(group[0])
    for (let index = 0; index < group.length; index++) for (const enemy of enemiesOf(engine, group[index])) if (eligible.delete(enemy)) group.push(enemy)
    groups.push(group)
  }
  return groups
}
export function outnumberBonus(engine: EngineState, targetId: string) {
  const attackers = enemiesOf(engine, targetId)
  return attackers.length > 1 && attackers.every((id) => enemiesOf(engine, id).length === 1) ? attackers.length - 1 : 0
}
export function strategyControl(engine: EngineState) {
  return [0, 1].map((seat) => [0, 1, 2].filter((axis) => {
    const units = engine.units.filter((unit) => zoneOf(unit.cell) === `2-${axis}`)
    return units.some((unit) => unit.seat === seat && !isEngaged(engine, unit.id)) && !units.some((unit) => unit.seat !== seat)
  }).length)
}
export function victory(engine: EngineState, cards: UnitCard[], turn: number): EngineState['result'] {
  const eliminated = [0, 1].map((seat) => !engine.units.some((unit) => unit.seat === seat) && !cards.some((card) => card.seat === seat && card.quantity > card.entered))
  if (eliminated.every(Boolean)) return { winner: null, reason: 'draw' }
  if (eliminated.some(Boolean)) return { winner: eliminated[0] ? 1 : 0, reason: 'annihilation' }
  const conquered = [0, 1].map((seat) => {
    const enemyBase = seat === 0 ? '1-1' : '3-1'
    const free = engine.units.filter((unit) => zoneOf(unit.cell) === enemyBase && !isEngaged(engine, unit.id))
    return free.some((unit) => unit.seat === seat) && !free.some((unit) => unit.seat !== seat)
  })
  if (conquered.every(Boolean)) return { winner: null, reason: 'draw' }
  if (conquered.some(Boolean)) return { winner: conquered[0] ? 0 : 1, reason: 'base' }
  if (turn >= 8) { const score = strategyControl(engine); return { winner: score[0] === score[1] ? null : score[0] > score[1] ? 0 : 1, reason: score[0] === score[1] ? 'draw' : 'strategy' } }
}
