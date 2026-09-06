import { ConvexError } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { requireActivePlayer } from './auth'
import { getUnitProfile } from '../../shared/unitProfile'
import { type BattleState, nextActor } from '../../shared/battle'
import type { AttackRoll, EngineState, UnitCard } from '../../shared/battleEngine'

export const fail = (code: string): never => { throw new ConvexError({ code }) }
export async function loadLive(ctx: MutationCtx, gameId: Id<'games'>, revision?: number) {
  const player = await requireActivePlayer(ctx)
  const game = await ctx.db.get(gameId)
  const members = await ctx.db.query('gamePlayers').withIndex('by_game', (q) => q.eq('gameId', gameId)).collect()
  const member = members.find((item) => item.userId === player.userId)
  if (!game || !member?.active || game.phase === 'cancelled') return fail('GAME_NOT_AVAILABLE')
  if (game.phase !== 'battle' || !game.battle?.engine || game.battle.phase === 'finished') return fail('WRONG_BATTLE_PHASE')
  if (revision !== undefined && game.battle.revision !== revision) return fail('STALE_GAME_ACTION')
  const rows = (await Promise.all(members.map(async (item) => (await ctx.db.query('gameCards').withIndex('by_player', (q) => q.eq('gamePlayerId', item._id)).collect()).map((card) => ({ ...card, seat: item.seat }))))).flat()
  const cards: UnitCard[] = rows.filter((card) => card.kind === 'unit').map((card) => ({ stableId: card.stableId, seat: card.seat, name: card.name, profile: getUnitProfile(card)!, cost: card.cost ?? 0, quantity: card.quantity, entered: card.enteredQuantity ?? card.deploymentQuantity }))
  return { game, member, members, rows, cards, battle: game.battle as BattleState, engine: game.battle.engine as EngineState }
}
export function requireOrder(state: Awaited<ReturnType<typeof loadLive>>, kind?: string) {
  const { battle, engine, member } = state
  if (battle.phase !== 'orders' || !engine.activeOrder || (kind && engine.activeOrder.orderId !== kind)) return fail('WRONG_BATTLE_PHASE')
  if (battle.actingSeat !== member.seat || engine.activeOrder.seat !== member.seat) return fail('NOT_YOUR_ORDER_TURN')
  return engine.activeOrder
}
export function requireActionUnit(state: Awaited<ReturnType<typeof loadLive>>, unitId: string, kind: string) {
  const order = requireOrder(state, kind)
  const unit = state.engine.units.find((item) => item.id === unitId && item.seat === state.member.seat)
  if (!unit) return fail('UNIT_NOT_OWNED')
  if (order.usedUnits.includes(unit.id)) return fail('UNIT_ALREADY_ACTED')
  return { order, unit }
}
export function logEvent(engine: EngineState, turn: number, text: string, rolls: AttackRoll[] = []): EngineState {
  return { ...engine, log: [...engine.log, { id: (engine.log.at(-1)?.id ?? 0) + 1, turn, text, rolls }].slice(-150) }
}
export function saveLive(ctx: MutationCtx, game: Doc<'games'>, battle: BattleState, engine: EngineState) {
  return ctx.db.patch(game._id, { battle: { ...battle, engine, revision: game.battle!.revision + 1 }, updatedAt: Date.now() })
}
export function finishOrdersForSeat(battle: BattleState, engine: EngineState, seat: number) {
  if (!engine.endedSeats.includes(seat)) engine = { ...engine, endedSeats: [...engine.endedSeats, seat] }
  const complete = engine.endedSeats.length === 2
  return { battle: { ...battle, phase: complete ? 'combat' as const : 'orders' as const, actingSeat: complete ? battle.initiativeSeat : nextActor(seat, (other) => !engine.endedSeats.includes(other)) }, engine }
}
export function finishActiveOrder(battle: BattleState, engine: EngineState) {
  const active = engine.activeOrder!
  battle = { ...battle, orders: battle.orders.map((order) => order.id === active.chosenId ? { ...order, status: active.usedUnits.length ? 'resolved' as const : 'passed' as const } : order) }
  engine = { ...engine, activeOrder: undefined }
  const count = battle.orders.filter((order) => order.seat === active.seat).length
  if (count >= battle.allowance[active.seat] && battle.strategyPoints[active.seat] === 0) return finishOrdersForSeat(battle, engine, active.seat)
  return { battle: { ...battle, actingSeat: nextActor(active.seat, (seat) => !engine.endedSeats.includes(seat)) }, engine }
}
