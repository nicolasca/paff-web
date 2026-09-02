import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'
import type { MutationCtx } from './_generated/server'
import { normalizeLoginId } from './lib/normalizeLoginId'

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile: passwordProfile,
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      if (existingUserId) {
        return existingUserId
      }

      const loginId = normalizeLoginId(profile.loginId)
      const displayName = readRequiredString(profile.displayName, 'displayName')
      const role = readRole(profile.role)
      const active = readBoolean(profile.active, 'active')

      const db = (ctx as unknown as MutationCtx).db
      const duplicate = await db
        .query('playerProfiles')
        .withIndex('by_login_id', (query) => query.eq('loginId', loginId))
        .unique()

      if (duplicate) {
        throw new Error('Account already exists')
      }

      const userId = await db.insert('users', {
        email: loginId,
        name: displayName,
      })

      await db.insert('playerProfiles', {
        userId,
        loginId,
        displayName,
        role,
        active,
      })

      return userId
    },
    async beforeSessionCreation(ctx, { userId }) {
      const db = (ctx as unknown as MutationCtx).db
      const player = await db
        .query('playerProfiles')
        .withIndex('by_user_id', (query) => query.eq('userId', userId))
        .unique()

      if (!player?.active) {
        throw new Error('Account is unavailable')
      }
    },
  },
})

export function passwordProfile(params: Record<string, unknown>) {
  if (params.flow !== 'signIn') {
    throw new Error('Public account creation is disabled')
  }

  return { email: normalizeLoginId(params.email) }
}

function readRequiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid ${field}`)
  }

  return value.trim()
}

function readRole(value: unknown): 'player' | 'admin' {
  if (value !== 'player' && value !== 'admin') {
    throw new Error('Invalid role')
  }

  return value
}

function readBoolean(value: unknown, field: string) {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid ${field}`)
  }

  return value
}
