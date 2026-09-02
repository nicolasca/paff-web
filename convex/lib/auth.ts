import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError } from 'convex/values'
import type { MutationCtx, QueryCtx } from '../_generated/server'

type AuthContext = Pick<QueryCtx | MutationCtx, 'auth' | 'db'>

export type CurrentPlayer =
  | { status: 'unauthenticated' }
  | { status: 'disabled' }
  | {
      status: 'active'
      userId: NonNullable<Awaited<ReturnType<typeof getAuthUserId>>>
      loginId: string
      displayName: string
      role: 'player' | 'admin'
    }

export async function getCurrentPlayer(ctx: AuthContext): Promise<CurrentPlayer> {
  const userId = await getAuthUserId(ctx)

  if (!userId) {
    return { status: 'unauthenticated' }
  }

  const profile = await ctx.db
    .query('playerProfiles')
    .withIndex('by_user_id', (query) => query.eq('userId', userId))
    .unique()

  if (!profile?.active) {
    return { status: 'disabled' }
  }

  return {
    status: 'active',
    userId,
    loginId: profile.loginId,
    displayName: profile.displayName,
    role: profile.role,
  }
}

export async function requireActivePlayer(ctx: AuthContext) {
  const player = await getCurrentPlayer(ctx)

  if (player.status === 'unauthenticated') {
    throw new ConvexError({ code: 'UNAUTHENTICATED' })
  }

  if (player.status === 'disabled') {
    throw new ConvexError({ code: 'ACCOUNT_DISABLED' })
  }

  return player
}
