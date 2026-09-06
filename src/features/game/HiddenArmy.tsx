import './HiddenArmy.css'

export function HiddenArmy({ name, count }: { name: string; count: number }) {
  return <div className="hidden-army" aria-label={`Réserve de ${name} : ${count} unité${count === 1 ? '' : 's'} face cachée`}>
    <div className="hidden-army__cards" aria-hidden="true">{Array.from({ length: Math.min(count, 5) }, (_, i) => <span key={i} style={{ transform: `translateX(${i * 12}px) rotate(${i * 5 - 10}deg)` }}><img src="/brand/paff-logo.png" alt="" /></span>)}</div>
    <div><p className="eyebrow">{name}</p><strong>{count} unité{count === 1 ? '' : 's'} à déployer</strong><p>Cartes face cachée</p></div>
  </div>
}
