import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGameHarness as setup } from '../src/test/gameHarness'

const code = (value: string) => ({ data: { code: value } })
afterEach(() => vi.restoreAllMocks())

describe('shared initiative after unit selection', () => {
  it('starts initiative only after both decks and records one server-generated D6 per player', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor('deck_selection')
    await run('selectDeck', 1, { gameId, deckId: 'deck-1' })
    await expect(run('rollInitiative', 1, { gameId, round: 1 })).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
    await run('selectDeck', 2, { gameId, deckId: 'deck-2' })
    for (const user of [1, 2]) await run('finishPreparation', user, { gameId })
    const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.99)
    await expect(run('confirmInitiative', 1, { gameId })).rejects.toMatchObject(code('INITIATIVE_PENDING'))
    await run('rollInitiative', 1, { gameId, round: 1 })
    await run('rollInitiative', 1, { gameId, round: 1 })
    expect(random).toHaveBeenCalledTimes(1)
    expect((await run('get', 2, { gameId }))?.setup?.initiativeRolls).toEqual([{ seat: 0, result: 1, round: 1 }])
    await run('rollInitiative', 2, { gameId, round: 1 })
    await run('rollInitiative', 2, { gameId, round: 1 })
    expect(random).toHaveBeenCalledTimes(2)
    await run('confirmInitiative', 1, { gameId })
    await run('confirmInitiative', 1, { gameId })
    expect((await run('get', 1, { gameId }))?.phase).toBe('initiative')
    await run('confirmInitiative', 2, { gameId })
    const state = await run('get', 1, { gameId })
    expect(state).toMatchObject({ phase: 'deployment', setup: { initiativeWinner: 1, deploymentTurn: 1, initiativeReady: [0, 1] } })
  })
  it('persists ties and prevents a delayed first-round request from rolling the next round', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor('preparation')
    for (const user of [1, 2]) await run('finishPreparation', user, { gameId })
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.99).mockReturnValueOnce(0)
    await run('rollInitiative', 1, { gameId, round: 1 })
    await run('rollInitiative', 2, { gameId, round: 1 })
    const state = await run('get', 2, { gameId })
    expect(state?.setup).toMatchObject({ initiativeRound: 2, initiativeRolls: [{ result: 4 }, { result: 4 }] })
    expect(state?.setup?.initiativeWinner).toBeUndefined()
    await expect(run('rollInitiative', 1, { gameId, round: 1 })).rejects.toMatchObject(code('STALE_GAME_ACTION'))
    await expect(run('confirmInitiative', 2, { gameId })).rejects.toMatchObject(code('INITIATIVE_PENDING'))
    await run('rollInitiative', 2, { gameId, round: 2 })
    await run('rollInitiative', 1, { gameId, round: 2 })
    expect((await run('get', 1, { gameId }))?.setup).toMatchObject({ initiativeWinner: 1, initiativeRound: 2 })
  })
})

describe('two-player lobby and access', () => {
  it('requires an authenticated and active player', async () => {
    const { run, tables } = setup()
    await expect(run('create', 0)).rejects.toMatchObject(code('UNAUTHENTICATED'))
    await expect(run('listLobby', 0)).rejects.toMatchObject(code('UNAUTHENTICATED'))
    tables.playerProfiles[0].active = false
    await expect(run('create')).rejects.toMatchObject(code('ACCOUNT_DISABLED'))
  })
  it('exposes open rooms, limits the table to two players and allows only one active game', async () => {
    const { run } = setup()
    const gameId = await run('create')
    expect(await run('listLobby', 2)).toMatchObject({ currentGame: null, rooms: [{ id: gameId, playerCount: 1 }] })
    await expect(run('create')).rejects.toMatchObject(code('ALREADY_IN_GAME'))
    await run('join', 2, { gameId })
    await run('join', 2, { gameId })
    await expect(run('join', 3, { gameId })).rejects.toMatchObject(code('GAME_FULL'))
    await expect(run('create', 2)).rejects.toMatchObject(code('ALREADY_IN_GAME'))
    const other = await run('create', 3)
    await expect(run('join', 1, { gameId: other })).rejects.toMatchObject(code('ALREADY_IN_GAME'))
    expect((await run('get', 1, { gameId }))?.players).toHaveLength(2)
  })
  it('lets only the host start with both players seated', async () => {
    const { run } = setup()
    const gameId = await run('create')
    await expect(run('start', 1, { gameId })).rejects.toMatchObject(code('NEED_TWO_PLAYERS'))
    await run('join', 2, { gameId })
    await expect(run('start', 2, { gameId })).rejects.toMatchObject(code('HOST_ONLY'))
    await run('start', 1, { gameId })
    expect((await run('listLobby')).rooms).toEqual([])
    expect((await run('listLobby')).currentGame?.phase).toBe('deck_selection')
    await expect(run('join', 3, { gameId })).rejects.toMatchObject(code('GAME_NOT_AVAILABLE'))
  })
  it('hides private rooms from outsiders and rejects all their game mutations', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor()
    expect(await run('get', 3, { gameId })).toBeNull()
    for (const name of ['start', 'selectDeck', 'updatePreparation', 'finishDeployment', 'leave', 'rollInitiative', 'confirmInitiative', 'deployUnit'] as const) {
      await expect(run(name, 3, { gameId, deckId: 'deck-1', cardStableId: 'archers', change: { quantity: 1 } })).rejects.toMatchObject(code('GAME_NOT_AVAILABLE'))
    }
  })
  it('enforces the stage order on the server', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor('waiting')
    await expect(run('selectDeck', 1, { gameId, deckId: 'deck-1' })).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
    await expect(run('updatePreparation', 1, { gameId, cardStableId: 'archers', change: { quantity: 1 } })).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
    await expect(run('finishDeployment', 1, { gameId })).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
  })
  it('frees a guest seat, then closes the table for everyone when the host leaves', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor('waiting')
    await run('leave', 2, { gameId })
    expect((await run('listLobby', 2)).currentGame).toBeNull()
    expect((await run('listLobby')).rooms[0].playerCount).toBe(1)
    await run('join', 2, { gameId })
    await run('leave', 1, { gameId })
    expect((await run('get', 2, { gameId }))?.phase).toBe('cancelled')
    expect(await run('listLobby', 2)).toEqual({ currentGame: null, rooms: [], watchable: [] })
    await expect(run('create', 2)).resolves.toBeTruthy()
  })
  it('closes an ongoing preparation if either player leaves', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor()
    await run('leave', 2, { gameId })
    expect((await run('listLobby', 1)).currentGame).toBeNull()
    await expect(run('finishDeployment', 1, { gameId })).rejects.toMatchObject(code('GAME_NOT_AVAILABLE'))
  })
})

describe('deck snapshots and simultaneous preparation', () => {
  it('waits for both decks and keeps each selection private', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor('deck_selection')
    await expect(run('selectDeck', 1, { gameId, deckId: 'deck-2' })).rejects.toMatchObject(code('DECK_NOT_FOUND'))
    await run('selectDeck', 1, { gameId, deckId: 'deck-1' })
    const guestView = await run('get', 2, { gameId })
    expect(guestView?.phase).toBe('deck_selection')
    expect(guestView?.players[0]).toMatchObject({ deckChosen: true, deckName: null, factionName: null, cards: [], drawPileCount: null, deploymentCount: null, deckId: null })
    await run('selectDeck', 2, { gameId, deckId: 'deck-2' })
    expect((await run('get', 1, { gameId }))?.phase).toBe('preparation')
    await expect(run('selectDeck', 1, { gameId, deckId: 'deck-1' })).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
  })
  it('does not allow mixed factions or unpublished cards', async () => {
    const { run, readyFor, tables } = setup()
    const gameId = await readyFor('deck_selection')
    tables.cards[0].factionId = 'other-faction'
    await expect(run('selectDeck', 1, { gameId, deckId: 'deck-1' })).rejects.toMatchObject(code('INVALID_DECK'))
    tables.cards[0].factionId = 'faction'
    tables.cards[0].status = 'draft'
    await expect(run('selectDeck', 1, { gameId, deckId: 'deck-1' })).rejects.toMatchObject(code('INVALID_DECK'))
    expect(tables.gameCards).toEqual([])
  })
  it('replaces a selection before the other player chooses and freezes the selected content', async () => {
    const { run, readyFor, tables } = setup()
    const gameId = await readyFor('deck_selection')
    await run('selectDeck', 1, { gameId, deckId: 'deck-1' })
    tables.deckCards[0].quantity = 4
    await run('selectDeck', 1, { gameId, deckId: 'deck-1' })
    tables.cards[0].name = 'Modifié'
    tables.deckCards = tables.deckCards.filter((card) => card.deckId !== 'deck-1')
    tables.decks = tables.decks.filter((deck) => deck._id !== 'deck-1')
    const me = (await run('get', 1, { gameId }))!.players.find((player) => player.isMe)!
    expect(me.cards).toHaveLength(1)
    expect(me.cards[0]).toMatchObject({ name: 'Archers', quantity: 4, abilities: ['Tir'] })
    expect(me.deckName).toBe('Armée 1')
  })
  it('freezes the new profile when choosing a deck and hides it from the opponent', async () => {
    const { run, readyFor, tables } = setup()
    const profile = { unitType: 'ranged', regiment: 4, dice: 2, offense: { kind: 'ranged', score: 5 }, defenseMelee: 2, defenseRanged: 3, ability: { name: 'Tir précis', description: 'Relancez un dé.' }, source: 'defined' }
    tables.cards[0].profile = profile
    const gameId = await readyFor()
    tables.cards[0].profile = { ...profile, dice: 99 }
    expect((await run('get', 1, { gameId }))?.players[0].cards[0].profile).toEqual(profile)
    expect((await run('get', 2, { gameId }))?.players[0].cards).toEqual([])
  })
  it.each([-1, 1.5, 6, NaN, Infinity])('rejects deployment quantity %s outside available copies', async (quantity) => {
    const { run, readyFor } = setup()
    const gameId = await readyFor()
    await expect(run('updatePreparation', 1, { gameId, cardStableId: 'archers', change: { quantity } })).rejects.toMatchObject(code('INVALID_DEPLOYMENT_QUANTITY'))
  })
  it('rejects actions or cards that are absent from the chosen deck', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor()
    for (const cardStableId of ['piege', 'unknown']) await expect(run('updatePreparation', 1, { gameId, cardStableId, change: { quantity: 1 } })).rejects.toMatchObject(code('UNIT_REQUIRED'))
  })
})
