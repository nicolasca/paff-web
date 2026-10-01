import { cellCoordinate } from '../../../shared/board'
import type { CombatReport as Report } from '../../../shared/combat'
import type { Game } from './types'
import './CombatPlanning.css'

const faces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
function Resolution({ report }: { report: Report }) {
  const hits = report.attacks.reduce((n, attack) => n + attack.hits, 0)
  const destroyed = report.losses.filter((loss) => !loss.after).length
  return <div className="combat-resolution">
    <div className="combat-summary"><div><strong>{hits}</strong><span>touches</span></div><div><strong>{report.losses.reduce((n, loss) => n + loss.before - loss.after, 0)}</strong><span>R perdus</span></div><div><strong>{destroyed}</strong><span>unités détruites</span></div></div>
    {report.diversions.map((split) => <details className="combat-diversion" key={split.attacker.id}><summary>Tir en mêlée · {split.attacker.name} ({cellCoordinate(split.attacker.cell)})</summary><p>1–3 → {split.ally.name} ({cellCoordinate(split.ally.cell)}) · 4–6 → {split.target.name} ({cellCoordinate(split.target.cell)})</p><p>Dés d’orientation : <strong>{split.values.join(' · ') || 'aucun'}</strong></p></details>)}
    <ol className="combat-result-list" tabIndex={0} aria-label="Détail des jets, liste défilante">{report.attacks.map((attack, index) => <li key={index}>
      <div className="combat-result-heading"><span>{String(index + 1).padStart(2, '0')}</span><p><strong>{attack.attacker.name} <small>{cellCoordinate(attack.attacker.cell)}</small></strong><span>→ {attack.target.name} <small>{cellCoordinate(attack.target.cell)}</small>{attack.attacker.seat === attack.target.seat && <em>Allié</em>}</span></p><b>{attack.threshold}+</b></div>
      <div className="combat-result-dice" aria-label={`Dés : ${attack.dice.map((die) => die.rerolled === undefined ? die.value : `${die.value} relancé ${die.rerolled}`).join(', ') || 'aucun'}`}>
        {attack.dice.map((die, i) => <span key={i} className="combat-result-die" data-hit={(die.rerolled ?? die.value) >= attack.threshold} title={die.rerolled === undefined ? `${die.value}` : `Relance : ${die.value} → ${die.rerolled}`} aria-hidden="true">{die.rerolled !== undefined && <small>{die.value}↗</small>}{faces[die.rerolled ?? die.value]}</span>)}
        {!attack.dice.length && <span className="manual-note">Aucun dé à lancer</span>}
        <strong className="combat-hit-total">{attack.hits} touche{attack.hits > 1 ? 's' : ''}<small>{attack.rain ? '−2 dés ce tour' : `−${attack.damage} R`}</small></strong>
      </div>
      <details className="combat-calculation"><summary>Détail du calcul</summary><p>{attack.offense}{report.kind === 'ranged' ? 'T' : 'C'} contre {attack.defense} {report.kind === 'ranged' ? 'DT' : 'DC'} · {attack.dice.length} dé{attack.dice.length > 1 ? 's' : ''}</p>{attack.effects.length ? <ul>{attack.effects.map((effect, i) => <li key={i}>{effect}</li>)}</ul> : <p>Profil de base, sans modificateur.</p>}</details>
    </li>)}</ol>
    {report.losses.length > 0 && <div className="combat-losses"><h4>Après les attaques simultanées</h4>{report.losses.map((loss) => <div key={loss.unit.id} data-destroyed={!loss.after}><span>{loss.unit.name} <small>{cellCoordinate(loss.unit.cell)}</small></span><strong>{loss.before} → {loss.after} R</strong>{!loss.after && <em>Défaussée</em>}</div>)}</div>}
  </div>
}
export function CombatReport({ game }: { game: Game }) {
  const combat = game.battle?.manual?.combat
  const latest = combat?.reports.at(-1)
  if (!latest) return null
  return <section className="manual-panel combat-report" aria-label="Compte rendu des attaques">
    <header><div><p className="eyebrow">Dernière résolution · Tour {latest.turn}</p><h3>{latest.kind === 'melee' ? 'Le choc des armes' : 'La volée de tirs'}</h3></div><span className="combat-report-seal" aria-hidden="true">{latest.kind === 'melee' ? '⚔' : '➶'}</span></header>
    <p className="combat-report-status" role="status">{latest.kind === 'melee' ? 'Combat' : 'Tir'} n°{latest.id} résolu · résultats partagés</p>
    <Resolution key={latest.id} report={latest} />
    {combat!.reports.length > 1 && <details className="combat-history"><summary>Résolutions précédentes ({combat!.reports.length - 1})</summary>{combat!.reports.slice(0, -1).reverse().map((report) => <details key={report.id}><summary>{report.kind === 'melee' ? 'Combat' : 'Tir'} n°{report.id} · Tour {report.turn}</summary><Resolution report={report} /></details>)}</details>}
  </section>
}
