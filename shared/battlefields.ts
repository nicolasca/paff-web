export const BATTLEFIELD_IDS = ['gobelins', 'sephosi', 'gaeli'] as const
export type BattlefieldId = typeof BATTLEFIELD_IDS[number]

/** Called once by the server when a game starts; the stored choice is shared by everyone. */
export function selectBattlefield(random = Math.random): BattlefieldId {
  return BATTLEFIELD_IDS[Math.floor(random() * BATTLEFIELD_IDS.length)]
}

/** Older games have a stable backdrop without a migration or random query results. */
export function resolveBattlefield(id?: string, gameId?: string): BattlefieldId {
  const stored = BATTLEFIELD_IDS.find((candidate) => candidate === id)
  if (stored) return stored
  if (!gameId) return BATTLEFIELD_IDS[0]
  let hash = 2166136261
  for (let index = 0; index < gameId.length; index++) hash = Math.imul(hash ^ gameId.charCodeAt(index), 16777619) >>> 0
  return BATTLEFIELD_IDS[hash % BATTLEFIELD_IDS.length]
}
