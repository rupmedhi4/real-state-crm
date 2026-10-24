import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, Pagination, RowActions } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { FilterSelect } from '../components/Form'
import { DocumentForm } from '../components/forms/RecordForms'
import { ConfirmDialog } from '../components/Modal'
import { PageHead, Spinner } from '../components/ui'
import { useIsManager } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useSearch } from '../context/SearchContext'
import { useToast } from '../context/ToastContext'
import { useList, useTableState } from '../hooks/useList'
import { downloadFile, errorMessage } from '../services/api'
import { documentsApi } from '../services/crm'
import type { CrmDocument } from '../types'
import { fmtDate, fmtSize } from '../utils/format'

export function DocumentsPage() {
  const toast = useToast()
  const isManager = useIsManager()
  const { meta, contacts, properties } = useData()
  const { debounced: search } = useSearch()
  const table = useTableState('createdAt')
  const [filters, setFilters] = useState({ category: '', contactId: '', propertyId: '' })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleting, setDeleting] = useState<CrmDocument | null>(null)
  const list = useList(documentsApi.list, { ...table.params, ...filters, search })
  const setFilter = (k: keyof typeof filters) => (v: string) => {
    setFilters((f) => ({ ...f, [k]: v }))
    table.setPage(1)
  }

  const download = (d: CrmDocument) =>
    downloadFile(`/documents/${d.id}/download`, d.originalName).catch((err) => toast(errorMessage(err), 'error'))

  const columns: Column<CrmDocument>[] = [
    { key: 'name', header: 'File', sortKey: 'originalName', render: (d) => <>📄 {d.originalName}</> },
    { key: 'cat', header: 'Category', sortKey: 'category', render: (d) => d.category },
    {
      key: 'rel',
      header: 'Related To',
      render: (d) => (
        <>
          {d.contact && <Link to={`/contacts/${d.contact.id}`}>{d.contact.name}</Link>}
          {d.contact && (d.property || d.deal) && ' · '}
          {d.property?.title}
          {d.deal && <>{d.property && ' · '}Deal: {d.deal.title ?? 'untitled'}</>}
          {!d.contact && !d.property && !d.deal && '—'}
        </>
      ),
    },
    { key: 'size', header: 'Size', sortKey: 'sizeBytes', render: (d) => fmtSize(d.sizeBytes) },
    { key: 'by', header: 'Uploaded By', render: (d) => d.uploadedBy?.name ?? '—' },
    { key: 'date', header: 'Uploaded', sortKey: 'createdAt', render: (d) => fmtDate(d.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (d) => (
        <RowActions>
          <button className="btn sm" title="Download" onClick={() => download(d)}>⬇</button>
          {isManager && <button className="btn sm" title="Delete" onClick={() => setDeleting(d)}>🗑</button>}
        </RowActions>
      ),
    },
  ]

  return (
    <>
      <PageHead title="Documents" subtitle="Properties, clients aur deals se judi files">
        <button className="btn primary" onClick={() => setUploadOpen(true)}>+ Upload Document</button>
      </PageHead>
      <p className="muted" style={{ fontSize: '.8rem', margin: '-6px 0 16px' }}>
        Files are stored on the server and can only be downloaded by signed-in team members.
      </p>
      <div className="block">
        <div className="filters">
          <FilterSelect value={filters.category} onChange={setFilter('category')} placeholder="All categories" options={meta?.documentCategories ?? []} />
          <FilterSelect value={filters.contactId} onChange={setFilter('contactId')} placeholder="Any client" options={contacts.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={filters.propertyId} onChange={setFilter('propertyId')} placeholder="Any property" options={properties.map((p) => ({ value: p.id, label: p.title }))} />
          <span className="muted" style={{ marginLeft: 'auto', fontSize: '.78rem' }}>
            {list.loading ? <Spinner /> : `${list.data?.total ?? 0} files`}
          </span>
        </div>
        <DataTable
          columns={columns}
          rows={list.data?.items}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(d) => d.id}
          sortBy={table.sortBy}
          sortOrder={table.sortOrder}
          onSort={table.toggleSort}
          empty="No documents uploaded yet."
        />
        {list.data && (
          <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
        )}
      </div>

      {uploadOpen && <DocumentForm onClose={() => setUploadOpen(false)} onSaved={list.reload} />}
      {deleting && (
        <ConfirmDialog
          message={<>Delete <b>{deleting.originalName}</b>? The file is removed from storage.</>}
          onConfirm={async () => {
            try {
              await documentsApi.remove(deleting.id)
              toast('Document deleted.')
              list.reload()
            } catch (err) {
              toast(errorMessage(err), 'error')
            }
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}
