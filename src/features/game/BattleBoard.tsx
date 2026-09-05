import type { Game, GamePlayer } from './types'

export function BattleBoard({ game }: { game: Game }) {
  const me = game.players.find((player) => player.isMe)!
  const opponent = game.players.find((player) => !player.isMe)!
  return (
    <section className="battle-arena" aria-label="Aire de jeu">
      <BattleCamp player={opponent} />
      <div className="battle-field" role="img" aria-label={`Champ de bataille initialisé entre ${opponent.displayName} et ${me.displayName}. Les emplacements sont encore vides.`}>
        <span className="battle-field__label">Zone adverse</span>
        <div className="battle-field__half" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div>
        <div className="battle-field__divide"><span /><img src="/brand/paff-logo.png" alt="" width="1942" height="809" /><span /></div>
        <div className="battle-field__half battle-field__half--you" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div>
        <span className="battle-field__label">Votre zone</span>
      </div>
      <BattleCamp player={me} />
      <p className="battle-notice">Le plateau est prêt. Le placement des cartes et les combats seront disponibles à la prochaine étape.</p>
    </section>
  )
}

function BattleCamp({ player }: { player: GamePlayer }) {
  return (
    <section className={`battle-camp${player.isMe ? ' battle-camp--you' : ''}`} aria-label={`Camp de ${player.displayName}`}>
      <header className="battle-player">
        <div className="game-avatar" aria-hidden="true">{player.displayName.slice(0, 1)}</div>
        <div><span className="eyebrow">{player.isMe ? 'Vous' : 'Adversaire'} · {player.factionName}</span><h2>{player.displayName}</h2><p>{player.deckName}</p></div>
        <div className="battle-pile" aria-label={`Pioche de ${player.displayName} : ${player.drawPileCount} cartes`}><strong>{player.drawPileCount}</strong><span>Pioche</span></div>
      </header>
      <div className="battle-reserve-heading"><h3>Unités à déployer</h3><span>{player.deploymentCount} exemplaire{player.deploymentCount === 1 ? '' : 's'}</span></div>
      {player.deployedCards.length ? <div className="battle-reserve">
        {player.deployedCards.map((card) => <article className={`battle-card unit-card--${card.faction.themeKey}`} key={card.stableId}>
          <div><img src={card.imagePath} alt="" loading="lazy" /><strong>×{card.quantity}</strong></div>
          <h4>{card.name}</h4><p>Vie {card.life ?? '—'} <span>·</span> Attaque {card.attack ?? '—'}</p>
        </article>)}
      </div> : <p className="battle-reserve--empty">Aucune unité préparée. Toutes les cartes sont dans la pioche.</p>}
    </section>
  )
}
