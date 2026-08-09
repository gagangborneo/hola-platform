'use client'

import type { ReactNode } from 'react'
import { useId } from 'react'
import { cn } from '../lib/cn.ts'
import { Label } from './label.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select.tsx'

export interface SelectOption {
  readonly label: string
  readonly value: string
}

interface SelectFieldProps {
  readonly className?: string
  readonly disabled?: boolean
  readonly id?: string
  readonly label: string
  /** Sembunyikan label secara visual tapi tetap tertaut untuk pembaca layar. */
  readonly labelHidden?: boolean
  readonly onChange: (value: string) => void
  readonly options: readonly SelectOption[]
  readonly placeholder?: string
  readonly size?: 'sm' | 'default'
  readonly triggerClassName?: string
  readonly value: string
}

/**
 * Sentinel untuk opsi bernilai string kosong.
 *
 * Radix Select memesan `''` sebagai "tidak ada pilihan" dan melempar bila ada
 * item bernilai kosong. Filter back-office justru memakai `''` sebagai "Semua",
 * dan nilai itu dikirim apa adanya ke query API. Penerjemahannya ditaruh di
 * sini, satu tempat: pemanggil tetap memakai `''` seperti pada `<select>`
 * bawaan, dan tidak ada sentinel yang bocor ke URL atau ke request.
 */
const EMPTY = '__empty__'

const toInner = (value: string): string => (value === '' ? EMPTY : value)
const toOuter = (value: string): string => (value === EMPTY ? '' : value)

export function SelectField({
  className,
  disabled = false,
  id,
  label,
  labelHidden = false,
  onChange,
  options,
  placeholder,
  size = 'default',
  triggerClassName,
  value,
}: SelectFieldProps): ReactNode {
  const generatedId = useId()
  const controlId = id ?? generatedId

  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label className={labelHidden ? 'sr-only' : undefined} htmlFor={controlId}>
        {label}
      </Label>
      <Select
        disabled={disabled}
        onValueChange={(next) => onChange(toOuter(next))}
        value={toInner(value)}
      >
        <SelectTrigger className={triggerClassName} id={controlId} size={size}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={toInner(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
