import { ConvexError } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { requireActivePlayer } from './auth'
import { getUnitProfile } from '../../shared/unitProfile'
import { type BattleState } from '../../shared/battle'
import type { EngineState, UnitCard } from '../../shared/battleEngine'

export const fail = (code: string): never => { throw new ConvexError({ code }) }
export async function loadManual(ctx: MutationCtx, gameId: Id<'games'>) {
  const player = await requireActivePlayer(ctx)
  const game = await ctx.db.get(gameId)
  const members = await ctx.db.query('gamePlayers').withIndex('by_game', (q) => q.eq('gameId', gameId)).collect()
  const member = members.find((item) => item.userId === player.userId)
  if (!game || !member?.active || game.phase === 'cancelled') return fail('GAME_NOT_AVAILABLE')
  if (game.phase !== 'battle' || !game.battle?.engine) return fail('WRONG_BATTLE_PHASE')
  const rows = (await Promise.all(members.map(async (item) => (await ctx.db.query('gameCards').withIndex('by_player', (q) => q.eq('gamePlayerId', item._id)).collect()).map((card) => ({ ...card, seat: item.seat }))))).flat()
  const cards: UnitCard[] = rows.filter((card) => card.kind === 'unit').map((card) => ({ stableId: card.stableId, seat: card.seat, name: card.name, profile: getUnitProfile(card)!, cost: card.cost ?? 0, quantity: card.quantity, entered: card.enteredQuantity ?? card.deploymentQuantity }))
  return { game, member, members, rows, cards, battle: game.battle as BattleState, engine: game.battle.engine as EngineState }
}
export function logEvent(engine: EngineState, turn: number, text: string): EngineState {
  return { ...engine, log: [...engine.log, { id: (engine.log.at(-1)?.id ?? 0) + 1, turn, text }].slice(-150) }
}
export function saveManual(ctx: MutationCtx, game: Doc<'games'>, battle: BattleState, engine: EngineState) {
  return ctx.db.patch(game._id, { battle: { ...battle, engine, revision: game.battle!.revision + 1 }, updatedAt: Date.now() })
}
