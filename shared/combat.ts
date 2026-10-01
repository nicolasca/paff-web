import { enemiesOf, hitRule, isEngaged, type BattleUnit, type EngineState, type UnitCard } from './battleEngine'
import { zoneOf } from './board'
import { hasUnitAbility } from './unitAbilities'
import type { UnitProfile } from './unitProfile'
import { underInvocation, type InvocationEffect, type InvocationRoll } from './greatInvocation'

export type AttackKind = 'ranged' | 'melee'
export type AttackArrow = { kind: AttackKind; attackerId: string; targetId: string; allyId?: string }
export type RainEffect = { unitId: string; turn: number; penalty: number }
export type Combatant = { id: string; name: string; seat: number; cell: number }
export type AttackResult = {
  attacker: Combatant; target: Combatant; threshold: number; offense: number; defense: number
  dice: { value: number; rerolled?: number }[]; hits: number; damage: number; rain: number; effects: string[]
}
export type CombatReport = {
  id: number; turn: number; kind: AttackKind; seat: number
  attacks: AttackResult[]
  diversions: { attacker: Combatant; ally: Combatant; target: Combatant; values: number[] }[]
  losses: { unit: Combatant; before: number; after: number; damage: number }[]
}
export type CombatState = {
  revision: number; arrows: AttackArrow[]; ready: number[]; rain: RainEffect[]; reports: CombatReport[]
  invocations?: InvocationEffect[]
  invocationRolls?: InvocationRoll[]
}
export const emptyCombat = (): CombatState => ({ revision: 0, arrows: [], ready: [], rain: [], reports: [] })
export function invalidateCombat(combat: CombatState, engine: EngineState, turn: number) {
  combat.revision++
  combat.ready = []
  const alive = new Set(engine.units.filter((unit) => unit.regiment > 0).map((unit) => unit.id))
  combat.arrows = combat.arrows.filter((arrow) => alive.has(arrow.attackerId) && alive.has(arrow.targetId))
    .map((arrow) => arrow.allyId && (!alive.has(arrow.allyId) || !enemiesOf(engine, arrow.targetId).includes(arrow.allyId)) ? { kind: arrow.kind, attackerId: arrow.attackerId, targetId: arrow.targetId } : arrow)
  combat.rain = combat.rain.filter((effect) => effect.turn === turn && alive.has(effect.unitId))
  if (combat.invocations) combat.invocations = combat.invocations.filter((effect) => effect.turn === turn)
    .map((effect) => ({ ...effect, unitIds: effect.unitIds.filter((id) => alive.has(id)) }))
}
export const combatCard = (cards: UnitCard[], unit: BattleUnit) => cards.find((card) => card.seat === unit.seat && card.stableId === unit.cardStableId)
export const excludedFromCombat = (profile: UnitProfile) => hasUnitAbility(profile, 'branTeha') || hasUnitAbility(profile, 'guardianCharge')
export const canAttack = (profile: UnitProfile, kind: AttackKind) => !excludedFromCombat(profile) && profile.offense.kind === kind && profile.offense.score !== null && profile.dice > 0

export function exposedAllies(engine: EngineState, attacker: BattleUnit, target: BattleUnit) {
  const engaged = enemiesOf(engine, target.id)
  return engine.units.filter((unit) => unit.seat === attacker.seat && unit.regiment > 0 && engaged.includes(unit.id))
}

// All attacks read the same snapshot. Damage and newly inflicted rain are applied
// only after every roll, including attacks made by units killed in this batch.
export function resolveCombat(engine: EngineState, cards: UnitCard[], arrows: AttackArrow[], rain: RainEffect[], turn: number, kind: AttackKind, seat: number, id: number, d6: () => number, invocations: InvocationEffect[] = []): { report: CombatReport; engine: EngineState; rain: RainEffect[]; dead: BattleUnit[] } {
  const report: CombatReport = { id, turn, kind, seat, attacks: [], diversions: [], losses: [] }
  const damage = new Map<string, number>()
  const penalties = new Map<string, number>()
  const identity = (unit: BattleUnit): Combatant => ({ id: unit.id, name: combatCard(cards, unit)!.name, seat: unit.seat, cell: unit.cell })
  const active = engine.units.filter((unit) => unit.regiment > 0)
  for (const arrow of arrows) {
    const attacker = active.find((unit) => unit.id === arrow.attackerId)!
    const target = active.find((unit) => unit.id === arrow.targetId)!
    const profile = combatCard(cards, attacker)!.profile
    const sameZone = active.filter((unit) => unit.seat === attacker.seat && zoneOf(unit.cell) === zoneOf(attacker.cell))
    const chiefs = kind === 'melee' ? sameZone.filter((unit) => unit.id !== attacker.id && hasUnitAbility(combatCard(cards, unit)?.profile, 'forGaeli')).length : 0
    const rerolls = kind === 'melee' ? sameZone.filter((unit) => hasUnitAbility(combatCard(cards, unit)?.profile, 'ancestralSong') && !isEngaged(engine, unit.id)).length : 0
    const penalty = rain.filter((effect) => effect.unitId === attacker.id && effect.turn === turn).reduce((sum, effect) => sum + effect.penalty, 0)
    const magical = kind === 'ranged' && hasUnitAbility(profile, 'magicalShot')
    const baseEffects = [ ...(chiefs ? [`Pour la Gaeli ! : +${chiefs} dé${chiefs > 1 ? 's' : ''}`] : []), ...(magical ? ['Tir magique : défenses spéciales ignorées'] : []) ]
    const invoked = underInvocation(attacker, invocations, turn)
    if (invoked) baseEffects.unshift(`La gross Invokation ! : ${profile.dice} → ${profile.dice * 2} dés de profil`)
    const normalCount = profile.dice * (invoked ? 2 : 1) + chiefs

    function rollAt(recipient: BattleUnit, initial: number, applyRain: boolean) {
      const defenseProfile = combatCard(cards, recipient)!.profile
      const effects = [...baseEffects]
      let count = initial
      if (!magical && hasUnitAbility(defenseProfile, 'ethereal') && count > 0) {
        count = Math.max(1, count - 1)
        effects.push('Ethérés : −1 dé, minimum 1')
      }
      if (applyRain && penalty) { count = Math.max(0, count - penalty); effects.push(`Pluie de gobs : −${penalty} dés`) }
      const defense = kind === 'ranged' ? defenseProfile.defenseRanged : defenseProfile.defenseMelee
      const threshold = hitRule(profile.offense.score!, defense).threshold
      const dice: AttackResult['dice'] = Array.from({ length: count }, () => ({ value: d6() }))
      let available = rerolls
      for (const die of dice) if (die.value < threshold && available > 0) { die.rerolled = d6(); available-- }
      if (rerolls) effects.push(`Chant des Ancêtres : ${rerolls - available}/${rerolls} relance${rerolls > 1 ? 's' : ''}`)
      const hits = dice.filter((die) => (die.rerolled ?? die.value) >= threshold).length
      const goblinRain = kind === 'ranged' && hasUnitAbility(profile, 'goblinRain') && recipient.seat !== attacker.seat
      const inflicted = goblinRain ? 0 : hits
      const rainPenalty = goblinRain && hits > 0 ? 2 : 0
      if (goblinRain) effects.push('Pluie de gobs : pas de dégâts, −2 dés si touche')
      report.attacks.push({ attacker: identity(attacker), target: identity(recipient), threshold, offense: profile.offense.score!, defense, dice, hits, damage: inflicted, rain: rainPenalty, effects })
      damage.set(recipient.id, (damage.get(recipient.id) ?? 0) + inflicted)
      penalties.set(recipient.id, (penalties.get(recipient.id) ?? 0) + rainPenalty)
    }

    const allies = kind === 'ranged' && hasUnitAbility(profile, 'meleeShooting') ? exposedAllies(engine, attacker, target) : []
    if (allies.length) {
      const ally = allies.find((unit) => unit.id === arrow.allyId) ?? (allies.length === 1 ? allies[0] : undefined)
      if (!ally) throw new Error('MISSING_EXPOSED_ALLY')
      // Rain changes the shooter's available dice; Ethérés is applied only after
      // each die has been assigned to its actual recipient.
      const values = Array.from({ length: Math.max(0, normalCount - penalty) }, d6)
      report.diversions.push({ attacker: identity(attacker), ally: identity(ally), target: identity(target), values })
      if (penalty) baseEffects.push(`Pluie de gobs : −${penalty} dés avant répartition`)
      baseEffects.push('Tir en mêlée : répartition avant les touches')
      rollAt(ally, values.filter((value) => value <= 3).length, false)
      rollAt(target, values.filter((value) => value > 3).length, false)
    } else rollAt(target, normalCount, true)
  }
  const dead: BattleUnit[] = []
  const units = engine.units.flatMap((unit) => {
    const loss = damage.get(unit.id) ?? 0
    if (!loss) return [unit]
    const after = Math.max(0, unit.regiment - loss)
    report.losses.push({ unit: identity(unit), before: unit.regiment, after, damage: loss })
    const updated = { ...unit, regiment: after }
    if (!after) { dead.push(updated); return [] }
    return [updated]
  })
  const alive = new Set(units.map((unit) => unit.id))
  const nextRain = rain.filter((effect) => effect.turn === turn && alive.has(effect.unitId)).map((effect) => ({ ...effect }))
  for (const [unitId, penalty] of penalties) if (penalty && alive.has(unitId)) {
    const current = nextRain.find((effect) => effect.unitId === unitId)
    if (current) current.penalty += penalty
    else nextRain.push({ unitId, turn, penalty })
  }
  return { report, dead, rain: nextRain, engine: { ...engine, units, engagements: engine.engagements.filter((edge) => alive.has(edge.a) && alive.has(edge.b)) } }
}
