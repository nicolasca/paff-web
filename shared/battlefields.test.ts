import { describe, expect, it, vi } from 'vitest'
import { BATTLEFIELD_IDS, resolveBattlefield, selectBattlefield } from './battlefields'

describe('battlefield selection', () => {
  it.each([
    [0, 'gobelins'], [1 / 3 - Number.EPSILON, 'gobelins'],
    [1 / 3, 'sephosi'], [2 / 3 - Number.EPSILON, 'sephosi'],
    [2 / 3, 'gaeli'], [1 - Number.EPSILON, 'gaeli'],
  ])('selects %s as %s from three equal intervals', (value, expected) => {
    const random = vi.fn(() => value as number)
    expect(selectBattlefield(random)).toBe(expected)
    expect(random).toHaveBeenCalledTimes(1)
  })

  it('keeps a stored choice regardless of the game identity', () => {
    for (const id of BATTLEFIELD_IDS) for (const gameId of [undefined, 'first-game', 'second-game']) expect(resolveBattlefield(id, gameId)).toBe(id)
  })

  it('provides deterministic valid backdrops for legacy games and a default without an identity', () => {
    expect(resolveBattlefield()).toBe('gobelins')
    expect(resolveBattlefield('unknown')).toBe('gobelins')
    const gameIds = ['games-1', 'games-2', 'games-3', 'games-42']
    const results = gameIds.map((id) => resolveBattlefield(undefined, id))
    expect(gameIds.map((id) => resolveBattlefield('unknown', id))).toEqual(results)
    expect(gameIds.map((id) => resolveBattlefield(undefined, id))).toEqual(results)
    expect(results.every((id) => BATTLEFIELD_IDS.includes(id))).toBe(true)
    expect(new Set(results).size).toBeGreaterThan(1)
  })
})
