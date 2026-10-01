import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGameHarness } from '../src/test/gameHarness'
import { liveGame } from '../src/test/liveGame'
import { resolveBattlefield } from '../shared/battlefields'

afterEach(() => vi.restoreAllMocks())
const error = (code: string) => ({ data: { code } })

describe('shared persistent battlefield', () => {
  it('selects once after a valid start and shares the stored choice without any query randomness', async () => {
    const h = createGameHarness()
    const random = vi.spyOn(Math, 'random').mockReturnValue(.5)
    const gameId = await h.run('create')
    expect(h.tables.games[0].battlefield).toBeUndefined()
    await expect(h.run('start', 1, { gameId })).rejects.toMatchObject(error('NEED_TWO_PLAYERS'))
    await h.run('join', 2, { gameId })
    await expect(h.run('start', 2, { gameId })).rejects.toMatchObject(error('HOST_ONLY'))
    expect(random).not.toHaveBeenCalled()
    await h.run('start', 1, { gameId })
    expect(h.tables.games[0].battlefield).toBe('sephosi')
    expect(random).toHaveBeenCalledTimes(1)
    random.mockClear().mockImplementation(() => { throw new Error('A read or repeat start must not draw another battlefield') })
    for (const user of [1, 2, 3, 1, 3]) expect((await h.run('get', user, { gameId }))?.battlefield).toBe('sephosi')
    await expect(h.run('start', 1, { gameId })).rejects.toMatchObject(error('WRONG_GAME_PHASE'))
    expect(random).not.toHaveBeenCalled()
    expect(h.tables.games[0].battlefield).toBe('sephosi')
  })

  it('preserves the same battlefield through preparation, deployment and live play', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(.9)
    const h = await liveGame()
    expect(random).toHaveBeenCalledTimes(1)
    expect(h.stored.battlefield).toBe('gaeli')
    for (const user of [1, 2, 3]) expect(await h.read(user)).toMatchObject({ phase: 'battle', battlefield: 'gaeli' })
    random.mockClear()
    await h.invoke('manual', 'adjustTurn', 1, { gameId: h.gameId, delta: 1 })
    for (const user of [1, 2, 3]) expect((await h.read(user)).battlefield).toBe('gaeli')
    expect(random).not.toHaveBeenCalled()
  })

  it('reads old games consistently for players and spectators without writing or rolling', async () => {
    const h = await liveGame()
    delete h.stored.battlefield
    const before = structuredClone(h.tables)
    const expected = resolveBattlefield(undefined, h.gameId)
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Legacy reads must not draw a battlefield') })
    for (const user of [1, 2, 3, 2, 1]) expect((await h.read(user)).battlefield).toBe(expected)
    expect(h.tables).toEqual(before)
    expect(random).not.toHaveBeenCalled()
  })
})
