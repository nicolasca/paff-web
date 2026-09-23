// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ActionCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { join } from './voice'

const gameId = 'game-1' as Id<'games'>
const handler = (join as unknown as { _handler: (ctx: ActionCtx, args: { gameId: Id<'games'> }) => Promise<{ serverUrl: string; token: string }> })._handler

afterEach(() => vi.unstubAllEnvs())

describe('voice token', () => {
  it('restricts a short-lived token to the game room and microphone', async () => {
    vi.stubEnv('LIVEKIT_URL', 'wss://voice.example')
    vi.stubEnv('LIVEKIT_API_KEY', 'test-key')
    vi.stubEnv('LIVEKIT_API_SECRET', 'test-secret-long-enough-for-signing')
    const runQuery = vi.fn().mockResolvedValue({ userId: 'user-1', displayName: 'Joueur 1' })
    const result = await handler({ runQuery } as unknown as ActionCtx, { gameId })
    const payload = JSON.parse(Buffer.from(result.token.split('.')[1], 'base64url').toString())
    expect(runQuery).toHaveBeenCalledWith(expect.anything(), { gameId })
    expect(result.serverUrl).toBe('wss://voice.example')
    expect(payload.sub).toBe('user-1')
    expect(payload.name).toBe('Joueur 1')
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000) + 3500)
    expect(payload.exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 3600)
    expect(payload.video).toMatchObject({
      room: 'paff-game-1', roomJoin: true, canPublish: true,
      canSubscribe: true, canPublishData: false, canPublishSources: ['microphone'],
    })
  })

  it('does not issue tokens without a configured free voice service', async () => {
    vi.stubEnv('LIVEKIT_URL', '')
    const runQuery = vi.fn().mockResolvedValue({ userId: 'user-1', displayName: 'Joueur 1' })
    await expect(handler({ runQuery } as unknown as ActionCtx, { gameId })).rejects.toMatchObject({ data: { code: 'AUDIO_NOT_CONFIGURED' } })
  })
})
