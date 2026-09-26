import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveGame } from '../../test/liveGame'
import { TacticalBoard } from './TacticalBoard'

afterEach(() => vi.useRealTimers())

async function board(spectator = false) {
  const h = await liveGame()
  const game = await h.read(spectator ? 3 : 1)
  const card = game.players[0].deployedCards.find((card) => card.stableId === 'lanciers')!
  card.profile!.ability = { name: 'Mur de lance', description: 'Les unités chargeant cette unité ne bénéficient pas de dés supplémentaires.' }
  render(<TacticalBoard game={game} />)
  return screen.getByRole(spectator ? 'img' : 'button', { name: spectator ? 'E5 · Lanciers · Joueur 1 · 4 R' : 'E5 · Lanciers · Joueur 1' })
}

describe('interactive battlefield card preview', () => {
  it.each([false, true])('keeps the initial R in the preview while manual changes update the tile (spectator: %s)', async (spectator) => {
    const h = await liveGame()
    const user = spectator ? 3 : 1
    const { rerender } = render(<TacticalBoard game={await h.read(user)} />)
    const unit = screen.getByRole(spectator ? 'img' : 'button', { name: /^E5 · Lanciers · Joueur 1/ })
    const regiment = unit.querySelector('.board-unit__regiment')
    const unitId = (await h.unit(0, 'lanciers')).id
    fireEvent.mouseEnter(unit)
    let current = 4
    expect(regiment).toHaveTextContent(/^4R$/)

    for (const delta of [-1, 1, 1]) {
      await h.invoke('manual', 'adjustRegiment', 1, { gameId: h.gameId, unitId, delta })
      current += delta
      rerender(<TacticalBoard game={await h.read(user)} />)
      expect(regiment).toHaveTextContent(new RegExp(`^${current}R$`))
      if (spectator) expect(unit).toHaveAccessibleName(`E5 · Lanciers · Joueur 1 · ${current} R`)
      const preview = screen.getByRole('dialog', { name: 'Détails de Lanciers' })
      expect(within(preview).getByLabelText('Points de Régiment : 4')).toHaveTextContent('4')
    }
  })

  it.each([false, true])('keeps the card and its ability open when crossing from the board (spectator: %s)', async (spectator) => {
    const unit = await board(spectator)
    vi.useFakeTimers()
    fireEvent.mouseEnter(unit)
    const preview = screen.getByRole('dialog', { name: 'Détails de Lanciers' })
    expect(preview).toHaveTextContent('4')
    fireEvent.mouseLeave(unit, { relatedTarget: preview })
    fireEvent.mouseEnter(preview, { relatedTarget: unit })
    act(() => vi.advanceTimersByTime(350))
    const ability = within(preview).getByRole('button', { name: /Mur de lance/ })
    fireEvent.mouseEnter(ability)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('ne bénéficient pas de dés supplémentaires')
    fireEvent.mouseLeave(ability, { relatedTarget: tooltip })
    fireEvent.mouseEnter(tooltip, { relatedTarget: ability })
    act(() => vi.advanceTimersByTime(350))
    expect(preview).toBeInTheDocument()
    expect(tooltip).toBeInTheDocument()
    fireEvent.scroll(tooltip)
    expect(preview).toBeInTheDocument()
    fireEvent.mouseLeave(tooltip, { relatedTarget: document.body })
    act(() => vi.advanceTimersByTime(350))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('opens the ability with Tab and returns focus to the board on Escape', async () => {
    const unit = await board()
    act(() => unit.focus())
    await userEvent.tab()
    expect(screen.getByRole('button', { name: /Mur de lance/ })).toHaveFocus()
    expect(screen.getByRole('tooltip')).toHaveTextContent('ne bénéficient pas de dés supplémentaires')
    await userEvent.keyboard('{Escape}')
    expect(unit).toHaveFocus()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
