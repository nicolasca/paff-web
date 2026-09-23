import { describe, expect, it } from 'vitest'
import { createGameHarness } from '../src/test/gameHarness'

describe('voice room access', () => {
  it('allows both players in the waiting room and spectators only after launch', async () => {
    const h = createGameHarness()
    const gameId = await h.readyFor('waiting')
    const args = { gameId }
    expect(await h.invoke('voiceAccess', 'authorize', 1, args)).toEqual({ userId: 'user-1', displayName: 'Joueur 1' })
    expect(await h.invoke('voiceAccess', 'authorize', 2, args)).toEqual({ userId: 'user-2', displayName: 'Joueur 2' })
    await expect(h.invoke('voiceAccess', 'authorize', 3, args)).rejects.toMatchObject({ data: { code: 'GAME_NOT_AVAILABLE' } })

    await h.run('start', 1, args)
    expect(await h.invoke('voiceAccess', 'authorize', 3, args)).toEqual({ userId: 'user-3', displayName: 'Joueur 3' })
  })

  it('refuses new access to closed games and disabled accounts', async () => {
    const h = createGameHarness()
    const gameId = await h.readyFor('deck_selection')
    const args = { gameId }
    h.tables.playerProfiles[2].active = false
    await expect(h.invoke('voiceAccess', 'authorize', 3, args)).rejects.toMatchObject({ data: { code: 'ACCOUNT_DISABLED' } })
    await h.run('leave', 1, args)
    await expect(h.invoke('voiceAccess', 'authorize', 2, args)).rejects.toMatchObject({ data: { code: 'GAME_NOT_AVAILABLE' } })
  })
})
