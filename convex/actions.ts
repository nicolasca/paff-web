import { v } from 'convex/values'
import type { EngineState } from '../shared/battleEngine'
import { mutation } from './_generated/server'
import { remainingStock } from '../shared/battle'
import { adjacent, applyDamage, cardFor, combatGroups, enemiesOf, isEngaged, legalMoves, legalRecruitmentCells, legalTargets, outnumberBonus, RECRUITMENT_POINTS, rollAttack, strategyControl, victory } from '../shared/battleEngine'
import { cellCoordinate, zoneOf } from '../shared/board'
import { fail, finishActiveOrder, finishOrdersForSeat, loadLive, logEvent, requireOrder, saveLive, requireActionUnit } from './lib/liveBattle'
const gameId = v.id('games')
const revision = v.number()

export const chooseOrder = mutation({
  args: { gameId, revision, orderId: v.string() },
  handler: async (ctx, args) => {
    const s = await loadLive(ctx, args.gameId, args.revision)
    let { battle, engine } = s
    const seat = s.member.seat
    if (battle.phase !== 'orders' || engine.activeOrder) return fail('WRONG_BATTLE_PHASE')
    if (battle.actingSeat !== seat || engine.endedSeats.includes(seat)) return fail('NOT_YOUR_ORDER_TURN')
    const definition = battle.catalog.find((item) => item.id === args.orderId && item.seats.includes(seat))
    if (!definition || !['movement', 'shooting', 'recruitment'].includes(definition.id)) return fail('ORDER_NOT_AVAILABLE')
    if (remainingStock(battle, definition, seat) === 0) return fail('ORDER_EXHAUSTED')
    const count = battle.orders.filter((order) => order.seat === seat).length
    const strategyPoints = [...battle.strategyPoints]; const allowance = [...battle.allowance]
    if (count >= allowance[seat]) {
      if (strategyPoints[seat] < 1) return fail('NOT_ENOUGH_STRATEGY')
      strategyPoints[seat]--; allowance[seat]++
    }
    const chosen = { id: `${battle.turn}:${battle.revision}`, seat, orderId: definition.id, status: 'selected' as const }
    const used = [...battle.used]
    if (definition.limit !== undefined) {
      const index = used.findIndex((item) => item.seat === seat && item.orderId === definition.id)
      if (index < 0) used.push({ seat, orderId: definition.id, count: 1 })
      else used[index] = { ...used[index], count: used[index].count + 1 }
    }
    battle = { ...battle, orders: [...battle.orders, chosen], used, strategyPoints, allowance }
    engine = logEvent({ ...engine, activeOrder: { chosenId: chosen.id, orderId: definition.id, seat, usedUnits: [], recruitmentSpent: 0, recruitmentBonus: 0 } }, battle.turn, `${s.member.displayName} joue ${definition.name}.`)
    await saveLive(ctx, s.game, battle, engine)
  },
})
export const finishOrder = mutation({
  args: { gameId, revision },
  handler: async (ctx, args) => {
    const s = await loadLive(ctx, args.gameId, args.revision); requireOrder(s)
    const next = finishActiveOrder(s.battle, s.engine)
    await saveLive(ctx, s.game, next.battle, next.engine)
  },
})
export const endOrders = mutation({
  args: { gameId, revision },
  handler: async (ctx, args) => {
    const s = await loadLive(ctx, args.gameId, args.revision)
    if (s.battle.phase !== 'orders' || s.engine.activeOrder) return fail('WRONG_BATTLE_PHASE')
    if (s.battle.actingSeat !== s.member.seat) return fail('NOT_YOUR_ORDER_TURN')
    if (s.battle.orders.filter((order) => order.seat === s.member.seat).length < 3) return fail('BASE_ORDERS_REMAINING')
    const next = finishOrdersForSeat(s.battle, s.engine, s.member.seat)
    await saveLive(ctx, s.game, next.battle, next.engine)
  },
})
export const moveUnit = mutation({
  args: { gameId, revision, unitId: v.string(), to: v.number() },
  handler: async (ctx, args) => {
    const s = await loadLive(ctx, args.gameId, args.revision)
    const { order, unit } = requireActionUnit(s, args.unitId, 'movement')
    const card = cardFor(unit, s.cards)
    if (order.zone && order.zone !== zoneOf(unit.cell)) return fail('ORDER_ZONE_MISMATCH')
    const move = legalMoves(s.engine, unit, card.profile, s.battle.turn).find((move) => move.cell === args.to)
    if (!move) return fail('INVALID_MOVEMENT')
    const rolls = enemiesOf(s.engine, unit.id).flatMap((id) => {
      const enemy = s.engine.units.find((item) => item.id === id)!
      const profile = cardFor(enemy, s.cards).profile
      return profile.offense.kind === 'melee' ? [rollAttack(enemy, unit, profile, card.profile.defenseMelee, Math.random, 0, 2)] : []
    })
    let engine = applyDamage(s.engine, rolls)
    const survived = engine.units.some((item) => item.id === unit.id)
    engine = { ...engine, units: engine.units.map((item) => item.id === unit.id ? { ...item, cell: args.to, movedTurn: s.battle.turn } : item), engagements: engine.engagements.filter((edge) => edge.a !== unit.id && edge.b !== unit.id), activeOrder: { ...order, zone: order.zone ?? zoneOf(unit.cell), usedUnits: [...order.usedUnits, unit.id] } }
    engine = logEvent(engine, s.battle.turn, `${s.member.displayName} · ${card.name} : ${cellCoordinate(unit.cell)} → ${survived ? cellCoordinate(args.to) : 'détruite pendant le désengagement'}.`, rolls)
    await saveLive(ctx, s.game, s.battle, engine)
  },
})
export const shoot = mutation({
  args: { gameId, revision, unitId: v.string(), targetId: v.string() },
  handler: async (ctx, args) => {
    const s = await loadLive(ctx, args.gameId, args.revision)
    const { order, unit } = requireActionUnit(s, args.unitId, 'shooting')
    const card = cardFor(unit, s.cards)
    if (order.zone && order.zone !== zoneOf(unit.cell)) return fail('ORDER_ZONE_MISMATCH')
    const target = legalTargets(s.engine, unit, card.profile, s.battle.turn).find((item) => item.id === args.targetId)
    if (!target) return fail('INVALID_SHOT')
    const defender = cardFor(target, s.cards)
    const roll = rollAttack(unit, target, card.profile, defender.profile.defenseRanged, Math.random)
    let engine = applyDamage(s.engine, [roll])
    engine = { ...engine, units: engine.units.map((item) => item.id === unit.id ? { ...item, shotTurn: s.battle.turn } : item), activeOrder: { ...order, zone: order.zone ?? zoneOf(unit.cell), usedUnits: [...order.usedUnits, unit.id] } }
    engine = logEvent(engine, s.battle.turn, `${s.member.displayName} · ${card.name} (${cellCoordinate(unit.cell)}) tire sur ${defender.name} (${cellCoordinate(target.cell)}) : ${roll.hits} touche(s), ${Math.max(0, target.regiment - roll.hits)} R restants.`, [roll])
    await saveLive(ctx, s.game, s.battle, engine)
  },
})
export const recruit = mutation({
  args: { gameId, revision, cardStableId: v.string(), cell: v.number(), strategy: v.number() },
  handler: async (ctx, args) => {
    const s = await loadLive(ctx, args.gameId, args.revision); const order = requireOrder(s, 'recruitment')
    const seat = s.member.seat
    const card = s.cards.find((card) => card.seat === seat && card.stableId === args.cardStableId)
    if (!card || card.entered >= card.quantity) return fail('RESERVE_EMPTY')
    if (!Number.isSafeInteger(args.strategy) || args.strategy < 0 || args.strategy > s.battle.strategyPoints[seat]) return fail('NOT_ENOUGH_STRATEGY')
    if (order.recruitmentSpent + card.cost > RECRUITMENT_POINTS + order.recruitmentBonus + args.strategy) return fail('NOT_ENOUGH_RECRUITMENT')
    if (!legalRecruitmentCells(s.engine, seat, card.profile, order.zone).includes(args.cell)) return fail('INVALID_RECRUITMENT_CELL')
    const unit = { id: `${seat}:${card.stableId}:${card.entered}`, seat, cardStableId: card.stableId, cell: args.cell, regiment: card.profile.regiment }
    const row = s.rows.find((row) => row.seat === seat && row.stableId === card.stableId)!
    await ctx.db.patch(row._id, { enteredQuantity: card.entered + 1 })
    const strategyPoints = [...s.battle.strategyPoints]; strategyPoints[seat] -= args.strategy
    let engine: EngineState = { ...s.engine, units: [...s.engine.units, unit], activeOrder: { ...order, zone: order.zone ?? zoneOf(args.cell), usedUnits: [...order.usedUnits, unit.id], recruitmentSpent: order.recruitmentSpent + card.cost, recruitmentBonus: order.recruitmentBonus + args.strategy } }
    engine = logEvent(engine, s.battle.turn, `${s.member.displayName} recrute ${card.name} en ${cellCoordinate(args.cell)} pour ${card.cost} points.`)
    await saveLive(ctx, s.game, { ...s.battle, strategyPoints }, engine)
  },
})
export const charge = mutation({
  args: { gameId, revision, unitId: v.string(), targetId: v.string() },
  handler: async (ctx, args) => {
    const s = await loadLive(ctx, args.gameId, args.revision)
    if (s.battle.phase !== 'combat' || s.engine.combatStep !== 'charges') return fail('WRONG_BATTLE_PHASE')
    if (s.battle.actingSeat !== s.member.seat || s.engine.chargesPassed.includes(s.member.seat)) return fail('NOT_YOUR_ORDER_TURN')
    const unit = s.engine.units.find((unit) => unit.id === args.unitId && unit.seat === s.member.seat)
    const target = s.engine.units.find((unit) => unit.id === args.targetId && unit.seat !== s.member.seat)
    if (!unit || !target || isEngaged(s.engine, unit.id) || unit.chargedTurn === s.battle.turn || !adjacent(unit.cell, target.cell)) return fail('INVALID_CHARGE')
    let engine = { ...s.engine, units: s.engine.units.map((item) => item.id === unit.id ? { ...item, chargedTurn: s.battle.turn } : item), engagements: [...s.engine.engagements, { a: unit.id, b: target.id }] }
    engine = logEvent(engine, s.battle.turn, `${s.member.displayName} · ${cardFor(unit, s.cards).name} charge ${cardFor(target, s.cards).name}.`)
    await saveLive(ctx, s.game, { ...s.battle, actingSeat: engine.chargesPassed.includes(1 - unit.seat) ? unit.seat : 1 - unit.seat }, engine)
  },
})
export const finishCharges = mutation({
  args: { gameId, revision },
  handler: async (ctx, args) => {
    const s = await loadLive(ctx, args.gameId, args.revision)
    if (s.battle.phase !== 'combat' || s.engine.combatStep !== 'charges') return fail('WRONG_BATTLE_PHASE')
    if (s.battle.actingSeat !== s.member.seat) return fail('NOT_YOUR_ORDER_TURN')
    const engine = { ...s.engine, chargesPassed: [...s.engine.chargesPassed, s.member.seat] }
    const both = engine.chargesPassed.length === 2
    if (both) engine.combatStep = 'fights'
    const noFights = both && !combatGroups(engine).length
    await saveLive(ctx, s.game, { ...s.battle, phase: noFights ? 'end_turn' : 'combat', actingSeat: both ? s.battle.initiativeSeat : 1 - s.member.seat, ...(noFights ? { draftPoints: strategyControl(engine), readySeats: [] } : {}) }, engine)
  },
})
export const beginCombat = mutation({
  args: { gameId, revision, unitId: v.string() },
  handler: async (ctx, args) => {
    const s = await loadLive(ctx, args.gameId, args.revision)
    if (s.battle.phase !== 'combat' || s.engine.combatStep !== 'fights' || s.engine.fight) return fail('WRONG_BATTLE_PHASE')
    if (s.member.seat !== s.battle.initiativeSeat) return fail('INITIATIVE_PLAYER_ONLY')
    const unitIds = combatGroups(s.engine).find((group) => group.includes(args.unitId))
    if (!unitIds) return fail('INVALID_COMBAT')
    const targets = unitIds.flatMap((unitId) => {
      const unit = s.engine.units.find((unit) => unit.id === unitId)!
      const enemies = enemiesOf(s.engine, unitId)
      return cardFor(unit, s.cards).profile.offense.kind === 'melee' && enemies.length === 1 ? [{ unitId, targetId: enemies[0] }] : []
    })
    await saveLive(ctx, s.game, s.battle, { ...s.engine, fight: { id: `${s.battle.turn}:${s.battle.revision}`, unitIds, targets, readySeats: [] } })
  },
})
export const setCombatTarget = mutation({
  args: { gameId, revision, unitId: v.string(), targetId: v.string() },
  handler: async (ctx, args) => {
    const s = await loadLive(ctx, args.gameId, args.revision); const fight = s.engine.fight
    if (s.battle.phase !== 'combat' || !fight || fight.readySeats.includes(s.member.seat)) return fail('WRONG_BATTLE_PHASE')
    const unit = s.engine.units.find((unit) => unit.id === args.unitId && unit.seat === s.member.seat)
    if (!unit || !fight.unitIds.includes(unit.id) || cardFor(unit, s.cards).profile.offense.kind !== 'melee' || !enemiesOf(s.engine, unit.id).includes(args.targetId)) return fail('INVALID_COMBAT')
    await saveLive(ctx, s.game, s.battle, { ...s.engine, fight: { ...fight, targets: [...fight.targets.filter((target) => target.unitId !== unit.id), { unitId: unit.id, targetId: args.targetId }] } })
  },
})
export const confirmCombat = mutation({
  args: { gameId, fightId: v.string() },
  handler: async (ctx, args) => {
    const s = await loadLive(ctx, args.gameId); const fight = s.engine.fight
    if (s.battle.phase !== 'combat' || !fight || fight.id !== args.fightId) return fail('STALE_GAME_ACTION')
    if (fight.readySeats.includes(s.member.seat)) return
    const mine = s.engine.units.filter((unit) => unit.seat === s.member.seat && fight.unitIds.includes(unit.id) && cardFor(unit, s.cards).profile.offense.kind === 'melee')
    if (mine.some((unit) => !fight.targets.some((target) => target.unitId === unit.id))) return fail('COMBAT_TARGETS_MISSING')
    const readySeats = [...fight.readySeats, s.member.seat]
    if (readySeats.length < 2) { await saveLive(ctx, s.game, s.battle, { ...s.engine, fight: { ...fight, readySeats } }); return }
    const rolls = fight.targets.map(({ unitId, targetId }) => {
      const unit = s.engine.units.find((unit) => unit.id === unitId)!
      const target = s.engine.units.find((unit) => unit.id === targetId)!
      return rollAttack(unit, target, cardFor(unit, s.cards).profile, cardFor(target, s.cards).profile.defenseMelee, Math.random, unit.chargedTurn === s.battle.turn ? 1 : 0, 0, outnumberBonus(s.engine, target.id))
    })
    let engine: EngineState = { ...applyDamage(s.engine, rolls), fight: undefined, resolvedUnits: [...s.engine.resolvedUnits, ...fight.unitIds] }
    engine = logEvent(engine, s.battle.turn, `Combat résolu simultanément : ${rolls.reduce((sum, roll) => sum + roll.hits, 0)} touche(s).`, rolls)
    const complete = combatGroups(engine).length === 0
    await saveLive(ctx, s.game, { ...s.battle, ...(complete ? { phase: 'end_turn' as const, draftPoints: strategyControl(engine), readySeats: [] } : {}) }, engine)
  },
})
export const confirmEndTurn = mutation({
  args: { gameId, turn: v.number() },
  handler: async (ctx, args) => {
    const s = await loadLive(ctx, args.gameId)
    if (s.battle.phase !== 'end_turn' || args.turn !== s.battle.turn) return fail('STALE_GAME_ACTION')
    if (s.battle.readySeats.includes(s.member.seat)) return
    const readySeats = [...s.battle.readySeats, s.member.seat]
    if (readySeats.length < 2) { await saveLive(ctx, s.game, { ...s.battle, readySeats }, s.engine); return }
    const points = strategyControl(s.engine)
    const strategyPoints = s.battle.strategyPoints.map((stock, seat) => stock + points[seat])
    const history = [...s.battle.history, { turn: s.battle.turn, initiativeSeat: s.battle.initiativeSeat, orders: s.battle.orders, strategyPoints: points }]
    const result = victory(s.engine, s.cards, s.battle.turn)
    let engine = logEvent(s.engine, s.battle.turn, `Fin du tour : ${points[0]} / ${points[1]} points stratégiques gagnés.`)
    if (result) {
      for (const member of s.members) await ctx.db.patch(member._id, { active: false })
      await saveLive(ctx, s.game, { ...s.battle, phase: 'finished', readySeats, history, strategyPoints }, { ...engine, result }); return
    }
    engine = { ...engine, endedSeats: [], chargesPassed: [], combatStep: 'charges', resolvedUnits: [], fight: undefined, activeOrder: undefined }
    await saveLive(ctx, s.game, { ...s.battle, turn: s.battle.turn + 1, phase: 'orders', actingSeat: 1 - s.battle.initiativeSeat, initiativeSeat: 1 - s.battle.initiativeSeat, allowance: [3, 3], orders: [], readySeats: [], draftPoints: [0, 0], strategyPoints, history }, engine)
  },
})
