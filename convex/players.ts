import { v } from 'convex/values'
import { internalMutation, query } from './_generated/server'
import { getCurrentPlayer } from './lib/auth'
import { normalizeLoginId } from './lib/normalizeLoginId'

export const current = query({
  args: {},
  handler: async (ctx) => {
    const player = await getCurrentPlayer(ctx)

    if (player.status !== 'active') {
      return { status: player.status }
    }

    return {
      status: player.status,
      loginId: player.loginId,
      displayName: player.displayName,
      role: player.role,
    }
  },
})

export const setActive = internalMutation({
  args: {
    loginId: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const loginId = normalizeLoginId(args.loginId)
    const player = await ctx.db
      .query('playerProfiles')
      .withIndex('by_login_id', (query) => query.eq('loginId', loginId))
      .unique()

    if (!player) {
      throw new Error('Account not found')
    }

    await ctx.db.patch(player._id, { active: args.active })
    return { updated: true }
  },
})
