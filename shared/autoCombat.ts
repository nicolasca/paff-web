import { adjacent, axisOf, isEngaged, type BattleUnit, type EngineState, type UnitCard } from './battleEngine'
import type { CombatState, TrollRoll } from './combat'
import { GOBLIN_SHAMAN_ID } from './greatInvocation'
import { hasUnitAbility } from './unitAbilities'

export const DANZEREU_ID = 'gobelins-le-danzereu'
export const FOREST_WRATH_ID = 'forest-wrath'
export const FOREST_SPIRITS_ID = 'gaeli-esprits-des-bois'
export const ANCESTRAL_GUARDIAN_ID = 'gaeli-gardiens-des-cen'
export const isHeld = (unit: BattleUnit, combat: CombatState | undefined, turn: number) => Boolean(combat?.held?.some((held) => held.unitId === unit.id && held.turn === turn))
export const isCombatPresent = (unit: BattleUnit, combat: CombatState | undefined, turn: number) => unit.regiment > 0 || isHeld(unit, combat, turn)

export function concentrationShamans(engine: EngineState, attacker: BattleUnit) {
  return engine.units.filter((unit) => unit.seat === attacker.seat && unit.regiment > 0 && unit.cardStableId === GOBLIN_SHAMAN_ID && axisOf(unit.cell) === axisOf(attacker.cell) && !isEngaged(engine, unit.id))
}
export function danzereuShotCount(engine: EngineState, attacker: BattleUnit, cards: UnitCard[]) {
  const profile = cards.find((card) => card.seat === attacker.seat && card.stableId === attacker.cardStableId)?.profile
  return hasUnitAbility(profile, 'shamanicConcentration') ? 1 + concentrationShamans(engine, attacker).length : 1
}
export function ammoEligible(engine: EngineState, attacker: BattleUnit, candidate: BattleUnit) {
  return engine.units.some((unit) => unit.id === candidate.id) && candidate.regiment > 0 && candidate.seat === attacker.seat && candidate.id !== attacker.id
    && adjacent(attacker.cell, candidate.cell)
    && !['gobelins-meneurs-de-troll', 'gobelins-djil-meneur-de-trolls', 'gobelins-katapult-a-gobs'].includes(candidate.cardStableId)
}

/** A roll belongs to an engagement, rather than a combat phase or turn. */
export function beginTrollEngagement(engine: EngineState, cards: UnitCard[], combat: CombatState, turn: number, unitId: string, targetId: string, d6: () => number): TrollRoll | undefined {
  const unit = engine.units.find((item) => item.id === unitId)
  const profile = unit && cards.find((card) => card.seat === unit.seat && card.stableId === unit.cardStableId)?.profile
  if (!unit || unit.regiment <= 0 || !hasUnitAbility(profile, 'trollitude')) return
  const existing = combat.trollRolls?.find((roll) => roll.unitId === unitId && roll.targetId === targetId)
  if (existing) return existing
  const roll = { unitId, targetId, value: d6(), turn }
  const rolls = combat.trollRolls ??= []
  rolls.push(roll)
  return roll
}
