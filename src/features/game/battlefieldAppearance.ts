import type { BattlefieldId } from '../../../shared/battlefields'

export type BattlefieldTheme = BattlefieldId

const appearances = {
  gobelins: { theme: 'gobelins', name: 'Camp de la Ferraille', faction: 'Gobelins' },
  sephosi: { theme: 'sephosi', name: 'Cour de la Salamandre', faction: 'Sephosi' },
  gaeli: { theme: 'gaeli', name: 'Sanctuaire des Racines', faction: 'Gaeli' },
} as const

// Rendering old local fixtures never changes the saved battlefield.
export function battlefieldAppearance(theme?: BattlefieldTheme) {
  return appearances[theme ?? 'gobelins']
}
