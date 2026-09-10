import { describe, expect, it } from 'vitest'
import { initialBattle, orderDefinitions } from './battle'

describe('orders from PAFF 2026.pdf pages 2 and 7', () => {
  it('offers exactly the four common orders with the documented recruitment allowance', () => {
    expect(orderDefinitions.filter((order) => order.faction === 'common').map((order) => order.name)).toEqual(['Mouvement', 'Tir', 'Tir Artillerie', 'Recrutement'])
    const battle = initialBattle([{ seat: 0, faction: 'gobelins' }, { seat: 1, faction: 'sephosi' }])
    expect(battle.manual.stocks).toEqual([{ seat: 0, orderId: 'recruitment', remaining: 3 }, { seat: 1, orderId: 'recruitment', remaining: 3 }, { seat: 0, orderId: 'waaagh', remaining: 1 }])
    expect(battle.catalog.find((order) => order.id === 'recruitment')?.description).toContain('6 ou 9 points')
    expect(battle.catalog.filter((order) => order.faction === 'gobelins').every((order) => order.description.includes('mettre à jour'))).toBe(true)
  })
})
