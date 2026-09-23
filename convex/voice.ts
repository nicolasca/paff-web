/// <reference types="node" />
"use node"

import { env } from 'node:process'
import { AccessToken, TrackSource } from 'livekit-server-sdk'
import { ConvexError, v } from 'convex/values'
import { action } from './_generated/server'
import { internal } from './_generated/api'

export const join = action({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }): Promise<{ serverUrl: string; token: string }> => {
    const { userId, displayName } = await ctx.runQuery(internal.voiceAccess.authorize, { gameId })
    const serverUrl = env.LIVEKIT_URL
    const apiKey = env.LIVEKIT_API_KEY
    const apiSecret = env.LIVEKIT_API_SECRET
    if (!serverUrl || !apiKey || !apiSecret) throw new ConvexError({ code: 'AUDIO_NOT_CONFIGURED' })
    if (!serverUrl.startsWith('wss://')) throw new ConvexError({ code: 'AUDIO_NOT_CONFIGURED' })

    const access = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: displayName,
      ttl: '1h',
    })
    access.addGrant({
      roomJoin: true,
      room: `paff-${gameId}`,
      canPublish: true,
      canPublishSources: [TrackSource.MICROPHONE],
      canSubscribe: true,
      canPublishData: false,
    })
    return { serverUrl, token: await access.toJwt() }
  },
})
