import { ConvexError, v } from 'convex/values'
import { internalQuery } from './_generated/server'
import { requireActivePlayer } from './lib/auth'

const spectatorPhases = ['deck_selection', 'preparation', 'initiative', 'deployment', 'battle']

export const authorize = internalQuery({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => {
    const player = await requireActivePlayer(ctx)
    const game = await ctx.db.get(gameId)
    if (!game || game.phase === 'cancelled') throw new ConvexError({ code: 'GAME_NOT_AVAILABLE' })

    const member = await ctx.db.query('gamePlayers')
      .withIndex('by_game_and_user', (q) => q.eq('gameId', gameId).eq('userId', player.userId))
      .unique()
    if (!member?.active && !spectatorPhases.includes(game.phase)) {
      throw new ConvexError({ code: 'GAME_NOT_AVAILABLE' })
    }

    return { userId: player.userId, displayName: player.displayName }
  },
})
