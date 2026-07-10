import { format, parseISO, isValid } from 'date-fns'
import { hu } from 'date-fns/locale'

// VSZ dátum formátum: "2024.01.15." (ponttal a végén, ahogy a DB-ben van)
export function formatVszDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? parseISO(date.replace(/\./g, '-').replace(/-$/, '')) : date
    if (!isValid(d)) return String(date)
    return format(d, 'yyyy.MM.dd.', { locale: hu })
  } catch {
    return String(date)
  }
}

// Olvasható dátum: "2024. január 15."
export function formatHuDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (!isValid(d)) return ''
    return format(d, 'yyyy. MMMM d.', { locale: hu })
  } catch {
    return ''
  }
}

// Pénznem formázás
export function formatFt(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatEur(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)
}

// Szám formázás
export function formatSzam(n: number | null | undefined, tizedesek = 0): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('hu-HU', {
    minimumFractionDigits: tizedesek,
    maximumFractionDigits: tizedesek,
  }).format(n)
}

// Osztálynevek összefűzése (cn utility)
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// API hiba kezelés
export function apiError(message: string, status = 500): Response {
  return Response.json({ error: message }, { status })
}

// Dátum range a mai napra
export function maiNap(): string {
  return format(new Date(), 'yyyy.MM.dd.')
}

export function hetKezdete(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return format(new Date(d.setDate(diff)), 'yyyy.MM.dd.')
}

export function honapKezdete(): string {
  const d = new Date()
  return format(new Date(d.getFullYear(), d.getMonth(), 1), 'yyyy.MM.dd.')
}
