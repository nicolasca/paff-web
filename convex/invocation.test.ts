import { afterEach, describe, expect, it, vi } from 'vitest'
import { invocationGame } from '../src/test/invocationGame'
import type { BattleState } from '../shared/battle'
import { emptyCombat } from '../shared/combat'

afterEach(() => vi.restoreAllMocks())
const error = (code: string) => ({ data: { code } })

describe('La gross Invokation !', () => {
  it.each([1, 2, 3, 4, 5, 6])('resolves result %i in the correct axes, excludes Trolls/Djil/enemies and consumes one order', async (value) => {
    const h = await invocationGame()
    vi.spyOn(Math, 'random').mockReturnValue((value - .5) / 6)
    const before = (await h.read()).battle!
    await h.invoke('combat', 'invoke', 1, { gameId: h.gameId, revision: 0, shamanId: 'shaman' })
    const after = (await h.read()).battle!
    const result = after.manual.combat!.invocationRolls![0]
    expect(result.value).toBe(value)
    expect(result.shaman).toEqual({ id: 'shaman', name: 'Shamans Gobelins', cell: 40 })
    expect(after.engine.log.some((entry) => entry.text.includes('Shamans Gobelins (E5)'))).toBe(true)
    const global = value === 1 || value === 6
    expect(result.scope).toBe(global ? 'all' : 1)
    expect(result.units.map((unit) => unit.id)).toEqual(global ? ['band', 'archer', 'shaman'] : ['band', 'shaman'])
    expect(after.manual.stocks.find((stock) => stock.seat === 0 && stock.orderId === 'great-invocation')!.remaining).toBe(0)
    for (const user of [2, 3]) expect((await h.read(user)).battle!.manual.combat).toEqual(after.manual.combat)
    expect(after.engine.units.filter((unit) => ['troll', 'djil', 'enemy'].includes(unit.id))).toEqual(before.engine.units.filter((unit) => ['troll', 'djil', 'enemy'].includes(unit.id)))
    if (value >= 4) {
      expect(after.engine.units).toEqual(before.engine.units)
      expect(after.manual.combat!.invocations).toEqual([{ seat: 0, turn: 1, scope: global ? 'all' : 1, unitIds: result.units.map((unit) => unit.id) }])
    } else {
      expect(result.units.every((unit) => unit.after === unit.before - 1)).toBe(true)
      expect(after.manual.discarded.map((unit) => unit.id)).toEqual(global ? ['archer', 'shaman'] : ['shaman'])
      expect(after.manual.combat!.invocations ?? []).toEqual([])
    }
    await expect(h.invoke('combat', 'invoke', 1, { gameId: h.gameId, revision: after.manual.combat!.revision, shamanId: 'shaman' })).rejects.toMatchObject(error('ORDER_EXHAUSTED'))
  })

  it('rejects absent Shamans, opponents, spectators and stale replays without rolling or writing', async () => {
    const h = await invocationGame()
    const random = vi.spyOn(Math, 'random').mockReturnValue(.99)
    const before = structuredClone(h.tables)
    for (const [user, shamanId, code] of [[1, 'missing', 'INVOCATION_NEEDS_SHAMAN'], [2, 'shaman', 'INVOCATION_NEEDS_SHAMAN'], [3, 'shaman', 'GAME_NOT_AVAILABLE']] as const) {
      await expect(h.invoke('combat', 'invoke', user, { gameId: h.gameId, revision: 0, shamanId })).rejects.toMatchObject(error(code))
      expect(h.tables).toEqual(before)
    }
    expect(random).not.toHaveBeenCalled()
    await h.invoke('combat', 'invoke', 1, { gameId: h.gameId, revision: 0, shamanId: 'shaman' })
    const after = structuredClone(h.tables)
    await expect(h.invoke('combat', 'invoke', 1, { gameId: h.gameId, revision: 0, shamanId: 'shaman' })).rejects.toMatchObject(error('STALE_GAME_ACTION'))
    expect(h.tables).toEqual(after)
    expect(random).toHaveBeenCalledTimes(1)
    const battle = h.tables.games.find((game) => game._id === h.gameId)!.battle as BattleState
    battle.catalog = battle.catalog.filter((order) => order.id !== 'great-invocation')
    const withoutOrder = structuredClone(h.tables)
    await expect(h.invoke('combat', 'invoke', 1, { gameId: h.gameId, revision: 1, shamanId: 'shaman' })).rejects.toMatchObject(error('ORDER_NOT_AVAILABLE'))
    expect(h.tables).toEqual(withoutOrder)
    expect(random).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['shaman', 1, ['band', 'shaman']],
    ['flank-shaman', 0, ['archer', 'flank-shaman']],
  ] as const)('uses the chosen %s among Shamans in different axes', async (shamanId, axis, affectedIds) => {
    for (const value of [2, 4]) {
      const h = await invocationGame()
      const battle = h.stored.battle as BattleState
      battle.engine!.units.push({ ...battle.engine!.units.find((unit) => unit.id === 'shaman')!, id: 'flank-shaman', cell: 37 })
      vi.spyOn(Math, 'random').mockReturnValue((value - .5) / 6)
      await h.invoke('combat', 'invoke', 1, { gameId: h.gameId, revision: 0, shamanId })
      const after = (await h.read()).battle!
      const result = after.manual.combat!.invocationRolls![0]
      expect(result).toMatchObject({ axis, scope: axis, value, shaman: { id: shamanId, cell: axis === 1 ? 40 : 37 } })
      expect(result.units.map((unit) => unit.id)).toEqual(affectedIds)
      if (value === 2) expect(result.units.every((unit) => unit.after === unit.before - 1)).toBe(true)
      else expect(after.manual.combat!.invocations![0].unitIds).toEqual(affectedIds)
      expect(after.engine.units.find((unit) => unit.id === (shamanId === 'shaman' ? 'flank-shaman' : 'shaman'))!.regiment).toBe(1)
    }
  })

  it.each(['wrong-type', 'enemy', 'dead', 'removed'] as const)('rejects a %s source without a roll, cost or other mutation', async (kind) => {
    const h = await invocationGame()
    const battle = h.stored.battle as BattleState
    const shaman = battle.engine!.units.find((unit) => unit.id === 'shaman')!
    if (kind === 'wrong-type') shaman.cardStableId = 'gobelins-troupe-de-gobelins'
    if (kind === 'enemy') shaman.seat = 1
    if (kind === 'dead') shaman.regiment = 0
    if (kind === 'removed') await h.invoke('manual', 'discardUnit', 1, { gameId: h.gameId, unitId: 'shaman' })
    const revision = (await h.read()).battle!.manual.combat?.revision ?? 0
    const before = structuredClone(h.tables)
    const random = vi.spyOn(Math, 'random')
    await expect(h.invoke('combat', 'invoke', 1, { gameId: h.gameId, revision, shamanId: 'shaman' })).rejects.toMatchObject(error('INVOCATION_NEEDS_SHAMAN'))
    expect(random).not.toHaveBeenCalled()
    expect(h.tables).toEqual(before)
  })

  it('rejects an invocation prepared before movement, then records the current source after refreshing', async () => {
    const h = await invocationGame()
    await h.invoke('combat', 'setArrow', 1, { gameId: h.gameId, kind: 'melee', attackerId: 'band', targetId: 'enemy' })
    const revision = (await h.read()).battle!.manual.combat!.revision
    await h.invoke('manual', 'moveUnit', 1, { gameId: h.gameId, unitId: 'shaman', from: 40, to: 41 })
    const before = structuredClone(h.tables)
    const random = vi.spyOn(Math, 'random').mockReturnValue(.6)
    await expect(h.invoke('combat', 'invoke', 1, { gameId: h.gameId, revision, shamanId: 'shaman' })).rejects.toMatchObject(error('STALE_GAME_ACTION'))
    expect(random).not.toHaveBeenCalled()
    expect(h.tables).toEqual(before)
    const currentRevision = (await h.read()).battle!.manual.combat!.revision
    await h.invoke('combat', 'invoke', 1, { gameId: h.gameId, revision: currentRevision, shamanId: 'shaman' })
    const result = (await h.read()).battle!.manual.combat!.invocationRolls![0]
    expect(result).toMatchObject({ axis: 1, scope: 1, value: 4, shaman: { id: 'shaman', cell: 41 } })
    expect(random).toHaveBeenCalledTimes(1)
  })

  it('preserves historical reports that do not identify their Shaman', async () => {
    const h = await invocationGame()
    const battle = h.stored.battle as BattleState
    const oldRoll = { id: 1, seat: 0, turn: 1, value: 6, axis: 1 as const, scope: 'all' as const, units: [] }
    battle.manual!.combat = { ...emptyCombat(), invocationRolls: [oldRoll] }
    vi.spyOn(Math, 'random').mockReturnValue(.6)
    await h.invoke('combat', 'invoke', 1, { gameId: h.gameId, revision: 0, shamanId: 'shaman' })
    const rolls = (await h.read()).battle!.manual.combat!.invocationRolls!
    expect(rolls[0]).toEqual(oldRoll)
    expect(rolls[1]).toMatchObject({ id: 2, shaman: { id: 'shaman', name: 'Shamans Gobelins', cell: 40 } })
  })

  it('cleans deaths and their arrows, clears readiness, and keeps an invocation loss report', async () => {
    const h = await invocationGame()
    const battle = h.stored.battle as BattleState
    battle.engine!.units.find((unit) => unit.id === 'band')!.regiment = 1
    await h.invoke('combat', 'setArrow', 1, { gameId: h.gameId, kind: 'melee', attackerId: 'band', targetId: 'enemy' })
    await h.invoke('manual', 'setDuel', 1, { gameId: h.gameId, attackerId: 'band', targetId: 'enemy' })
    const revision = (await h.read()).battle!.manual.combat!.revision
    for (const user of [1, 2]) await h.invoke('combat', 'setReady', user, { gameId: h.gameId, revision, ready: true })
    vi.spyOn(Math, 'random').mockReturnValue(.2)
    await h.invoke('combat', 'invoke', 1, { gameId: h.gameId, revision, shamanId: 'shaman' })
    const after = (await h.read(3)).battle!
    expect(after.manual.combat!.ready).toEqual([])
    expect(after.manual.combat!.arrows).toEqual([])
    expect(after.engine.engagements).toEqual([])
    expect(after.manual.duel).toBeUndefined()
    expect(after.manual.combat!.invocationRolls![0].units.find((unit) => unit.id === 'band')).toMatchObject({ before: 1, after: 0 })
  })

  it('doubles combat and shooting, follows affected units after a move, then expires without reviving on rewind', async () => {
    const h = await invocationGame()
    const battle = h.stored.battle as BattleState
    battle.engine!.units.find((unit) => unit.id === 'archer')!.cell = 38
    vi.spyOn(Math, 'random').mockReturnValue(.99)
    await h.invoke('combat', 'setArrow', 1, { gameId: h.gameId, kind: 'melee', attackerId: 'band', targetId: 'enemy' })
    const revision = (await h.read()).battle!.manual.combat!.revision
    for (const user of [1, 2]) await h.invoke('combat', 'setReady', user, { gameId: h.gameId, revision, ready: true })
    await h.invoke('combat', 'invoke', 1, { gameId: h.gameId, revision, shamanId: 'shaman' })
    expect((await h.read()).battle!.manual.combat!.ready).toEqual([])
    vi.spyOn(Math, 'random').mockReturnValue(.01)
    const combatRevision = (await h.read()).battle!.manual.combat!.revision
    for (const user of [1, 2]) await h.invoke('combat', 'setReady', user, { gameId: h.gameId, revision: combatRevision, ready: true })
    await h.invoke('combat', 'resolve', 1, { gameId: h.gameId, kind: 'melee', revision: combatRevision })
    let combat = (await h.read()).battle!.manual.combat!
    expect(combat.reports[0].attacks[0].dice).toHaveLength(4)
    expect(combat.reports[0].attacks[0].effects.join(' ')).toContain('La gross Invokation !')
    await h.invoke('manual', 'moveUnit', 1, { gameId: h.gameId, unitId: 'archer', from: 38, to: 29 })
    await h.invoke('combat', 'setArrow', 1, { gameId: h.gameId, kind: 'ranged', attackerId: 'archer', targetId: 'enemy' })
    combat = (await h.read()).battle!.manual.combat!
    await h.invoke('combat', 'resolve', 1, { gameId: h.gameId, kind: 'ranged', revision: combat.revision })
    expect((await h.read()).battle!.manual.combat!.reports[1].diversions[0].values).toHaveLength(4)
    for (const delta of [1, -1]) {
      await h.invoke('manual', 'adjustTurn', 1, { gameId: h.gameId, delta })
      expect((await h.read()).battle!.manual.combat!.invocations).toEqual([])
      expect((await h.read()).battle!.manual.combat!.invocationRolls).toHaveLength(1)
    }
  })
})
