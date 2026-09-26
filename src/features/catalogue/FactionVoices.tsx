import { useEffect, useRef, useState } from 'react'
import './FactionVoices.css'

const audioFactions = new Set(['gobelins', 'sephosi', 'gaeli'])
const versions = [
  { id: 'serious', label: 'Écouter', suffix: '' },
  { id: 'fun', label: 'Une autre voix', suffix: '-fun' },
] as const

type VoiceVersion = typeof versions[number]['id']

export function FactionVoices({ faction }: { faction: { name: string; themeKey: string } }) {
  if (!audioFactions.has(faction.themeKey)) return null
  return <FactionVoicePlayer key={faction.themeKey} faction={faction} />
}

function FactionVoicePlayer({ faction }: { faction: { name: string; themeKey: string } }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const requestRef = useRef(0)
  const [activeVersion, setActiveVersion] = useState<VoiceVersion | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing'>('idle')
  const [error, setError] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    return () => {
      requestRef.current += 1
      if (!audio?.getAttribute('src')) return
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  }, [])

  function stop() {
    requestRef.current += 1
    audioRef.current?.pause()
    setActiveVersion(null)
    setStatus('idle')
  }

  async function play(version: typeof versions[number]) {
    const audio = audioRef.current
    if (!audio) return
    if (activeVersion === version.id) {
      stop()
      return
    }

    const request = ++requestRef.current
    audio.pause()
    audio.src = `/audio/factions/${faction.themeKey}${version.suffix}.mp3`
    setActiveVersion(version.id)
    setStatus('loading')
    setError(false)

    try {
      await audio.play()
      if (request === requestRef.current) setStatus('playing')
    } catch {
      if (request !== requestRef.current) return
      setActiveVersion(null)
      setStatus('idle')
      setError(true)
    }
  }

  return <section className="faction-voices" aria-label={`Voix de ${faction.name}`}>
    <p className="faction-voices__title">
      <span>Voix<span className="visually-hidden"> de {faction.name}</span></span>
      <span aria-hidden="true">·</span>
      <a href="https://elevenlabs.io" target="_blank" rel="noreferrer">elevenlabs.io</a>
    </p>
    <div className="faction-voices__choices">
      {versions.map((version) => {
        const active = activeVersion === version.id
        return <button
          key={version.id}
          type="button"
          className={`faction-voices__button faction-voices__button--${version.id}`}
          aria-pressed={active}
          aria-busy={active && status === 'loading'}
          aria-label={`${active ? 'Arrêter' : 'Écouter'} ${version.id === 'fun' ? 'la deuxième' : 'la première'} voix de ${faction.name}`}
          title={`${active ? 'Arrêter' : version.label} · ${faction.name} — elevenlabs.io`}
          onClick={() => void play(version)}
        >
          <span aria-hidden="true">
            {active ? <svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><rect x="7" y="7" width="10" height="10" rx="1" /></svg> : <VoiceIcon fun={version.id === 'fun'} />}
          </span>
        </button>
      })}
    </div>
    <audio ref={audioRef} preload="none" onEnded={stop} onError={() => { stop(); setError(true) }} />
    {error && <p className="faction-voices__error" role="status">Lecture impossible. Réessaie dans un instant.</p>}
  </section>
}

function VoiceIcon({ fun }: { fun: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" focusable="false">
    {fun ? <>
      <path d="m10 4-4 5H3v6h3l7 5-3-16Z" />
      <path d="m15 8 2 2-2 4 2 2m1-12 3 4-2 4 2 4-2 4" />
    </> : <>
      <path d="m11 5-5 4H3v6h3l5 4V5Z" />
      <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
    </>}
  </svg>
}
