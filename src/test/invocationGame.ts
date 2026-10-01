import { liveGame } from './liveGame'
import { catalogue2026, catalogueFactions } from '../../shared/catalogue2026'
import type { BattleState } from '../../shared/battle'

// A prepared table with real published profiles, in memory only.
export async function invocationGame() {
  const h = await liveGame()
  const battle = h.stored.battle as BattleState
  battle.engine!.units = []
  h.tables.gameCards = []
  const entries = [
    ['band', 0, 'gobelins-troupe-de-gobelins', 30],
    ['archer', 0, 'gobelins-archers-gobelins', 36],
    ['shaman', 0, 'gobelins-shaman-gobelin', 40],
    ['troll', 0, 'gobelins-meneurs-de-troll', 31],
    ['djil', 0, 'gobelins-djil-meneur-de-trolls', 32],
    ['enemy', 1, 'gobelins-troupe-de-gobelins', 21],
  ] as const
  for (const [id, seat, stableId, cell] of entries) {
    const source = catalogue2026.find((card) => card.stableId === stableId)!
    h.tables.gameCards.push({ ...source, _id: `invocation-card-${id}`, gamePlayerId: h.tables.gamePlayers[seat]._id, kind: 'unit', abilities: [], faction: { stableId: source.faction, name: catalogueFactions[source.faction], themeKey: source.faction }, quantity: 1, deploymentQuantity: 1, selectedQuantity: 1, enteredQuantity: 1 })
    battle.engine!.units.push({ id, seat, cell, cardStableId: stableId, regiment: source.profile.regiment })
  }
  return h
}
