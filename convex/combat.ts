import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { attackKindValidator } from './lib/combat'
import { fail, loadManual, logEvent, requireAutoRules, saveManual } from './lib/manualState'
import { canAttack, combatCard, emptyCombat, invalidateCombat, resolveCombat, type AttackArrow } from '../shared/combat'
import { hasUnitAbility } from '../shared/unitAbilities'
import { cellCoordinate, zoneOf } from '../shared/board'
import { GOBLIN_SHAMAN_ID, GREAT_INVOCATION_ID, invocationEligible, invocationScopeName, type InvocationRoll } from '../shared/greatInvocation'
import { adjacent, axisOf, isEngaged } from '../shared/battleEngine'
import { isWithinShootingRange } from '../shared/shootingRange'
import { ammoEligible, ANCESTRAL_GUARDIAN_ID, beginTrollEngagement, danzereuShotCount, FOREST_WRATH_ID, isCombatPresent } from '../shared/autoCombat'
import type { CombatState } from '../shared/combat'

const gameId = v.id('games')

export const invoke = mutation({
  args: { gameId, revision: v.number(), shamanId: v.string() },
  handler: async (ctx, args) => {
    const state = await loadManual(ctx, args.gameId)
    requireAutoRules(state.game)
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
const d6 = () => Math.floor(Math.random() * 6) + 1
function redirectedTrollRoll(combat: CombatState | undefined, attackerId: string, targetId: string) {
  const existing = combat?.trollRolls?.find((roll) => roll.unitId === attackerId && roll.targetId === targetId)
  const current = combat?.arrows.find((arrow) => arrow.kind === 'melee' && arrow.attackerId === attackerId)
  return existing ?? combat?.trollRolls?.find((roll) => roll.unitId === attackerId && roll.targetId === current?.targetId)
    ?? combat?.trollRolls?.findLast((roll) => roll.unitId === attackerId)
}
function validateArrow(state: State, arrow: AttackArrow, seat: number, launching: boolean) {
  const combat = state.battle.manual!.combat
  const attacker = state.engine.units.find((unit) => unit.id === arrow.attackerId && isCombatPresent(unit, combat, state.battle.turn))
  const target = state.engine.units.find((unit) => unit.id === arrow.targetId && isCombatPresent(unit, combat, state.battle.turn))
  if (!attacker || attacker.seat !== seat) return fail('UNIT_NOT_OWNED')
  if (!target || target.id === attacker.id) return fail('INVALID_ATTACK_TARGET')
  if (arrow.kind === 'ranged' && target.regiment <= 0) return fail('INVALID_ATTACK_TARGET')
  const profile = combatCard(state.cards, attacker)?.profile
  const defense = combatCard(state.cards, target)?.profile
  if (!profile || !defense || !canAttack(profile, arrow.kind) || (arrow.kind === 'ranged' && attacker.regiment <= 0)) return fail('ATTACK_NOT_AVAILABLE')
  const slot = arrow.slot ?? 0
  if (!Number.isSafeInteger(slot) || slot < 0 || slot >= (arrow.kind === 'ranged' ? danzereuShotCount(state.engine, attacker, state.cards) : 1)) return fail('INVALID_ATTACK_SLOT')
  const troll = arrow.kind === 'melee' && hasUnitAbility(profile, 'trollitude')
  const behavior = combat?.trollRolls?.find((roll) => roll.unitId === attacker.id && roll.targetId === target.id)
  if (target.seat === attacker.seat) {
    const redirect = redirectedTrollRoll(combat, attacker.id, target.id)
    if (!troll || redirect?.value !== 1 || !adjacent(attacker.cell, target.cell) || target.regiment <= 0) return fail('INVALID_ATTACK_TARGET')
  } else if (launching && troll && behavior?.value === 1) return fail('TROLL_NEEDS_ALLY')
  if (launching && troll && !behavior) return fail('TROLL_NEEDS_ENGAGEMENT')
  if (arrow.kind === 'ranged') {
    if (!isWithinShootingRange(attacker, target, profile)) return fail('OUT_OF_SHOOTING_RANGE')
    if (isEngaged(state.engine, target.id)) return fail('ENGAGED_SHOOTING_TARGET')
  }
  if (arrow.allyId) return fail('INVALID_EXPOSED_ALLY')
  if (arrow.kind === 'ranged' && hasUnitAbility(profile, 'ammunition')) {
    const sacrifice = state.engine.units.find((unit) => unit.id === arrow.sacrificeId)
    if ((launching || arrow.sacrificeId) && (!sacrifice || !ammoEligible(state.engine, attacker, sacrifice))) return fail('INVALID_AMMUNITION')
  } else if (arrow.sacrificeId) return fail('INVALID_AMMUNITION')
}
function removeUnusedPair(state: State, arrows: AttackArrow[], old: AttackArrow) {
  if (old.kind !== 'melee' || arrows.some((arrow) => arrow.kind === 'melee' && ((arrow.attackerId === old.attackerId && arrow.targetId === old.targetId) || (arrow.attackerId === old.targetId && arrow.targetId === old.attackerId)))) return
  state.engine.engagements = state.engine.engagements.filter((edge) => !([edge.a, edge.b].includes(old.attackerId) && [edge.a, edge.b].includes(old.targetId)))
}

export const forestWrath = mutation({
  args: { gameId, revision: v.number(), guardianId: v.string() },
  handler: async (ctx, args) => {
    const state = await loadManual(ctx, args.gameId)
    requireAutoRules(state.game)
    const seat = state.member.seat
    const manual = state.battle.manual!
    const combat = manual.combat ??= emptyCombat()
    if (combat.revision !== args.revision) return fail('STALE_GAME_ACTION')
    if (!state.battle.catalog.some((order) => order.id === FOREST_WRATH_ID && order.faction === 'gaeli' && order.seats.includes(seat))) return fail('ORDER_NOT_AVAILABLE')
    const stock = manual.stocks.find((item) => item.seat === seat && item.orderId === FOREST_WRATH_ID)
    if (!stock || stock.remaining < 1) return fail('ORDER_EXHAUSTED')
    const guardian = state.engine.units.find((unit) => unit.id === args.guardianId && unit.seat === seat && unit.regiment > 0 && unit.cardStableId === ANCESTRAL_GUARDIAN_ID && !isEngaged(state.engine, unit.id))
    if (!guardian) return fail('FOREST_WRATH_NEEDS_GUARDIAN')
    stock.remaining--
    combat.forestWrath = [...(combat.forestWrath ?? []).filter((effect) => effect.seat !== seat), { seat, turn: state.battle.turn }]
    invalidateCombat(combat, state.engine, state.battle.turn)
    await saveManual(ctx, state.game, state.battle, logEvent(state.engine, state.battle.turn, `Colère de la Forêt · camp ${seat + 1} : dés de profil des Esprits des Bois ×2 au corps à corps jusqu’à la fin du tour. Ordre consommé.`))
  },
})

export const setArrow = mutation({
  args: { gameId, kind: attackKindValidator, attackerId: v.string(), targetId: v.optional(v.string()), slot: v.optional(v.number()), sacrificeId: v.optional(v.string()), allyId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const state = await loadManual(ctx, args.gameId)
    requireAutoRules(state.game)
    const manual = state.battle.manual!
    const combat = manual.combat ??= emptyCombat()
    const attacker = state.engine.units.find((unit) => unit.id === args.attackerId && unit.seat === state.member.seat)
    if (!attacker) return fail('UNIT_NOT_OWNED')
    if (!Number.isSafeInteger(args.slot ?? 0) || (args.slot ?? 0) < 0) return fail('INVALID_ATTACK_SLOT')
    const old = combat.arrows.find((arrow) => arrow.attackerId === attacker.id && arrow.kind === args.kind && (arrow.slot ?? 0) === (args.slot ?? 0))
    const arrow: AttackArrow | undefined = args.targetId ? { kind: args.kind, attackerId: attacker.id, targetId: args.targetId, ...(args.slot !== undefined ? { slot: args.slot } : {}), ...(args.sacrificeId ? { sacrificeId: args.sacrificeId } : {}), ...(args.allyId ? { allyId: args.allyId } : {}) } : undefined
    if (arrow) {
      validateArrow(state, arrow, state.member.seat, false)
      if (arrow.kind === 'melee') {
        const target = state.engine.units.find((unit) => unit.id === arrow.targetId)!
        if (target.seat === attacker.seat) {
          const behavior = redirectedTrollRoll(combat, attacker.id, target.id)
          if (!behavior) return fail('TROLL_NEEDS_ENGAGEMENT')
          if (!combat.trollRolls?.some((roll) => roll.unitId === attacker.id && roll.targetId === target.id)) {
            const rolls = combat.trollRolls ??= []
            rolls.push({ ...behavior, targetId: target.id })
          }
        } else beginTrollEngagement(state.engine, state.cards, combat, state.battle.turn, attacker.id, target.id, d6)
      }
    }
    combat.arrows = combat.arrows.filter((item) => item.attackerId !== attacker.id || item.kind !== args.kind || (item.slot ?? 0) !== (args.slot ?? 0))
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
    requireAutoRules(state.game)
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
    requireAutoRules(state.game)
    const combat = state.battle.manual!.combat ??= emptyCombat()
    if (combat.revision !== args.revision) return fail('STALE_GAME_ACTION')
    combat.ready = combat.ready.filter((seat) => seat !== state.member.seat)
    if (args.ready) combat.ready.push(state.member.seat)
    await saveManual(ctx, state.game, state.battle, state.engine)
  },
})

export const resolve = mutation({
  args: { gameId, kind: attackKindValidator, revision: v.number(), orderId: v.optional(v.literal('concentrated-fire')) },
  handler: async (ctx, args) => {
    const state = await loadManual(ctx, args.gameId)
    requireAutoRules(state.game)
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
    const sacrifices = arrows.flatMap((arrow) => arrow.sacrificeId ? [arrow.sacrificeId] : [])
    if (new Set(sacrifices).size !== sacrifices.length) return fail('DUPLICATE_AMMUNITION')
    if (arrows.some((arrow) => sacrifices.includes(arrow.attackerId) || sacrifices.includes(arrow.targetId))) return fail('AMMUNITION_IS_ATTACKING')
    const snapshot = { ...state.engine, units: state.engine.units.filter((unit) => !sacrifices.includes(unit.id)), engagements: state.engine.engagements.filter((edge) => !sacrifices.includes(edge.a) && !sacrifices.includes(edge.b)) }
    if (args.kind === 'ranged') for (const attackerId of new Set(arrows.map((arrow) => arrow.attackerId))) {
      const attacker = snapshot.units.find((unit) => unit.id === attackerId)!
      const count = danzereuShotCount(snapshot, attacker, state.cards)
      const slots = arrows.filter((arrow) => arrow.attackerId === attackerId).map((arrow) => arrow.slot ?? 0)
      if (slots.length !== count || new Set(slots).size !== count || slots.some((slot) => slot >= count)) return fail('INCOMPLETE_SHAMANIC_SHOTS')
    }
    let stock: typeof manual.stocks[number] | undefined
    if (args.orderId) {
      if (args.kind !== 'ranged' || !state.battle.catalog.some((order) => order.id === args.orderId && order.faction === 'sephosi' && order.seats.includes(state.member.seat))) return fail('ORDER_NOT_AVAILABLE')
      const shooters = arrows.map((arrow) => state.engine.units.find((unit) => unit.id === arrow.attackerId)!)
      if (shooters.length < 2 || new Set(shooters.map((unit) => unit.id)).size < 2 || new Set(shooters.map((unit) => zoneOf(unit.cell))).size !== 1 || new Set(arrows.map((arrow) => arrow.targetId)).size !== 1) return fail('INVALID_CONCENTRATED_FIRE')
      stock = manual.stocks.find((item) => item.seat === state.member.seat && item.orderId === args.orderId)
      if (!stock || stock.remaining < 1) return fail('ORDER_EXHAUSTED')
    }
    const result = resolveCombat(state.engine, state.cards, arrows, combat.rain, state.battle.turn, args.kind, state.member.seat, (combat.reports.at(-1)?.id ?? 0) + 1, d6, combat.invocations, combat, args.orderId)
    if (stock) stock.remaining--
    manual.discarded.push(...result.dead)
    if (result.dead.some((unit) => unit.id === manual.duel?.attackerId || unit.id === manual.duel?.targetId)) manual.duel = undefined
    combat.rain = result.rain
    combat.held = result.held
    combat.reports = [...combat.reports, result.report].slice(-10)
    if (args.kind === 'ranged') combat.arrows = combat.arrows.filter((arrow) => !arrows.includes(arrow))
    invalidateCombat(combat, result.engine, state.battle.turn)
    let engine = logEvent(result.engine, state.battle.turn, `${args.kind === 'melee' ? 'COMBAT' : 'TIR'} : ${arrows.length} attaque${arrows.length > 1 ? 's' : ''} simultanée${arrows.length > 1 ? 's' : ''}, ${result.dead.length} unité${result.dead.length > 1 ? 's' : ''} défaussée${result.dead.length > 1 ? 's' : ''}.`)
    for (const attack of result.report.attacks) engine = logEvent(engine, state.battle.turn, `${attack.attacker.name} (${cellCoordinate(attack.attacker.cell)}) → ${attack.target.name} (${cellCoordinate(attack.target.cell)}) : ${attack.dice.map((die) => die.value).join(', ') || 'aucun dé'} ; ${attack.threshold}+ ; ${attack.hits} touche(s), −${attack.damage} R.`)
    for (const risk of result.report.shamanRisks ?? []) engine = logEvent(engine, state.battle.turn, `Concentration shamanique : ${risk.unit.name} (${cellCoordinate(risk.unit.cell)}) · dé ${risk.value} · ${risk.discarded ? 'défaussé' : 'survit'}.`)
    await saveManual(ctx, state.game, state.battle, engine)
  },
})
