import { ConvexError, v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { getCurrentPlayer, requireActivePlayer } from './lib/auth'
import { normalizeLoginId } from './lib/normalizeLoginId'
import { badgesForPlayer, playerBadges } from '../shared/playerBadges'
import { isPlayerAvatar, resolvePlayerAvatar } from '../shared/playerAvatars'

export const updateMyAvatar = mutation({
  args: { avatarPath: v.string() },
  handler: async (ctx, args) => {
    const player = await requireActivePlayer(ctx)
    if (!isPlayerAvatar(args.avatarPath)) {
      throw new ConvexError({ code: 'INVALID_AVATAR' })
    }
    const profile = await ctx.db.query('playerProfiles')
      .withIndex('by_user_id', (q) => q.eq('userId', player.userId)).unique()
    if (!profile?.active) throw new ConvexError({ code: 'ACCOUNT_DISABLED' })
    await ctx.db.patch(profile._id, { avatarPath: args.avatarPath })
    return { avatarPath: args.avatarPath }
  },
})

export const current = query({
  args: {},
  handler: async (ctx) => {
    const player = await getCurrentPlayer(ctx)

    if (player.status !== 'active') {
      return { status: player.status }
    }

    return {
      status: player.status,
      userId: player.userId,
      loginId: player.loginId,
      displayName: player.displayName,
      role: player.role,
    }
  },
})

export const getProfile = query({
  // Accept a route segment, then normalize it so a malformed URL is a missing profile.
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireActivePlayer(ctx)
    const userId = ctx.db.normalizeId('users', args.userId)
    if (!userId) return null

    const profile = await ctx.db.query('playerProfiles')
      .withIndex('by_user_id', (q) => q.eq('userId', userId)).unique()
    if (!profile?.active) return null

    // Return only the identity shown to other members, never login or account data.
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      avatarPath: resolvePlayerAvatar(profile.avatarPath),
      badges: badgesForPlayer(profile.badgeIds),
      deckSummary: await summarizePlayerDecks(ctx, userId),
    }
  },
})

export const setPresentation = internalMutation({
  args: {
    userId: v.id('users'),
    avatarPath: v.optional(v.string()),
    badgeIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.query('playerProfiles')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId)).unique()
    if (!profile) throw new Error('Account not found')
    if (args.avatarPath !== undefined && !isPlayerAvatar(args.avatarPath)) {
      throw new Error('Avatar must belong to the faction gallery')
    }
    if (args.badgeIds?.some((id) => !playerBadges.some((badge) => badge.id === id))) {
      throw new Error('Unknown player badge')
    }
    await ctx.db.patch(profile._id, {
      ...(args.avatarPath !== undefined ? { avatarPath: args.avatarPath } : {}),
      ...(args.badgeIds !== undefined ? { badgeIds: [...new Set(args.badgeIds)] } : {}),
    })
    return { updated: true }
  },
})

async function summarizePlayerDecks(ctx: QueryCtx, userId: Id<'users'>) {
  const decks = await ctx.db.query('decks')
    .withIndex('by_owner', (q) => q.eq('ownerUserId', userId)).collect()
  const factions = await Promise.all(decks.map(async (deck) => {
    const faction = deck.factionId ? await ctx.db.get(deck.factionId) : null
    if (faction) return faction
    // Legacy decks may predate factionId: use their first surviving card,
    // as in decks:listMine. Only aggregated counts leave this query.
    const entries = await ctx.db.query('deckCards')
      .withIndex('by_deck', (q) => q.eq('deckId', deck._id)).collect()
    for (const entry of entries) {
      const card = await ctx.db.get(entry.cardId)
      if (card) return ctx.db.get(card.factionId)
    }
    return null
  }))
  const groups = new Map<string | null, { factionStableId: string | null; name: string; count: number }>()
  for (const faction of factions) {
    const key = faction?.stableId ?? null
    const group = groups.get(key) ?? { factionStableId: key, name: faction?.name ?? 'Sans faction', count: 0 }
    group.count++
    groups.set(key, group)
  }
  return { total: decks.length, byFaction: [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')) }
}

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
