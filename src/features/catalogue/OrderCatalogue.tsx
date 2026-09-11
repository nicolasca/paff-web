import { useId } from 'react'
import { ordersForFaction, type OrderDefinition } from '../../../shared/orders'
import './OrderCatalogue.css'

export type CatalogueView = 'units' | 'orders'

export function CatalogueViewPicker({ value, onChange, unitCount, orderCount }: {
  value: CatalogueView; onChange: (view: CatalogueView) => void; unitCount?: number; orderCount: number
}) {
  return <div className="catalogue-view-picker" role="group" aria-label="Afficher dans le catalogue">
    <button type="button" aria-pressed={value === 'units'} onClick={() => onChange('units')}>Unités <span>{unitCount ?? '…'}</span></button>
    <button type="button" aria-pressed={value === 'orders'} onClick={() => onChange('orders')}>Ordres <span>{orderCount}</span></button>
  </div>
}

const categoryNames: Record<OrderDefinition['category'], string> = {
  common: 'Commun', classic: 'Classique', advanced: 'Avancé', rare: 'Rare', legendary: 'Unique',
}

export function OrderCatalogue({ faction, inDeck = false }: {
  faction: { stableId: string; name: string; themeKey: string }; inDeck?: boolean
}) {
  const id = useId()
  const orders = ordersForFaction(faction.stableId)
  const groups = [
    { key: 'faction', title: `Ordres ${faction.name}`, orders: orders.filter((order) => order.faction !== 'common') },
    { key: 'common', title: 'Ordres communs', orders: orders.filter((order) => order.faction === 'common') },
  ]
  return <div className="order-catalogue">
    {inDeck && <p className="order-catalogue__note">Les ordres sont disponibles en partie. Consultez-les pour préparer votre stratégie : ils ne s’ajoutent pas au deck et ne coûtent aucun point de composition.</p>}
    {groups.map((group) => group.orders.length > 0 && <section key={group.key} aria-labelledby={`${id}-${group.key}`} className="order-catalogue__group">
      <h3 id={`${id}-${group.key}`}>{group.title}</h3>
      <div className="order-catalogue__grid">
        {group.orders.map((order) => <article key={order.id} className="order-card" data-faction={order.faction === 'common' ? 'neutral' : faction.themeKey} aria-labelledby={`${id}-${order.id}`}>
          <header className="order-card__header"><span className="order-card__category">{categoryNames[order.category]}</span><span className="order-card__limit">{order.limit === undefined ? 'Illimité' : `${order.limit} fois par partie`}</span></header>
          <h4 id={`${id}-${order.id}`}>{order.name}</h4>
          <p>{order.description}</p>
        </article>)}
      </div>
    </section>)}
  </div>
}
