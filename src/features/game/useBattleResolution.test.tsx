import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BattleUnit } from '../../../shared/battleEngine'
import { emptyCombat, type CombatReport } from '../../../shared/combat'
import { liveGame } from '../../test/liveGame'
import type { Game } from './types'
import { RESOLUTION_DURATION, useBattleResolution } from './useBattleResolution'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

const identity = (unit: BattleUnit) => ({ id: unit.id, seat: unit.seat, cell: unit.cell, name: unit.cardStableId })
function report(game: Game, id: number): CombatReport {
  return { id, turn: game.battle!.turn, kind: 'ranged', seat: 0, attacks: [], diversions: [], losses: [] }
}
function loss(game: Game, unitId: string, after: number, id = 1, held = false) {
  const next = structuredClone(game)
  const battle = next.battle!
  const unit = battle.engine.units.find((unit) => unit.id === unitId)!
  const value = report(next, id)
  value.losses = [{ unit: identity(unit), before: unit.regiment, after, damage: unit.regiment - after }]
  if (held) {
    value.held = [identity(unit)]
    unit.regiment = after
  }
  else if (after === 0) {
    battle.engine.units = battle.engine.units.filter((item) => item.id !== unit.id)
    battle.manual.discarded.push({ ...unit, regiment: 0 })
  }
  else unit.regiment = after
  battle.manual.combat ??= emptyCombat()
  battle.manual.combat.reports.push(value)
  battle.revision++
  return next
}
async function fixture() {
  const h = await liveGame()
  const game = await h.read()
  const units = game.battle!.engine.units
  return { game, archer: units.find((unit) => unit.seat === 1 && unit.cardStableId === 'archers')!,
    lancer: units.find((unit) => unit.seat === 1 && unit.cardStableId === 'lanciers')! }
}
const elapse = (duration = RESOLUTION_DURATION) => act(() => vi.advanceTimersByTime(duration))

describe('shared battle resolution presentation', () => {
  it('does not replay the persisted history on mount or after remount', async () => {
    const { game, archer } = await fixture()
    const resolved = loss(game, archer.id, 0)
    const first = renderHook(() => useBattleResolution(resolved))
    expect(first.result.current.resolution).toBeNull()
    expect(first.result.current.boardGame).toBe(resolved)
    first.unmount()
    const second = renderHook(() => useBattleResolution(resolved))
    expect(second.result.current.resolving).toBe(false)
    expect(second.result.current.boardGame.battle!.engine.units.some((unit) => unit.id === archer.id)).toBe(false)
  })

  it.each([1, 2, 3])('receives a real combat report for either player and the spectator (viewer %s)', async (viewer) => {
    const h = await liveGame()
    const before = await h.read(viewer)
    const attacker = await h.unit(0, 'archers')
    const target = await h.unit(1, 'archers')
    const { result, rerender } = renderHook(({ game }) => useBattleResolution(game), { initialProps: { game: before } })
    await h.invoke('combat', 'setArrow', 1, { gameId: h.gameId, revision: 0, kind: 'ranged', attackerId: attacker.id, targetId: target.id })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    await h.invoke('combat', 'resolve', 1, { gameId: h.gameId, revision: (await h.read()).battle!.manual.combat!.revision, kind: 'ranged' })
    const after = await h.read(viewer)
    vi.useFakeTimers()
    rerender({ game: after })
    expect(result.current.resolution?.effects).toEqual([expect.objectContaining({ before: 2, after: 1, outcome: 'wounded', faction: 'gobelins', unit: expect.objectContaining({ id: target.id }) })])
    expect(result.current.boardGame).toBe(after)
    rerender({ game: structuredClone(after) })
    expect(result.current.resolution?.key).toBe(`${after.id}:1:1`)
    elapse(RESOLUTION_DURATION - 1)
    expect(result.current.resolving).toBe(true)
    elapse(1)
    expect(result.current.resolving).toBe(false)
    rerender({ game: structuredClone(after) })
    expect(result.current.resolving).toBe(false)
  })

  it('retains only temporary dead tiles and preserves the final shared counters and engagements', async () => {
    const { game, archer } = await fixture()
    const next = loss(game, archer.id, 0)
    next.battle!.strategyPoints = [5, 3]
    next.battle!.recruitmentOffsets = [-2, 1]
    next.battle!.engine.engagements = [{ a: 'unrelated-a', b: 'unrelated-b' }]
    next.battle!.manual.combat!.reports[0].losses[0].damage = 7
    const { result, rerender } = renderHook(({ game }) => useBattleResolution(game), { initialProps: { game } })
    vi.useFakeTimers()
    rerender({ game: next })
    expect(result.current.resolution?.effects[0]).toMatchObject({ before: 2, after: 0, outcome: 'destroyed' })
    expect(result.current.boardGame.battle!.engine.units.find((unit) => unit.id === archer.id)).toMatchObject({ regiment: 0, cell: archer.cell })
    expect(result.current.boardGame.battle!.strategyPoints).toBe(next.battle!.strategyPoints)
    expect(result.current.boardGame.battle!.recruitmentOffsets).toBe(next.battle!.recruitmentOffsets)
    expect(result.current.boardGame.battle!.engine.engagements).toBe(next.battle!.engine.engagements)
    expect(result.current.boardGame.battle!.manual).toBe(next.battle!.manual)
    expect(next.battle!.engine.units.some((unit) => unit.id === archer.id)).toBe(false)
    elapse()
    expect(result.current.boardGame).toBe(next)
    expect(result.current.resolution).toBeNull()
  })

  it('queues independent shared reports without making a pending dead unit reappear', async () => {
    const { game, archer, lancer } = await fixture()
    const first = loss(game, archer.id, 1)
    const second = loss(first, lancer.id, 0, 2)
    const { result, rerender } = renderHook(({ game }) => useBattleResolution(game), { initialProps: { game } })
    vi.useFakeTimers()
    rerender({ game: first })
    elapse(400)
    rerender({ game: second })
    expect(result.current.resolution?.key).toBe(`${game.id}:1:1`)
    expect(result.current.boardGame.battle!.engine.units.find((unit) => unit.id === lancer.id)?.regiment).toBe(0)
    expect(result.current.boardGame.battle!.engine.units.find((unit) => unit.id === archer.id)?.regiment).toBe(1)
    elapse(RESOLUTION_DURATION - 400)
    expect(result.current.resolution?.key).toBe(`${game.id}:1:2`)
    expect(result.current.boardGame.battle!.engine.units.some((unit) => unit.id === lancer.id)).toBe(true)
    elapse()
    expect(result.current.boardGame).toBe(second)
    expect(result.current.resolving).toBe(false)
  })

  it('skips an outdated loss when a newer combat has already reduced the same unit again', async () => {
    const { game, lancer } = await fixture()
    const first = loss(game, lancer.id, 3)
    const second = loss(first, lancer.id, 2, 2)
    const { result, rerender } = renderHook(({ game }) => useBattleResolution(game), { initialProps: { game } })
    vi.useFakeTimers()
    rerender({ game: first })
    rerender({ game: second })
    expect(result.current.resolution?.key).toBe(`${game.id}:1:2`)
    expect(result.current.resolution?.effects[0]).toMatchObject({ before: 3, after: 2 })
    expect(result.current.boardGame.battle!.engine.units.find((unit) => unit.id === lancer.id)?.regiment).toBe(2)
    elapse()
    expect(result.current.resolving).toBe(false)
  })

  it('keeps Gaeli warriors at zero R with a held effect instead of discarding them', async () => {
    const { game, archer } = await fixture()
    game.players.find((player) => player.seat === archer.seat)!.deployedCards.find((card) => card.stableId === archer.cardStableId)!.faction.stableId = 'gaeli'
    const next = loss(game, archer.id, 0, 1, true)
    next.battle!.manual.combat!.held = [{ unitId: archer.id, turn: 1 }]
    const { result, rerender } = renderHook(({ game }) => useBattleResolution(game), { initialProps: { game } })
    vi.useFakeTimers()
    rerender({ game: next })
    expect(result.current.resolution?.effects[0]).toMatchObject({ outcome: 'held', faction: 'gaeli', before: 2, after: 0 })
    expect(result.current.boardGame).toBe(next)
    elapse()
    expect(result.current.boardGame.battle!.engine.units.find((unit) => unit.id === archer.id)?.regiment).toBe(0)
  })

  it.each([1, 0])('uses the reported square when one shared query combines an earlier move and a combat (after %s R)', async (after) => {
    const { game, archer } = await fixture()
    const moved = structuredClone(game)
    moved.battle!.engine.units.find((unit) => unit.id === archer.id)!.cell = 23
    const next = loss(moved, archer.id, after)
    const { result, rerender } = renderHook(({ game }) => useBattleResolution(game), { initialProps: { game } })
    vi.useFakeTimers()
    rerender({ game: next })
    expect(result.current.resolution?.effects[0]).toMatchObject({ before: 2, after, unit: { id: archer.id, cell: 23 } })
    expect(result.current.boardGame.battle!.engine.units.find((unit) => unit.id === archer.id)).toMatchObject({ cell: 23, regiment: after })
    expect(result.current.boardGame.battle!.engine.units.some((unit) => unit.cell === archer.cell)).toBe(false)
    elapse()
    expect(result.current.boardGame).toBe(next)
  })

  it('identifies ammunition sacrifices and failed Shaman risks without inventing wound amounts', async () => {
    const { game, archer, lancer } = await fixture()
    const next = structuredClone(game)
    const value = report(next, 1)
    value.sacrifices = [identity(archer)]
    value.shamanRisks = [{ unit: identity(lancer), value: 2, discarded: true }, { unit: identity(game.battle!.engine.units[0]), value: 6, discarded: false }]
    next.battle!.manual.combat = { ...emptyCombat(), reports: [value] }
    next.battle!.manual.discarded.push({ ...archer, regiment: 0 }, { ...lancer, regiment: 0 })
    next.battle!.engine.units = next.battle!.engine.units.filter((unit) => unit.id !== archer.id && unit.id !== lancer.id)
    const { result, rerender } = renderHook(({ game }) => useBattleResolution(game), { initialProps: { game } })
    vi.useFakeTimers()
    rerender({ game: next })
    expect(result.current.resolution?.effects).toEqual([
      expect.objectContaining({ before: 2, after: 0, reason: 'sacrifice', outcome: 'destroyed', unit: expect.objectContaining({ id: archer.id }) }),
      expect.objectContaining({ before: 4, after: 0, reason: 'shaman', outcome: 'destroyed', unit: expect.objectContaining({ id: lancer.id }) }),
    ])
    expect(result.current.boardGame.battle!.engine.units).toHaveLength(game.battle!.engine.units.length)
    elapse()
    expect(result.current.boardGame).toBe(next)
  })

  it.each(['restored', 'occupied', 'moved', 'healed'] as const)('lets a newer %s unit state override the animation immediately', async (change) => {
    const { game, archer } = await fixture()
    const discarded = change === 'restored' || change === 'occupied'
    const next = loss(game, archer.id, discarded ? 0 : 1)
    const { result, rerender } = renderHook(({ game }) => useBattleResolution(game), { initialProps: { game } })
    vi.useFakeTimers()
    rerender({ game: next })
    expect(result.current.resolving).toBe(true)
    const changed = structuredClone(next)
    if (change === 'restored') {
      changed.battle!.engine.units.push({ ...archer })
      changed.battle!.manual.discarded = []
    }
    if (change === 'occupied') changed.battle!.engine.units.push({ ...archer, id: 'new-recruit' })
    if (change === 'moved') changed.battle!.engine.units.find((unit) => unit.id === archer.id)!.cell++
    if (change === 'healed') changed.battle!.engine.units.find((unit) => unit.id === archer.id)!.regiment++
    rerender({ game: changed })
    expect(result.current.resolving).toBe(false)
    expect(result.current.boardGame).toBe(changed)
    elapse()
    expect(result.current.boardGame).toBe(changed)
  })

  it('clears the animation and queued tiles when the turn changes', async () => {
    const { game, archer, lancer } = await fixture()
    const first = loss(game, archer.id, 0)
    const second = loss(first, lancer.id, 0, 2)
    const { result, rerender } = renderHook(({ game }) => useBattleResolution(game), { initialProps: { game } })
    vi.useFakeTimers()
    rerender({ game: first })
    rerender({ game: second })
    const changed = structuredClone(second)
    changed.battle!.turn++
    rerender({ game: changed })
    expect(result.current.boardGame).toBe(changed)
    expect(result.current.resolving).toBe(false)
    elapse(RESOLUTION_DURATION * 2)
    expect(result.current.resolving).toBe(false)
  })

  it('clears the previous table presentation when the game identity changes', async () => {
    const { game, archer } = await fixture()
    const next = loss(game, archer.id, 0)
    const { result, rerender } = renderHook(({ game }) => useBattleResolution(game), { initialProps: { game } })
    vi.useFakeTimers()
    rerender({ game: next })
    const other = { ...next, id: 'other-table' as Game['id'] }
    rerender({ game: other })
    expect(result.current.boardGame).toBe(other)
    expect(result.current.resolving).toBe(false)
    elapse()
    expect(result.current.resolving).toBe(false)
  })

  it('detects the next report when the ten-report history drops its oldest entry', async () => {
    const { game, archer } = await fixture()
    game.battle!.manual.combat = { ...emptyCombat(), reports: Array.from({ length: 10 }, (_, index) => report(game, index + 1)) }
    const next = loss(game, archer.id, 1, 11)
    next.battle!.manual.combat!.reports = next.battle!.manual.combat!.reports.slice(-10)
    const { result, rerender } = renderHook(({ game }) => useBattleResolution(game), { initialProps: { game } })
    vi.useFakeTimers()
    rerender({ game: next })
    expect(result.current.resolution?.key).toBe(`${game.id}:1:11`)
    elapse()
    expect(result.current.resolving).toBe(false)
  })

  it('establishes a fresh baseline after a connection loss instead of replaying missed combats', async () => {
    const { game, archer, lancer } = await fixture()
    const first = loss(game, archer.id, 0)
    const second = loss(first, lancer.id, 3, 2)
    const { result, rerender } = renderHook(({ game, connected }) => useBattleResolution(game, connected), { initialProps: { game, connected: true } })
    vi.useFakeTimers()
    rerender({ game: first, connected: true })
    expect(result.current.resolving).toBe(true)
    rerender({ game: first, connected: false })
    expect(result.current.boardGame).toBe(first)
    rerender({ game: second, connected: true })
    expect(result.current.resolving).toBe(false)
    const third = loss(second, lancer.id, 2, 3)
    rerender({ game: third, connected: true })
    expect(result.current.resolution?.key).toBe(`${game.id}:1:3`)
    elapse()
    expect(result.current.resolving).toBe(false)
  })

  it('does not keep a timer after leaving the board', async () => {
    const { game, archer } = await fixture()
    const { rerender, unmount } = renderHook(({ game }) => useBattleResolution(game), { initialProps: { game } })
    vi.useFakeTimers()
    rerender({ game: loss(game, archer.id, 0) })
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
