import { v } from 'convex/values'
import { mutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { cellCoordinate, isCell } from '../shared/board'
import { manualMoves } from '../shared/manualBattle'
import { fail, loadManual, logEvent, saveManual } from './lib/manualState'

const gameId = v.id('games')
const delta = v.union(v.literal(-1), v.literal(1))
async function load(ctx: MutationCtx, id: Id<'games'>) {
  const state = await loadManual(ctx, id)
  return { ...state, manual: state.battle.manual! }
}
type State = Awaited<ReturnType<typeof load>>
function owned(state: State, id: string) {
  const unit = state.engine.units.find((unit) => unit.id === id && unit.seat === state.member.seat)
  if (!unit) return fail('UNIT_NOT_OWNED')
  return unit
}
function freeCell(state: State, cell: number) {
  if (!isCell(cell) || state.engine.units.some((unit) => unit.cell === cell)) fail('CELL_OCCUPIED')
}
function save(ctx: MutationCtx, state: State, text?: string) {
  return saveManual(ctx, state.game, { ...state.battle, manual: state.manual }, text ? logEvent(state.engine, state.battle.turn, text) : state.engine)
}
function counter(value: number, change: number, minimum = 0) {
  const next = value + change
  if (!Number.isSafeInteger(next) || next < minimum || next > 999) return fail('INVALID_MANUAL_COUNTER')
  return next
}

export const moveUnit = mutation({
  args: { gameId, unitId: v.string(), from: v.number(), to: v.number() },
  handler: async (ctx, args) => {
    const state = await load(ctx, args.gameId)
    const unit = owned(state, args.unitId)
    if (unit.cell !== args.from) fail('STALE_GAME_ACTION')
    const card = state.cards.find((card) => card.seat === unit.seat && card.stableId === unit.cardStableId)!
    if (!manualMoves(state.engine, unit, card.profile).includes(args.to)) fail('INVALID_MOVEMENT')
    state.engine.units = state.engine.units.map((item) => item.id === unit.id ? { ...item, cell: args.to } : item)
    await save(ctx, state, `${state.member.displayName} déplace ${card.name} : ${cellCoordinate(args.from)} → ${cellCoordinate(args.to)}.`)
  },
})
export const recruit = mutation({
  args: { gameId, cardStableId: v.string(), entered: v.number(), cell: v.number() },
  handler: async (ctx, args) => {
    const state = await load(ctx, args.gameId)
    const row = state.rows.find((card) => card.seat === state.member.seat && card.stableId === args.cardStableId && card.kind === 'unit')
    const card = state.cards.find((card) => card.seat === state.member.seat && card.stableId === args.cardStableId)
    if (!row || !card || card.entered >= card.quantity) return fail('RESERVE_EMPTY')
    if (args.entered !== card.entered) return fail('STALE_GAME_ACTION')
    freeCell(state, args.cell)
    state.engine.units.push({ id: `${card.seat}:${card.stableId}:${card.entered}`, cardStableId: card.stableId, seat: card.seat, cell: args.cell, regiment: card.profile.regiment })
    await ctx.db.patch(row._id, { enteredQuantity: card.entered + 1 })
    await save(ctx, state, `${state.member.displayName} recrute ${card.name} en ${cellCoordinate(args.cell)}.`)
  },
})
export const adjustTurn = mutation({
  args: { gameId, delta },
  handler: async (ctx, args) => {
    const state = await load(ctx, args.gameId)
    state.battle.turn = counter(state.battle.turn, args.delta, 1)
    await save(ctx, state, `${state.member.displayName} indique le tour ${state.battle.turn}.`)
  },
})
export const adjustStrategy = mutation({
  args: { gameId, delta },
  handler: async (ctx, args) => {
    const state = await load(ctx, args.gameId)
    state.battle.strategyPoints[state.member.seat] = counter(state.battle.strategyPoints[state.member.seat], args.delta)
    await save(ctx, state)
  },
})
export const adjustOrderStock = mutation({
  args: { gameId, orderId: v.string(), delta },
  handler: async (ctx, args) => {
    const state = await load(ctx, args.gameId)
    const stock = state.manual.stocks.find((item) => item.seat === state.member.seat && item.orderId === args.orderId)
    if (!stock) return fail('ORDER_NOT_AVAILABLE')
    stock.remaining = counter(stock.remaining, args.delta)
    await save(ctx, state)
  },
})
export const adjustRegiment = mutation({
  args: { gameId, unitId: v.string(), delta },
  handler: async (ctx, args) => {
    const state = await load(ctx, args.gameId)
    const unit = owned(state, args.unitId)
    unit.regiment = counter(unit.regiment, args.delta)
    await save(ctx, state)
  },
})
export const setDuel = mutation({
  args: { gameId, attackerId: v.optional(v.string()), targetId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const state = await load(ctx, args.gameId)
    if (!args.attackerId) {
      if (args.targetId) fail('INVALID_DUEL')
      state.manual.duel = undefined
    } else {
      const attacker = state.engine.units.find((unit) => unit.id === args.attackerId)
      const target = state.engine.units.find((unit) => unit.id === args.targetId)
      if (!attacker || (args.targetId && (!target || target.seat === attacker.seat))) return fail('INVALID_DUEL')
      state.manual.duel = { attackerId: attacker.id, ...(target ? { targetId: target.id } : {}) }
    }
    await save(ctx, state)
  },
})
export const setEngagement = mutation({
  args: { gameId, a: v.string(), b: v.string(), engaged: v.boolean() },
  handler: async (ctx, args) => {
    const state = await load(ctx, args.gameId)
    const a = state.engine.units.find((unit) => unit.id === args.a)
    const b = state.engine.units.find((unit) => unit.id === args.b)
    if (!a || !b || a.seat === b.seat) return fail('INVALID_DUEL')
    const pair = [a.id, b.id].sort()
    state.engine.engagements = state.engine.engagements.filter((edge) => !pair.includes(edge.a) || !pair.includes(edge.b))
    if (args.engaged) state.engine.engagements.push({ a: pair[0], b: pair[1] })
    await save(ctx, state, `${state.member.displayName} ${args.engaged ? 'marque' : 'retire'} un engagement entre ${cellCoordinate(a.cell)} et ${cellCoordinate(b.cell)}.`)
  },
})
export const rollDice = mutation({
  args: { gameId, count: v.number() },
  handler: async (ctx, args) => {
    const state = await load(ctx, args.gameId)
    if (!Number.isSafeInteger(args.count) || args.count < 1 || args.count > 100) return fail('INVALID_DICE_COUNT')
    const roll = { id: (state.manual.dice.at(-1)?.id ?? 0) + 1, seat: state.member.seat, turn: state.battle.turn, values: Array.from({ length: args.count }, () => Math.floor(Math.random() * 6) + 1) }
    state.manual.dice = [...state.manual.dice, roll].slice(-20)
    await save(ctx, state)
  },
})
export const discardUnit = mutation({
  args: { gameId, unitId: v.string() },
  handler: async (ctx, args) => {
    const state = await load(ctx, args.gameId)
    const unit = owned(state, args.unitId)
    state.manual.discarded.push(unit)
    state.engine.units = state.engine.units.filter((item) => item.id !== unit.id)
    state.engine.engagements = state.engine.engagements.filter((edge) => edge.a !== unit.id && edge.b !== unit.id)
    if (state.manual.duel?.attackerId === unit.id || state.manual.duel?.targetId === unit.id) state.manual.duel = undefined
    await save(ctx, state, `${state.member.displayName} retire son unité en ${cellCoordinate(unit.cell)}.`)
  },
})
export const restoreUnit = mutation({
  args: { gameId, unitId: v.string(), cell: v.number() },
  handler: async (ctx, args) => {
    const state = await load(ctx, args.gameId)
    const unit = state.manual.discarded.find((unit) => unit.id === args.unitId && unit.seat === state.member.seat)
    if (!unit) return fail('UNIT_NOT_OWNED')
    freeCell(state, args.cell)
    state.engine.units.push({ ...unit, cell: args.cell })
    state.manual.discarded = state.manual.discarded.filter((item) => item.id !== unit.id)
    await save(ctx, state, `${state.member.displayName} remet une unité en ${cellCoordinate(args.cell)}.`)
  },
})
