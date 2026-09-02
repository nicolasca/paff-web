import { createAccount } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalAction, internalQuery } from './_generated/server'
import { normalizeLoginId } from './lib/normalizeLoginId'

type ProvisioningAccount = {
  loginId: string
  password: string
  displayName: string
  role: 'player' | 'admin'
  active: boolean
}

export const findByLoginId = internalQuery({
  args: { loginId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('playerProfiles')
      .withIndex('by_login_id', (query) => query.eq('loginId', args.loginId))
      .unique()
    const authAccount = await ctx.db
      .query('authAccounts')
      .withIndex('providerAndAccountId', (query) =>
        query
          .eq('provider', 'password')
          .eq('providerAccountId', args.loginId),
      )
      .unique()

    return {
      profileExists: profile !== null,
      authAccountExists: authAccount !== null,
    }
  },
})

export const provisionAccounts = internalAction({
  args: {},
  handler: async (ctx) => {
    const accounts = readProvisioningAccounts(readProvisioningEnvironment())
    let created = 0
    let existing = 0

    for (const account of accounts) {
      const loginId = normalizeLoginId(account.loginId)
      const knownAccount = await ctx.runQuery(
        internal.provisioning.findByLoginId,
        { loginId },
      )

      if (knownAccount.profileExists && knownAccount.authAccountExists) {
        existing += 1
        continue
      }

      if (knownAccount.profileExists || knownAccount.authAccountExists) {
        throw new Error('Inconsistent existing account data')
      }

      const profile = {
        email: loginId,
        loginId,
        displayName: account.displayName,
        role: account.role,
        active: account.active,
      }

      await createAccount(ctx, {
        provider: 'password',
        account: { id: loginId, secret: account.password },
        profile,
      })
      created += 1
    }

    return { created, existing, total: accounts.length }
  },
})

function readProvisioningEnvironment() {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> }
  }

  return runtime.process?.env?.PAFF_PROVISIONING_ACCOUNTS
}

function readProvisioningAccounts(value: string | undefined) {
  if (!value) {
    throw new Error('PAFF_PROVISIONING_ACCOUNTS is not configured')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('PAFF_PROVISIONING_ACCOUNTS must be valid JSON')
  }

  if (!Array.isArray(parsed) || parsed.length !== 5) {
    throw new Error('Exactly five provisioning accounts are required')
  }

  const accounts = parsed.map(validateAccount)
  const loginIds = accounts.map((account) => normalizeLoginId(account.loginId))

  if (new Set(loginIds).size !== loginIds.length) {
    throw new Error('Provisioning login identifiers must be unique')
  }

  return accounts
}

function validateAccount(value: unknown): ProvisioningAccount {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid provisioning account')
  }

  const account = value as Record<string, unknown>
  const role = account.role

  if (
    typeof account.loginId !== 'string' ||
    typeof account.password !== 'string' ||
    account.password.length < 12 ||
    typeof account.displayName !== 'string' ||
    account.displayName.trim() === '' ||
    (role !== 'player' && role !== 'admin') ||
    typeof account.active !== 'boolean'
  ) {
    throw new Error('Invalid provisioning account')
  }

  return {
    loginId: account.loginId,
    password: account.password,
    displayName: account.displayName.trim(),
    role,
    active: account.active,
  }
}
