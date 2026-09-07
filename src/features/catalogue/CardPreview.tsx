import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { UnitCard } from './UnitCard'
import type { PublicCard } from './types'
import './CardPreview.css'

export function CardPreview({ card, x, y, id }: { card: PublicCard; x: number; y: number; id: string }) {
  const preview = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = preview.current!
    const { width, height } = element.getBoundingClientRect()
    const left = x + 20 + width > window.innerWidth - 12 ? x - width - 20 : x + 20
    element.style.left = `${Math.max(12, Math.min(left, window.innerWidth - width - 12))}px`
    element.style.top = `${Math.max(12, Math.min(y - 28, window.innerHeight - height - 12))}px`
  }, [x, y, card])
  return createPortal(<div ref={preview} id={id} role="tooltip" className="card-preview" aria-label={`Détails de ${card.name}`}>
    <UnitCard card={card} costPlacement="hidden" interactiveAbilities={false} />
  </div>, document.body)
}
