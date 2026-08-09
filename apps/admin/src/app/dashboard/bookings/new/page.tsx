'use client'

import { buildSlotGrid, type Quote } from '@hola/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { formErrorMessage } from '../../../../components/common/form-error.ts'
import { StatusChip } from '../../../../components/common/StatusChip.tsx'
import { RoleRouteGuard } from '../../../../components/shell/RoleRouteGuard.tsx'
import { apiClient } from '../../../../lib/api-client.ts'
import { isRecord, parseData, parseOffsetList } from '../../../../lib/api-response.ts'
import { useAuthSession } from '../../../../lib/auth.ts'
import { useCourtDetail, useCourts } from '../../../../lib/courts.ts'
import { dayOfWeekFor, formatRupiah, formatTimeWita, todayWita } from '../../../../lib/format.ts'
import { newIdempotencyKey } from '../../../../lib/idempotency.ts'
import * as labels from '../../../../lib/labels.ts'
import { requestQuote } from '../../../../lib/quote.ts'
import { isSlotClaimResponse, normalizeSlotClaim } from '../../../../lib/slot-claims.ts'

type BookingChannel = 'walk_in' | 'admin'
type PaymentMethod = 'cash' | 'manual_transfer'

interface CreatedBooking {
  bookingCode: string
  id: string
  status: string
  totalAmount: number
}

function isCreatedBookingResponse(value: unknown): value is {
  booking_code: string
  id: string
  status: string
  total_amount: number
} {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.booking_code === 'string' &&
    typeof value.status === 'string' &&
    typeof value.total_amount === 'number'
  )
}

/** Slot yang sudah diklaim `held`/`confirmed` tidak boleh ditawarkan ke operator. */
function useTakenSlots(courtId: string, dateKey: string) {
  return useQuery({
    queryKey: ['slot-claims', dateKey, courtId],
    enabled: courtId.length > 0,
    queryFn: async (): Promise<Set<string>> => {
      const response = await apiClient.api.v1['slot-claims'].$get({
        query: {
          court_id: courtId,
          slot_date_from: dateKey,
          slot_date_to: dateKey,
          per_page: '100',
        },
      })
      const list = parseOffsetList(await response.json(), isSlotClaimResponse)
      return new Set(
        list.data
          .map(normalizeSlotClaim)
          .filter((claim) => claim.status !== 'released')
          .map((claim) => new Date(claim.startsAt).toISOString()),
      )
    },
  })
}

function QuoteSummary({ quote }: { quote: Quote }): ReactNode {
  return (
    <div className="table-scroll">
      <table className="line-table">
        <thead>
          <tr>
            <th scope="col">Rincian</th>
            <th scope="col">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {quote.lines.map((line) => (
            <tr key={`${line.type}-${line.ref_id}-${line.starts_at ?? ''}`}>
              <td>
                {line.label}
                {line.starts_at ? ` · ${formatTimeWita(line.starts_at)}` : ''}
              </td>
              <td className="numeric">
                {line.type === 'discount' ? '−' : ''}
                {formatRupiah(Math.abs(line.line_total_amount))}
              </td>
            </tr>
          ))}
          <tr className="total-row">
            <td>Total tagihan</td>
            <td className="numeric">{formatRupiah(quote.total_amount)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ManualBookingPage(): ReactNode {
  const queryClient = useQueryClient()
  const session = useAuthSession()
  const courts = useCourts()

  const [courtId, setCourtId] = useState('')
  const [dateKey, setDateKey] = useState(() => todayWita(new Date()))
  const [selected, setSelected] = useState<string[]>([])
  const [channel, setChannel] = useState<BookingChannel>('admin')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [customerUserId, setCustomerUserId] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [note, setNote] = useState('')

  const [quote, setQuote] = useState<Quote | null>(null)
  const [bookingKey, setBookingKey] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedBooking | null>(null)
  const [error, setError] = useState<string | null>(null)

  const detail = useCourtDetail(courtId.length > 0 ? courtId : null)
  const taken = useTakenSlots(courtId, dateKey)

  const hours = detail.data?.operatingHours.find((hour) => hour.dayOfWeek === dayOfWeekFor(dateKey))
  let slots: ReturnType<typeof buildSlotGrid> = []
  if (detail.data && hours) {
    try {
      slots = buildSlotGrid(dateKey, {
        slotDurationMinutes: detail.data.slotDurationMinutes,
        opensTime: hours.opensTime.slice(0, 5),
        closesTime: hours.closesTime.slice(0, 5),
      })
    } catch {
      slots = []
    }
  }

  /**
   * Setiap perubahan input membatalkan quote dan kunci idempotensinya. Tanpa
   * ini, operator bisa mengubah slot lalu menekan "Buat booking" dan mengirim
   * harga yang sudah tidak berlaku dengan kunci lama.
   */
  const resetQuote = (): void => {
    setQuote(null)
    setBookingKey(null)
    setError(null)
  }

  const toggleSlot = (startsAt: string): void => {
    resetQuote()
    setSelected((current) =>
      current.includes(startsAt)
        ? current.filter((slot) => slot !== startsAt)
        : [...current, startsAt].sort(),
    )
  }

  const previewQuote = useMutation({
    mutationFn: async (): Promise<Quote> =>
      requestQuote(
        selected.map((startsAt) => ({ court_id: courtId, starts_at: startsAt })),
        promoCode.trim().length > 0 ? promoCode.trim() : undefined,
      ),
  })

  const createBooking = useMutation({
    mutationFn: async (input: {
      expectedTotal: number
      idempotencyKey: string
    }): Promise<CreatedBooking> => {
      const response = await apiClient.api.v1.bookings.$post(
        {
          json: {
            items: selected.map((startsAt) => ({ court_id: courtId, starts_at: startsAt })),
            addons: [],
            channel,
            expected_total_amount: input.expectedTotal,
            ...(promoCode.trim().length > 0 ? { promo_code: promoCode.trim() } : {}),
            ...(note.trim().length > 0 ? { customer_note: note.trim() } : {}),
            ...(customerUserId.trim().length > 0
              ? { customer_user_id: customerUserId.trim() }
              : { guest_name: guestName.trim(), guest_phone: guestPhone.trim() }),
          },
        },
        { headers: { 'Idempotency-Key': input.idempotencyKey } },
      )
      const body = parseData(await response.json(), isCreatedBookingResponse)
      return {
        id: body.id,
        bookingCode: body.booking_code,
        status: body.status,
        totalAmount: body.total_amount,
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      await queryClient.invalidateQueries({ queryKey: ['slot-claims'] })
    },
  })

  const onPreview = async (): Promise<void> => {
    if (!courtId || selected.length === 0) {
      setError('Pilih lapangan dan minimal satu slot.')
      return
    }
    setError(null)
    try {
      setQuote(await previewQuote.mutateAsync())
      // Kunci dibuat sekali di sini dan dipakai ulang pada setiap percobaan
      // kirim — percobaan kedua setelah timeout tidak boleh jadi booking kedua.
      setBookingKey(newIdempotencyKey())
    } catch (previewError) {
      setQuote(null)
      setBookingKey(null)
      setError(formErrorMessage(previewError))
    }
  }

  const onCreate = async (): Promise<void> => {
    if (!quote || !bookingKey) return
    if (customerUserId.trim().length === 0) {
      if (guestName.trim().length === 0 || guestPhone.trim().length === 0) {
        setError('Nama dan nomor HP tamu wajib diisi untuk booking tanpa akun customer.')
        return
      }
    }
    setError(null)
    try {
      setCreated(
        await createBooking.mutateAsync({
          expectedTotal: quote.total_amount,
          idempotencyKey: bookingKey,
        }),
      )
    } catch (createError) {
      setError(formErrorMessage(createError))
    }
  }

  const startOver = (): void => {
    setSelected([])
    setQuote(null)
    setBookingKey(null)
    setCreated(null)
    setGuestName('')
    setGuestPhone('')
    setCustomerUserId('')
    setPromoCode('')
    setNote('')
    setError(null)
  }

  if (created) {
    return <CashPaymentStep booking={created} onStartOver={startOver} />
  }

  return (
    <section className="page-stack">
      <p className="breadcrumb">
        <Link href="/dashboard/bookings">← Kembali ke daftar booking</Link>
      </p>

      <div className="page-heading">
        <p className="eyebrow">Operasional</p>
        <h1>Booking manual</h1>
        <p>
          Untuk customer yang datang langsung atau memesan lewat telepon. Booking walk-in langsung
          terkonfirmasi tanpa hold; booking admin menunggu pembayaran seperti kanal online.
        </p>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>1 · Slot</h2>
          </div>
        </div>
        <div className="stack">
          <div className="form-grid">
            <label className="field">
              <span>Lapangan</span>
              <select
                value={courtId}
                onChange={(event) => {
                  setCourtId(event.target.value)
                  setSelected([])
                  resetQuote()
                }}
                required
              >
                <option value="">Pilih lapangan</option>
                {(courts.data ?? [])
                  .filter((court) => court.status === 'active')
                  .map((court) => (
                    <option value={court.id} key={court.id}>
                      {court.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Tanggal main</span>
              <input
                type="date"
                value={dateKey}
                onChange={(event) => {
                  setDateKey(event.target.value)
                  setSelected([])
                  resetQuote()
                }}
              />
            </label>
          </div>

          {detail.data ? (
            <p className="muted">
              {detail.data.minSlotsPerBooking}–{detail.data.maxSlotsPerBooking} slot per booking ·{' '}
              {detail.data.slotDurationMinutes} menit per slot
            </p>
          ) : null}

          {slots.length === 0 ? (
            <p className="table-state">
              {courtId
                ? 'Tidak ada jam operasional untuk tanggal ini.'
                : 'Pilih lapangan untuk melihat slot.'}
            </p>
          ) : (
            <div className="row">
              {slots.map((slot) => {
                const iso = slot.startsAt.toISOString()
                const isTaken = taken.data?.has(iso) ?? false
                const isSelected = selected.includes(iso)
                return (
                  <button
                    className={isSelected ? 'button-small' : 'button-secondary button-small'}
                    disabled={isTaken}
                    key={iso}
                    title={isTaken ? 'Slot sudah diklaim' : undefined}
                    type="button"
                    onClick={() => toggleSlot(iso)}
                  >
                    {formatTimeWita(iso)}
                    {isTaken ? ' · terisi' : ''}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>2 · Pemesan</h2>
            <p>
              Isi data tamu untuk walk-in. Booking atas nama akun customer terdaftar memerlukan ID
              akunnya.
            </p>
          </div>
        </div>
        {channel === 'walk_in' ? (
          <p className="notice notice-warning">
            Booking walk-in langsung berstatus terkonfirmasi tanpa membuat catatan pembayaran, jadi
            uangnya <strong>tidak muncul</strong> di daftar pembayaran maupun rekap pemasukan hari
            ini. API juga belum dapat membatalkan booking seperti ini. Pakai kanal admin kecuali
            memang tidak ada uang yang perlu dicatat.
          </p>
        ) : null}
        <div className="form-grid">
          <label className="field">
            <span>Kanal</span>
            <select
              value={channel}
              onChange={(event) => {
                setChannel(event.target.value as BookingChannel)
                resetQuote()
              }}
            >
              <option value="admin">Admin — catat pembayaran tunai (disarankan)</option>
              <option value="walk_in">Walk-in — langsung terkonfirmasi, tanpa catatan uang</option>
            </select>
            <small>
              Kanal admin menahan slot lalu dilunasi lewat pencatatan tunai, sehingga uangnya
              tercatat, masuk laporan harian, dan booking tetap dapat dibatalkan.
            </small>
          </label>
          <label className="field">
            <span>Nama tamu</span>
            <input
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              disabled={customerUserId.trim().length > 0}
            />
          </label>
          <label className="field">
            <span>Nomor HP tamu</span>
            <input
              value={guestPhone}
              onChange={(event) => setGuestPhone(event.target.value)}
              disabled={customerUserId.trim().length > 0}
              placeholder="08xxxxxxxxxx"
            />
          </label>
          {session.user?.role === 'admin' ? (
            <label className="field">
              <span>ID akun customer</span>
              <input
                value={customerUserId}
                onChange={(event) => setCustomerUserId(event.target.value)}
                placeholder="Kosongkan untuk booking tamu"
              />
              <small>
                Salin dari <Link href="/dashboard/customers">halaman customer</Link>. Kalau diisi,
                data tamu diabaikan.
              </small>
            </label>
          ) : null}
          <label className="field">
            <span>Kode promo</span>
            <input
              value={promoCode}
              onChange={(event) => {
                setPromoCode(event.target.value)
                resetQuote()
              }}
            />
          </label>
          <label className="field field-wide">
            <span>Catatan</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>3 · Harga &amp; konfirmasi</h2>
            <p>
              Harga dihitung ulang oleh server saat booking dibuat. Kalau berubah di antara dua
              langkah ini, booking ditolak alih-alih menagih angka yang berbeda.
            </p>
          </div>
        </div>
        <div className="stack">
          <div className="form-actions">
            <button
              className="button-secondary"
              type="button"
              onClick={() => void onPreview()}
              disabled={previewQuote.isPending || selected.length === 0}
            >
              {previewQuote.isPending ? 'Menghitung…' : `Hitung harga ${selected.length} slot`}
            </button>
          </div>

          {quote ? (
            <>
              <QuoteSummary quote={quote} />
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => void onCreate()}
                  disabled={createBooking.isPending}
                >
                  {createBooking.isPending
                    ? 'Membuat booking…'
                    : `Buat booking ${formatRupiah(quote.total_amount)}`}
                </button>
              </div>
            </>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}
        </div>
      </div>
    </section>
  )
}

function CashPaymentStep({
  booking,
  onStartOver,
}: {
  booking: CreatedBooking
  onStartOver: () => void
}): ReactNode {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState(String(booking.totalAmount))
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [paymentKey] = useState(newIdempotencyKey)
  const [error, setError] = useState<string | null>(null)
  const [isPaid, setIsPaid] = useState(false)
  const isPayable = booking.status === 'pending_payment'

  const record = useMutation({
    mutationFn: async (): Promise<void> => {
      await apiClient.api.v1.payments.manual.$post(
        {
          json: {
            booking_id: booking.id,
            amount: Number(amount),
            method,
          },
        },
        { headers: { 'Idempotency-Key': paymentKey } },
      )
    },
    onSuccess: async () => {
      setIsPaid(true)
      await queryClient.invalidateQueries({ queryKey: ['booking-detail', booking.id] })
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
    },
  })

  const onRecord = async (): Promise<void> => {
    const parsed = Number(amount)
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError('Nominal harus bilangan bulat rupiah tanpa desimal.')
      return
    }
    setError(null)
    try {
      await record.mutateAsync()
    } catch (recordError) {
      setError(formErrorMessage(recordError))
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Booking dibuat</p>
        <h1>{booking.bookingCode}</h1>
        <p>
          <StatusChip {...labels.bookingStatus(booking.status)} /> · total{' '}
          {formatRupiah(booking.totalAmount)}
        </p>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Catat pembayaran</h2>
            <p>
              Untuk uang tunai yang diterima di venue atau transfer manual yang sudah diverifikasi.
              Pencatatan ini melunasi booking tanpa gateway.
            </p>
          </div>
        </div>

        {/* Booking walk-in sudah lahir berstatus terkonfirmasi; `POST
            /payments/manual` menolaknya dengan `BOOKING_ALREADY_PAID`. Formulir
            yang pasti gagal tidak boleh ditampilkan seolah bisa dipakai. */}
        {!isPayable ? (
          <div className="stack">
            <p className="notice notice-warning">
              Booking walk-in langsung terkonfirmasi, jadi tidak ada pembayaran yang dapat dicatat
              untuknya. Uangnya tidak akan muncul di daftar pembayaran maupun rekap pemasukan hari
              ini. Untuk mencatat uang tunai, buat booking lewat kanal admin.
            </p>
            <div className="form-actions">
              <Link className="button-link" href={`/dashboard/bookings/${booking.id}`}>
                Buka detail booking
              </Link>
              <button className="button-secondary" type="button" onClick={onStartOver}>
                Booking manual berikutnya
              </button>
            </div>
          </div>
        ) : isPaid ? (
          <div className="stack">
            <p className="notice notice-success">
              Pembayaran tercatat. Booking sudah lunas dan slotnya terkunci.
            </p>
            <div className="form-actions">
              <Link className="button-link" href={`/dashboard/bookings/${booking.id}`}>
                Buka detail booking
              </Link>
              <button className="button-secondary" type="button" onClick={onStartOver}>
                Booking manual berikutnya
              </button>
            </div>
          </div>
        ) : (
          <div className="stack">
            <div className="form-grid">
              <label className="field">
                <span>Nominal diterima (Rp)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Metode</span>
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                >
                  <option value="cash">Tunai</option>
                  <option value="manual_transfer">Transfer manual</option>
                </select>
              </label>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions">
              <button type="button" onClick={() => void onRecord()} disabled={record.isPending}>
                {record.isPending ? 'Mencatat…' : 'Catat pembayaran'}
              </button>
              <Link
                className="button-link button-secondary"
                href={`/dashboard/bookings/${booking.id}`}
              >
                Lewati — bayar nanti
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default function Page(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin', 'staff']}>
      <ManualBookingPage />
    </RoleRouteGuard>
  )
}
