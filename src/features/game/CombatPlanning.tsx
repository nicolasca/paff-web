import { underInvocation } from '../../../shared/greatInvocation'
import { getUnitProfile } from '../../../shared/unitProfile'
import { cellCoordinate } from '../../../shared/board'
import { hasUnitAbility } from '../../../shared/unitAbilities'
import type { Game } from './types'
import type { useCombatPlanning, PlanningMode } from './useCombatPlanning'
import './CombatPlanning.css'

type Planner = ReturnType<typeof useCombatPlanning>

export function CombatToolbar({ game, plan, locked, onMode }: { game: Game; plan: Planner; locked: boolean; onMode: (mode: PlanningMode) => void }) {
  const { mode, state, seat } = plan
  const allReady = [0, 1].every((seat) => state.ready.includes(seat))
  const blocked = locked || !plan.automated
  const shootingHint = plan.invalidShots ? 'Une cible ou un tir est devenu indisponible : corrigez sa flèche.' : plan.missingAmmo ? 'Choisissez les munitions de chaque Katapult dans la liste des tirs.' : plan.duplicateAmmo ? 'Une unité ne peut pas servir de munition à deux tirs.' : plan.attackingAmmo ? 'Une unité sacrifiée comme munition ne peut pas tirer dans cette salve.' : plan.missingSlots ? 'Choisissez la cible de chaque tir du Danzereu avant de lancer.' : 'Annoncez l’ordre et les zones à voix haute.'
  return <section className="combat-toolbar" aria-label="Préparer les attaques" data-mode={mode}>
    <div className="combat-toolbar-top"><div className="combat-modes" aria-label="Mode du plateau">{([['move', '↔', 'Déplacer'], ['ranged', '➶', 'Tir'], ['melee', '⚔', 'Corps à corps']] as const).map(([value, icon, label]) => <button key={value} type="button" disabled={!plan.automated && value !== 'move'} aria-pressed={mode === value} onClick={() => onMode(value)}><span aria-hidden="true">{icon}</span>{label}</button>)}</div><span className="combat-version">{plan.automated ? 'Règles AUTO' : 'Anciennes règles'}</span></div>
    {!plan.automated && <p className="combat-legacy-notice" role="status">Cette partie conserve ses anciennes règles. Les outils manuels et les anciens rapports restent disponibles ; les nouvelles résolutions automatiques sont réservées aux nouvelles parties.</p>}
    {mode === 'move' ? <p className="combat-guide">{plan.automated ? <>Déplacez vos unités, puis choisissez <strong>Tir</strong> ou <strong>Corps à corps</strong> pour préparer vos attaques.</> : 'Les déplacements, engagements, compteurs et dés libres restent disponibles.'}</p> : <>
      <div className="combat-guide" role="status"><span className="combat-step">{plan.source ? '2' : '1'}</span><p>{plan.hint || (plan.source ? <><strong>{plan.cardFor(plan.source).name}</strong> · {plan.needsFriendlyTarget ? 'choisissez un allié adjacent au Troll.' : mode === 'ranged' ? plan.shootingTargets.length ? 'choisissez une cible éclairée.' : 'aucune cible à portée, libre d’engagement.' : 'choisissez sa cible ennemie.'}</> : <>Cliquez sur <strong>votre unité</strong>, puis sur <strong>sa cible</strong>.</>)}{plan.rangeLabel && <span className="combat-range-guide">{plan.rangeLabel} <small>{plan.shootingTargets.length} cible{plan.shootingTargets.length > 1 ? 's' : ''} à portée</small></span>}<small>Clic droit ou touche C également disponibles · Échap pour annuler</small></p><span className="combat-arrow-count">{plan.own.length}<small>vos flèches</small></span></div>
      {plan.source && mode === 'ranged' && plan.shotCount > 1 && <div className="combat-shot-slots" role="group" aria-label="Tirs du Danzereu"><span>Choisissez chaque cible · {plan.shotCount} tirs simultanés</span><div>{Array.from({ length: plan.shotCount }, (_, slot) => <button type="button" key={slot} disabled={blocked} aria-pressed={plan.shotSlot === slot} onClick={() => plan.setShotSlot(slot)}>{slot === 0 ? 'Tir normal' : `Tir Shaman ${slot}`}<small>{plan.own.some((arrow) => arrow.attackerId === plan.source!.id && (arrow.slot ?? 0) === slot) ? 'Cible choisie' : 'À choisir'}</small></button>)}</div><p>Chaque tir conserve les dés du profil. Un dé de risque sera lancé pour chaque Shaman utilisé après la salve.</p></div>}
      {plan.source && mode === 'melee' && plan.trollRoll && <p className="combat-troll-note" role="status">Trollitude · dé {plan.trollRoll.value} : {plan.trollRoll.value === 1 ? 'attaquez un allié adjacent de votre choix.' : plan.trollRoll.value <= 3 ? 'le Troll n’attaque pas tant que cet engagement dure.' : 'le Troll attaque normalement.'}</p>}
      <div className="combat-launch">
        {mode === 'melee' ? <><div className="combat-readiness" aria-label="Validation des joueurs">{game.players.map((player) => <span key={player.seat} data-ready={state.ready.includes(player.seat)}><i aria-hidden="true">{state.ready.includes(player.seat) ? '✓' : '○'}</i>{player.displayName}<small>{state.ready.includes(player.seat) ? 'Prêt' : 'Prépare ses attaques'}</small></span>)}</div>{plan.pendingTroll && <p className="combat-range-error">Trollitude : choisissez l’allié adjacent à attaquer dans la liste des attaques.</p>}<button type="button" className="ui-button" disabled={blocked || !plan.arrows.length || plan.pendingTroll} onClick={plan.ready}>{state.ready.includes(seat) ? 'Modifier mes choix' : 'Je suis prêt'}</button><button type="button" className="ui-button combat-resolve" disabled={blocked || !allReady || !plan.arrows.length || plan.pendingTroll} onClick={plan.resolve}>⚔ COMBAT <small>{plan.arrows.length} attaque{plan.arrows.length > 1 ? 's' : ''}</small></button></> : <><p>Tous vos tirs seront résolus ensemble.<small>{shootingHint}</small></p><button type="button" className="ui-button combat-resolve" disabled={blocked || !plan.own.length || plan.shootingBlocked} onClick={plan.resolve}>➶ TIR <small>{plan.own.length} attaque{plan.own.length > 1 ? 's' : ''}</small></button>{plan.concentratedOrder && <div className="combat-concentrated"><button type="button" className="ui-button combat-resolve" disabled={blocked || plan.shootingBlocked || !plan.concentratedEligible || plan.concentratedStock < 1} onClick={plan.resolveConcentrated}>➶ TIR CONCENTRÉ <small>+1 dé par tireur · {plan.concentratedStock} restant{plan.concentratedStock > 1 ? 's' : ''}</small></button><small>{plan.concentratedStock < 1 ? 'Ordre épuisé.' : 'Au moins deux tireurs d’une même zone, vers une cible commune.'}</small></div>}</>}
      </div>
    </>}
  </section>
}

export function CombatPlan({ game, plan, locked }: { game: Game; plan: Planner; locked: boolean }) {
  const units = game.battle!.engine!.units
  return <section className="manual-panel combat-plan" aria-label="Flèches préparées">
    <header><h3>{plan.mode === 'ranged' ? 'Les tirs préparés' : 'Les attaques préparées'}</h3><span>{plan.arrows.length}</span></header>
    {!plan.arrows.length && <div className="combat-empty"><span aria-hidden="true">{plan.mode === 'ranged' ? '➶' : '⚔'}</span><p>À vous de choisir les cibles.<small>Vos flèches apparaîtront ici et sur le plateau.</small></p></div>}
    <ol className="combat-arrow-list">{plan.arrows.map((arrow) => {
      const attacker = units.find((unit) => unit.id === arrow.attackerId)
      const target = units.find((unit) => unit.id === arrow.targetId)
      if (!attacker || !target) return null
      const editable = attacker.seat === plan.seat && plan.automated
      const ammunition = arrow.kind === 'ranged' && hasUnitAbility(getUnitProfile(plan.cardFor(attacker)), 'ammunition')
      const ammo = ammunition ? plan.ammoOptions(arrow) : []
      const troll = arrow.kind === 'melee' && plan.state.trollRolls?.find((roll) => roll.unitId === attacker.id && roll.targetId === arrow.targetId)
      return <li key={`${arrow.kind}:${arrow.attackerId}:${arrow.slot ?? 0}`} data-seat={attacker.seat} data-kind={arrow.kind}>
        <div className="combat-arrow-row"><img src={plan.cardFor(attacker).imagePath} alt="" /><div><strong>{plan.cardFor(attacker).name} <small>{cellCoordinate(attacker.cell)}{arrow.slot !== undefined && ` · Tir ${arrow.slot + 1}`}</small></strong><span>→ {plan.cardFor(target).name} <small>{cellCoordinate(target.cell)}{target.seat === attacker.seat && ' · Allié'}</small></span></div>{editable && <><button type="button" className="manual-icon-button" disabled={locked} onClick={() => plan.edit(arrow)} aria-label={`Changer la cible de ${plan.cardFor(attacker).name} ${cellCoordinate(attacker.cell)}${arrow.kind === 'ranged' ? ` tir ${(arrow.slot ?? 0) + 1}` : ''}`}>↗</button><button type="button" className="manual-icon-button" disabled={locked} onClick={() => plan.remove(arrow)} aria-label={`Retirer la flèche de ${plan.cardFor(attacker).name} ${cellCoordinate(attacker.cell)}${arrow.slot !== undefined ? ` tir ${arrow.slot + 1}` : ''}`}>×</button></>}</div>
        {plan.shotProblem(arrow) && <p className="combat-range-error">{plan.shotProblem(arrow)}</p>}
        {underInvocation(attacker, game.battle!.manual?.combat?.invocations, game.battle!.turn) && <p className="combat-invocation-note">✦ La gross Invokation ! · {getUnitProfile(plan.cardFor(attacker))!.dice} → {getUnitProfile(plan.cardFor(attacker))!.dice * 2} dés de profil</p>}
        {ammunition && <label className="combat-exposed">Des munitions !{editable ? <select aria-label={`Munition pour ${plan.cardFor(attacker).name} ${cellCoordinate(attacker.cell)}`} disabled={locked} value={ammo.some((unit) => unit.id === arrow.sacrificeId) ? arrow.sacrificeId : ''} onChange={(event) => plan.setSacrifice(arrow, event.target.value)}><option value="">Choisir l’unité à sacrifier…</option>{ammo.map((unit) => <option key={unit.id} value={unit.id}>{plan.cardFor(unit).name} · {cellCoordinate(unit.cell)}</option>)}</select> : <strong>{ammo.find((unit) => unit.id === arrow.sacrificeId) ? plan.cardFor(ammo.find((unit) => unit.id === arrow.sacrificeId)!).name : 'Choix en attente'}</strong>}<small>Cette unité sera défaussée avant le tir.{!ammo.length && ' Aucune munition admissible adjacente.'}</small></label>}
        {troll && <p className="combat-troll-note">Trollitude · {troll.value} : {troll.value === 1 ? target.seat === attacker.seat ? 'attaque de cet allié adjacent.' : 'choisissez un allié adjacent avec le bouton « Changer la cible ».' : troll.value <= 3 ? 'aucune attaque pour cet engagement.' : 'attaque normale.'}</p>}
      </li>
    })}</ol>
    {plan.own.length > 0 && <button type="button" className="manual-text-button" disabled={locked || !plan.automated} onClick={plan.clear}>Effacer mes flèches {plan.mode === 'ranged' ? 'de tir' : 'de combat'}</button>}
    <p className="manual-note">{plan.mode === 'melee' ? 'Une cible par unité. Les survivants gardent leur cible au prochain combat.' : 'Une cible par tir. Le Danzereu peut préparer plusieurs flèches ; chaque cible reste votre choix.'}</p>
  </section>
}
