import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGameHarness } from '../src/test/gameHarness'

const code = (code: string) => ({ data: { code } })
afterEach(() => vi.restoreAllMocks())

async function preparation() {
  const h = createGameHarness()
  // A second unit type lets tests distinguish the chosen subset from the deck.
  h.tables.cards.push({ ...h.tables.cards[0], _id: 'other-unit', stableId: 'lanciers', name: 'Lanciers' })
  h.tables.deckCards.push({ _id: 'lanciers-1', deckId: 'deck-1', cardId: 'other-unit', quantity: 3 })
  const gameId = await h.run('create')
  await h.run('join', 2, { gameId })
  await h.run('start', 1, { gameId })
  await h.run('selectDeck', 1, { gameId, deckId: 'deck-1' })
  await h.run('selectDeck', 2, { gameId, deckId: 'deck-2' })
  const read = async (user = 1) => (await h.run('get', user, { gameId }))!
  const choose = (user: number, quantity: number, cardStableId = 'archers') => h.run('updatePreparation', user, { gameId, cardStableId, change: { quantity } })
  const validate = (user: number) => h.run('finishPreparation', user, { gameId })
  const deploy = async (user: number, cell: number, cardStableId = 'archers') => h.run('deployUnit', user, { gameId, cell, cardStableId, revision: (await read()).setup!.revision })
  const finish = async (user: number) => h.run('finishDeployment', user, { gameId, revision: (await read()).setup!.revision })
  async function initiative() {
    await validate(1)
    await validate(2)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.99).mockReturnValueOnce(0)
    await h.run('rollInitiative', 1, { gameId, round: 1 })
    await h.run('rollInitiative', 2, { gameId, round: 1 })
    await h.run('confirmInitiative', 1, { gameId })
    await h.run('confirmInitiative', 2, { gameId })
  }
  return { ...h, gameId, read, choose, validate, deploy, finish, initiative }
}

describe('unit selection before initiative', () => {
  it('opens an empty preparation after both decks and waits for both confirmations', async () => {
    const { run, gameId, read, choose, validate } = await preparation()
    expect(await read()).toMatchObject({ phase: 'preparation', setup: { version: 3 }, players: [{ preparationReady: false, preparationCount: 0, deploymentCount: 0, drawPileCount: 10 }, { preparationReady: false, preparationCount: 0 }] })
    await expect(run('rollInitiative', 1, { gameId, round: 1 })).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
    await choose(1, 2)
    await validate(1)
    await validate(1)
    expect((await read()).phase).toBe('preparation')
    await expect(choose(1, 3)).rejects.toMatchObject(code('PREPARATION_LOCKED'))
    await choose(2, 1)
    await validate(2)
    expect((await read()).phase).toBe('initiative')
    await expect(choose(2, 2)).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
  })
  it.each([-1, 1.5, 6, NaN, Infinity])('rejects invalid selected quantity %s', async (quantity) => {
    const { choose, read } = await preparation()
    await expect(choose(1, quantity)).rejects.toMatchObject(code('INVALID_DEPLOYMENT_QUANTITY'))
    expect((await read()).players[0].preparationCount).toBe(0)
  })
  it('rejects actions, missing cards and outsiders, and applies relative quantities atomically', async () => {
    const { run, gameId, choose, read } = await preparation()
    for (const stableId of ['piege', 'unknown']) await expect(choose(1, 1, stableId)).rejects.toMatchObject(code('UNIT_REQUIRED'))
    for (const name of ['updatePreparation', 'finishPreparation'] as const) await expect(run(name, 3, { gameId, cardStableId: 'archers', change: { quantity: 1 } })).rejects.toMatchObject(code('GAME_NOT_AVAILABLE'))
    await choose(1, 2)
    await run('updatePreparation', 1, { gameId, cardStableId: 'archers', change: { delta: 1 } })
    await run('updatePreparation', 1, { gameId, cardStableId: 'archers', change: { delta: -1 } })
    expect((await read()).players[0]).toMatchObject({ preparationCount: 2, deploymentCount: 0, drawPileCount: 8 })
  })
  it('reveals only the selected count, then only individual units as they are placed', async () => {
    const { choose, read, initiative, deploy } = await preparation()
    await choose(1, 3, 'lanciers')
    let opponent = (await read(2)).players[0]
    expect(opponent).toMatchObject({ preparationCount: 3, cards: [], deployedCards: [], drawPileCount: null })
    expect(JSON.stringify(opponent)).not.toContain('Lanciers')
    await initiative()
    opponent = (await read(2)).players[0]
    expect(opponent.cards).toEqual([])
    expect(opponent.deployedCards).toEqual([])
    await deploy(1, 40, 'lanciers')
    opponent = (await read(2)).players[0]
    expect(opponent.deployedCards[0]).toMatchObject({ name: 'Lanciers', quantity: 1, deploymentQuantity: 1 })
    expect(opponent.deployedCards[0]).not.toHaveProperty('selectedQuantity')
    expect(opponent.cards).toEqual([])
    expect(opponent.preparationCount).toBe(3)
  })
  it('enforces the chosen subset and all its copies without drawing from the rest of the deck', async () => {
    const { choose, initiative, read, deploy, finish } = await preparation()
    await choose(1, 2)
    await choose(2, 1)
    await initiative()
    await expect(deploy(1, 40, 'lanciers')).rejects.toMatchObject(code('UNIT_NOT_PREPARED'))
    await expect(finish(1)).rejects.toMatchObject(code('DEPLOYMENT_INCOMPLETE'))
    await deploy(1, 40)
    await deploy(2, 13)
    await expect(finish(1)).rejects.toMatchObject(code('DEPLOYMENT_INCOMPLETE'))
    await deploy(1, 45)
    await finish(2)
    await expect(deploy(1, 46)).rejects.toMatchObject(code('UNIT_NOT_PREPARED'))
    await finish(1)
    const game = await read()
    expect(game.phase).toBe('battle')
    expect(game.players.map((player) => [player.preparationCount, player.deploymentCount, player.drawPileCount])).toEqual([[2, 2, 8], [1, 1, 6]])
    expect(game.setup!.units).toHaveLength(3)
  })
  it('allows zero selected units even in a nonempty deck', async () => {
    const { initiative, finish, read } = await preparation()
    await initiative()
    await finish(1)
    await finish(2)
    expect((await read()).players.map((player) => player.drawPileCount)).toEqual([10, 7])
    expect((await read()).phase).toBe('battle')
  })
  it('refuses selections that cannot fit the board before locking them', async () => {
    const { tables, choose, validate, read } = await preparation()
    for (const card of tables.gameCards) card.quantity = 25
    await choose(1, 19)
    await expect(validate(1)).rejects.toMatchObject(code('PREPARATION_TOO_LARGE'))
    expect((await read()).players[0].preparationReady).toBe(false)
    await choose(1, 18)
    await validate(1)
    expect((await read()).players[0].preparationReady).toBe(true)
  })
  it('counts artillery within the chosen subset, including the artillery-only first placement exception', async () => {
    const { tables, choose, validate, initiative, deploy } = await preparation()
    for (const card of tables.gameCards.filter((item) => item.stableId === 'archers')) {
      card.profile = { ...(card.profile as object), unitType: 'artillery' }
      card.quantity = 10
    }
    await choose(1, 10)
    await expect(validate(1)).rejects.toMatchObject(code('TOO_MUCH_ARTILLERY'))
    await choose(1, 1)
    await initiative()
    // The deck also has lancers, but they were not selected.
    await expect(deploy(1, 40)).rejects.toMatchObject(code('INVALID_DEPLOYMENT_CELL'))
    await deploy(1, 45)
  })
  it('keeps enough rear cells for all selected artillery until the full army is placed', async () => {
    const { tables, choose, initiative, deploy, finish, read } = await preparation()
    const artillery = tables.gameCards.find((card) => card.stableId === 'archers')!
    artillery.profile = { ...(artillery.profile as object), unitType: 'artillery' }
    artillery.quantity = 9
    await choose(1, 9)
    await choose(1, 2, 'lanciers')
    await initiative()
    await deploy(1, 40, 'lanciers')
    await finish(2)
    await expect(deploy(1, 45, 'lanciers')).rejects.toMatchObject(code('INVALID_DEPLOYMENT_CELL'))
    await deploy(1, 41, 'lanciers')
    for (let cell = 45; cell < 54; cell++) await deploy(1, cell)
    await finish(1)
    expect((await read()).phase).toBe('battle')
    expect((await read()).players[0].deploymentCount).toBe(11)
  })
})
