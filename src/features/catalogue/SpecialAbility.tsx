import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UnitProfile } from '../../../shared/unitProfile'
import './SpecialAbility.css'

export function SpecialAbility({ ability }: { ability: NonNullable<UnitProfile['ability']> }) {
  const id = useId()
  const button = useRef<HTMLButtonElement>(null)
  const hint = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [position, setPosition] = useState<{ left: number; top: number; width: number; below: boolean } | null>(null)

  function keepOpen() { clearTimeout(timer.current) }
  function show() {
    keepOpen()
    const rect = button.current!.getBoundingClientRect()
    const width = Math.min(288, window.innerWidth - 24)
    const below = rect.top < 220
    setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: below ? rect.bottom + 8 : rect.top - 8, width, below })
  }
  function hideSoon() {
    keepOpen()
    timer.current = setTimeout(() => setPosition(null), 150)
  }

  const open = position !== null
  useEffect(() => {
    if (!open) return
    const dismiss = () => setPosition(null)
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss() }
    const onPointerDown = (event: PointerEvent) => {
      if (!button.current?.contains(event.target as Node) && !hint.current?.contains(event.target as Node)) dismiss()
    }
    const onScroll = (event: Event) => { if (!hint.current?.contains(event.target as Node)) dismiss() }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', dismiss)
    return () => {
      clearTimeout(timer.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', dismiss)
    }
  }, [open])

  return <>
    <button ref={button} type="button" className="ability-hint" aria-describedby={open ? id : undefined} aria-expanded={open}
      onMouseEnter={show} onMouseLeave={hideSoon} onFocus={show} onBlur={hideSoon} onClick={show}>
      {ability.name}<span aria-hidden="true"> ⓘ</span>
    </button>
    {position && createPortal(<div ref={hint} id={id} role="tooltip" className="ability-tooltip"
      style={{ left: position.left, top: position.top, width: position.width, transform: position.below ? undefined : 'translateY(-100%)' }}
      onMouseEnter={keepOpen} onMouseLeave={hideSoon}>
      <strong>{ability.name}</strong><p>{ability.description}</p>
    </div>, document.body)}
  </>
}
