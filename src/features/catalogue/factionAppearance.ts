type FactionAppearance = { motto: string; description: string; image: string }

const appearances: Record<string, FactionAppearance> = {
  sephosi: {
    motto: 'Discipline · Rigueur · Cohésion',
    description: 'Une seule ligne. Une seule volonté.',
    image: '/cards/sephosi/sephosi-lanciers-sephosiens.webp',
  },
  gobelins: {
    motto: 'Chaos · Instabilité · Déferlement',
    description: 'Pas de rangs. Pas de calme. Des gobelins.',
    image: '/cards/gobelins/gobelins-troupe-de-gobelins.webp',
  },
}

export function factionAppearance(theme?: string): FactionAppearance {
  return appearances[theme ?? ''] ?? {
    motto: 'Les armées de PAFF', description: 'Découvrez les forces de votre faction.', image: '/art/paff-battle-home.png',
  }
}
