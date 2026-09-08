import { createContext } from 'react'
import { createGameHarness } from './gameHarness'

type Entry = { module: 'games' | 'decks' | 'players' | 'manual'; name: string; user: number; args: Record<string, unknown>; value?: unknown; error?: unknown; listeners: Set<() => void> }

// Only the transport/database are replaced. Queries, mutations, routes and screens
// are the application's real code; the test never assigns game phases itself.
export function createFunctionalTransport(harness = createGameHarness()) {
  const entries = new Map<string, Entry>()
  let queue: Promise<unknown> = Promise.resolve()
  function enqueue<T>(action: () => Promise<T>): Promise<T> {
    const next = queue.then(action)
    queue = next.catch(() => undefined)
    return next
  }
  async function refresh(entry: Entry) {
    try {
      const result = await harness.invoke(entry.module, entry.name, entry.user, entry.args)
      if (JSON.stringify(result) !== JSON.stringify(entry.value)) entry.value = result
      entry.error = undefined
    } catch (error) { entry.error = error }
    entry.listeners.forEach((notify) => notify())
  }
  function parse(reference: string): Pick<Entry, 'module' | 'name'> {
    const [module, name] = reference.split(':')
    if (module !== 'games' && module !== 'decks' && module !== 'players' && module !== 'manual') throw new Error(`Unexpected API request: ${reference}`)
    return { module, name }
  }
  return {
    harness,
    query(user: number, reference: string, args: Record<string, unknown>) {
      const key = JSON.stringify([user, reference, args])
      let entry = entries.get(key)
      if (!entry) {
        entry = { ...parse(reference), user, args, listeners: new Set() }
        entries.set(key, entry)
        const current = entry
        void enqueue(() => refresh(current))
      }
      const current = entry
      return {
        snapshot: () => { if (current.error) throw current.error; return current.value },
        subscribe: (notify: () => void) => { current.listeners.add(notify); return () => { current.listeners.delete(notify) } },
      }
    },
    mutate(user: number, reference: string, args: Record<string, unknown>) {
      return enqueue(async () => {
        const { module, name } = parse(reference)
        const result = await harness.invoke(module, name, user, args)
        await Promise.all([...entries.values()].map(refresh))
        return result
      })
    },
    async reconnect() { await queue; entries.clear() },
  }
}

export const FunctionalClientContext = createContext<{ user: number; transport: ReturnType<typeof createFunctionalTransport> } | null>(null)
