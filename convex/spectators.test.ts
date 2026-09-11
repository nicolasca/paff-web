import { describe, expect, it } from 'vitest'
import { createGameHarness } from '../src/test/gameHarness'
import { liveGame } from '../src/test/liveGame'

describe('spectator access', () => {
  it('lists battles, allows a direct visit without joining and keeps both reserves private', async () => {
    const h = await liveGame()
    const ownTable = await h.run('create', 3)
    h.tables.gameCards.push({ ...h.tables.gameCards[0], _id: 'secret-reserve', stableId: 'secret-unit', name: 'Unité secrète', quantity: 1, selectedQuantity: 0, deploymentQuantity: 0, enteredQuantity: 0 })
    const before = structuredClone(h.tables)
    expect(await h.run('listLobby', 3)).toMatchObject({ currentGame: { id: ownTable }, watchable: [{ id: h.gameId, turn: 1, players: [{ displayName: 'Joueur 1' }, { displayName: 'Joueur 2' }] }] })
    expect((await h.run('listLobby', 1)).watchable).toEqual([])
    const view = await h.read(3)
    expect(view).toMatchObject({ isSpectator: true, isHost: false, phase: 'battle' })
    for (const player of view.players) {
      expect(player).toMatchObject({ isMe: false, cards: [], deckId: null })
      expect(player.deployedCards).toHaveLength(2)
      for (const card of player.deployedCards) {
        expect(card.quantity).toBe(1)
        expect(card).not.toHaveProperty('selectedQuantity')
        expect(card).not.toHaveProperty('enteredQuantity')
      }
    }
    expect(JSON.stringify(view)).not.toMatch(/Unité secrète|secret-unit/)
    expect(view.battle).toEqual((await h.read(1)).battle)
    expect((await h.read(1)).isSpectator).toBe(false)
    expect(h.tables).toEqual(before)

    await h.invoke('manual', 'recruit', 1, { gameId: h.gameId, cardStableId: 'secret-unit', entered: 0, cell: 45 })
    expect((await h.read(3)).players[0].deployedCards).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Unité secrète', quantity: 1 })]))
    expect((await h.read(3)).players[0].cards).toEqual([])
  })

  it('keeps preparation private and requires an authenticated active account', async () => {
    const h = createGameHarness()
    const gameId = await h.readyFor('preparation')
    expect(await h.run('get', 3, { gameId })).toBeNull()
    expect((await h.run('listLobby', 3)).watchable).toEqual([])
    const live = await liveGame()
    await expect(live.read(0)).rejects.toMatchObject({ data: { code: 'UNAUTHENTICATED' } })
    live.tables.playerProfiles[2].active = false
    await expect(live.read(3)).rejects.toMatchObject({ data: { code: 'ACCOUNT_DISABLED' } })
    await expect(live.run('listLobby', 3)).rejects.toMatchObject({ data: { code: 'ACCOUNT_DISABLED' } })
  })

  it('rejects every manual mutation and leaving the table from a spectator, even by direct API call', async () => {
    const h = await liveGame()
    await h.read(3)
    const unit = await h.unit(0, 'lanciers')
    const target = await h.unit(1, 'lanciers')
    const before = structuredClone(h.tables)
    const actions: Record<string, Record<string, unknown>> = {
      moveUnit: { unitId: unit.id, from: unit.cell, to: 31 },
      recruit: { cardStableId: 'lanciers', entered: 1, cell: 45 },
      adjustTurn: { delta: 1 }, adjustStrategy: { delta: 1 },
      adjustOrderStock: { orderId: 'recruitment', delta: -1 },
      adjustRegiment: { unitId: unit.id, delta: -1 },
      setDuel: { attackerId: unit.id, targetId: target.id },
      setEngagement: { a: unit.id, b: target.id, engaged: true },
      rollDice: { count: 3 }, discardUnit: { unitId: unit.id },
      restoreUnit: { unitId: unit.id, cell: 45 },
    }
    for (const [action, args] of Object.entries(actions)) await expect(h.invoke('manual', action, 3, { gameId: h.gameId, ...args })).rejects.toMatchObject({ data: { code: 'GAME_NOT_AVAILABLE' } })
    await expect(h.run('leave', 3, { gameId: h.gameId })).rejects.toMatchObject({ data: { code: 'GAME_NOT_AVAILABLE' } })
    await expect(h.run('join', 3, { gameId: h.gameId })).rejects.toMatchObject({ data: { code: 'GAME_NOT_AVAILABLE' } })
    expect(h.tables).toEqual(before)
  })

  it('removes a closed battle from the lobby and revokes spectator access', async () => {
    const h = await liveGame()
    await h.run('leave', 2, { gameId: h.gameId })
    expect((await h.run('listLobby', 3)).watchable).toEqual([])
    expect(await h.run('get', 3, { gameId: h.gameId })).toBeNull()
    expect((await h.read(1)).phase).toBe('cancelled')
  })
})
