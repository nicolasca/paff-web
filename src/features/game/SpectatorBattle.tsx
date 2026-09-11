import { cellCoordinate } from '../../../shared/board'
import { hitRule, type BattleUnit } from '../../../shared/battleEngine'
import { getUnitProfile } from '../../../shared/unitProfile'
import { TacticalBoard } from './TacticalBoard'
import { OrderInfo } from './OrderInfo'
import type { Game } from './types'
import './ManualBattle.css'

export function SpectatorBattle({ game }: { game: Game }) {
  const battle = game.battle
  if (!battle?.engine) return <p className="game-empty">Le plateau de cette partie n’est pas disponible.</p>
  const { engine, manual } = battle
  const cardFor = (unit: BattleUnit) => game.players.find((player) => player.seat === unit.seat)?.deployedCards.find((card) => card.stableId === unit.cardStableId)
  const unitName = (unit: BattleUnit) => `${cardFor(unit)?.name ?? 'Unité'} · ${cellCoordinate(unit.cell)}`
  const attacker = engine.units.find((unit) => unit.id === manual?.duel?.attackerId)
  const target = engine.units.find((unit) => unit.id === manual?.duel?.targetId)
  const attackCard = attacker && cardFor(attacker)
  const targetCard = target && cardFor(target)
  const attackProfile = attackCard && getUnitProfile(attackCard)
  const targetProfile = targetCard && getUnitProfile(targetCard)
  const ranged = attackProfile?.offense.kind === 'ranged'
  const defense = targetProfile && (ranged ? targetProfile.defenseRanged : targetProfile.defenseMelee)
  const rule = attackProfile && attackProfile.offense.score !== null && defense !== undefined ? hitRule(attackProfile.offense.score, defense) : undefined
  const lastRoll = manual?.dice.at(-1)

  return <section className="manual-battle manual-battle--spectator" aria-label="Bataille en mode spectateur">
    <header className="manual-toolbar">
      <div><p className="eyebrow">Lecture seule</p><h2>Mode spectateur</h2></div>
      <div className="manual-turn"><span>Tour</span><output aria-label="Tour">{battle.turn}</output></div>
      {game.players.map((player) => <div key={player.id} className="manual-strategy"><span>{player.displayName}<small>Points stratégiques</small></span><output aria-label={`Points stratégiques de ${player.displayName}`}>{battle.strategyPoints[player.seat]}</output></div>)}
    </header>
    <div className="manual-main">
      <p className="manual-instructions">Vous suivez la bataille en direct, sans pouvoir intervenir.<span>Survolez une unité ou utilisez Tab pour consulter son profil. Les réserves des joueurs restent privées.</span></p>
      <TacticalBoard game={game} />
      <section className="manual-reserve" aria-label="Réserves des joueurs">
        <header><h3>Réserves</h3><p>Cartes cachées</p></header>
        {game.players.map((player) => <p key={player.id} className="manual-enemy-reserve">{player.displayName} : <strong>{player.drawPileCount} unités</strong> <span aria-hidden="true">▰ ▰ ▰</span></p>)}
      </section>
      <details className="manual-journal"><summary>Journal des déplacements et engagements</summary><ol>{engine.log.slice(-20).reverse().map((item) => <li key={item.id}><small>Tour {item.turn}</small> {item.text}</li>)}</ol></details>
    </div>
    <aside className="manual-sidebar" aria-label="Suivi de la bataille">
      <section className="manual-panel manual-duel" aria-label="Combat suivi">
        <header><h3>Combat suivi</h3></header>
        {attacker ? <>
          <p className="manual-note">Attaquant : <strong>{unitName(attacker)}</strong></p>
          <p className="manual-note">Défenseur : <strong>{target ? unitName(target) : 'En attente du choix des joueurs'}</strong></p>
          {target && attackProfile && <>
            {attackProfile.offense.kind === 'none' ? <p className="manual-note">Cette unité ne possède pas d’attaque.</p> : <div className="manual-hit"><div><span>{ranged ? 'Tir' : 'Corps à corps'}</span><strong>{attackProfile.dice}<small> D6</small></strong></div><div><span>{attackProfile.offense.score ?? '—'}{ranged ? 'T' : 'C'} contre {defense} {ranged ? 'DT' : 'DC'}</span><strong>{rule ? `${rule.threshold}+` : '—'}</strong></div></div>}
            {rule && rule.reroll !== 'none' && <p className="manual-reroll">{rule.reroll === 'fail' ? 'Relance possible des échecs, une fois.' : 'Chaque réussite doit être confirmée par une relance.'}</p>}
            <p className="manual-note">Profil de base. Les joueurs gèrent les bonus, les jets et les pertes de R.</p>
          </>}
        </> : <p className="manual-note">Aucun combat sélectionné par les joueurs.</p>}
      </section>
      <section className="manual-panel manual-dice-panel" aria-label="Jets des joueurs">
        <header><h3>Les dés</h3><span>D6</span></header>
        <div aria-live="polite" aria-atomic="true">{lastRoll ? <div key={lastRoll.id} className="manual-roll"><p>{game.players.find((player) => player.seat === lastRoll.seat)?.displayName} · {lastRoll.values.length} D6 · Tour {lastRoll.turn}</p><div className="manual-dice" aria-label={`Résultats : ${lastRoll.values.join(', ')}`}>{lastRoll.values.map((value, index) => <span key={index} className="manual-die" aria-hidden="true">{['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][value]}</span>)}</div></div> : <p className="manual-note">Les prochains jets apparaîtront ici.</p>}</div>
        {manual && manual.dice.length > 1 && <details className="manual-dice-history"><summary>Jets précédents</summary><ol>{manual.dice.slice(0, -1).reverse().map((item) => <li key={item.id}>{game.players.find((player) => player.seat === item.seat)?.displayName} · T{item.turn} : {item.values.join(' · ')}</li>)}</ol></details>}
      </section>
      {game.players.map((player) => <section key={player.id} className="manual-panel" aria-label={`Ordres de ${player.displayName}`}>
        <header><h3>Ordres de {player.displayName}</h3><span>{player.factionName}</span></header>
        <ul className="manual-orders">{battle.catalog.filter((order) => order.seats.includes(player.seat)).map((order) => {
          const remaining = manual?.stocks.find((item) => item.seat === player.seat && item.orderId === order.id)?.remaining
          return <li key={order.id}><OrderInfo name={order.name} description={order.description} />{remaining === undefined ? <span className="manual-unlimited" aria-label="Illimité">∞</span> : <output aria-label={`${order.name} restants pour ${player.displayName}`}>{remaining}</output>}</li>
        })}</ul>
      </section>)}
    </aside>
  </section>
}
