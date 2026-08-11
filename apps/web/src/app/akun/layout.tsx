import type { ReactNode } from 'react'
import { AccountSidebar } from '../../components/account/AccountSidebar.tsx'
import { RequireSession } from '../../components/common/RequireSession.tsx'

interface AccountLayoutProps {
  children: ReactNode
}

/**
 * Shell akun pelanggan: sidebar menu di atas kerangka situs. Header, footer,
 * dan `print:hidden`-nya sekarang datang dari root layout — termasuk untuk
 * `/akun/booking/{id}/receipt` yang dicetak sebagai bukti pemesanan.
 *
 * Penjaga sesi hidup di sini supaya setiap halaman di bawah `/akun` otomatis
 * terlindungi tanpa mengulang `RequireSession`. Ia sengaja TIDAK membungkus
 * header: pengunjung yang sesinya belum pulih tetap melihat navigasi alih-alih
 * layar kosong.
 */
export default function AccountLayout({ children }: AccountLayoutProps): ReactNode {
  return (
    <RequireSession>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8 lg:py-10 print:max-w-none print:p-0">
        <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-8">
          <AccountSidebar />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </RequireSession>
  )
}
