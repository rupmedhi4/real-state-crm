import { useState } from 'react'
import { DataTable, Pagination, RowActions } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { FilterSelect } from '../components/Form'
import { PropertyForm } from '../components/forms/PropertyForm'
import { ConfirmDialog, Modal } from '../components/Modal'
import { Badge, ErrorBox, PageHead, Spinner, Toggle } from '../components/ui'
import { useIsManager } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useSearch } from '../context/SearchContext'
import { useToast } from '../context/ToastContext'
import { useCreateParam } from '../hooks/useCreateParam'
import { useList, useTableState } from '../hooks/useList'
import { errorMessage, fileUrl } from '../services/api'
import { propertiesApi } from '../services/crm'
import type { Property } from '../types'
import { money } from '../utils/format'

export function PropertiesPage() {
  const toast = useToast()
  const isManager = useIsManager()
  const { meta, users, refresh } = useData()
  const { debounced: search } = useSearch()
  const table = useTableState('createdAt', 'DESC', 12)
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [filters, setFilters] = useState({ status: '', listingType: '', category: '', agentId: '', minPrice: '', maxPrice: '' })
  const [createOpen, setCreateOpen] = useCreateParam()
  const [editing, setEditing] = useState<Property | null>(null)
  const [viewing, setViewing] = useState<Property | null>(null)
  const [deleting, setDeleting] = useState<Property | null>(null)
  const list = useList(propertiesApi.list, { ...table.params, ...filters, search })
  const setFilter = (k: keyof typeof filters) => (v: string) => {
    setFilters((f) => ({ ...f, [k]: v }))
    table.setPage(1)
  }

  const remove = async (p: Property) => {
    try {
      await propertiesApi.remove(p.id)
      toast('Property deleted.')
      refresh(['properties'])
      list.reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const price = (p: Property) => `${money(p.price)}${p.listingType !== 'Sale' && p.price ? '/mo' : ''}`
  const columns: Column<Property>[] = [
    {
      key: 'title',
      header: 'Property',
      sortKey: 'title',
      render: (p) => (
        <span className="cell-name">
          {p.images[0] ? <img className="avatar" src={fileUrl(p.images[0].url)} alt="" /> : <div className="avatar-fallback">🏠</div>}
          <span className="name-sub">{p.title}<small>{p.images.length} photo(s)</small></span>
        </span>
      ),
    },
    { key: 'type', header: 'Type', render: (p) => `${p.propertyType} · ${p.listingType}` },
    { key: 'price', header: 'Price', sortKey: 'price', render: price },
    { key: 'loc', header: 'Location', sortKey: 'locality', render: (p) => [p.locality, p.city].filter(Boolean).join(', ') || '—' },
    { key: 'area', header: 'Area', sortKey: 'areaSqft', render: (p) => (p.areaSqft ? `${p.areaSqft} sqft` : '—') },
    { key: 'status', header: 'Status', sortKey: 'status', render: (p) => <Badge value={p.status} /> },
    { key: 'agent', header: 'Agent', render: (p) => p.agent?.name ?? '—' },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => (
        <RowActions>
          <button className="btn sm" onClick={() => setEditing(p)}>✏️</button>
          {isManager && <button className="btn sm" onClick={() => setDeleting(p)}>🗑</button>}
        </RowActions>
      ),
    },
  ]

  return (
    <>
      <PageHead title="Properties" subtitle="Inventory — sale, rent aur lease listings">
        <Toggle value={view} options={[['grid', 'Grid'], ['table', 'Table']]} onChange={setView} />
        <button className="btn primary" onClick={() => setCreateOpen(true)}>+ Add Property</button>
      </PageHead>

      <div className="block">
        <div className="filters">
          <FilterSelect value={filters.status} onChange={setFilter('status')} placeholder="Any availability" options={meta?.propertyStatuses ?? []} />
          <FilterSelect value={filters.listingType} onChange={setFilter('listingType')} placeholder="Sale / Rent / Lease" options={meta?.listingTypes ?? []} />
          <FilterSelect value={filters.category} onChange={setFilter('category')} placeholder="All categories" options={meta?.propertyCategories ?? []} />
          <FilterSelect value={filters.agentId} onChange={setFilter('agentId')} placeholder="All agents" options={users.map((u) => ({ value: u.id, label: u.name }))} />
          <input type="number" min={0} placeholder="Min ₹" value={filters.minPrice} onChange={(e) => setFilter('minPrice')(e.target.value)} aria-label="Minimum price" />
          <input type="number" min={0} placeholder="Max ₹" value={filters.maxPrice} onChange={(e) => setFilter('maxPrice')(e.target.value)} aria-label="Maximum price" />
          <select
            value={`${table.sortBy}:${table.sortOrder}`}
            aria-label="Sort"
            onChange={(e) => {
              const [k, o] = e.target.value.split(':')
              table.setSort(k, o as 'ASC' | 'DESC')
            }}
          >
            <option value="createdAt:DESC">Newest first</option>
            <option value="price:ASC">Price: low → high</option>
            <option value="price:DESC">Price: high → low</option>
            <option value="title:ASC">Title A–Z</option>
          </select>
          <span className="muted" style={{ marginLeft: 'auto', fontSize: '.78rem' }}>
            {list.loading ? <Spinner /> : `${list.data?.total ?? 0} properties`}
          </span>
        </div>

        {view === 'table' ? (
          <DataTable
            columns={columns}
            rows={list.data?.items}
            loading={list.loading}
            error={list.error}
            onRetry={list.reload}
            rowKey={(p) => p.id}
            onRowClick={setViewing}
            sortBy={table.sortBy}
            sortOrder={table.sortOrder}
            onSort={table.toggleSort}
            empty="No properties found."
          />
        ) : list.error ? (
          <ErrorBox message={list.error} onRetry={list.reload} />
        ) : list.loading && !list.data ? (
          <div className="center-pad"><Spinner /> Loading…</div>
        ) : !list.data?.items.length ? (
          <div className="center-pad">No properties found.</div>
        ) : (
          <div className="prop-grid" style={{ padding: 14 }}>
            {list.data.items.map((p) => (
              <div className="prop-card" key={p.id}>
                <div className="prop-img" onClick={() => setViewing(p)} style={{ cursor: 'pointer' }}>
                  {p.images[0] ? <img src={fileUrl(p.images[0].url)} alt={p.title} loading="lazy" /> : '🏠'}
                  {p.images.length > 1 && <span className="count">📷 {p.images.length}</span>}
                </div>
                <div className="prop-body">
                  <h4>{p.title}</h4>
                  <div className="ploc">{[p.locality, p.city].filter(Boolean).join(', ') || '—'}</div>
                  <div className="prop-price">{price(p)}</div>
                  <div className="prop-specs">
                    <span>{p.propertyType}</span>
                    {!!p.bedrooms && <span>🛏 {p.bedrooms}</span>}
                    {!!p.areaSqft && <span>📐 {p.areaSqft} sqft</span>}
                  </div>
                  <div style={{ marginTop: 8 }}><Badge value={p.status} /></div>
                  <div className="prop-actions">
                    <button className="btn sm" onClick={() => setEditing(p)}>Edit</button>
                    {isManager && <button className="btn sm danger" onClick={() => setDeleting(p)}>Delete</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {list.data && (
          <Pagination
            page={list.data.page}
            totalPages={list.data.totalPages}
            total={list.data.total}
            pageSize={table.pageSize}
            onPage={table.setPage}
            onPageSize={table.setPageSize}
          />
        )}
      </div>

      {(createOpen || editing) && (
        <PropertyForm
          property={editing}
          onClose={() => {
            setCreateOpen(false)
            setEditing(null)
          }}
          onSaved={() => list.reload()}
        />
      )}
      {viewing && (
        <Modal title={viewing.title} size="wide" onClose={() => setViewing(null)}
          footer={<><button className="btn" onClick={() => setViewing(null)}>Close</button><button className="btn primary" onClick={() => { setEditing(viewing); setViewing(null) }}>Edit</button></>}>
          {viewing.images.length ? (
            <div className="gallery">
              {viewing.images.map((img) => (
                <a key={img.id} href={fileUrl(img.url)} target="_blank" rel="noreferrer"><img src={fileUrl(img.url)} alt={img.originalName} /></a>
              ))}
            </div>
          ) : <p className="muted">No photos yet.</p>}
          <dl className="kv" style={{ marginTop: 14 }}>
            <dt>Price</dt><dd>{price(viewing)}</dd>
            <dt>Type</dt><dd>{viewing.category} · {viewing.propertyType} · {viewing.listingType}</dd>
            <dt>Specs</dt><dd>{viewing.bedrooms ?? '—'} bed · {viewing.areaSqft ?? '—'} sqft</dd>
            <dt>Location</dt><dd>{[viewing.address, viewing.locality, viewing.city].filter(Boolean).join(', ') || '—'}</dd>
            <dt>Status</dt><dd><Badge value={viewing.status} /></dd>
            <dt>Agent</dt><dd>{viewing.agent?.name ?? '—'}</dd>
            <dt>Description</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{viewing.description ?? '—'}</dd>
          </dl>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          message={<>Delete <b>{deleting.title}</b> and its {deleting.images.length} photo(s)? Deals and visits keep existing without the property link.</>}
          onConfirm={() => remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}
