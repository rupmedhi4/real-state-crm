import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, Pagination, RowActions } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { FilterSelect } from '../components/Form'
import { VisitForm } from '../components/forms/RecordForms'
import { ConfirmDialog } from '../components/Modal'
import { Badge, PageHead, Spinner, Toggle } from '../components/ui'
import { useData } from '../context/DataContext'
import { useSearch } from '../context/SearchContext'
import { useToast } from '../context/ToastContext'
import { useCreateParam } from '../hooks/useCreateParam'
import { useList, useTableState } from '../hooks/useList'
import { errorMessage } from '../services/api'
import { visitsApi } from '../services/crm'
import type { Visit } from '../types'
import { fmtDate } from '../utils/format'

export function VisitsPage() {
  const toast = useToast()
  const { meta, users } = useData()
  const { debounced: search } = useSearch()
  const [when, setWhen] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const table = useTableState('visitDate', 'ASC')
  const [filters, setFilters] = useState({ status: '', agentId: '' })
  const [createOpen, setCreateOpen] = useCreateParam()
  const [editing, setEditing] = useState<Visit | null>(null)
  const [deleting, setDeleting] = useState<Visit | null>(null)
  const list = useList(visitsApi.list, {
    ...table.params,
    sortOrder: when === 'past' && table.sortBy === 'visitDate' ? 'DESC' : table.sortOrder,
    ...filters,
    when: when === 'all' ? undefined : when,
    search,
  })
  const setFilter = (k: keyof typeof filters) => (v: string) => {
    setFilters((f) => ({ ...f, [k]: v }))
    table.setPage(1)
  }

  const quickStatus = async (v: Visit, status: string) => {
    try {
      await visitsApi.update(v.id, { status })
      toast(`Visit marked ${status}.`)
      list.reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const columns: Column<Visit>[] = [
    { key: 'client', header: 'Client', render: (v) => v.contact ? <Link to={`/contacts/${v.contact.id}`} onClick={(e) => e.stopPropagation()}>{v.contact.name}</Link> : '—' },
    { key: 'prop', header: 'Property', render: (v) => v.property?.title ?? '—' },
    { key: 'date', header: 'Date', sortKey: 'visitDate', render: (v) => fmtDate(v.visitDate) },
    { key: 'time', header: 'Time', render: (v) => v.visitTime ?? '—' },
    { key: 'agent', header: 'Agent', render: (v) => v.agent?.name ?? '—' },
    { key: 'status', header: 'Status', sortKey: 'status', render: (v) => <Badge value={v.status} /> },
    { key: 'fb', header: 'Feedback', className: 'wrap', render: (v) => v.feedback ?? <span className="muted">—</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (v) => (
        <RowActions>
          {['Scheduled', 'Rescheduled'].includes(v.status) && <button className="btn sm" title="Confirm" onClick={() => quickStatus(v, 'Confirmed')}>👍</button>}
          {['Scheduled', 'Confirmed', 'Rescheduled'].includes(v.status) && <button className="btn sm" title="Mark completed" onClick={() => quickStatus(v, 'Completed')}>✔</button>}
          <button className="btn sm" title="Edit / feedback" onClick={() => setEditing(v)}>✏️</button>
          <button className="btn sm" title="Delete" onClick={() => setDeleting(v)}>🗑</button>
        </RowActions>
      ),
    },
  ]

  return (
    <>
      <PageHead title="Site Visits" subtitle="Property viewings schedule karein aur track karein">
        <Toggle value={when} options={[['upcoming', 'Upcoming'], ['past', 'Past'], ['all', 'All']]} onChange={(v) => { setWhen(v); table.setPage(1) }} />
        <button className="btn primary" onClick={() => setCreateOpen(true)}>+ Schedule Visit</button>
      </PageHead>
      <div className="block">
        <div className="filters">
          <FilterSelect value={filters.status} onChange={setFilter('status')} placeholder="Any status" options={meta?.visitStatuses ?? []} />
          <FilterSelect value={filters.agentId} onChange={setFilter('agentId')} placeholder="All agents" options={users.map((u) => ({ value: u.id, label: u.name }))} />
          <span className="muted" style={{ marginLeft: 'auto', fontSize: '.78rem' }}>
            {list.loading ? <Spinner /> : `${list.data?.total ?? 0} visits`}
          </span>
        </div>
        <DataTable
          columns={columns}
          rows={list.data?.items}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(v) => v.id}
          onRowClick={setEditing}
          sortBy={table.sortBy}
          sortOrder={table.sortOrder}
          onSort={table.toggleSort}
          empty={when === 'upcoming' ? 'No upcoming visits scheduled.' : 'No visits found.'}
        />
        {list.data && (
          <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
        )}
      </div>
      <p className="muted" style={{ fontSize: '.78rem' }}>
        Scheduling a visit here does not send an SMS or calendar invite to the client.
      </p>

      {(createOpen || editing) && (
        <VisitForm
          visit={editing}
          onClose={() => {
            setCreateOpen(false)
            setEditing(null)
          }}
          onSaved={list.reload}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={<>Delete the visit for <b>{deleting.contact?.name}</b> on {fmtDate(deleting.visitDate)}?</>}
          onConfirm={async () => {
            try {
              await visitsApi.remove(deleting.id)
              toast('Visit deleted.')
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
