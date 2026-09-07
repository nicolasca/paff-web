import type { ReactNode } from 'react'
import { factionAppearance } from './factionAppearance'
import './FactionBanner.css'

export function FactionBanner({ faction, children, title, heading = 'h1' }: {
  faction?: { name: string; themeKey: string }; children?: ReactNode; title?: string; heading?: 'h1' | 'h2'
}) {
  const appearance = factionAppearance(faction?.themeKey)
  const Heading = heading
  return <header className="faction-banner" data-faction={faction?.themeKey ?? 'neutral'}>
    <img className="faction-banner__art" src={appearance.image} alt="" />
    <div className="faction-banner__copy">
      <p className="faction-banner__eyebrow">{appearance.motto}</p>
      <Heading>{title ?? faction?.name ?? 'Les cartes de PAFF'}</Heading>
      <p className="faction-banner__description">{appearance.description}</p>
    </div>
    {children && <div className="faction-banner__controls">{children}</div>}
  </header>
}
