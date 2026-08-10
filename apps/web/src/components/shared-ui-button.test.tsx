import { Button } from '@hola/ui'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Kontrak `Button` diuji dari sisi konsumen, bukan dari dalam `packages/ui`.
 *
 * Paket UI sengaja tidak memasang testing-library maupun DOM environment —
 * ia hanya mengekspor sumber TypeScript dan dikompilasi oleh aplikasi yang
 * memakainya. Menaruh uji ini di apps/web memakai harness yang sudah ada dan
 * sekaligus menguji jalur impor yang betul-betul dipakai produksi
 * (`@hola/ui`, lewat symlink workspace), bukan impor relatif ke berkas sumber
 * yang tidak pernah terjadi di kode nyata.
 *
 * Tiga perilaku di bawah pernah dijaga oleh apps/web/src/components/ui/
 * button.test.tsx sebelum komponennya dipindah, dan ikut terhapus bersama
 * direktorinya. Ketiganya adalah default diam-diam: kalau lepas, tidak ada
 * yang error — tombol submit form tanpa sengaja, warna aksen jadi literal,
 * atau `asChild` merender <button> di dalam <a>.
 */
describe('Button (@hola/ui)', () => {
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
