import { useId, useRef, useState } from 'react'
import { FactionEmblem } from '../catalogue/FactionEmblem'
import type { Game, GamePlayer } from './types'
import '../catalogue/factionTheme.css'
import './FreeDice.css'

const pips = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]]
const factionOf = (player?: GamePlayer) => player?.deployedCards[0]?.faction.stableId ?? player?.cards[0]?.faction.stableId ?? player?.factionName?.toLowerCase() ?? 'neutral'
const dieShapes: Record<string, { edge: string; face: string; engraving: string }> = {
  gobelins: {
    edge: 'M16 10 43 7 51 12 75 8 88 22 86 44 92 53 85 82 61 89 52 86 28 91 10 76 13 52 8 42Z',
    face: 'M23 19 42 16 50 21 72 17 80 27 78 47 83 55 77 75 60 81 52 78 31 82 19 70 22 51 17 40Z',
    engraving: 'M20 12 26 19M78 14 72 22M13 69 22 66M79 75 83 81M30 82 30 88M55 14 52 25 58 21M16 39 24 42 20 48M71 77 67 72 66 81',
  },
  sephosi: {
    edge: 'M25 8H75L92 25V75L75 92H25L8 75V25Z',
    face: 'M28 17H72L83 28V72L72 83H28L17 72V28Z',
    engraving: 'M25 8 28 17M75 8 72 17M92 25 83 28M92 75 83 72M75 92 72 83M25 92 28 83M8 75 17 72M8 25 17 28M35 22H43L50 27 57 22H65M35 78H43L50 73 57 78H65M50 9 54 13 50 17 46 13Z M50 83 54 87 50 91 46 87Z',
  },
  gaeli: {
    edge: 'M50 6C73 6 88 18 92 42C98 69 81 90 57 93C31 97 10 81 7 57C4 31 22 8 50 6Z',
    face: 'M50 16C69 15 80 27 82 45C87 66 73 80 54 83C34 86 19 72 17 54C15 34 29 17 50 16Z',
    engraving: 'M36 12C44 8 59 10 65 16M12 40C8 52 13 67 18 72M83 32C92 47 88 61 84 65M40 87C53 92 69 86 75 79M43 22 50 29 57 22 50 17ZM21 43 28 50 21 57 16 50ZM79 43 72 50 79 57 84 50ZM43 78 50 71 57 78 50 83Z',
  },
}

function DieFace({ value, faction }: { value: number; faction: string }) {
  const id = useId()
  const shape = dieShapes[faction] ?? dieShapes.sephosi!
  return <span className="free-die" data-faction={faction} aria-hidden="true"><svg viewBox="0 0 100 104" focusable="false">
    <defs>
      <linearGradient id={`${id}-edge`} x2=".8" y2="1"><stop className="free-die-edge-light" /><stop offset="1" className="free-die-edge-dark" /></linearGradient>
      <linearGradient id={`${id}-face`} x2=".85" y2="1"><stop className="free-die-face-light" /><stop offset="1" className="free-die-face-dark" /></linearGradient>
    </defs>
    <path className="free-die-depth" d={shape.edge} transform="translate(0 5)" />
    <path className="free-die-edge" d={shape.edge} fill={`url(#${id}-edge)`} />
    <path className="free-die-surface" d={shape.face} fill={`url(#${id}-face)`} />
    <path className="free-die-engraving" d={shape.engraving} />
    {pips[value - 1]?.map((position) => {
      const x = 34 + (position % 3) * 16, y = 34 + Math.floor(position / 3) * 16
      return faction === 'sephosi'
        ? <path key={position} className="free-die-pip" d={`M${x} ${y - 6}l5 6-5 6-5-6Z`} />
        : <circle key={position} className="free-die-pip" cx={x} cy={y} r="5" />
    })}
  </svg></span>
}

export function FreeDice({ game, busy = false, onRoll }: { game: Game; busy?: boolean; onRoll?: () => Promise<void> }) {
  const me = game.players.find((player) => player.isMe)
  const rolls = game.battle?.manual?.dice ?? []
  const last = rolls.at(-1)
  const author = game.players.find((player) => player.seat === last?.seat)
  const editable = !game.isSpectator && Boolean(onRoll)
  const faction = factionOf(editable ? me : author)
  const instructionsId = useId()
  const inFlight = useRef(false)
  const [rolling, setRolling] = useState(false)
  async function roll() {
    if (busy || inFlight.current || !onRoll) return
    inFlight.current = true
    setRolling(true)
    try { await onRoll() } finally { inFlight.current = false; setRolling(false) }
  }
  return <section className="manual-panel free-dice" data-faction={faction} aria-label={editable ? 'Lanceur de dés' : 'Jets des joueurs'}>
    <header><div><FactionEmblem theme={faction} /><h3>Dés libres</h3></div><span>1 clic · 1 D6</span></header>
    {editable && <>
      <button className="free-dice-launch" type="button" disabled={busy || rolling} data-rolling={rolling} aria-label="Lancer un dé" aria-describedby={instructionsId} onClick={() => void roll()}>
        <DieFace value={5} faction={faction} />
        <span className="free-dice-launch-label"><strong>{rolling ? 'Lancer en cours…' : 'Lancer un dé'}</strong><span id={instructionsId}>Cliquez sur le dé.<br />Un résultat de 1 à 6.</span></span>
      </button>
    </>}
    <div className="free-dice-live" aria-live="polite" aria-atomic="true">
      {last ? <div className="free-dice-result" key={last.id} data-faction={factionOf(author)}>
        <div className="free-dice-values" role="img" aria-label={`Résultats : ${last.values.join(', ')}`}>{last.values.map((value, index) => <DieFace key={index} value={value} faction={factionOf(author)} />)}</div>
        <div><span>{author?.displayName} · tour {last.turn}</span><strong>{last.values.length === 1 ? <>Résultat <b>{last.values[0]}</b></> : `${last.values.length} dés lancés`}</strong><small>Visible de tous</small></div>
      </div> : <p className="free-dice-empty">{editable ? 'À vous de lancer.' : 'En attente du premier jet.'}<span>Le résultat apparaîtra ici pour tous les joueurs.</span></p>}
    </div>
    {rolls.length > 1 && <details className="free-dice-history"><summary>Jets précédents <span>{rolls.length - 1}</span></summary><ol>{rolls.slice(0, -1).reverse().map((item) => {
      const player = game.players.find((player) => player.seat === item.seat)
      return <li key={item.id} data-faction={factionOf(player)}><span>{player?.displayName}<small>Tour {item.turn}</small></span><strong>{item.values.join(' · ')}</strong></li>
    })}</ol></details>}
  </section>
}
