import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { api } from '../services/api'
import { initials } from '../utils/format'

// Badge colours per status, carried over from the legacy app.
const STAGE_COLOR: Record<string, [string, string]> = {
  New: ['--blue-soft', '--blue'],
  Contacted: ['--amber-soft', '--amber'],
  Qualified: ['--purple-soft', '--purple'],
  'Site Visit': ['--purple-soft', '--purple'],
  Negotiation: ['--amber-soft', '--amber'],
  Won: ['--forest-soft', '--forest'],
  Lost: ['--gray-soft', '--gray'],
  'New Opportunity': ['--blue-soft', '--blue'],
  Offer: ['--amber-soft', '--amber'],
  Scheduled: ['--blue-soft', '--blue'],
  Confirmed: ['--purple-soft', '--purple'],
  Completed: ['--forest-soft', '--forest'],
  Rescheduled: ['--amber-soft', '--amber'],
  Cancelled: ['--gray-soft', '--gray'],
  'No-show': ['--red-soft', '--red'],
  Available: ['--forest-soft', '--forest'],
  'Under Offer': ['--amber-soft', '--amber'],
  Sold: ['--gray-soft', '--gray'],
  Rented: ['--blue-soft', '--blue'],
  High: ['--red-soft', '--red'],
  Medium: ['--amber-soft', '--amber'],
  Low: ['--gray-soft', '--gray'],
  Pending: ['--amber-soft', '--amber'],
  Active: ['--forest-soft', '--forest'],
  Paused: ['--amber-soft', '--amber'],
  ADMIN: ['--red-soft', '--red'],
  MANAGER: ['--purple-soft', '--purple'],
  AGENT: ['--blue-soft', '--blue'],
  Connected: ['--forest-soft', '--forest'],
  Interested: ['--forest-soft', '--forest'],
  'Not Interested': ['--gray-soft', '--gray'],
  'No Answer': ['--amber-soft', '--amber'],
  'Follow-up Scheduled': ['--blue-soft', '--blue'],
  'Not Started': ['--gray-soft', '--gray'],
  'Token Paid': ['--blue-soft', '--blue'],
  'Agreement Signed': ['--purple-soft', '--purple'],
  'Payment In Progress': ['--amber-soft', '--amber'],
  Registered: ['--forest-soft', '--forest'],
}

export function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="muted">—</span>
  const [bg, fg] = STAGE_COLOR[value] ?? ['--gray-soft', '--gray']
  return (
    <span className="badge" style={{ background: `var(${bg})`, color: `var(${fg})` }}>
      {value}
    </span>
  )
}

export function Spinner() {
  return <span className="spinner" aria-label="Loading" />
}

/**
 * Image from an authenticated endpoint (e.g. contact photos). <img> can't
 * send the Authorization header, so the file is fetched as a blob.
 */
export function AuthImage({ src, alt, className, style }: {
  src: string
  alt: string
  className?: string
  style?: CSSProperties
}) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let objectUrl: string | null = null
    let alive = true
    api
      .get(src, { responseType: 'blob' })
      .then((r) => {
        if (!alive) return
        objectUrl = URL.createObjectURL(r.data as Blob)
        setUrl(objectUrl)
      })
      .catch(() => setUrl(null))
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])
  if (!url) return <div className="avatar-fallback" style={style}>{initials(alt)}</div>
  return <img src={url} alt={alt} className={className} style={style} />
}

export function Avatar({ name, contactId, hasPhoto, size = 30, version }: {
  name: string
  contactId?: string
  hasPhoto?: boolean
  size?: number
  /** Changes when the photo is replaced so the image reloads. */
  version?: string
}) {
  const style = { width: size, height: size, fontSize: size > 40 ? '1rem' : undefined }
  if (contactId && hasPhoto) {
    return (
      <AuthImage
        src={`/contacts/${contactId}/photo${version ? `?v=${encodeURIComponent(version)}` : ''}`}
        alt={name}
        className="avatar"
        style={style}
      />
    )
  }
  return (
    <div className="avatar-fallback" style={style}>
      {initials(name)}
    </div>
  )
}

export function KpiStrip({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="kpi-strip">
      {items.map(([label, value]) => (
        <div className="kpi" key={label}>
          <b>{value}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

export function Bars({ rows, empty = 'No data yet.' }: {
  rows: { label: string; value: number; display?: ReactNode }[]
  empty?: string
}) {
  if (!rows.length) return <p className="muted" style={{ padding: '14px 18px', margin: 0 }}>{empty}</p>
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="source-bars">
      {rows.map((r) => (
        <div className="source-row" key={r.label}>
          <span className="slabel" title={r.label}>{r.label}</span>
          <div className="sbar-wrap">
            <div className="sbar" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="scount">{r.display ?? r.value}</span>
        </div>
      ))}
    </div>
  )
}

export function PageHead({ title, subtitle, children }: {
  title: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

export function Toggle<T extends string>({ value, options, onChange }: {
  value: T
  options: [T, string][]
  onChange: (v: T) => void
}) {
  return (
    <div className="toggle-group">
      {options.map(([v, label]) => (
        <button key={v} type="button" className={v === value ? 'active' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-box">
      {message}{' '}
      {onRetry && (
        <button className="btn sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
