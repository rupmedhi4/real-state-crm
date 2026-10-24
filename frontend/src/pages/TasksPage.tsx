import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, Pagination, RowActions } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { FilterSelect } from '../components/Form'
import { TaskForm } from '../components/forms/RecordForms'
import { ConfirmDialog } from '../components/Modal'
import { Badge, PageHead, Spinner } from '../components/ui'
import { useData } from '../context/DataContext'
import { useSearch } from '../context/SearchContext'
import { useToast } from '../context/ToastContext'
import { useCreateParam } from '../hooks/useCreateParam'
import { useList, useLoad, useTableState } from '../hooks/useList'
import { errorMessage } from '../services/api'
import { tasksApi } from '../services/crm'
import type { Task } from '../types'
import { fmtDate, todayIso } from '../utils/format'

const BUCKETS = [
  ['', 'All'],
  ['overdue', 'Overdue'],
  ['today', 'Today'],
  ['upcoming', 'Upcoming'],
  ['completed', 'Completed'],
] as const

export function TasksPage() {
  const toast = useToast()
  const { meta, users } = useData()
  const { debounced: search } = useSearch()
  const table = useTableState('dueDate', 'ASC')
  const [bucket, setBucket] = useState<string>('')
  const [filters, setFilters] = useState({ assigneeId: '', priority: '' })
  const [createOpen, setCreateOpen] = useCreateParam()
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const list = useList(tasksApi.list, { ...table.params, ...filters, bucket, search })
  const counts = useLoad(() => tasksApi.counts(filters.assigneeId || undefined), [filters.assigneeId])
  const reload = () => {
    list.reload()
    counts.reload()
  }
  const today = todayIso()

  const complete = async (t: Task) => {
    try {
      await tasksApi.complete(t.id)
      toast('Marked complete.')
      reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const columns: Column<Task>[] = [
    { key: 'title', header: 'Title', sortKey: 'title', render: (t) => t.title },
    { key: 'rel', header: 'Related To', render: (t) => t.contact ? <Link to={`/contacts/${t.contact.id}`} onClick={(e) => e.stopPropagation()}>{t.contact.name}</Link> : '—' },
    { key: 'type', header: 'Type', render: (t) => t.type },
    {
      key: 'due',
      header: 'Due',
      sortKey: 'dueDate',
      render: (t) => (
        <span className={t.dueDate && t.dueDate < today && t.status !== 'Completed' ? 'overdue' : undefined}>
          {fmtDate(t.dueDate)} {t.dueTime}
        </span>
      ),
    },
    { key: 'priority', header: 'Priority', sortKey: 'priority', render: (t) => <Badge value={t.priority} /> },
    { key: 'owner', header: 'Owner', render: (t) => t.assignee?.name ?? '—' },
    { key: 'status', header: 'Status', render: (t) => <Badge value={t.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (t) => (
        <RowActions>
          {t.status !== 'Completed' && <button className="btn sm" title="Complete" onClick={() => complete(t)}>✔</button>}
          <button className="btn sm" title="Edit" onClick={() => setEditing(t)}>✏️</button>
          <button className="btn sm" title="Delete" onClick={() => setDeleting(t)}>🗑</button>
        </RowActions>
      ),
    },
  ]

  return (
    <>
      <PageHead title="Tasks & Follow-ups" subtitle="Daily agenda — kuch bhi chhutna nahi chahiye">
        <button className="btn primary" onClick={() => setCreateOpen(true)}>+ Add Task</button>
      </PageHead>
      <div className="toggle-group" style={{ marginBottom: 14 }}>
        {BUCKETS.map(([k, label]) => (
          <button key={k} className={bucket === k ? 'active' : ''} onClick={() => { setBucket(k); table.setPage(1) }}>
            {label}{k && counts.data ? ` (${counts.data[k] ?? 0})` : ''}
          </button>
        ))}
      </div>
      <div className="block">
        <div className="filters">
          <FilterSelect
            value={filters.assigneeId}
            onChange={(v) => { setFilters((f) => ({ ...f, assigneeId: v })); table.setPage(1) }}
            placeholder="Everyone's tasks"
            options={[{ value: 'me', label: 'My tasks' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
          />
          <FilterSelect value={filters.priority} onChange={(v) => { setFilters((f) => ({ ...f, priority: v })); table.setPage(1) }} placeholder="Any priority" options={meta?.priorities ?? []} />
          <span className="muted" style={{ marginLeft: 'auto', fontSize: '.78rem' }}>
            {list.loading ? <Spinner /> : `${list.data?.total ?? 0} tasks`}
          </span>
        </div>
        <DataTable
          columns={columns}
          rows={list.data?.items}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(t) => t.id}
          onRowClick={setEditing}
          sortBy={table.sortBy}
          sortOrder={table.sortOrder}
          onSort={table.toggleSort}
          empty="No tasks here."
        />
        {list.data && (
          <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
        )}
      </div>

      {(createOpen || editing) && (
        <TaskForm
          task={editing}
          onClose={() => {
            setCreateOpen(false)
            setEditing(null)
          }}
          onSaved={reload}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={<>Delete task “<b>{deleting.title}</b>”?</>}
          onConfirm={async () => {
            try {
              await tasksApi.remove(deleting.id)
              toast('Task deleted.')
              reload()
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
