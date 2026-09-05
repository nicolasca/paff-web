import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAccount } from '@convex-dev/auth/server'
import { provisionAccounts } from './provisioning'

vi.mock('@convex-dev/auth/server', () => ({ createAccount: vi.fn().mockResolvedValue(undefined) }))
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

const account = { loginId: 'test-player', password: 'Demo123456!', displayName: 'Test', role: 'player', active: true }
const run = (known = { profileExists: false, authAccountExists: false }) => {
  const ctx = { runQuery: vi.fn().mockResolvedValue(known) }
  return (provisionAccounts as unknown as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> })._handler(ctx, {})
}

describe('private account provisioning', () => {
  it('creates one requested player with an eleven-character password', async () => {
    vi.stubEnv('PAFF_PROVISIONING_ACCOUNTS', JSON.stringify([account]))
    await expect(run()).resolves.toEqual({ created: 1, existing: 0, total: 1 })
    expect(createAccount).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ provider: 'password', account: { id: 'test-player', secret: account.password }, profile: expect.objectContaining({ role: 'player', active: true }) }))
  })
  it('does not duplicate or reset an existing account', async () => {
    vi.stubEnv('PAFF_PROVISIONING_ACCOUNTS', JSON.stringify([account]))
    await expect(run({ profileExists: true, authAccountExists: true })).resolves.toEqual({ created: 0, existing: 1, total: 1 })
    expect(createAccount).not.toHaveBeenCalled()
  })
  it('rejects inconsistent existing account data', async () => {
    vi.stubEnv('PAFF_PROVISIONING_ACCOUNTS', JSON.stringify([account]))
    await expect(run({ profileExists: true, authAccountExists: false })).rejects.toThrow('Inconsistent')
    expect(createAccount).not.toHaveBeenCalled()
  })
  it.each([[], Array(6).fill(account), [{ ...account, password: 'short' }]])('rejects invalid provisioning input', async (accounts) => {
    vi.stubEnv('PAFF_PROVISIONING_ACCOUNTS', JSON.stringify(accounts))
    await expect(run()).rejects.toThrow()
    expect(createAccount).not.toHaveBeenCalled()
  })
})
