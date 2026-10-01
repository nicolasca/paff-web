import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { canAttack, emptyCombat, excludedFromCombat, exposedAllies, type AttackArrow, type AttackKind } from '../../../shared/combat'
import { getUnitProfile } from '../../../shared/unitProfile'
import { hasUnitAbility } from '../../../shared/unitAbilities'
import { hasLongRangeFire, isWithinShootingRange, shootingDistance } from '../../../shared/shootingRange'
import type { BattleUnit } from '../../../shared/battleEngine'
import type { Game } from './types'

export type PlanningMode = 'move' | AttackKind
export function useCombatPlanning(game: Game, locked: boolean, run: (action: () => Promise<unknown>) => void) {
  const setArrow = useMutation(api.combat.setArrow)
  const clear = useMutation(api.combat.clearArrows)
  const ready = useMutation(api.combat.setReady)
  const resolve = useMutation(api.combat.resolve)
  const [mode, setMode] = useState<PlanningMode>('move')
  const [sourceId, setSourceId] = useState<string>()
  const [hint, setHint] = useState('')
  const engine = game.battle!.engine!
  const state = game.battle!.manual!.combat ?? emptyCombat()
  const seat = game.players.find((player) => player.isMe)!.seat
  const cardFor = (unit: BattleUnit) => game.players.find((player) => player.seat === unit.seat)!.deployedCards.find((card) => card.stableId === unit.cardStableId)!
  const source = engine.units.find((unit) => unit.id === sourceId && unit.regiment > 0)
  const arrows = state.arrows.filter((arrow) => arrow.kind === mode)
  const own = arrows.filter((arrow) => engine.units.find((unit) => unit.id === arrow.attackerId)?.seat === seat)
  const shootingProfile = mode === 'ranged' && source ? getUnitProfile(cardFor(source)) : undefined
  const shootingTargets = shootingProfile && source ? engine.units.filter((unit) => unit.seat !== seat && unit.regiment > 0 && !excludedFromCombat(getUnitProfile(cardFor(unit))!) && isWithinShootingRange(source, unit, shootingProfile)).map((unit) => ({ cell: unit.cell, distance: shootingDistance(source.cell, unit.cell) })) : []
  const rangeLabel = shootingProfile && source ? hasLongRangeFire(source, shootingProfile) ? 'Portée 3 · 4 droit devant' : `Portée ${shootingProfile.unitType === 'artillery' ? 4 : 3} · même axe` : ''
  const outOfRange = (arrow: AttackArrow) => {
    const attacker = engine.units.find((unit) => unit.id === arrow.attackerId)
    const target = engine.units.find((unit) => unit.id === arrow.targetId)
    return Boolean(arrow.kind === 'ranged' && attacker && target && !isWithinShootingRange(attacker, target, getUnitProfile(cardFor(attacker))!))
  }
  const invalidShots = own.filter(outOfRange).length
  const allyOptions = (arrow: AttackArrow) => {
    const attacker = engine.units.find((unit) => unit.id === arrow.attackerId)
    const target = engine.units.find((unit) => unit.id === arrow.targetId)
    return attacker && target && arrow.kind === 'ranged' && hasUnitAbility(getUnitProfile(cardFor(attacker)), 'meleeShooting') ? exposedAllies(engine, attacker, target) : []
  }
  const missingAlly = own.some((arrow) => { const allies = allyOptions(arrow); return allies.length > 1 && !allies.some((unit) => unit.id === arrow.allyId) })
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSourceId(undefined); setHint('') } }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [])
  function changeMode(next: PlanningMode) { setMode(next); setSourceId(undefined); setHint('') }
  function choose(cell: number) {
    if (locked || mode === 'move') return
    const unit = engine.units.find((unit) => unit.cell === cell && unit.regiment > 0)
    if (!unit) return
    const profile = getUnitProfile(cardFor(unit))!
    if (unit.seat === seat) {
      if (!canAttack(profile, mode)) { setHint(mode === 'ranged' ? 'Choisissez une de vos unités capable de tirer.' : 'Cette unité ne peut pas attaquer au corps à corps.'); return }
      setSourceId(sourceId === unit.id ? undefined : unit.id); setHint(''); return
    }
    if (!source) { setHint('Choisissez d’abord une de vos unités.'); return }
    if (excludedFromCombat(profile)) { setHint('Les Druides et le Grand Gardien sont hors des essais V1.'); return }
    if (mode === 'ranged' && !isWithinShootingRange(source, unit, getUnitProfile(cardFor(source))!)) { setHint('Cette cible est hors de portée ou dans un autre axe. Choisissez une unité éclairée.'); return }
    const arrow = { gameId: game.id, kind: mode, attackerId: source.id, targetId: unit.id }
    run(async () => { await setArrow(arrow); setSourceId(undefined); setHint('') })
  }
  return { mode, changeMode, choose, source, hint, state, arrows, own, seat, cardFor, allyOptions, missingAlly, shootingTargets, rangeLabel, invalidShots, outOfRange,
    remove: (arrow: AttackArrow) => run(() => setArrow({ gameId: game.id, kind: arrow.kind, attackerId: arrow.attackerId })),
    setAlly: (arrow: AttackArrow, allyId: string) => run(() => setArrow({ gameId: game.id, ...arrow, allyId: allyId || undefined })),
    clear: () => { if (mode !== 'move') run(() => clear({ gameId: game.id, kind: mode })) },
    ready: () => run(() => ready({ gameId: game.id, revision: state.revision, ready: !state.ready.includes(seat) })),
    resolve: () => { if (mode !== 'move') run(() => resolve({ gameId: game.id, revision: state.revision, kind: mode })) },
  }
}
