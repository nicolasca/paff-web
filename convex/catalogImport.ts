import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'

const DATA_VERSION = 'paff-v100'

const FACTIONS = {
  Sephosi: {
    stableId: 'sephosi',
    name: 'Céphosi',
    themeKey: 'sephosi',
    entity: { stableId: 'ep', name: 'EP', sourceCode: 'EP' },
  },
  Orcs: {
    stableId: 'orcs',
    name: 'Orcs',
    themeKey: 'orcs',
    entity: {
      stableId: 'peaux-vertes',
      name: 'Peaux-Vertes',
      sourceCode: 'PV',
    },
  },
  Gaeli: {
    stableId: 'gaeli',
    name: 'Gaeli',
    themeKey: 'gaeli',
    entity: { stableId: 'ep', name: 'EP', sourceCode: 'EP' },
  },
  Gobelins: {
    stableId: 'gobelins',
    name: 'Gobelins',
    themeKey: 'gobelins',
    entity: {
      stableId: 'peaux-vertes',
      name: 'Peaux-Vertes',
      sourceCode: 'PV',
    },
  },
} as const

type SourceRow = {
  lineNumber: number
  entityCode: string
  faction: string
  name: string
  cost: string
  deckLimit: string
  life: string
  attack: string
  unitType: string
  abilities: string
  isUnit: string
  sourceNote: string
}

export const importCards = internalMutation({
  args: { rows: v.array(v.any()) },
  handler: async (ctx, args) => {
    const result = {
      entities: { created: 0, updated: 0, unchanged: 0 },
      factions: { created: 0, updated: 0, unchanged: 0 },
      cards: { created: 0, updated: 0, unchanged: 0 },
      ignored: 0,
      rejected: [] as Array<{ lineNumber: number; cause: string }>,
    }
    const seenCards = new Set<string>()
    const entityIds = new Map<
      string,
      Awaited<ReturnType<typeof upsertEntity>>
    >()
    const factionIds = new Map<
      string,
      Awaited<ReturnType<typeof upsertFaction>>
    >()

    for (const rawRow of args.rows) {
      let row: SourceRow
      try {
        row = validateSourceRow(rawRow)
      } catch (error) {
        result.rejected.push({
          lineNumber: readLineNumber(rawRow),
          cause: error instanceof Error ? error.message : 'Ligne invalide',
        })
        continue
      }

      const factionConfig = FACTIONS[row.faction as keyof typeof FACTIONS]
      if (!factionConfig || row.entityCode !== factionConfig.entity.sourceCode) {
        result.ignored += 1
        continue
      }

      const stableId = `${factionConfig.stableId}-${slugify(row.name)}`
      if (seenCards.has(stableId)) {
        result.rejected.push({
          lineNumber: row.lineNumber,
          cause: `Identifiant de carte dupliqué: ${stableId}`,
        })
        continue
      }
      seenCards.add(stableId)

      let entityId = entityIds.get(factionConfig.entity.stableId)
      if (!entityId) {
        entityId = await upsertEntity(ctx, factionConfig.entity, result)
        entityIds.set(factionConfig.entity.stableId, entityId)
      }

      let factionId = factionIds.get(factionConfig.stableId)
      if (!factionId) {
        factionId = await upsertFaction(ctx, factionConfig, entityId, result)
        factionIds.set(factionConfig.stableId, factionId)
      }

      try {
        const card = {
          stableId,
          dataVersion: DATA_VERSION,
          factionId,
          name: normalizeText(row.name),
          kind: parseCardKind(row.isUnit),
          ...optionalNumber('cost', row.cost),
          ...optionalNumber('deckLimit', row.deckLimit),
          ...optionalNumber('life', row.life),
          ...optionalNumber('attack', row.attack),
          ...(normalizeOptionalText(row.unitType)
            ? { unitType: normalizeOptionalText(row.unitType) }
            : {}),
          abilities: normalizeOptionalText(row.abilities)
            ? [normalizeText(row.abilities)]
            : [],
          imagePath: `/cards/${factionConfig.stableId}/${stableId}.webp`,
          sourceLine: row.lineNumber,
          ...(normalizeOptionalText(row.sourceNote)
            ? { sourceNote: normalizeText(row.sourceNote) }
            : {}),
          status: 'published' as const,
        }

        await upsertCard(ctx, card, result)
      } catch (error) {
        result.rejected.push({
          lineNumber: row.lineNumber,
          cause: error instanceof Error ? error.message : 'Ligne invalide',
        })
      }
    }

    return result
  },
})

async function upsertEntity(
  ctx: MutationCtx,
  entity: { stableId: string; name: string; sourceCode: string },
  result: ImportResult,
) {
  const value = {
    stableId: entity.stableId,
    slug: entity.stableId,
    name: entity.name,
    sourceCode: entity.sourceCode,
    status: 'published' as const,
  }
  const existing = await ctx.db
    .query('entities')
    .withIndex('by_stable_id', (query) => query.eq('stableId', entity.stableId))
    .unique()

  if (!existing) {
    result.entities.created += 1
    return ctx.db.insert('entities', value)
  }

  if (sameRecord(existing, value)) {
    result.entities.unchanged += 1
  } else {
    await ctx.db.patch(existing._id, value)
    result.entities.updated += 1
  }

  return existing._id
}

async function upsertFaction(
  ctx: MutationCtx,
  faction: (typeof FACTIONS)[keyof typeof FACTIONS],
  entityId: Awaited<ReturnType<typeof upsertEntity>>,
  result: ImportResult,
) {
  const value = {
    stableId: faction.stableId,
    slug: faction.stableId,
    entityId,
    name: faction.name,
    themeKey: faction.themeKey,
    status: 'published' as const,
  }
  const existing = await ctx.db
    .query('factions')
    .withIndex('by_stable_id', (query) => query.eq('stableId', faction.stableId))
    .unique()

  if (!existing) {
    result.factions.created += 1
    return ctx.db.insert('factions', value)
  }

  if (sameRecord(existing, value)) {
    result.factions.unchanged += 1
  } else {
    await ctx.db.patch(existing._id, value)
    result.factions.updated += 1
  }

  return existing._id
}

async function upsertCard(
  ctx: MutationCtx,
  value: Omit<
    Parameters<typeof ctx.db.insert<'cards'>>[1],
    never
  >,
  result: ImportResult,
) {
  const existing = await ctx.db
    .query('cards')
    .withIndex('by_stable_id', (query) => query.eq('stableId', value.stableId))
    .unique()

  if (!existing) {
    await ctx.db.insert('cards', value)
    result.cards.created += 1
  } else if (sameRecord(existing, value)) {
    result.cards.unchanged += 1
  } else {
    await ctx.db.patch(existing._id, value)
    result.cards.updated += 1
  }
}

type ImportResult = {
  entities: { created: number; updated: number; unchanged: number }
  factions: { created: number; updated: number; unchanged: number }
  cards: { created: number; updated: number; unchanged: number }
  ignored: number
  rejected: Array<{ lineNumber: number; cause: string }>
}

function validateSourceRow(value: unknown): SourceRow {
  if (!value || typeof value !== 'object') {
    throw new Error('La ligne doit être un objet')
  }

  const row = value as Record<string, unknown>
  const lineNumber = readLineNumber(row)
  const requiredStrings = [
    'entityCode',
    'faction',
    'name',
    'cost',
    'deckLimit',
    'life',
    'attack',
    'unitType',
    'abilities',
    'isUnit',
    'sourceNote',
  ] as const

  for (const field of requiredStrings) {
    if (typeof row[field] !== 'string') {
      throw new Error(`Colonne invalide: ${field}`)
    }
  }

  if (!normalizeOptionalText(row.name as string)) {
    throw new Error('Nom de carte manquant')
  }

  return { lineNumber, ...(row as Omit<SourceRow, 'lineNumber'>) }
}

function readLineNumber(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    Number.isInteger((value as Record<string, unknown>).lineNumber)
  ) {
    return (value as Record<string, number>).lineNumber
  }

  return 0
}

function parseCardKind(value: string): 'unit' | 'action' {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized === 'oui') return 'unit'
  if (normalized === 'non') return 'action'
  throw new Error(`Valeur Unités invalide: ${value}`)
}

function optionalNumber<Key extends string>(key: Key, value: string) {
  const normalized = value.trim()
  if (normalized === '') return {}

  const parsed = Number(normalized)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Valeur numérique invalide pour ${key}: ${value}`)
  }

  return { [key]: parsed } as Record<Key, number>
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeOptionalText(value: string) {
  const normalized = normalizeText(value)
  return normalized === '' ? undefined : normalized
}

function slugify(value: string) {
  return normalizeText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function sameRecord(
  existing: Record<string, unknown>,
  value: Record<string, unknown>,
) {
  return Object.entries(value).every(
    ([key, expected]) => JSON.stringify(existing[key]) === JSON.stringify(expected),
  )
}
