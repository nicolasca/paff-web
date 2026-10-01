import type { BattlefieldTheme } from './battlefieldAppearance'

/** The rails belong to the scenery; every tactical cell remains unobstructed. */
export function BattlefieldScenery({ theme }: { theme: BattlefieldTheme }) {
  return <div className="battlefield-scenery" aria-hidden="true">
    {['nw', 'ne', 'se', 'sw'].map((corner) => <svg key={corner} className={`battlefield-corner battlefield-corner--${corner}`} viewBox="0 0 60 60" fill="none" focusable="false">
      {theme === 'gobelins' ? <>
        <path d="M3 4h48l-9 8H13v30l-9 10Z" fill="currentColor" fillOpacity=".4" stroke="currentColor" />
        <path d="m4 24 9-2m-9 9 9-3m11-24-2 8m12-8-3 8" stroke="currentColor" strokeWidth="2" />
        <circle cx="8" cy="8" r="2.5" fill="currentColor" /><circle cx="8" cy="39" r="2" fill="currentColor" /><circle cx="38" cy="8" r="2" fill="currentColor" />
      </> : theme === 'sephosi' ? <>
        <path d="M4 52V4h48M9 42V9h33" stroke="currentColor" strokeWidth="1.5" />
        <path d="m15 15 12 2-10 10Zm-8-8 4 4-4 4-4-4Z" fill="currentColor" />
        <path d="m29 7 6 6 6-6M7 29l6 6-6 6" stroke="currentColor" />
      </> : <>
        <path d="M4 54C16 45-1 23 11 12S40 18 54 4M8 53C18 36 8 21 18 13S42 16 53 8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13 31c12 2 13-8 6-11-8-3-11 6-3 7m10-13c2 12-8 13-11 6-3-8 6-11 7-3" stroke="currentColor" />
        <circle cx="11" cy="11" r="3" fill="currentColor" fillOpacity=".7" />
      </>}
    </svg>)}
    <span className="battlefield-rail battlefield-rail--left" /><span className="battlefield-rail battlefield-rail--right" />
    {theme === 'gaeli' && <div className="battlefield-wisps"><i /><i /><i /><i /></div>}
  </div>
}
