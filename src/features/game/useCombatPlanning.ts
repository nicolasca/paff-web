import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { canAttack, emptyCombat, type AttackArrow, type AttackKind } from '../../../shared/combat'
import { ammoEligible, danzereuShotCount, isCombatPresent, isHeld } from '../../../shared/autoCombat'
import { getUnitProfile } from '../../../shared/unitProfile'
import { hasUnitAbility } from '../../../shared/unitAbilities'
import { hasLongRangeFire, isWithinShootingRange, shootingDistance } from '../../../shared/shootingRange'
import { adjacent, isEngaged, type BattleUnit, type UnitCard } from '../../../shared/battleEngine'
import { zoneOf } from '../../../shared/board'
import { MANUAL_RULES_VERSION } from '../../../shared/manualBattle'
import type { Game } from './types'

export type PlanningMode = 'move' | AttackKind
export function useCombatPlanning(game: Game, locked: boolean, run: (action: () => Promise<unknown>) => void) {
  const setArrow = useMutation(api.combat.setArrow)
  const clear = useMutation(api.combat.clearArrows)
  const ready = useMutation(api.combat.setReady)
  const resolve = useMutation(api.combat.resolve)
  const [mode, setMode] = useState<PlanningMode>('move')
  const [sourceId, setSourceId] = useState<string>()
  const [shotSlot, setShotSlot] = useState(0)
  const [hint, setHint] = useState('')
  const engine = game.battle!.engine!
  const state = game.battle!.manual!.combat ?? emptyCombat()
  const turn = game.battle!.turn
  const seat = game.players.find((player) => player.isMe)!.seat
  const automated = game.rulesVersion === MANUAL_RULES_VERSION
  const cardFor = (unit: BattleUnit) => game.players.find((player) => player.seat === unit.seat)!.deployedCards.find((card) => card.stableId === unit.cardStableId)!
  const cards: UnitCard[] = game.players.flatMap((player) => player.deployedCards.flatMap((card) => {
    const profile = getUnitProfile(card)
    return profile ? [{ stableId: card.stableId, seat: player.seat, name: card.name, cost: card.cost ?? 0, profile, quantity: card.quantity, entered: card.deploymentQuantity }] : []
  }))
  // Munitions leave the battlefield before the volley and cannot support it.
  const sacrificed = new Set(state.arrows.filter((arrow) => arrow.kind === 'ranged' && engine.units.find((unit) => unit.id === arrow.attackerId)?.seat === seat).flatMap((arrow) => arrow.sacrificeId ? [arrow.sacrificeId] : []))
  const shootingEngine = { ...engine, units: engine.units.filter((unit) => !sacrificed.has(unit.id)), engagements: engine.engagements.filter((edge) => !sacrificed.has(edge.a) && !sacrificed.has(edge.b)) }
  const source = engine.units.find((unit) => unit.id === sourceId && isCombatPresent(unit, state, turn))
  const arrows = state.arrows.filter((arrow) => arrow.kind === mode)
  const own = arrows.filter((arrow) => engine.units.find((unit) => unit.id === arrow.attackerId)?.seat === seat)
  const shotCount = source && mode === 'ranged' ? danzereuShotCount(shootingEngine, source, cards) : 1
  const shootingProfile = mode === 'ranged' && source ? getUnitProfile(cardFor(source)) : undefined
  const shootingTargets = shootingProfile && source ? engine.units.filter((unit) => unit.seat !== seat && unit.regiment > 0 && !isEngaged(engine, unit.id) && isWithinShootingRange(source, unit, shootingProfile)).map((unit) => ({ cell: unit.cell, distance: shootingDistance(source.cell, unit.cell) })) : []
  const rangeLabel = shootingProfile && source ? hasLongRangeFire(source, shootingProfile) ? 'Portée 3 · 4 droit devant' : `Portée ${shootingProfile.unitType === 'artillery' ? 4 : 3} · même axe` : ''
  const sourceArrow = source && own.find((arrow) => arrow.attackerId === source.id)
  const trollRoll = source && (state.trollRolls?.find((roll) => roll.unitId === source.id && roll.targetId === sourceArrow?.targetId) ?? state.trollRolls?.findLast((roll) => roll.unitId === source.id))
  const needsFriendlyTarget = mode === 'melee' && trollRoll?.value === 1
  const shotProblem = (arrow: AttackArrow) => {
    const attacker = engine.units.find((unit) => unit.id === arrow.attackerId)
    const target = engine.units.find((unit) => unit.id === arrow.targetId)
    if (arrow.kind !== 'ranged' || !attacker || !target) return ''
    if (isHeld(attacker, state, turn) || target.regiment <= 0) return 'Cette unité est conservée pour le corps à corps seulement.'
    if (isEngaged(engine, target.id)) return 'Cette cible est engagée : le tir est interdit.'
    if (!isWithinShootingRange(attacker, target, getUnitProfile(cardFor(attacker))!)) return 'Hors de portée · modifiez ou retirez cette flèche.'
    if ((arrow.slot ?? 0) >= danzereuShotCount(shootingEngine, attacker, cards)) return 'Ce tir supplémentaire n’a plus de Shaman disponible.'
    return ''
  }
  const invalidShots = own.filter((arrow) => shotProblem(arrow)).length
  const ammoOptions = (arrow: AttackArrow) => {
    const attacker = engine.units.find((unit) => unit.id === arrow.attackerId)
    return attacker && arrow.kind === 'ranged' && hasUnitAbility(getUnitProfile(cardFor(attacker)), 'ammunition') ? engine.units.filter((unit) => ammoEligible(engine, attacker, unit)) : []
  }
  const missingAmmo = own.some((arrow) => {
    const attacker = engine.units.find((unit) => unit.id === arrow.attackerId)
    return attacker && hasUnitAbility(getUnitProfile(cardFor(attacker)), 'ammunition') && !ammoOptions(arrow).some((unit) => unit.id === arrow.sacrificeId)
  })
  const duplicateAmmo = own.some((arrow, index) => arrow.sacrificeId && own.some((other, otherIndex) => otherIndex !== index && other.sacrificeId === arrow.sacrificeId))
  const attackingAmmo = own.some((arrow) => sacrificed.has(arrow.attackerId))
  const missingSlots = [...new Set(own.map((arrow) => arrow.attackerId))].some((id) => {
    const attacker = engine.units.find((unit) => unit.id === id)!
    const count = danzereuShotCount(shootingEngine, attacker, cards)
    return Array.from({ length: count }, (_, slot) => slot).some((slot) => !own.some((arrow) => arrow.attackerId === id && (arrow.slot ?? 0) === slot))
  })
  const pendingTroll = own.some((arrow) => {
    const attacker = engine.units.find((unit) => unit.id === arrow.attackerId)
    const target = engine.units.find((unit) => unit.id === arrow.targetId)
    return arrow.kind === 'melee' && state.trollRolls?.find((roll) => roll.unitId === arrow.attackerId && roll.targetId === arrow.targetId)?.value === 1 && attacker?.seat !== target?.seat
  })
  const concentratedOrder = game.battle!.catalog.some((order) => order.id === 'concentrated-fire' && order.seats.includes(seat))
  const concentratedStock = game.battle!.manual!.stocks.find((stock) => stock.seat === seat && stock.orderId === 'concentrated-fire')?.remaining ?? 0
  const concentratedEligible = own.length >= 2 && own.every((arrow) => arrow.targetId === own[0].targetId && zoneOf(engine.units.find((unit) => unit.id === arrow.attackerId)!.cell) === zoneOf(engine.units.find((unit) => unit.id === own[0].attackerId)!.cell)) && new Set(own.map((arrow) => arrow.attackerId)).size >= 2
  const shootingBlocked = Boolean(invalidShots || missingAmmo || duplicateAmmo || attackingAmmo || missingSlots)
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSourceId(undefined); setHint('') } }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [])
  function changeMode(next: PlanningMode) { setMode(next); setSourceId(undefined); setShotSlot(0); setHint('') }
  function choose(cell: number) {
    if (locked || !automated || mode === 'move') return
    const unit = engine.units.find((unit) => unit.cell === cell && isCombatPresent(unit, state, turn))
    if (!unit) return
    const profile = getUnitProfile(cardFor(unit))!
    if (needsFriendlyTarget && source && unit.seat === seat && unit.id !== source.id && adjacent(source.cell, unit.cell)) {
      run(async () => { await setArrow({ gameId: game.id, kind: 'melee', attackerId: source.id, targetId: unit.id }); setSourceId(undefined); setHint('') })
      return
    }
    if (unit.seat === seat) {
      if (!canAttack(profile, mode) || (mode === 'ranged' && isHeld(unit, state, turn))) { setHint(mode === 'ranged' ? 'Choisissez une de vos unités capable de tirer.' : 'Cette unité ne peut pas attaquer au corps à corps.'); return }
      setSourceId(sourceId === unit.id ? undefined : unit.id)
      const count = danzereuShotCount(shootingEngine, unit, cards)
      setShotSlot(Array.from({ length: count }, (_, slot) => slot).find((slot) => !own.some((arrow) => arrow.attackerId === unit.id && (arrow.slot ?? 0) === slot)) ?? 0)
      setHint(''); return
    }
    if (!source) { setHint('Choisissez d’abord une de vos unités.'); return }
    if (needsFriendlyTarget) { setHint('Trollitude : choisissez une de vos unités adjacentes au Troll.'); return }
    if (mode === 'ranged' && (unit.regiment <= 0 || isEngaged(engine, unit.id))) { setHint('Cette cible est engagée ou conservée pour le combat : le tir est interdit.'); return }
    if (mode === 'ranged' && !isWithinShootingRange(source, unit, getUnitProfile(cardFor(source))!)) { setHint('Cette cible est hors de portée ou dans un autre axe. Choisissez une unité éclairée.'); return }
    const slot = mode === 'ranged' ? shotSlot : undefined
    const previous = own.find((arrow) => arrow.attackerId === source.id && (arrow.slot ?? 0) === (slot ?? 0))
    run(async () => {
      await setArrow({ gameId: game.id, kind: mode, attackerId: source.id, targetId: unit.id, ...(slot !== undefined ? { slot } : {}), ...(previous?.sacrificeId ? { sacrificeId: previous.sacrificeId } : {}) })
      const next = Array.from({ length: shotCount }, (_, value) => value).find((value) => value !== slot && !own.some((arrow) => arrow.attackerId === source.id && (arrow.slot ?? 0) === value))
      if (mode === 'ranged' && next !== undefined) { setShotSlot(next); setHint('Choisissez la cible du tir suivant.') } else { setSourceId(undefined); setHint('') }
    })
  }
  return { mode, changeMode, choose, source, hint, state, arrows, own, seat, cardFor, automated, shootingTargets, rangeLabel, invalidShots, shotProblem, shotCount, shotSlot, setShotSlot, ammoOptions, missingAmmo, duplicateAmmo, attackingAmmo, missingSlots, pendingTroll, needsFriendlyTarget, trollRoll, shootingBlocked, concentratedOrder, concentratedStock, concentratedEligible,
    edit: (arrow: AttackArrow) => { setSourceId(arrow.attackerId); setShotSlot(arrow.slot ?? 0); setHint('Choisissez une nouvelle cible pour cette flèche.') },
    remove: (arrow: AttackArrow) => run(() => setArrow({ gameId: game.id, kind: arrow.kind, attackerId: arrow.attackerId, ...(arrow.slot !== undefined ? { slot: arrow.slot } : {}) })),
    setSacrifice: (arrow: AttackArrow, sacrificeId: string) => run(() => setArrow({ gameId: game.id, kind: arrow.kind, attackerId: arrow.attackerId, targetId: arrow.targetId, slot: arrow.slot, sacrificeId: sacrificeId || undefined })),
    clear: () => { if (mode !== 'move') run(() => clear({ gameId: game.id, kind: mode })) },
    ready: () => run(() => ready({ gameId: game.id, revision: state.revision, ready: !state.ready.includes(seat) })),
    resolve: () => { if (mode !== 'move') run(() => resolve({ gameId: game.id, revision: state.revision, kind: mode })) },
    resolveConcentrated: () => run(() => resolve({ gameId: game.id, revision: state.revision, kind: 'ranged', orderId: 'concentrated-fire' })),
  }
}
