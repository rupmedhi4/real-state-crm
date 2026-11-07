import { useEffect, useState } from 'react'
import { useData } from '../context/DataContext'
import { fileUrl } from '../services/api'
import type { Property } from '../types'
import { money } from '../utils/format'
import { Modal } from './Modal'
import { Badge } from './ui'

export function PropertyDetail({ property: p, onClose, onEdit }: {
  property: Property; onClose: () => void; onEdit: () => void
}) {
  const { settings, meta } = useData()
  const [active, setActive] = useState(0)
  const count = p.images.length
  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      if (!count) return
      if (event.key === 'ArrowLeft') setActive((current) => (current - 1 + count) % count)
      if (event.key === 'ArrowRight') setActive((current) => (current + 1) % count)
    }
    document.addEventListener('keydown', navigate)
    return () => document.removeEventListener('keydown', navigate)
  }, [count])
  const price = `${money(p.price)}${p.listingType !== 'Sale' && p.price ? '/month' : ''}`
  const location = [p.address, p.locality, p.city].filter(Boolean).join(', ')
  const share = [settings?.companyName, p.title, `${p.propertyType} for ${p.listingType.toLowerCase()}`, price,
    location, p.bedrooms != null ? `${p.bedrooms} bedrooms` : '', p.areaSqft ? `${p.areaSqft} sq.ft` : '',
    p.furnishing, p.possessionStatus, p.amenities, p.description,
    settings?.companyPhone ? `Enquiries: ${settings.companyPhone}` : '',
  ].filter(Boolean).join('\n')
  return <Modal title={p.title} size="wide" onClose={onClose} footer={<>
    <button className="btn" onClick={onClose}>Close</button>
    {meta?.features?.brochures !== false && <>
    <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
    <button className="btn" onClick={() => window.print()}>Print / Save PDF</button>
    </>}
    <button className="btn primary" onClick={onEdit}>Edit property</button>
  </>}>
    <article className="property-detail">
      <div className="property-brochure-brand"><strong>{settings?.companyName || 'Estateflow'}</strong><span>{settings?.tagline}</span></div>
      {count > 0 ? <>
        <div className="property-hero">
          <img src={fileUrl(p.images[active].url)} alt={`${p.title} — photo ${active + 1}`} />
          {count > 1 && <div className="property-gallery-controls" data-no-print>
            <button type="button" aria-label="Previous photo" onClick={() => setActive((active - 1 + count) % count)}>←</button>
            <span aria-live="polite">{active + 1} / {count}</span>
            <button type="button" aria-label="Next photo" onClick={() => setActive((active + 1) % count)}>→</button>
          </div>}
        </div>
        <div className="property-filmstrip" data-no-print>{p.images.map((image, index) => <button key={image.id} type="button" aria-label={`View photo ${index + 1}`} aria-pressed={index === active} onClick={() => setActive(index)}><img src={fileUrl(image.url)} alt="" loading="lazy" /></button>)}</div>
      </> : <div className="property-no-photo">No property photos added yet.</div>}
      <div className="property-overview"><div><div className="section-label">{p.listingType} · {p.category}</div><h2>{p.title}</h2><p className="muted">{location || 'Location not specified'}</p></div><div><div className="property-detail-price">{price}</div><Badge value={p.status} /></div></div>
      <div className="property-spec-grid">{[
        ['Bedrooms', p.bedrooms], ['Bathrooms', p.bathrooms], ['Area (sq.ft)', p.areaSqft], ['Parking', p.parkingSpaces],
      ].map(([label, value]) => <div key={label}><strong>{value ?? '—'}</strong><span>{label}</span></div>)}</div>
      <dl className="kv">
        <dt>Property type</dt><dd>{p.propertyType}</dd>
        <dt>Furnishing</dt><dd>{p.furnishing || '—'}</dd>
        <dt>Possession</dt><dd>{p.possessionStatus || '—'}</dd>
        <dt>Floor</dt><dd>{p.floorNumber ?? '—'}{p.totalFloors != null ? ` of ${p.totalFloors}` : ''}</dd>
        <dt>Balconies</dt><dd>{p.balconies ?? '—'}</dd>
        <dt>Facing</dt><dd>{p.facing || '—'}</dd>
        <dt>RERA number</dt><dd>{p.reraNumber || '—'}</dd>
        <dt>Amenities</dt><dd>{p.amenities || '—'}</dd>
      </dl>
      {p.description && <><div className="section-label">About this property</div><p className="property-description">{p.description}</p></>}
      <section className="property-owner" data-no-print><div className="section-label">Internal owner contact</div><p>{p.ownerName || 'No owner recorded'}{p.ownerPhone && <> · <a href={`tel:${p.ownerPhone.replace(/[^+\d]/g, '')}`}>{p.ownerPhone}</a></>}</p><p className="muted">Assigned agent: {p.agent?.name || 'Unassigned'}</p></section>
      <div className="property-brochure-contact">{[settings?.companyName, settings?.companyPhone, settings?.companyEmail, settings?.companyAddress].filter(Boolean).join(' · ')}</div>
    </article>
  </Modal>
}
