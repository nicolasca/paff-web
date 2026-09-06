import { describe, expect, it } from 'vitest'
import { canDeployUnit, cells, displayCell, initialSetup, isCenterBase, isHome, zoneOf } from './board'
import type { UnitProfile } from './unitProfile'

const troop: UnitProfile = { unitType: 'troop', regiment: 2, dice: 1, offense: { kind: 'melee', score: 3 }, defenseMelee: 2, defenseRanged: 2, source: 'defined' }
const artillery: UnitProfile = { ...troop, unitType: 'artillery' }

describe('2026 battlefield geometry and deployment', () => {
  it('has 54 distinct cells in 15 zones, including double-depth strategic zones', () => {
    expect(cells).toHaveLength(54)
    const zones = Object.groupBy(cells, zoneOf)
    expect(Object.keys(zones)).toHaveLength(15)
    expect(zones['2-0']).toHaveLength(4)
    expect(zones['2-1']).toHaveLength(10)
    expect(zones['2-2']).toHaveLength(4)
    expect(zones['1-1']).toHaveLength(5)
  })
  it('rotates both axes for the opposite player without changing canonical coordinates', () => {
    for (const cell of cells) {
      expect(displayCell(displayCell(cell, 1), 1)).toBe(cell)
      expect(isHome(cell, 0)).toBe(isHome(displayCell(cell, 1), 1))
      expect(isCenterBase(cell, 0)).toBe(isCenterBase(displayCell(cell, 1), 1))
    }
    expect(displayCell(0, 1)).toBe(53)
  })
  it.each([0, 1])('starts seat %s in Centre Base then permits its 18 home cells except occupied ones', (seat) => {
    const setup = initialSetup()
    const first = cells.filter((cell) => canDeployUnit(cell, seat, troop, setup))
    expect(first).toHaveLength(5)
    expect(first.every((cell) => isCenterBase(cell, seat))).toBe(true)
    setup.units.push({ seat, cell: first[0], cardStableId: 'troop' })
    const next = cells.filter((cell) => canDeployUnit(cell, seat, troop, setup))
    expect(next).toHaveLength(17)
    expect(next.every((cell) => isHome(cell, seat))).toBe(true)
  })
  it('keeps artillery in the rear, with a first-unit exception only for artillery-only armies', () => {
    const setup = initialSetup()
    expect(cells.filter((cell) => canDeployUnit(cell, 0, artillery, setup))).toHaveLength(0)
    expect(cells.filter((cell) => canDeployUnit(cell, 0, artillery, setup, true))).toEqual([45, 46, 47, 48, 49, 50, 51, 52, 53])
    setup.units.push({ seat: 0, cell: 40, cardStableId: 'troop' })
    expect(canDeployUnit(45, 0, artillery, setup)).toBe(true)
    expect(canDeployUnit(38, 0, artillery, setup)).toBe(false)
  })
  it.each([-1, 54, 2.5, NaN, Infinity])('rejects malformed cell %s', (cell) => {
    expect(canDeployUnit(cell, 0, troop, initialSetup())).toBe(false)
  })
})
