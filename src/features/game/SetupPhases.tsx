import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { canDeployUnit, cells } from '../../../shared/board'
import { getUnitProfile, unitTypeNames } from '../../../shared/unitProfile'
import { UnitProfileStats } from '../catalogue/UnitProfileStats'
import { TacticalBoard } from './TacticalBoard'
import type { Game } from './types'
import './SetupPhases.css'

export function SetupPhases({ game, busy, perform }: { game: Game; busy: boolean; perform: (action: () => Promise<unknown>) => Promise<void> }) {
  const roll = useMutation(api.games.rollInitiative)
  const confirm = useMutation(api.games.confirmInitiative)
  const deploy = useMutation(api.games.deployUnit)
  const finish = useMutation(api.games.finishDeployment)
  const [selection, setSelection] = useState('')
  const [confirmFinish, setConfirmFinish] = useState(false)
  const setup = game.setup!
  const me = game.players.find((player) => player.isMe)!
  const opponent = game.players.find((player) => !player.isMe)!
  const winner = game.players.find((player) => player.seat === setup.initiativeWinner)

  if (game.phase === 'initiative') {
    const mine = setup.initiativeRolls.find((item) => item.round === setup.initiativeRound && item.seat === me.seat)
    const ready = setup.initiativeReady.includes(me.seat)
    return <section className="initiative-panel" aria-label="Jet d’initiative">
      <p className="eyebrow">Le sort des armes · Jet {setup.initiativeRound}</p>
      <h2>À qui le premier mouvement ?</h2>
      <p className="game-intro">Chacun lance un dé à six faces. Le plus haut résultat prend l’initiative et déploie la première unité.</p>
      <div className="initiative-dice">{game.players.map((player) => {
        const result = setup.initiativeRolls.find((item) => item.round === setup.initiativeRound && item.seat === player.seat)?.result
        return <div key={player.id} className={`initiative-player${winner?.id === player.id ? ' initiative-player--winner' : ''}`}>
          <span className="eyebrow">{player.isMe ? 'Votre dé' : 'Dé adverse'}</span>
          <div className="initiative-die" role="img" aria-label={result ? `${player.displayName} : ${result} sur 6` : `${player.displayName} : dé en attente`} key={`${setup.initiativeRound}-${result}`}>{result ? <span aria-hidden="true">{['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][result]}</span> : <span aria-hidden="true">?</span>}</div>
          <h3>{player.displayName}</h3><p>{result ? `${result} sur 6` : 'En attente du jet'}</p>
        </div>
      })}</div>
      <div className="initiative-result" role="status">{winner ? <><strong>{winner.displayName} prend l’initiative.</strong><p>Validez tous les deux pour passer au déploiement.</p></> : setup.initiativeRound > 1 ? <><strong>Égalité au jet précédent : relancez !</strong><p>Les deux joueurs lancent à nouveau leur dé.</p></> : <p>{mine ? `Votre résultat est enregistré. Au tour de ${opponent.displayName} de lancer son dé.` : 'Lancez votre dé quand vous êtes prêt.'}</p>}</div>
      {winner ? <button type="button" className="ui-button ui-button--primary" disabled={busy || ready} onClick={() => void perform(() => confirm({ gameId: game.id }))}>{ready ? 'En attente de l’adversaire…' : 'Passer au déploiement'}</button>
        : <button type="button" className="ui-button ui-button--primary" disabled={busy || Boolean(mine)} onClick={() => void perform(() => roll({ gameId: game.id, round: setup.initiativeRound }))}>{mine ? 'Dé lancé ✓' : 'Lancer mon dé'}</button>}
      {setup.initiativeRound > 1 && <details className="initiative-history"><summary>Jets précédents</summary>{Array.from(new Set(setup.initiativeRolls.filter((item) => item.round < setup.initiativeRound).map((item) => item.round))).map((round) => <p key={round}>Jet {round} · {setup.initiativeRolls.filter((item) => item.round === round).map((item) => `${game.players.find((p) => p.seat === item.seat)?.displayName} : ${item.result}`).join(' / ')} · Égalité</p>)}</details>}
    </section>
  }

  const myTurn = setup.deploymentTurn === me.seat && !me.deploymentReady
  const units = me.cards.filter((card) => card.kind === 'unit')
  const artilleryOnly = units.every((card) => getUnitProfile(card)?.unitType === 'artillery')
  const selected = units.find((card) => card.stableId === selection && card.deploymentQuantity < card.quantity)
  const profile = selected && getUnitProfile(selected)
  const allowed = myTurn && profile ? cells.filter((cell) => canDeployUnit(cell, me.seat, profile, setup, artilleryOnly)) : []
  const first = !setup.units.some((unit) => unit.seat === me.seat)
  const remaining = units.reduce((sum, card) => sum + card.quantity - card.deploymentQuantity, 0)

  return <section aria-label="Déploiement alterné">
    <div className="game-section-heading"><div><p className="eyebrow">{winner?.displayName} a l’initiative</p><h2>Prenez position</h2></div><span className="setup-counter">{me.deploymentCount} sur le plateau · {me.drawPileCount} dans la pioche</span></div>
    <div className={`setup-turn${myTurn ? ' setup-turn--you' : ''}`} role="status"><span className="setup-turn__light" /><div><strong>{me.deploymentReady ? 'Votre déploiement est terminé' : myTurn ? 'À vous de déployer une unité' : `${opponent.displayName} déploie une unité`}</strong><p>{me.deploymentReady ? 'Vous pouvez suivre les placements de votre adversaire.' : myTurn ? first ? artilleryOnly ? 'Votre artillerie commence sur votre arrière.' : 'Votre première unité doit être placée dans votre zone Centre Base.' : 'Choisissez une unité, puis une case éclairée dans votre base ou votre arrière.' : 'Le plateau se met à jour au fil de ses placements.'}</p></div></div>
    <div className="setup-layout"><TacticalBoard game={game} allowedCells={allowed} busy={busy} onPlace={(cell) => {
      if (selected) void perform(() => deploy({ gameId: game.id, cardStableId: selected.stableId, cell, revision: setup.revision }))
    }} />
      <aside className="setup-army" aria-label="Unités disponibles"><div className="setup-army__heading"><p className="eyebrow">{me.deckName}</p><h3>Votre armée</h3><p>{remaining} unité{remaining === 1 ? '' : 's'} disponible{remaining === 1 ? '' : 's'}</p></div>
        {units.length ? <div className="setup-unit-list">{units.map((card) => {
          const unitProfile = getUnitProfile(card)!
          const available = card.quantity - card.deploymentQuantity
          const eligible = cells.some((cell) => canDeployUnit(cell, me.seat, unitProfile, setup, artilleryOnly))
          return <button type="button" key={card.stableId} className={`setup-unit${selected?.stableId === card.stableId ? ' setup-unit--selected' : ''}`} aria-pressed={selected?.stableId === card.stableId} aria-label={`Sélectionner ${card.name}, ${available} disponibles`} disabled={busy || !myTurn || !available || !eligible} onClick={() => setSelection(card.stableId)}>
            <img src={card.imagePath} alt="" /><span><strong>{card.name}</strong><small>{unitTypeNames[unitProfile.unitType]}{first && !artilleryOnly && unitProfile.unitType === 'artillery' ? ' · Après la première unité' : ''}</small></span><b>×{available}</b>
          </button>
        })}</div> : <p className="setup-army__empty">Votre deck ne contient aucune unité.</p>}
        {profile && <div className="setup-selection"><p>{selected!.name} · {allowed.length ? `${allowed.length} cases possibles` : 'En attente de votre tour'}</p><UnitProfileStats profile={profile} compact /></div>}
        {myTurn && !remaining && <p className="setup-army__empty">Toutes vos unités sont sur le plateau. Vous pouvez terminer.</p>}
        <div className="setup-finish"><p>Les cartes non déployées restent dans votre pioche. L’artillerie se place uniquement à l’arrière.</p>
          {confirmFinish && myTurn ? <div className="setup-finish__confirm"><p>Terminer avec {me.deploymentCount} unité{me.deploymentCount === 1 ? '' : 's'} sur le plateau ? Vous ne pourrez plus en placer.</p><button type="button" className="ui-button ui-button--primary" disabled={busy} onClick={() => void perform(async () => { await finish({ gameId: game.id, revision: setup.revision }); setConfirmFinish(false) })}>Confirmer le déploiement</button><button type="button" className="ui-button ui-button--quiet" disabled={busy} onClick={() => setConfirmFinish(false)}>Continuer à placer</button></div>
            : <button type="button" className="ui-button ui-button--primary" disabled={busy || !myTurn} onClick={() => setConfirmFinish(true)}>{me.deploymentReady ? 'Déploiement terminé ✓' : 'Terminer mon déploiement'}</button>}
        </div>
      </aside>
    </div>
    <p className="setup-footnote">Déploiement libre en coût, une unité par case. Les décors viendront plus tard.</p>
  </section>
}
