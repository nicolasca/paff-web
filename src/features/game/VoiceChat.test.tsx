import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConvexError } from 'convex/values'
import type { Id } from '../../../convex/_generated/dataModel'
import { VoiceChat } from './VoiceChat'

const voice = vi.hoisted(() => ({
  access: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), microphone: vi.fn(), startAudio: vi.fn(),
}))

vi.mock('convex/react', () => ({ useAction: () => voice.access }))
vi.mock('livekit-client', () => ({
  Room: class {
    remoteParticipants = new Map()
    localParticipant = { setMicrophoneEnabled: voice.microphone }
    canPlaybackAudio = true
    on = vi.fn()
    connect = voice.connect
    disconnect = voice.disconnect
    startAudio = voice.startAudio
  },
  RoomEvent: {
    TrackSubscribed: 'trackSubscribed', TrackUnsubscribed: 'trackUnsubscribed',
    ParticipantConnected: 'participantConnected', ParticipantDisconnected: 'participantDisconnected',
    AudioPlaybackStatusChanged: 'audioPlaybackStatusChanged', Reconnecting: 'reconnecting',
    Reconnected: 'reconnected', Disconnected: 'disconnected',
  },
  Track: { Kind: { Audio: 'audio' } },
}))

const gameId = 'game-1' as Id<'games'>

beforeEach(() => {
  vi.clearAllMocks()
  voice.access.mockResolvedValue({ serverUrl: 'wss://voice.example', token: 'token' })
  voice.connect.mockResolvedValue(undefined)
  voice.disconnect.mockResolvedValue(undefined)
  voice.microphone.mockResolvedValue(undefined)
  voice.startAudio.mockResolvedValue(undefined)
})

describe('voice chat', () => {
  it('joins only on request, keeps the microphone off, then lets the member speak and leave', async () => {
    const user = userEvent.setup()
    render(<VoiceChat gameId={gameId} />)
    expect(voice.access).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Rejoindre l’audio' }))
    expect(await screen.findByRole('button', { name: 'Activer mon micro' })).toBeVisible()
    expect(voice.access).toHaveBeenCalledWith({ gameId })
    expect(voice.connect).toHaveBeenCalledWith('wss://voice.example', 'token')
    expect(voice.microphone).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Activer mon micro' }))
    expect(voice.microphone).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: 'Couper mon micro' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Quitter l’audio' }))
    expect(voice.disconnect).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Rejoindre l’audio' })).toBeVisible()
  })

  it('explains when the free voice service has not been configured', async () => {
    voice.access.mockRejectedValue(new ConvexError({ code: 'AUDIO_NOT_CONFIGURED' }))
    render(<VoiceChat gameId={gameId} />)
    await userEvent.click(screen.getByRole('button', { name: 'Rejoindre l’audio' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Le salon vocal n’est pas encore configuré')
    expect(voice.connect).not.toHaveBeenCalled()
  })
})
