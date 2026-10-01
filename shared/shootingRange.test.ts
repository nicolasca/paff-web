import { describe, expect, it } from 'vitest'
import { isWithinShootingRange, LONG_RANGE_ARCHERS_ID } from './shootingRange'
import type { UnitProfile } from './unitProfile'

const profile: UnitProfile = { unitType: 'ranged', regiment: 2, dice: 2, offense: { kind: 'ranged', score: 3 }, defenseMelee: 1, defenseRanged: 2, source: 'defined' }
const unit = (cell: number, seat = 0, cardStableId = 'archers') => ({ cell, seat, cardStableId })

describe('shooting range geometry', () => {
  it.each([
    [40, 13, true], // E5 → E2: three vertical steps.
    [40, 21, true], // E5 → D3: two vertical plus one horizontal.
    [40, 12, false], // E5 → D2: four steps, not a three-step diagonal.
    [40, 4, false], // E5 → E1: fourth step reserved for artillery/long archers.
    [20, 23, true], // C3 → F3: shooting within one zone is allowed.
    [20, 24, false], // C3 → G3: four horizontal steps.
    [29, 28, false], // C4 → B4: adjacent but in another axis.
    [33, 34, false], // G4 → H4: adjacent but in another axis.
    [28, 1, true], // B4 → B1: left flank, three steps.
    [0, 0, false],
    [-1, 0, false],
    [40, 54, false],
  ])('checks standard shot from %i to %i: %s', (from, to, expected) => {
    expect(isWithinShootingRange(unit(from), unit(to, 1), profile)).toBe(expected)
  })

  it('gives artillery four steps in all directions within its axis', () => {
    const artillery = { ...profile, unitType: 'artillery' as const }
    for (const [from, to] of [[40, 4], [4, 40], [40, 12], [20, 24]]) expect(isWithinShootingRange(unit(from), unit(to), artillery)).toBe(true)
    expect(isWithinShootingRange(unit(40), unit(5), artillery)).toBe(false)
    expect(isWithinShootingRange(unit(33), unit(34), artillery)).toBe(false)
  })

  it.each([false, true])('adds only the fourth forward square for long archers (frozen profile: %s)', (frozen) => {
    const longProfile = frozen ? profile : { ...profile, ability: { id: 'long-range-fire', name: 'Tir longue portée', description: '' } }
    const stableId = frozen ? LONG_RANGE_ARCHERS_ID : 'new-long-archers'
    expect(isWithinShootingRange(unit(40, 0, stableId), unit(4), longProfile)).toBe(true) // E5 → E1.
    expect(isWithinShootingRange(unit(13, 1, stableId), unit(49), longProfile)).toBe(true) // E2 → E6, rotated player.
    expect(isWithinShootingRange(unit(13, 0, stableId), unit(49), longProfile)).toBe(false) // Four behind.
    expect(isWithinShootingRange(unit(40, 1, stableId), unit(4), longProfile)).toBe(false)
    expect(isWithinShootingRange(unit(40, 0, stableId), unit(12), longProfile)).toBe(false) // Fourth diagonal step.
    expect(isWithinShootingRange(unit(49, 0, stableId), unit(4), longProfile)).toBe(false) // Five forward.
    expect(isWithinShootingRange(unit(13, 0, stableId), unit(40), longProfile)).toBe(true) // Three behind remain normal.
    expect(isWithinShootingRange(unit(40, 1, stableId), unit(21), longProfile)).toBe(true) // Three sideways/behind.
  })
})
