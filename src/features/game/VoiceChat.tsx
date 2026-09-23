import { useAction } from 'convex/react'
import type { Room } from 'livekit-client'
import { ConvexError } from 'convex/values'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { gameError } from './gameError'
import './VoiceChat.css'

type VoiceStatus = 'idle' | 'joining' | 'connected' | 'reconnecting'

export function VoiceChat({ gameId }: { gameId: Id<'games'> }) {
  const requestAccess = useAction(api.voice.join)
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [names, setNames] = useState<string[]>([])
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false)
  const [microphoneBusy, setMicrophoneBusy] = useState(false)
  const [soundMuted, setSoundMuted] = useState(false)
  const [soundBlocked, setSoundBlocked] = useState(false)
  const [error, setError] = useState('')
  const roomRef = useRef<Room | null>(null)
  const audioRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef(0)
  const mountedRef = useRef(false)
  const soundMutedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    const audioContainer = audioRef.current
    return () => {
      mountedRef.current = false
      requestRef.current += 1
      const room = roomRef.current
      roomRef.current = null
      void room?.disconnect()
      audioContainer?.replaceChildren()
    }
  }, [])

  function updateParticipants(room: Room) {
    setNames(['Vous', ...Array.from(room.remoteParticipants.values(), (participant) => participant.name || 'Membre')])
  }

  function close() {
    requestRef.current += 1
    const room = roomRef.current
    roomRef.current = null
    void room?.disconnect()
    audioRef.current?.replaceChildren()
    setStatus('idle')
    setNames([])
    setMicrophoneEnabled(false)
    setMicrophoneBusy(false)
    setSoundBlocked(false)
    setError('')
  }

  async function join() {
    if (status !== 'idle') return
    const request = ++requestRef.current
    setStatus('joining')
    setError('')
    let room: Room | null = null
    try {
      const { serverUrl, token } = await requestAccess({ gameId })
      if (!mountedRef.current || request !== requestRef.current) return
      const { Room, RoomEvent, Track } = await import('livekit-client')
      if (!mountedRef.current || request !== requestRef.current) return
      room = new Room({ adaptiveStream: false, dynacast: false })
      const connectedRoom = room
      roomRef.current = connectedRoom
      connectedRoom.on(RoomEvent.TrackSubscribed, (track) => {
        if (roomRef.current !== connectedRoom || track.kind !== Track.Kind.Audio) return
        const element = track.attach()
        element.autoplay = true
        element.muted = soundMutedRef.current
        audioRef.current?.append(element)
      })
      connectedRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove())
      })
      connectedRoom.on(RoomEvent.ParticipantConnected, () => { if (roomRef.current === connectedRoom) updateParticipants(connectedRoom) })
      connectedRoom.on(RoomEvent.ParticipantDisconnected, () => { if (roomRef.current === connectedRoom) updateParticipants(connectedRoom) })
      connectedRoom.on(RoomEvent.AudioPlaybackStatusChanged, () => { if (roomRef.current === connectedRoom) setSoundBlocked(!connectedRoom.canPlaybackAudio) })
      connectedRoom.on(RoomEvent.Reconnecting, () => { if (roomRef.current === connectedRoom) setStatus('reconnecting') })
      connectedRoom.on(RoomEvent.Reconnected, () => {
        if (roomRef.current !== connectedRoom) return
        setStatus('connected')
        updateParticipants(connectedRoom)
      })
      connectedRoom.on(RoomEvent.Disconnected, () => {
        if (roomRef.current !== connectedRoom || !mountedRef.current) return
        roomRef.current = null
        audioRef.current?.replaceChildren()
        setStatus('idle')
        setNames([])
        setMicrophoneEnabled(false)
        setError('La connexion audio a été interrompue. Rejoignez le salon pour réessayer.')
      })
      await connectedRoom.connect(serverUrl, token)
      if (!mountedRef.current || request !== requestRef.current) {
        await connectedRoom.disconnect()
        return
      }
      updateParticipants(connectedRoom)
      setSoundBlocked(!connectedRoom.canPlaybackAudio)
      setStatus('connected')
    } catch (cause) {
      if (!mountedRef.current || request !== requestRef.current) return
      if (roomRef.current === room) roomRef.current = null
      void room?.disconnect()
      audioRef.current?.replaceChildren()
      setStatus('idle')
      setError(cause instanceof ConvexError ? gameError(cause) : 'Impossible de rejoindre le salon vocal. Vérifiez votre connexion et réessayez.')
    }
  }

  async function toggleMicrophone() {
    const room = roomRef.current
    if (!room || microphoneBusy || status !== 'connected') return
    setMicrophoneBusy(true)
    setError('')
    try {
      await room.localParticipant.setMicrophoneEnabled(!microphoneEnabled)
      if (roomRef.current === room) setMicrophoneEnabled(!microphoneEnabled)
    } catch {
      setError('Le micro n’a pas pu être activé. Vérifiez son autorisation dans le navigateur.')
    } finally {
      if (roomRef.current === room) setMicrophoneBusy(false)
    }
  }

  function toggleSound() {
    const muted = !soundMutedRef.current
    soundMutedRef.current = muted
    setSoundMuted(muted)
    audioRef.current?.querySelectorAll('audio').forEach((element) => { element.muted = muted })
    if (!muted) void roomRef.current?.startAudio().then(() => setSoundBlocked(false)).catch(() => setSoundBlocked(true))
  }

  function resumeSound() {
    void roomRef.current?.startAudio().then(() => setSoundBlocked(false)).catch(() => setSoundBlocked(true))
  }

  return <section className="voice-chat" aria-label="Salon vocal de la partie">
    <div className="voice-chat__intro">
      <div><p className="eyebrow">En direct</p><h2>Salon vocal</h2></div>
      <p role="status">{status === 'idle' ? 'Échangez avec les joueurs et les spectateurs.' : status === 'joining' ? 'Connexion audio…' : status === 'reconnecting' ? 'Reconnexion audio…' : `${names.length} personne${names.length > 1 ? 's' : ''} dans le salon`}</p>
    </div>
    <div className="voice-chat__controls">
      {status === 'idle' ? <button type="button" className="ui-button ui-button--primary" onClick={() => void join()}>Rejoindre l’audio</button> : <>
        {status === 'joining' ? <button type="button" className="ui-button ui-button--quiet" onClick={close}>Annuler</button> : <>
          <button type="button" className="ui-button" aria-pressed={microphoneEnabled} disabled={microphoneBusy || status !== 'connected'} onClick={() => void toggleMicrophone()}>{microphoneEnabled ? 'Couper mon micro' : 'Activer mon micro'}</button>
          <button type="button" className="ui-button ui-button--quiet" aria-pressed={soundMuted} onClick={toggleSound}>{soundMuted ? 'Rétablir le son' : 'Couper le son'}</button>
          <button type="button" className="ui-button ui-button--quiet" onClick={close}>Quitter l’audio</button>
        </>}
      </>}
    </div>
    {status !== 'idle' && status !== 'joining' && <p className="voice-chat__people">{names.join(' · ')}</p>}
    {soundBlocked && !soundMuted && <button type="button" className="ui-button voice-chat__resume" onClick={resumeSound}>Activer l’écoute</button>}
    {error && <p className="voice-chat__error" role="alert">{error}</p>}
    <div className="voice-chat__audio" ref={audioRef} aria-hidden="true" />
  </section>
}
