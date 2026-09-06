import { internalMutation } from './_generated/server'
import { catalogue2026, CATALOGUE_VERSION } from '../shared/catalogue2026'

// Convex returns object fields in canonical order, independently of source literals.
function sameValue(first: unknown, second: unknown) {
  const ordered = (_key: string, value: unknown): unknown => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, (value as Record<string, unknown>)[key]])) : value
  return JSON.stringify(first, ordered) === JSON.stringify(second, ordered)
}

export const apply = internalMutation({
  args: {},
  handler: async (ctx) => {
    const result = { created: 0, updated: 0, archived: 0 }
    for (const factionStableId of ['gobelins', 'sephosi'] as const) {
      const faction = await ctx.db.query('factions').withIndex('by_stable_id', (q) => q.eq('stableId', factionStableId)).unique()
      if (!faction) throw new Error(`Faction manquante : ${factionStableId}. Importez d’abord le catalogue initial.`)
      const name = factionStableId === 'sephosi' ? 'Sephosi' : 'Gobelins'
      if (faction.name !== name) await ctx.db.patch(faction._id, { name })
      const units = catalogue2026.filter((unit) => unit.faction === factionStableId)
      const published = await ctx.db.query('cards').withIndex('by_faction_and_status', (q) => q.eq('factionId', faction._id).eq('status', 'published')).collect()
      for (const [index, unit] of units.entries()) {
        const existing = await ctx.db.query('cards').withIndex('by_stable_id', (q) => q.eq('stableId', unit.stableId)).unique()
        const fields = {
          stableId: unit.stableId, factionId: faction._id, name: unit.name, cost: unit.cost,
          kind: 'unit' as const, profile: unit.profile, imagePath: unit.imagePath, abilities: unit.profile.ability ? [unit.profile.ability.name] : [],
          dataVersion: CATALOGUE_VERSION, status: 'published' as const, sourceLine: index + 1,
          sourceNote: 'Captures du Drive du 06/09/2026 ; interprétations WIP dans docs/regles-implementees.md.',
        }
        if (!existing) { await ctx.db.insert('cards', fields); result.created++ }
        else if (Object.entries(fields).some(([key, value]) => !sameValue(existing[key as keyof typeof existing], value)) || existing.deckLimit !== undefined) {
          await ctx.db.patch(existing._id, { ...fields, deckLimit: undefined }); result.updated++
        }
      }
      // Preserve retired cards and deck references; players can remove them in the editor.
      for (const card of published) if (!units.some((unit) => unit.stableId === card.stableId)) {
        await ctx.db.patch(card._id, { status: 'archived', dataVersion: CATALOGUE_VERSION }); result.archived++
      }
    }
    return result
  },
})
