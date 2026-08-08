import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button.tsx'

describe('Button', () => {
  it('merender label dan tipe default button', () => {
    render(<Button>Pesan Lapangan</Button>)
    const button = screen.getByRole('button', { name: 'Pesan Lapangan' })

    expect(button).toBeDefined()
    expect(button.getAttribute('type')).toBe('button')
  })

  it('varian accent memakai token aksen, bukan warna literal', () => {
    render(<Button variant="accent">Bayar</Button>)

    expect(screen.getByRole('button').className).toContain('bg-accent')
  })

  it('asChild merender elemen anak alih-alih button', () => {
    render(
      <Button asChild>
        <a href="/lapangan">Lihat lapangan</a>
      </Button>,
    )

    expect(screen.getByRole('link', { name: 'Lihat lapangan' })).toBeDefined()
  })
})
