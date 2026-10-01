import { underInvocation } from '../../../shared/greatInvocation'
import { getUnitProfile } from '../../../shared/unitProfile'
import { cellCoordinate } from '../../../shared/board'
import type { Game } from './types'
import type { useCombatPlanning, PlanningMode } from './useCombatPlanning'
import './CombatPlanning.css'

type Planner = ReturnType<typeof useCombatPlanning>

export function CombatToolbar({ game, plan, locked, onMode }: { game: Game; plan: Planner; locked: boolean; onMode: (mode: PlanningMode) => void }) {
  const { mode, state, seat } = plan
  const allReady = [0, 1].every((seat) => state.ready.includes(seat))
  return <section className="combat-toolbar" aria-label="Préparer les attaques" data-mode={mode}>
    <div className="combat-toolbar-top"><div className="combat-modes" aria-label="Mode du plateau">{([['move', '↔', 'Déplacer'], ['ranged', '➶', 'Tir'], ['melee', '⚔', 'Corps à corps']] as const).map(([value, icon, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => onMode(value)}><span aria-hidden="true">{icon}</span>{label}</button>)}</div><span className="combat-version" title="Capacités prises en compte. La gross Invokation ! disponible. Sans les autres ordres spéciaux, charge, Ligne Verte, Trollitude, Druides ni Grand Gardien.">Essais · V1</span></div>
    {mode === 'move' ? <p className="combat-guide">Déplacez vos unités, puis choisissez <strong>Tir</strong> ou <strong>Corps à corps</strong> pour préparer vos attaques.</p> : <>
      <div className="combat-guide" role="status"><span className="combat-step">{plan.source ? '2' : '1'}</span><p>{plan.hint || (plan.source ? <><strong>{plan.cardFor(plan.source).name}</strong> · {mode === 'ranged' ? plan.shootingTargets.length ? 'choisissez une cible éclairée.' : 'aucune cible à portée.' : 'choisissez sa cible ennemie.'}</> : <>Cliquez sur <strong>votre unité</strong>, puis sur <strong>sa cible</strong>.</>)}{plan.rangeLabel && <span className="combat-range-guide">{plan.rangeLabel} <small>{plan.shootingTargets.length} cible{plan.shootingTargets.length > 1 ? 's' : ''} à portée</small></span>}<small>Clic droit ou touche C également disponibles · Échap pour annuler</small></p><span className="combat-arrow-count">{plan.own.length}<small>vos flèches</small></span></div>
      <div className="combat-launch">
        {mode === 'melee' ? <><div className="combat-readiness" aria-label="Validation des joueurs">{game.players.map((player) => <span key={player.seat} data-ready={state.ready.includes(player.seat)}><i aria-hidden="true">{state.ready.includes(player.seat) ? '✓' : '○'}</i>{player.displayName}<small>{state.ready.includes(player.seat) ? 'Prêt' : 'Prépare ses attaques'}</small></span>)}</div><button type="button" className="ui-button" disabled={locked || !plan.arrows.length} onClick={plan.ready}>{state.ready.includes(seat) ? 'Modifier mes choix' : 'Je suis prêt'}</button><button type="button" className="ui-button combat-resolve" disabled={locked || !allReady || !plan.arrows.length} onClick={plan.resolve}>⚔ COMBAT <small>{plan.arrows.length} attaque{plan.arrows.length > 1 ? 's' : ''}</small></button></> : <><p>Tous vos tirs seront résolus ensemble.<small>{plan.invalidShots ? 'Une cible a quitté la portée : modifiez ou retirez sa flèche.' : plan.missingAlly ? 'Choisissez les alliés exposés dans la liste des tirs.' : 'Annoncez l’ordre et les zones à voix haute.'}</small></p><button type="button" className="ui-button combat-resolve" disabled={locked || !plan.own.length || plan.missingAlly || Boolean(plan.invalidShots)} onClick={plan.resolve}>➶ TIR <small>{plan.own.length} attaque{plan.own.length > 1 ? 's' : ''}</small></button></>}
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
      const attacker = units.find((unit) => unit.id === arrow.attackerId)!
      const target = units.find((unit) => unit.id === arrow.targetId)!
      const editable = attacker.seat === plan.seat
      const allies = plan.allyOptions(arrow)
      return <li key={arrow.attackerId} data-seat={attacker.seat} data-kind={arrow.kind}>
        <div className="combat-arrow-row"><img src={plan.cardFor(attacker).imagePath} alt="" /><div><strong>{plan.cardFor(attacker).name} <small>{cellCoordinate(attacker.cell)}</small></strong><span>→ {plan.cardFor(target).name} <small>{cellCoordinate(target.cell)}</small></span></div>{editable && <button type="button" className="manual-icon-button" disabled={locked} onClick={() => plan.remove(arrow)} aria-label={`Retirer la flèche de ${plan.cardFor(attacker).name} ${cellCoordinate(attacker.cell)}`}>×</button>}</div>
        {plan.outOfRange(arrow) && <p className="combat-range-error">Hors de portée · cette flèche doit être modifiée.</p>}
        {underInvocation(attacker, game.battle!.manual?.combat?.invocations, game.battle!.turn) && <p className="combat-invocation-note">✦ La gross Invokation ! · {getUnitProfile(plan.cardFor(attacker))!.dice} → {getUnitProfile(plan.cardFor(attacker))!.dice * 2} dés de profil</p>}
        {allies.length > 0 && <label className="combat-exposed">Allié exposé au tir{editable && allies.length > 1 ? <select aria-label={`Allié exposé pour ${plan.cardFor(attacker).name} ${cellCoordinate(attacker.cell)}`} disabled={locked} value={allies.some((unit) => unit.id === arrow.allyId) ? arrow.allyId : ''} onChange={(event) => plan.setAlly(arrow, event.target.value)}><option value="">Choisir un allié…</option>{allies.map((unit) => <option key={unit.id} value={unit.id}>{plan.cardFor(unit).name} · {cellCoordinate(unit.cell)}</option>)}</select> : <strong>{allies.find((unit) => unit.id === arrow.allyId) || allies.length === 1 ? plan.cardFor(allies.find((unit) => unit.id === arrow.allyId) ?? allies[0]).name : 'Choix en attente'}</strong>}</label>}
      </li>
    })}</ol>
    {plan.own.length > 0 && <button type="button" className="manual-text-button" disabled={locked} onClick={plan.clear}>Effacer mes flèches {plan.mode === 'ranged' ? 'de tir' : 'de combat'}</button>}
    <p className="manual-note">{plan.mode === 'melee' ? 'Une cible par unité. Les survivants gardent leur cible au prochain combat.' : 'Une cible par tireur. Plusieurs tireurs peuvent viser la même unité.'}</p>
  </section>
}
