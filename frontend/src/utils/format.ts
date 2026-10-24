/** Indian-style rupee amounts: ₹45,000 · ₹52.0 L · ₹1.20 Cr */
export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  const v = Number(n)
  if (v >= 10_000_000) return '₹' + (v / 10_000_000).toFixed(2) + ' Cr'
  if (v >= 100_000) return '₹' + (v / 100_000).toFixed(1) + ' L'
  return '₹' + v.toLocaleString('en-IN')
}

/** "2026-10-18" or ISO timestamp -> "18 Oct 2026" */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = value.length === 10 ? new Date(value + 'T00:00:00') : new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Local calendar date as YYYY-MM-DD (not UTC). */
export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function initials(name: string | null | undefined): string {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function timeAgo(value: string): string {
  const diff = (Date.now() - new Date(value).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} days ago`
  return fmtDate(value)
}

/** Digits-only phone for wa.me / tel: links (legacy regex bug fixed). */
export function phoneDigits(phone: string | null | undefined): string {
  return (phone || '').replace(/\D/g, '')
}

/** Builds a CSV file from rows and downloads it. */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join(
    '\r\n',
  )
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
