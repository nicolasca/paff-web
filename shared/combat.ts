import { hitRule, type BattleUnit, type EngineState, type UnitCard } from './battleEngine'
import { zoneOf } from './board'
import { hasUnitAbility } from './unitAbilities'
import type { UnitProfile } from './unitProfile'
import { underInvocation, type InvocationEffect, type InvocationRoll } from './greatInvocation'
import { concentrationShamans, FOREST_SPIRITS_ID, isCombatPresent, isHeld } from './autoCombat'

export type AttackKind = 'ranged' | 'melee'
export type AttackArrow = { kind: AttackKind; attackerId: string; targetId: string; slot?: number; sacrificeId?: string; allyId?: string }
// These fields remain readable in past reports; new combat does not create rain or diversions.
export type RainEffect = { unitId: string; turn: number; penalty: number }
export type HeldUnit = { unitId: string; turn: number }
export type TrollRoll = { unitId: string; targetId: string; value: number; turn: number }
export type Combatant = { id: string; name: string; seat: number; cell: number }
export type AttackResult = {
  attacker: Combatant; target: Combatant; threshold: number; offense: number; defense: number
  dice: { value: number; rerolled?: number }[]; hits: number; damage: number; rain: number; effects: string[]; slot?: number
}
export type CombatReport = {
  id: number; turn: number; kind: AttackKind; seat: number
  attacks: AttackResult[]
  diversions: { attacker: Combatant; ally: Combatant; target: Combatant; values: number[] }[]
  losses: { unit: Combatant; before: number; after: number; damage: number }[]
  sacrifices?: Combatant[]
  shamanRisks?: { unit: Combatant; value: number; discarded: boolean }[]
  held?: Combatant[]
  orderId?: 'concentrated-fire'
}
export type CombatState = {
  revision: number; arrows: AttackArrow[]; ready: number[]; rain: RainEffect[]; reports: CombatReport[]
  invocations?: InvocationEffect[]
  invocationRolls?: InvocationRoll[]
  forestWrath?: { seat: number; turn: number }[]
  held?: HeldUnit[]
  trollRolls?: TrollRoll[]
}
export const emptyCombat = (): CombatState => ({ revision: 0, arrows: [], ready: [], rain: [], reports: [] })
export function invalidateCombat(combat: CombatState, engine: EngineState, turn: number) {
  combat.revision++
  combat.ready = []
  const present = new Set(engine.units.filter((unit) => isCombatPresent(unit, combat, turn)).map((unit) => unit.id))
  const alive = new Set(engine.units.filter((unit) => unit.regiment > 0).map((unit) => unit.id))
  combat.arrows = combat.arrows.filter((arrow) => present.has(arrow.attackerId) && present.has(arrow.targetId) && (arrow.kind === 'melee' || (alive.has(arrow.attackerId) && alive.has(arrow.targetId))))
    .map((arrow) => {
      if (!arrow.sacrificeId || alive.has(arrow.sacrificeId)) return arrow
      const cleaned = { ...arrow }
      delete cleaned.sacrificeId
      return cleaned
    })
  combat.rain = []
  if (combat.held) combat.held = combat.held.filter((held) => held.turn === turn && present.has(held.unitId))
  if (combat.forestWrath) combat.forestWrath = combat.forestWrath.filter((effect) => effect.turn === turn)
  if (combat.invocations) combat.invocations = combat.invocations.filter((effect) => effect.turn === turn)
    .map((effect) => ({ ...effect, unitIds: effect.unitIds.filter((id) => alive.has(id)) }))
  if (combat.trollRolls) combat.trollRolls = combat.trollRolls.filter((roll) => present.has(roll.unitId) && present.has(roll.targetId)
    && engine.engagements.some((edge) => [edge.a, edge.b].includes(roll.unitId) && [edge.a, edge.b].includes(roll.targetId)))
}
export const combatCard = (cards: UnitCard[], unit: BattleUnit) => cards.find((card) => card.seat === unit.seat && card.stableId === unit.cardStableId)
// Retained for callers; Druides and Grand Gardien are now available as targets.
export const excludedFromCombat = (_profile: UnitProfile) => false
export const canAttack = (profile: UnitProfile, kind: AttackKind) => profile.offense.kind === kind && profile.offense.score !== null && profile.dice > 0

// Every attack reads the same snapshot, after ammunition sacrifices. Shaman risks
// and all wounds are applied only after the complete batch has rolled.
export function resolveCombat(engine: EngineState, cards: UnitCard[], arrows: AttackArrow[], _rain: RainEffect[], turn: number, kind: AttackKind, seat: number, id: number, d6: () => number, invocations: InvocationEffect[] = [], combat?: CombatState, orderId?: 'concentrated-fire'): { report: CombatReport; engine: EngineState; rain: RainEffect[]; dead: BattleUnit[]; held: HeldUnit[] } {
  const report: CombatReport = { id, turn, kind, seat, attacks: [], diversions: [], losses: [], ...(orderId ? { orderId } : {}) }
  const identity = (unit: BattleUnit): Combatant => ({ id: unit.id, name: combatCard(cards, unit)!.name, seat: unit.seat, cell: unit.cell })
  const sacrificedIds = new Set(arrows.flatMap((arrow) => arrow.sacrificeId ? [arrow.sacrificeId] : []))
  const sacrificed = engine.units.filter((unit) => sacrificedIds.has(unit.id))
  if (sacrificed.length) report.sacrifices = sacrificed.map(identity)
  const snapshot = { ...engine, units: engine.units.filter((unit) => !sacrificedIds.has(unit.id)), engagements: engine.engagements.filter((edge) => !sacrificedIds.has(edge.a) && !sacrificedIds.has(edge.b)) }
  const active = snapshot.units.filter((unit) => isCombatPresent(unit, combat, turn))
  const damage = new Map<string, number>()
  const supporters = new Map<string, BattleUnit>()
  for (const arrow of arrows) {
    const attacker = active.find((unit) => unit.id === arrow.attackerId)!
    const target = active.find((unit) => unit.id === arrow.targetId)!
    const profile = combatCard(cards, attacker)!.profile
    const defenseProfile = combatCard(cards, target)!.profile
    const effects: string[] = []
    const invoked = underInvocation(attacker, invocations, turn)
    const forest = kind === 'melee' && attacker.cardStableId === FOREST_SPIRITS_ID && combat?.forestWrath?.some((effect) => effect.seat === attacker.seat && effect.turn === turn)
    if (invoked) effects.push(`La gross Invokation ! : ${profile.dice} → ${profile.dice * 2} dés de profil`)
    if (forest) effects.push(`Colère de la Forêt : ${profile.dice} → ${profile.dice * 2} dés de profil`)
    if (orderId) effects.push('Tir concentré : +1 dé')
    let count = profile.dice * (invoked || forest ? 2 : 1) + (orderId ? 1 : 0)
    if (hasUnitAbility(defenseProfile, 'ethereal') && count > 0) {
      count = Math.max(1, count - 1)
      effects.push('Ethérés : −1 dé, minimum 1')
    }
    const behavior = kind === 'melee' && hasUnitAbility(profile, 'trollitude') ? combat?.trollRolls?.find((roll) => roll.unitId === attacker.id && roll.targetId === target.id) : undefined
    if (behavior) {
      effects.push(`Trollitude : dé ${behavior.value}${behavior.value <= 3 && behavior.value > 1 ? ', aucune attaque pendant cet engagement' : behavior.value === 1 ? ', attaque de l’allié choisi' : ', attaque normale'}`)
      if (behavior.value === 2 || behavior.value === 3) count = 0
    }
    if (kind === 'ranged' && hasUnitAbility(profile, 'shamanicConcentration')) {
      for (const shaman of concentrationShamans(snapshot, attacker)) supporters.set(shaman.id, shaman)
      effects.push(`Concentration shamanique : tir ${(arrow.slot ?? 0) + 1}`)
    }
    if (arrow.sacrificeId) effects.push(`Des munitions ! : ${identity(sacrificed.find((unit) => unit.id === arrow.sacrificeId)!).name} sacrifié`)
    if (isHeld(attacker, combat, turn)) effects.push('Pour la Gaeli ! : combat conservé jusqu’à la fin du tour')
    const defense = kind === 'ranged' ? defenseProfile.defenseRanged : defenseProfile.defenseMelee
    const threshold = hitRule(profile.offense.score!, defense).threshold
    const dice = Array.from({ length: count }, () => ({ value: d6() }))
    const hits = dice.filter((die) => die.value >= threshold).length
    report.attacks.push({ attacker: identity(attacker), target: identity(target), threshold, offense: profile.offense.score!, defense, dice, hits, damage: hits, rain: 0, effects, ...(arrow.slot !== undefined ? { slot: arrow.slot } : {}) })
    damage.set(target.id, (damage.get(target.id) ?? 0) + hits)
  }
  const failedShamans = new Set<string>()
  if (supporters.size) report.shamanRisks = [...supporters.values()].map((unit) => {
    const value = d6()
    const discarded = value <= 3
    if (discarded) failedShamans.add(unit.id)
    return { unit: identity(unit), value, discarded }
  })
  const held = (combat?.held ?? []).filter((entry) => entry.turn === turn && active.some((unit) => unit.id === entry.unitId))
  const dead: BattleUnit[] = sacrificed.map((unit) => ({ ...unit, regiment: 0 }))
  const newlyHeld: BattleUnit[] = []
  const units = snapshot.units.flatMap((unit) => {
    if (failedShamans.has(unit.id)) { dead.push({ ...unit, regiment: 0 }); return [] }
    if (isHeld(unit, combat, turn)) return [unit]
    const loss = damage.get(unit.id) ?? 0
    if (!loss) return [unit]
    const after = Math.max(0, unit.regiment - loss)
    report.losses.push({ unit: identity(unit), before: unit.regiment, after, damage: loss })
    const updated = { ...unit, regiment: after }
    if (after) return [updated]
    const protectedByChief = kind === 'ranged' && !hasUnitAbility(combatCard(cards, unit)?.profile, 'forGaeli')
      && active.some((chief) => chief.regiment > 0 && chief.seat === unit.seat && zoneOf(chief.cell) === zoneOf(unit.cell) && hasUnitAbility(combatCard(cards, chief)?.profile, 'forGaeli'))
    if (protectedByChief) { held.push({ unitId: unit.id, turn }); newlyHeld.push(updated); return [updated] }
    dead.push(updated)
    return []
  })
  if (newlyHeld.length) report.held = newlyHeld.map(identity)
  const present = new Set(units.map((unit) => unit.id))
  return { report, dead, held, rain: [], engine: { ...engine, units, engagements: snapshot.engagements.filter((edge) => present.has(edge.a) && present.has(edge.b)) } }
}
