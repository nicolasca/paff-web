import { useId } from 'react'

export function OrderInfo({ name, description }: { name: string; description: string }) {
  const id = useId()
  return <span className="manual-order-info" tabIndex={0} aria-describedby={id}>{name}<span id={id} role="tooltip">{description}</span></span>
}
