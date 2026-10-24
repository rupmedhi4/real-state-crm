import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, Pagination, RowActions } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { FilterSelect } from '../components/Form'
import { ActivityForm } from '../components/forms/RecordForms'
import { ConfirmDialog } from '../components/Modal'
import { Badge, PageHead, Spinner } from '../components/ui'
import { useData } from '../context/DataContext'
import { useSearch } from '../context/SearchContext'
import { useToast } from '../context/ToastContext'
import { useList, useTableState } from '../hooks/useList'
import { errorMessage } from '../services/api'
import { activitiesApi } from '../services/crm'
import type { Activity } from '../types'
import { fmtDateTime } from '../utils/format'

export function CommunicationsPage() {
  const toast = useToast()
  const { meta, users } = useData()
  const { debounced: search } = useSearch()
  const table = useTableState('occurredAt')
  const [filters, setFilters] = useState({ type: '', agentId: '' })
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [deleting, setDeleting] = useState<Activity | null>(null)
  const list = useList(activitiesApi.list, { ...table.params, ...filters, search })
  const setFilter = (k: keyof typeof filters) => (v: string) => {
    setFilters((f) => ({ ...f, [k]: v }))
    table.setPage(1)
  }

  const columns: Column<Activity>[] = [
    { key: 'date', header: 'Date', sortKey: 'occurredAt', render: (a) => fmtDateTime(a.occurredAt) },
    { key: 'type', header: 'Type', sortKey: 'type', render: (a) => a.type },
    { key: 'contact', header: 'Contact', render: (a) => a.contact ? <Link to={`/contacts/${a.contact.id}`} onClick={(e) => e.stopPropagation()}>{a.contact.name}</Link> : '—' },
    { key: 'agent', header: 'Agent', render: (a) => a.agent?.name ?? '—' },
    { key: 'outcome', header: 'Outcome', render: (a) => <Badge value={a.outcome} /> },
    { key: 'notes', header: 'Notes', className: 'wrap', render: (a) => a.notes ?? '—' },
    {
      key: 'actions',
      header: 'Actions',
      render: (a) => (
        <RowActions>
          <button className="btn sm" onClick={() => setEditing(a)}>✏️</button>
          <button className="btn sm" onClick={() => setDeleting(a)}>🗑</button>
        </RowActions>
      ),
    },
  ]

  return (
    <>
      <PageHead title="Communications" subtitle="Har call, email, WhatsApp aur note ka ek hi timeline">
        <button className="btn primary" onClick={() => setCreateOpen(true)}>+ Log Activity</button>
      </PageHead>
      <p className="muted" style={{ fontSize: '.8rem', margin: '-6px 0 16px' }}>
        Call/WhatsApp buttons only open your phone or WhatsApp app and log the attempt — no message is sent automatically.
      </p>
      <div className="block">
        <div className="filters">
          <FilterSelect value={filters.type} onChange={setFilter('type')} placeholder="All types" options={meta?.activityTypes ?? []} />
          <FilterSelect value={filters.agentId} onChange={setFilter('agentId')} placeholder="All agents" options={users.map((u) => ({ value: u.id, label: u.name }))} />
          <span className="muted" style={{ marginLeft: 'auto', fontSize: '.78rem' }}>
            {list.loading ? <Spinner /> : `${list.data?.total ?? 0} entries`}
          </span>
        </div>
        <DataTable
          columns={columns}
          rows={list.data?.items}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(a) => a.id}
          sortBy={table.sortBy}
          sortOrder={table.sortOrder}
          onSort={table.toggleSort}
          empty="No communication logged yet."
        />
        {list.data && (
          <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
        )}
      </div>

      {(createOpen || editing) && (
        <ActivityForm
          activity={editing}
          onClose={() => {
            setCreateOpen(false)
            setEditing(null)
          }}
          onSaved={list.reload}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message="Delete this communication entry?"
          onConfirm={async () => {
            try {
              await activitiesApi.remove(deleting.id)
              toast('Deleted.')
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
