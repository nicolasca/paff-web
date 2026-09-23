import { internalMutation } from './_generated/server'
import { catalogue2026, catalogueFactions, CATALOGUE_VERSION } from '../shared/catalogue2026'

// Convex returns object fields in canonical order, independently of source literals.
function sameValue(first: unknown, second: unknown) {
  const ordered = (_key: string, value: unknown): unknown => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, (value as Record<string, unknown>)[key]])) : value
  return JSON.stringify(first, ordered) === JSON.stringify(second, ordered)
}

export const apply = internalMutation({
  args: {},
  handler: async (ctx) => {
    const result = { created: 0, updated: 0, archived: 0, disabledFactions: 0, removedOrcEntries: 0, clearedOrcDecks: 0 }
    for (const [factionStableId, name] of Object.entries(catalogueFactions)) {
      const faction = await ctx.db.query('factions').withIndex('by_stable_id', (q) => q.eq('stableId', factionStableId)).unique()
      if (!faction) throw new Error(`Faction manquante : ${factionStableId}. Importez d’abord le catalogue initial.`)
      if (faction.name !== name || faction.status !== 'published') await ctx.db.patch(faction._id, { name, status: 'published' })
      const units = catalogue2026.filter((unit) => unit.faction === factionStableId)
      const published = await ctx.db.query('cards').withIndex('by_faction_and_status', (q) => q.eq('factionId', faction._id).eq('status', 'published')).collect()
      for (const unit of units) {
        const existing = await ctx.db.query('cards').withIndex('by_stable_id', (q) => q.eq('stableId', unit.stableId)).unique()
        const fields = {
          stableId: unit.stableId, factionId: faction._id, name: unit.name, cost: unit.cost,
          kind: 'unit' as const, profile: unit.profile, imagePath: unit.imagePath, abilities: unit.profile.ability ? [unit.profile.ability.name] : [],
          dataVersion: CATALOGUE_VERSION, status: 'published' as const, sourceLine: catalogue2026.indexOf(unit) + 2,
          sourceNote: unit.faction === 'gaeli'
            ? 'PAFF 2026 (4).pdf transmis le 21/09/2026, p. 8 (unités) et p. 9 (capacités). Les indications d’illustration ne sont pas des règles.'
            : 'PAFF 2026 (3).pdf transmis le 18/09/2026, p. 8 (unités) et p. 9 (capacités), avec les réponses du créateur transmises par Nicolas, récapitulées dans docs/differences-regles-2026-09-18.md.',
        }
        if (!existing) { await ctx.db.insert('cards', fields); result.created++ }
        else if (Object.entries(fields).some(([key, value]) => !sameValue(existing[key as keyof typeof existing], value)) || existing.deckLimit !== undefined) {
          await ctx.db.patch(existing._id, { ...fields, deckLimit: undefined }); result.updated++
        }
      }
      // Preserve retired cards and deck references; players can remove them in the editor.
      for (const card of published) if (!units.some((unit) => unit.stableId === card.stableId)) {
        await ctx.db.patch(card._id, {
          status: 'archived', dataVersion: CATALOGUE_VERSION,
          ...(card.stableId === 'gobelins-bande-du-chef' ? { name: 'Bande du Sef' } : {}),
        }); result.archived++
      }
    }
    // Nicolas explicitly requested removal of Orc cards from all decks on 2026-09-21.
    // Archive source records; frozen gameCards and battles remain historical snapshots.
    const orcs = await ctx.db.query('factions').withIndex('by_stable_id', (q) => q.eq('stableId', 'orcs')).unique()
    if (orcs) {
      if (orcs.status !== 'archived') {
        await ctx.db.patch(orcs._id, { status: 'archived' })
        result.disabledFactions++
      }
      const cards = await ctx.db.query('cards').withIndex('by_faction_and_status', (q) => q.eq('factionId', orcs._id)).collect()
      const orcIds = new Set(cards.map((card) => card._id))
      for (const card of cards) if (card.status !== 'archived') {
        await ctx.db.patch(card._id, { status: 'archived', dataVersion: CATALOGUE_VERSION })
        result.archived++
      }
      const decks = await ctx.db.query('decks').collect()
      for (const deck of decks) {
        const entries = await ctx.db.query('deckCards').withIndex('by_deck', (q) => q.eq('deckId', deck._id)).collect()
        const removed = entries.filter((entry) => orcIds.has(entry.cardId))
        for (const entry of removed) {
          await ctx.db.delete(entry._id)
          result.removedOrcEntries++
        }
        if (deck.factionId === orcs._id) {
          // Keep the deck's owner/name. Empty decks can choose a new faction in the editor.
          const remaining = entries.find((entry) => !orcIds.has(entry.cardId))
          const card = remaining ? await ctx.db.get(remaining.cardId) : null
          await ctx.db.patch(deck._id, { factionId: card?.factionId, updatedAt: Date.now() })
          result.clearedOrcDecks++
        } else if (removed.length) await ctx.db.patch(deck._id, { updatedAt: Date.now() })
      }
    }
    return result
  },
})
