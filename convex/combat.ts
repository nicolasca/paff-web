import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { attackKindValidator } from './lib/combat'
import { fail, loadManual, logEvent, saveManual } from './lib/manualState'
import { canAttack, combatCard, emptyCombat, excludedFromCombat, exposedAllies, invalidateCombat, resolveCombat, type AttackArrow } from '../shared/combat'
import { hasUnitAbility } from '../shared/unitAbilities'
import { cellCoordinate } from '../shared/board'
import { GOBLIN_SHAMAN_ID, GREAT_INVOCATION_ID, invocationEligible, invocationScopeName, type InvocationRoll } from '../shared/greatInvocation'
import { axisOf } from '../shared/battleEngine'
import { isWithinShootingRange } from '../shared/shootingRange'

const gameId = v.id('games')

export const invoke = mutation({
  args: { gameId, revision: v.number(), shamanId: v.string() },
  handler: async (ctx, args) => {
    const state = await loadManual(ctx, args.gameId)
    const seat = state.member.seat
    if (!state.battle.catalog.some((order) => order.id === GREAT_INVOCATION_ID && order.faction === 'gobelins' && order.seats.includes(seat))) return fail('ORDER_NOT_AVAILABLE')
    const manual = state.battle.manual!
    const combat = manual.combat ?? emptyCombat()
    if (combat.revision !== args.revision) return fail('STALE_GAME_ACTION')
    const stock = manual.stocks.find((item) => item.seat === seat && item.orderId === GREAT_INVOCATION_ID)
    if (!stock || stock.remaining < 1) return fail('ORDER_EXHAUSTED')
    const shaman = state.engine.units.find((unit) => unit.id === args.shamanId && unit.seat === seat && unit.regiment > 0 && unit.cardStableId === GOBLIN_SHAMAN_ID)
    if (!shaman) return fail('INVOCATION_NEEDS_SHAMAN')
    const shamanCard = combatCard(state.cards, shaman)
    if (!shamanCard) return fail('INVOCATION_NEEDS_SHAMAN')
    const axis = axisOf(shaman.cell)
    const value = Math.floor(Math.random() * 6) + 1
    const scope = value === 1 || value === 6 ? 'all' : axis
    const affected = state.engine.units.filter((unit) => invocationEligible(unit, seat, scope))
    const result: InvocationRoll = {
      id: (combat.invocationRolls?.at(-1)?.id ?? 0) + 1, seat, turn: state.battle.turn, value, axis, scope,
      shaman: { id: shaman.id, name: shamanCard.name, cell: shaman.cell },
      units: affected.map((unit) => ({ id: unit.id, name: combatCard(state.cards, unit)!.name, cell: unit.cell, before: unit.regiment, after: value <= 3 ? Math.max(0, unit.regiment - 1) : unit.regiment })),
    }
    manual.combat = combat
    stock.remaining--
    combat.invocationRolls = [...(combat.invocationRolls ?? []), result].slice(-20)
    if (value >= 4) {
      combat.invocations = (combat.invocations ?? []).filter((effect) => effect.seat !== seat)
      combat.invocations.push({ seat, turn: state.battle.turn, scope, unitIds: affected.map((unit) => unit.id) })
    } else {
      const losses = new Map(result.units.map((unit) => [unit.id, unit.after]))
      state.engine.units = state.engine.units.flatMap((unit) => {
        const after = losses.get(unit.id)
        if (after === undefined) return [unit]
        const updated = { ...unit, regiment: after }
        if (after > 0) return [updated]
        manual.discarded.push(updated)
        return []
      })
      const alive = new Set(state.engine.units.map((unit) => unit.id))
      state.engine.engagements = state.engine.engagements.filter((edge) => alive.has(edge.a) && alive.has(edge.b))
      if (manual.duel && (!alive.has(manual.duel.attackerId) || (manual.duel.targetId && !alive.has(manual.duel.targetId)))) manual.duel = undefined
    }
    invalidateCombat(combat, state.engine, state.battle.turn)
    let engine = logEvent(state.engine, state.battle.turn, `La gross Invokation ! · camp ${seat + 1} · ${shamanCard.name} (${cellCoordinate(shaman.cell)}) · dé ${value} · ${invocationScopeName(scope)} : ${value >= 4 ? 'dés de profil ×2 jusqu’à la fin du tour' : '−1 R par unité'}, hors Trolls et Djil. Ordre consommé.`)
    if (value <= 3) for (const unit of result.units) engine = logEvent(engine, state.battle.turn, `${unit.name} (${cellCoordinate(unit.cell)}) : ${unit.before} → ${unit.after} R${unit.after === 0 ? ' · détruite' : ''}.`)
    await saveManual(ctx, state.game, state.battle, engine)
  },
})
type State = Awaited<ReturnType<typeof loadManual>>
function validateArrow(state: State, arrow: AttackArrow, seat: number, requireAlly: boolean) {
  const attacker = state.engine.units.find((unit) => unit.id === arrow.attackerId && unit.regiment > 0)
  const target = state.engine.units.find((unit) => unit.id === arrow.targetId && unit.regiment > 0)
  if (!attacker || attacker.seat !== seat) return fail('UNIT_NOT_OWNED')
  if (!target || target.seat === attacker.seat) return fail('INVALID_ATTACK_TARGET')
  const profile = combatCard(state.cards, attacker)?.profile
  const defense = combatCard(state.cards, target)?.profile
  if (!profile || !defense || !canAttack(profile, arrow.kind) || excludedFromCombat(defense)) return fail('ATTACK_NOT_AVAILABLE')
  if (arrow.kind === 'ranged' && !isWithinShootingRange(attacker, target, profile)) return fail('OUT_OF_SHOOTING_RANGE')
  if (arrow.kind === 'ranged' && hasUnitAbility(profile, 'meleeShooting')) {
    const allies = exposedAllies(state.engine, attacker, target)
    if (arrow.allyId && !allies.some((unit) => unit.id === arrow.allyId)) return fail('INVALID_EXPOSED_ALLY')
    if (requireAlly && allies.length > 1 && !arrow.allyId) return fail('MISSING_EXPOSED_ALLY')
  } else if (arrow.allyId) return fail('INVALID_EXPOSED_ALLY')
}
function removeUnusedPair(state: State, arrows: AttackArrow[], old: AttackArrow) {
  if (old.kind !== 'melee' || arrows.some((arrow) => arrow.kind === 'melee' && ((arrow.attackerId === old.attackerId && arrow.targetId === old.targetId) || (arrow.attackerId === old.targetId && arrow.targetId === old.attackerId)))) return
  state.engine.engagements = state.engine.engagements.filter((edge) => !([edge.a, edge.b].includes(old.attackerId) && [edge.a, edge.b].includes(old.targetId)))
}

export const setArrow = mutation({
  args: { gameId, kind: attackKindValidator, attackerId: v.string(), targetId: v.optional(v.string()), allyId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const state = await loadManual(ctx, args.gameId)
    const manual = state.battle.manual!
    const combat = manual.combat ??= emptyCombat()
    const attacker = state.engine.units.find((unit) => unit.id === args.attackerId && unit.seat === state.member.seat)
    if (!attacker) return fail('UNIT_NOT_OWNED')
    const old = combat.arrows.find((arrow) => arrow.attackerId === attacker.id && arrow.kind === args.kind)
    const arrow: AttackArrow | undefined = args.targetId ? { kind: args.kind, attackerId: attacker.id, targetId: args.targetId, ...(args.allyId ? { allyId: args.allyId } : {}) } : undefined
    if (arrow) validateArrow(state, arrow, state.member.seat, false)
    combat.arrows = combat.arrows.filter((item) => item.attackerId !== attacker.id || item.kind !== args.kind)
    if (arrow) combat.arrows.push(arrow)
    if (old) removeUnusedPair(state, combat.arrows, old)
    if (arrow?.kind === 'melee') {
      const [a, b] = [arrow.attackerId, arrow.targetId].sort()
      if (!state.engine.engagements.some((edge) => edge.a === a && edge.b === b)) state.engine.engagements.push({ a, b })
    }
    invalidateCombat(combat, state.engine, state.battle.turn)
    await saveManual(ctx, state.game, state.battle, state.engine)
  },
})

export const clearArrows = mutation({
  args: { gameId, kind: attackKindValidator },
  handler: async (ctx, args) => {
    const state = await loadManual(ctx, args.gameId)
    const combat = state.battle.manual!.combat ??= emptyCombat()
    const mine = new Set(state.engine.units.filter((unit) => unit.seat === state.member.seat).map((unit) => unit.id))
    const removed = combat.arrows.filter((arrow) => arrow.kind === args.kind && mine.has(arrow.attackerId))
    combat.arrows = combat.arrows.filter((arrow) => !removed.includes(arrow))
    for (const arrow of removed) removeUnusedPair(state, combat.arrows, arrow)
    invalidateCombat(combat, state.engine, state.battle.turn)
    await saveManual(ctx, state.game, state.battle, state.engine)
  },
})

export const setReady = mutation({
  args: { gameId, revision: v.number(), ready: v.boolean() },
  handler: async (ctx, args) => {
    const state = await loadManual(ctx, args.gameId)
    const combat = state.battle.manual!.combat ??= emptyCombat()
    if (combat.revision !== args.revision) return fail('STALE_GAME_ACTION')
    combat.ready = combat.ready.filter((seat) => seat !== state.member.seat)
    if (args.ready) combat.ready.push(state.member.seat)
    await saveManual(ctx, state.game, state.battle, state.engine)
  },
})

export const resolve = mutation({
  args: { gameId, kind: attackKindValidator, revision: v.number() },
  handler: async (ctx, args) => {
    const state = await loadManual(ctx, args.gameId)
    const manual = state.battle.manual!
    const combat = manual.combat ??= emptyCombat()
    if (combat.revision !== args.revision) return fail('STALE_GAME_ACTION')
    if (args.kind === 'melee' && ![0, 1].every((seat) => combat.ready.includes(seat))) return fail('COMBAT_NOT_READY')
    const arrows = combat.arrows.filter((arrow) => arrow.kind === args.kind && (args.kind === 'melee' || state.engine.units.find((unit) => unit.id === arrow.attackerId)?.seat === state.member.seat))
    if (!arrows.length) return fail('NO_ATTACKS')
    for (const arrow of arrows) {
      const seat = state.engine.units.find((unit) => unit.id === arrow.attackerId)?.seat
      if (seat === undefined) return fail('INVALID_ATTACK_TARGET')
      validateArrow(state, arrow, seat, true)
    }
    const result = resolveCombat(state.engine, state.cards, arrows, combat.rain, state.battle.turn, args.kind, state.member.seat, (combat.reports.at(-1)?.id ?? 0) + 1, () => Math.floor(Math.random() * 6) + 1, combat.invocations)
    manual.discarded.push(...result.dead)
    if (result.dead.some((unit) => unit.id === manual.duel?.attackerId || unit.id === manual.duel?.targetId)) manual.duel = undefined
    combat.rain = result.rain
    combat.reports = [...combat.reports, result.report].slice(-10)
    if (args.kind === 'ranged') combat.arrows = combat.arrows.filter((arrow) => !arrows.includes(arrow))
    invalidateCombat(combat, result.engine, state.battle.turn)
    let engine = logEvent(result.engine, state.battle.turn, `${args.kind === 'melee' ? 'COMBAT' : 'TIR'} : ${arrows.length} attaque${arrows.length > 1 ? 's' : ''} simultanée${arrows.length > 1 ? 's' : ''}, ${result.dead.length} unité${result.dead.length > 1 ? 's' : ''} détruite${result.dead.length > 1 ? 's' : ''}.`)
    for (const attack of result.report.attacks) engine = logEvent(engine, state.battle.turn, `${attack.attacker.name} (${cellCoordinate(attack.attacker.cell)}) → ${attack.target.name} (${cellCoordinate(attack.target.cell)}) : ${attack.dice.map((die) => die.rerolled === undefined ? die.value : `${die.value}→${die.rerolled}`).join(', ') || 'aucun dé'} ; ${attack.threshold}+ ; ${attack.hits} touche(s), −${attack.damage} R${attack.rain ? ', −2 dés (Pluie)' : ''}.`)
    await saveManual(ctx, state.game, state.battle, engine)
  },
})
