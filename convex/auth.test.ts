import { describe, expect, it } from 'vitest'
import { passwordProfile } from './auth'
import { getCurrentPlayer, requireActivePlayer } from './lib/auth'
import { normalizeLoginId } from './lib/normalizeLoginId'

type AuthContext = Parameters<typeof getCurrentPlayer>[0]

function createContext(
  profile: {
    loginId: string
    displayName: string
    role: 'player' | 'admin'
    active: boolean
  } | null,
  subject = 'session-user|session-id',
) {
  return {
    auth: {
      getUserIdentity: async () => ({ subject }),
    },
    db: {
      query: () => ({
        withIndex: () => ({
          unique: async () => profile,
        }),
      }),
    },
  } as unknown as AuthContext
}

describe('private authentication server rules', () => {
  it('normalizes login identifiers consistently', () => {
    expect(normalizeLoginId('  Joueur.UN  ')).toBe('joueur.un')
  })

  it('rejects every public flow other than sign in', () => {
    expect(() =>
      passwordProfile({
        flow: 'signUp',
        email: 'sixieme.joueur',
      }),
    ).toThrow('Public account creation is disabled')
  })

  it('refuses private server access to a disabled player', async () => {
    const context = createContext({
      loginId: 'joueur.un',
      displayName: 'Joueur Un',
      role: 'player',
      active: false,
    })

    await expect(getCurrentPlayer(context)).resolves.toEqual({
      status: 'disabled',
    })
    await expect(requireActivePlayer(context)).rejects.toMatchObject({
      data: { code: 'ACCOUNT_DISABLED' },
    })
  })

  it('derives identity from the authenticated session only', async () => {
    const context = createContext({
      loginId: 'joueur.un',
      displayName: 'Joueur Un',
      role: 'player',
      active: true,
    })
    const callWithUntrustedInput = getCurrentPlayer as unknown as (
      context: AuthContext,
      untrusted: { userId: string },
    ) => ReturnType<typeof getCurrentPlayer>

    await expect(
      callWithUntrustedInput(context, { userId: 'autre-utilisateur' }),
    ).resolves.toMatchObject({
      status: 'active',
      userId: 'session-user',
    })
  })
})
