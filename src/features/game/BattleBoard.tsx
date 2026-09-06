import { LiveBattle } from './LiveBattle'
import type { Game, GamePlayer } from './types'
import { getUnitProfile, unitTypeNames } from '../../../shared/unitProfile'
import { UnitProfileStats } from '../catalogue/UnitProfileStats'
import { SpecialAbility } from '../catalogue/SpecialAbility'
import { TacticalBoard } from './TacticalBoard'
import { BattleFlow, type BattleControls } from './BattleFlow'

export function BattleBoard({ game, busy, perform }: { game: Game } & BattleControls) {
  if (game.battle?.engine) return <LiveBattle game={game} busy={busy} perform={perform} />
  const me = game.players.find((player) => player.isMe)!
  const opponent = game.players.find((player) => !player.isMe)!
  return (
    <section className="battle-arena" aria-label="Aire de jeu">
      {game.battle ? <BattleFlow game={game} busy={busy} perform={perform} /> : game.setup && <div className="battle-round"><span className="eyebrow">Tour 1 · Plateau initialisé</span><p>Initiative : <strong>{game.players.find((player) => player.seat === game.setup?.initiativeWinner)?.displayName}</strong></p></div>}
      <BattleCamp player={opponent} positioned={Boolean(game.setup)} />
      {game.setup ? <TacticalBoard game={game} /> : <div className="battle-field" role="img" aria-label={`Champ de bataille initialisé entre ${opponent.displayName} et ${me.displayName}. Les emplacements sont encore vides.`}>
        <span className="battle-field__label">Zone adverse</span>
        <div className="battle-field__half" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div>
        <div className="battle-field__divide"><span /><img src="/brand/paff-logo.png" alt="" width="1942" height="809" /><span /></div>
        <div className="battle-field__half battle-field__half--you" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div>
        <span className="battle-field__label">Votre zone</span>
      </div>}
      <BattleCamp player={me} positioned={Boolean(game.setup)} />
      <p className="battle-notice">{game.battle ? 'Cliquez sur une unité pour consulter son profil. Les unités restent à leur emplacement de déploiement pendant cette démo.' : 'Cette partie utilise une ancienne version. Créez une nouvelle table pour découvrir le catalogue et les tours de la démo 2026.'}</p>
    </section>
  )
}

function BattleCamp({ player, positioned = false }: { player: GamePlayer; positioned?: boolean }) {
  return (
    <section className={`battle-camp${player.isMe ? ' battle-camp--you' : ''}`} aria-label={`Camp de ${player.displayName}`}>
      <header className="battle-player">
        <div className="game-avatar" aria-hidden="true">{player.displayName.slice(0, 1)}</div>
        <div><span className="eyebrow">{player.isMe ? 'Vous' : 'Adversaire'} · {player.factionName}</span><h2>{player.displayName}</h2><p>{player.deckName}</p></div>
        <div className="battle-pile" aria-label={`Pioche de ${player.displayName} : ${player.drawPileCount} cartes`}><strong>{player.drawPileCount}</strong><span>Pioche</span></div>
      </header>
      <div className="battle-reserve-heading"><h3>{positioned ? 'Unités sur le plateau' : 'Unités à déployer'}</h3><span>{player.deploymentCount} exemplaire{player.deploymentCount === 1 ? '' : 's'}</span></div>
      {!positioned && (player.deployedCards.length ? <div className="battle-reserve">
        {player.deployedCards.map((card) => {
          const profile = getUnitProfile(card)
          return <article className={`battle-card unit-card--${card.faction.themeKey}`} key={card.stableId}>
          <div><img src={card.imagePath} alt="" loading="lazy" /><strong>×{card.quantity}</strong></div>
          <h4>{card.name}</h4>
          {profile && <><p>{unitTypeNames[profile.unitType]}</p><UnitProfileStats profile={profile} compact />{profile.ability && <div className="battle-card__ability"><SpecialAbility ability={profile.ability} /></div>}</>}
        </article>})}
      </div> : <p className="battle-reserve--empty">Aucune unité préparée. Toutes les cartes sont dans la pioche.</p>)}
    </section>
  )
}
