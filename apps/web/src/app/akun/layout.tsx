import type { ReactNode } from 'react'
import { AccountSidebar } from '../../components/account/AccountSidebar.tsx'
import { RequireSession } from '../../components/common/RequireSession.tsx'
import { SiteFooter } from '../../components/layout/SiteFooter.tsx'
import { SiteHeader } from '../../components/layout/SiteHeader.tsx'

interface AccountLayoutProps {
  children: ReactNode
}

/**
 * Shell akun pelanggan: header dan footer yang sama dengan halaman publik,
 * ditambah sidebar menu. Penjaga sesi hidup di sini supaya setiap halaman di
 * bawah `/akun` otomatis terlindungi tanpa mengulang `RequireSession`.
 *
 * Semua kerangka ditandai `print:hidden` karena `/akun/booking/{id}/receipt`
 * dicetak sebagai bukti pemesanan — yang boleh ikut tercetak hanya isinya.
 */
export default function AccountLayout({ children }: AccountLayoutProps): ReactNode {
  return (
    <>
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <RequireSession>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8 lg:py-10 print:max-w-none print:p-0">
          <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-8">
            <AccountSidebar />
            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </RequireSession>
      <div className="print:hidden">
        <SiteFooter />
      </div>
    </>
  )
}
