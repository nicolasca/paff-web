import { v } from 'convex/values'
import { query } from './_generated/server'

export const check = query({
  args: {},
  returns: v.object({
    service: v.literal('Convex'),
    status: v.literal('operational'),
    message: v.string(),
  }),
  handler: async () => ({
    service: 'Convex' as const,
    status: 'operational' as const,
    message: 'Le frontend reçoit bien une réponse du backend.',
  }),
})
