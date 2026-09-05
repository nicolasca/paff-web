import { useState } from 'react'

export function QuantityControl({ name, quantity, busy, canAdd = true, onAdjust, onSet }: {
  name: string
  quantity: number
  busy: boolean
  canAdd?: boolean
  onAdjust: (delta: -1 | 1) => void
  onSet: (quantity: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState('')

  function commit() {
    if (draft === null) return
    const next = Number(draft)
    setDraft(null)
    if (!draft.trim() || !Number.isSafeInteger(next) || next < 0) {
      setError('Saisissez un nombre entier positif ou zéro.')
      return
    }
    if (!canAdd && next > quantity) {
      setError('Retirez d’abord les cartes des autres factions.')
      return
    }
    setError('')
    if (next !== quantity) onSet(next)
  }

  return (
    <div className="quantity-field">
      <div className="quantity-control">
        <button type="button" disabled={busy || quantity === 0} onClick={() => onAdjust(-1)} aria-label={`Retirer ${name}`}>−</button>
        <input
          type="number" min="0" step="1" inputMode="numeric"
          aria-label={`Quantité de ${name}`} disabled={busy}
          value={draft ?? quantity}
          onChange={(event) => { setDraft(event.target.value); setError('') }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') { setDraft(null); setError('') }
          }}
        />
        <button type="button" disabled={busy || !canAdd} onClick={() => onAdjust(1)} aria-label={`Ajouter ${name}`}>+</button>
      </div>
      {error && <small role="alert">{error}</small>}
    </div>
  )
}
