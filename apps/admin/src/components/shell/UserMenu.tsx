'use client'

import type { ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { ChevronIcon } from './NavIcon.tsx'

interface UserMenuProps {
  readonly email: string | null
  readonly fullName: string
  readonly onLogout: () => void
  readonly roleLabel: string
}

/** Inisial dari satu atau dua kata pertama; sisanya jadi bising di lingkaran 2,4rem. */
function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? '?'
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : ''
  return `${first}${second}`.toUpperCase()
}

export function UserMenu({ email, fullName, onLogout, roleLabel }: UserMenuProps): ReactNode {
  const [isOpen, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  /**
   * Menutup lewat klik di luar dan Escape.
   *
   * Listener dipasang saat `pointerdown`, bukan `click`: kalau menunggu `click`,
   * menekan tombol lain di header akan menutup menu SETELAH tombol itu bereaksi,
   * dan urutannya terasa seperti klik yang terlewat.
   */
  useEffect(() => {
    if (!isOpen) return

    const onPointerDown = (event: globalThis.PointerEvent): void => {
      const target = event.target
      if (target instanceof Node && containerRef.current?.contains(target) === true) return
      setOpen(false)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="user-menu-trigger"
        onClick={() => setOpen((open) => !open)}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className="user-avatar">
          {initialsOf(fullName)}
        </span>
        <span className="user-identity">
          <strong>{fullName}</strong>
          <span>{email ?? roleLabel}</span>
        </span>
        <ChevronIcon />
      </button>

      {isOpen ? (
        <div className="user-menu-panel" id={menuId}>
          <div className="user-menu-head">
            <strong>{fullName}</strong>
            <span>{email ?? 'Akun operasional'}</span>
            <em>{roleLabel}</em>
          </div>
          {/*
            Profil belum punya halaman, jadi ia teks — bukan tombol mati. Item
            menu yang bisa diklik tapi tidak melakukan apa pun lebih buruk
            daripada item yang jelas-jelas belum tersedia.
          */}
          <p className="user-menu-item user-menu-item-planned">
            Profil
            <em>Segera</em>
          </p>
          <button className="user-menu-item" onClick={onLogout} type="button">
            Keluar
          </button>
        </div>
      ) : null}
    </div>
  )
}
