import type { UnitProfile } from '../../shared/unitProfile'
import { createGameHarness } from './gameHarness'

export const meleeProfile: UnitProfile = { unitType: 'troop', regiment: 4, dice: 1, offense: { kind: 'melee', score: 3 }, defenseMelee: 3, defenseRanged: 3, source: 'defined' }
export const rangedProfile: UnitProfile = { ...meleeProfile, unitType: 'ranged', regiment: 2, offense: { kind: 'ranged', score: 3 } }

export async function liveGame(h = createGameHarness()) {
  const template = h.tables.cards[0]
  h.tables.cards = [{ ...template, _id: 'unit', stableId: 'archers', name: 'Archers', profile: rangedProfile }, { ...template, _id: 'lancers', stableId: 'lanciers', name: 'Lanciers', profile: meleeProfile }]
  h.tables.deckCards = [1, 2].flatMap((user) => ['unit', 'lancers'].map((cardId) => ({ _id: `${user}:${cardId}`, deckId: `deck-${user}`, cardId, quantity: 2 })))
  const gameId = await h.run('create')
  await h.run('join', 2, { gameId })
  await h.run('start', 1, { gameId })
  for (const user of [1, 2]) await h.run('selectDeck', user, { gameId, deckId: `deck-${user}` })
  for (const user of [1, 2]) {
    for (const cardStableId of ['archers', 'lanciers']) await h.run('updatePreparation', user, { gameId, cardStableId, change: { quantity: 1 } })
    await h.run('finishPreparation', user, { gameId })
  }
  const read = async (user = 1) => (await h.run('get', user, { gameId }))!
  // Control only the setup dice fixture; all phase transitions use real mutations.
  const stored = h.tables.games.find((game) => game._id === gameId)!
  const setup = stored.setup as { initiativeRolls: { seat: number; result: number; round: number }[]; initiativeWinner: number }
  setup.initiativeRolls = [{ seat: 0, result: 6, round: 1 }, { seat: 1, result: 1, round: 1 }]
  setup.initiativeWinner = 0
  for (const user of [1, 2]) await h.run('confirmInitiative', user, { gameId })
  for (const [user, cell, cardStableId] of [[1, 40, 'lanciers'], [2, 13, 'lanciers'], [1, 41, 'archers'], [2, 14, 'archers']] as const) await h.run('deployUnit', user, { gameId, cell, cardStableId, revision: (await read()).setup!.revision })
  for (const user of [1, 2]) await h.run('finishDeployment', user, { gameId, revision: (await read()).setup!.revision })
  const act = async (name: string, user = 1, args: Record<string, unknown> = {}) => h.invoke('actions', name, user, { gameId, revision: (await read()).battle!.revision, ...args })
  const unit = async (seat: number, stableId: string) => (await read()).battle!.engine!.units.find((unit) => unit.seat === seat && unit.cardStableId === stableId)!
  const skipOrders = async () => {
    while ((await read()).battle!.phase === 'orders') {
      const battle = (await read()).battle!
      if (!battle.engine!.activeOrder) await act('chooseOrder', battle.actingSeat + 1, { orderId: 'movement' })
      await act('finishOrder', battle.actingSeat + 1)
    }
  }
  return { ...h, gameId, read, act, unit, stored, skipOrders }
}
