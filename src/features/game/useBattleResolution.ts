import { useEffect, useState } from 'react'
import type { BattleUnit } from '../../../shared/battleEngine'
import type { Combatant, CombatReport } from '../../../shared/combat'
import type { Game } from './types'

export type FactionTheme = 'gobelins' | 'sephosi' | 'gaeli'
export type ResolutionEffect = {
  unit: BattleUnit
  faction: FactionTheme
  name: string
  before: number
  after: number
  outcome: 'wounded' | 'destroyed' | 'held'
  reason?: 'sacrifice' | 'shaman'
}
export type BattleResolution = { key: string; effects: ResolutionEffect[] }
export const RESOLUTION_DURATION = 2300

type Playback = {
  query: Game
  scope: string
  connected: boolean
  seen: number
  units: BattleUnit[]
  active: BattleResolution | null
  pending: BattleResolution[]
}

const scopeOf = (game: Game) => `${game.id}:${game.phase}:${game.battle?.turn ?? ''}`
const reportsOf = (game: Game) => game.battle?.manual.combat?.reports ?? []
const latestId = (game: Game) => Math.max(0, ...reportsOf(game).map((report) => report.id))
const unitSnapshot = (game: Game) => (game.battle?.engine.units ?? []).map((unit) => ({ ...unit }))
const baseline = (game: Game, connected: boolean): Playback => ({
  query: game, scope: scopeOf(game), connected, seen: latestId(game), units: unitSnapshot(game), active: null, pending: [],
})

function factionOf(game: Game, unit: BattleUnit): FactionTheme | undefined {
  const player = game.players.find((player) => player.seat === unit.seat)
  const card = player?.deployedCards.find((card) => card.stableId === unit.cardStableId)
  const faction = card?.faction.stableId ?? player?.factionName?.toLowerCase()
  return faction === 'gobelins' || faction === 'sephosi' || faction === 'gaeli' ? faction : undefined
}

function fromReport(game: Game, report: CombatReport, previousUnits: Map<string, BattleUnit>): BattleResolution {
  const discarded = game.battle?.manual.discarded ?? []
  const effects: ResolutionEffect[] = []
  const held = new Set(report.held?.map((unit) => unit.id))
  function add(identity: Combatant, before: number | undefined, after: number, outcome: ResolutionEffect['outcome'], reason?: ResolutionEffect['reason']) {
    // A query can combine an earlier move/recruitment with this combat. Prefer
    // the old R snapshot only when it actually describes the report's square.
    const source = [previousUnits.get(identity.id), discarded.find((unit) => unit.id === identity.id),
      game.battle?.engine.units.find((unit) => unit.id === identity.id)]
      .find((unit) => unit !== undefined && unit.seat === identity.seat && unit.cell === identity.cell)
    if (!source) return
    const faction = factionOf(game, source)
    if (!faction) return
    effects.push({ unit: { ...source, regiment: after }, faction, name: identity.name,
      before: before ?? source.regiment, after, outcome, ...(reason ? { reason } : {}) })
    if (outcome === 'destroyed') previousUnits.delete(source.id)
    else previousUnits.set(source.id, { ...source, regiment: after })
  }
  for (const unit of report.sacrifices ?? []) add(unit, undefined, 0, 'destroyed', 'sacrifice')
  for (const loss of report.losses) {
    if (loss.before > loss.after) add(loss.unit, loss.before, loss.after,
      loss.after > 0 ? 'wounded' : held.has(loss.unit.id) ? 'held' : 'destroyed')
  }
  for (const risk of report.shamanRisks ?? []) if (risk.discarded) add(risk.unit, undefined, 0, 'destroyed', 'shaman')
  return { key: `${game.id}:${report.turn}:${report.id}`, effects }
}

// A later move, restoration or manual correction always takes precedence over
// presentation. Never put a temporary card on a newly occupied square.
function compatible(game: Game, effect: ResolutionEffect) {
  const units = game.battle?.engine.units ?? []
  const live = units.find((unit) => unit.id === effect.unit.id)
  const sameIdentity = (unit: BattleUnit) => unit.seat === effect.unit.seat && unit.cardStableId === effect.unit.cardStableId && unit.cell === effect.unit.cell
  if (live) return effect.outcome !== 'destroyed' && sameIdentity(live) && live.regiment === effect.after
  return effect.outcome === 'destroyed'
    && !units.some((unit) => unit.cell === effect.unit.cell)
    && Boolean(game.battle?.manual.discarded.some((unit) => unit.id === effect.unit.id && sameIdentity(unit)))
}

function filterResolution(game: Game, resolution: BattleResolution) {
  return { ...resolution, effects: resolution.effects.filter((effect) => compatible(game, effect)) }
}

function receive(previous: Playback, game: Game, connected: boolean): Playback {
  const scope = scopeOf(game)
  const seen = latestId(game)
  // Baseline the currently available query on reconnect. Convex's socket status
  // does not distinguish cached data from a completed query resynchronization.
  if (previous.scope !== scope || !connected || !previous.connected || seen < previous.seen) return baseline(game, connected)
  const source = new Map(previous.units.map((unit) => [unit.id, unit]))
  const received = reportsOf(game).filter((report) => report.id > previous.seen && report.turn === game.battle?.turn)
    .sort((a, b) => a.id - b.id).map((report) => fromReport(game, report, source))
  const active = previous.active && filterResolution(game, previous.active)
  const pending = [...previous.pending, ...received].map((resolution) => filterResolution(game, resolution)).filter((resolution) => resolution.effects.length > 0)
  return { query: game, scope, connected, seen, units: unitSnapshot(game),
    active: active?.effects.length ? active : pending.shift() ?? null, pending }
}

function presentationGame(game: Game, resolutions: BattleResolution[]) {
  if (!game.battle || resolutions.length === 0) return game
  const ghosts = new Map<string, BattleUnit>()
  for (const resolution of resolutions) for (const effect of resolution.effects) {
    if (effect.outcome === 'destroyed' && compatible(game, effect)) ghosts.set(effect.unit.id, effect.unit)
  }
  if (ghosts.size === 0) return game
  return { ...game, battle: { ...game.battle, engine: { ...game.battle.engine,
    units: [...game.battle.engine.units, ...ghosts.values()],
  } } }
}

/** Animates new shared reports while all counters and gameplay stay authoritative. */
export function useBattleResolution(game: Game, connected = true) {
  const [playback, setPlayback] = useState(() => baseline(game, connected))
  // Adjust before React commits the new query: otherwise a dead tile would be
  // removed for one frame before its presentation copy is added back.
  if (playback.query !== game || playback.connected !== connected) setPlayback(receive(playback, game, connected))
  const key = playback.active?.key
  useEffect(() => {
    if (!key) return
    const timer = setTimeout(() => setPlayback((previous) => {
      if (previous.active?.key !== key) return previous
      const [active = null, ...pending] = previous.pending
      return { ...previous, active, pending }
    }), RESOLUTION_DURATION)
    return () => clearTimeout(timer)
  }, [key])
  const current = connected && playback.connected && playback.scope === scopeOf(game)
  const resolution = current && playback.active ? filterResolution(game, playback.active) : null
  const visible = resolution?.effects.length ? resolution : null
  const pending = current ? playback.pending : []
  return { resolution: visible, resolving: Boolean(visible),
    boardGame: presentationGame(game, [...(visible ? [visible] : []), ...pending]),
  }
}
