import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DataTable, Pagination, RowActions } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { FilterSelect } from '../components/Form'
import { ContactForm } from '../components/forms/ContactForm'
import { Kanban } from '../components/Kanban'
import { ConfirmDialog, Modal } from '../components/Modal'
import { Avatar, Badge, ErrorBox, PageHead, Spinner, Toggle } from '../components/ui'
import { useIsManager } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useSearch } from '../context/SearchContext'
import { useToast } from '../context/ToastContext'
import { useCreateParam } from '../hooks/useCreateParam'
import { useList, useTableState } from '../hooks/useList'
import { errorMessage } from '../services/api'
import { activitiesApi, contactsApi } from '../services/crm'
import type { Contact } from '../types'
import { downloadCsv, fmtDate, money, phoneDigits, todayIso } from '../utils/format'

/**
 * Leads and Clients share this page. Clients are contacts that have reached
 * the Qualified stage or later.
 */
export function ContactsPage({ mode }: { mode: 'leads' | 'clients' }) {
  const isClients = mode === 'clients'
  const navigate = useNavigate()
  const toast = useToast()
  const isManager = useIsManager()
  const { meta, users, campaigns, refresh } = useData()
  const { debounced: search } = useSearch()
  const table = useTableState('createdAt')
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [urlParams] = useSearchParams()
  const emptyFilters = { stage: '', source: '', agentId: '', priority: '', followupDue: '', campaignId: '' }
  const [filters, setFilters] = useState({ ...emptyFilters, campaignId: urlParams.get('campaign') ?? '' })
  const [createOpen, setCreateOpen] = useCreateParam()
  const [editing, setEditing] = useState<Contact | null>(null)
  const [deleting, setDeleting] = useState<Contact | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)

  const kanban = view === 'kanban' && !isClients
  const params = {
    ...(kanban ? { page: 1, limit: 100, sortBy: 'updatedAt', sortOrder: 'DESC' } : table.params),
    ...filters,
    search,
    clientsOnly: isClients || undefined,
  }
  const list = useList(contactsApi.list, params)
  const setFilter = (k: keyof typeof filters) => (v: string) => {
    setFilters((f) => ({ ...f, [k]: v }))
    table.setPage(1)
  }
  const rows = list.data?.items
  const today = todayIso()

  const logQuick = (c: Contact, type: string) => {
    activitiesApi.create({ contactId: c.id, type, notes: 'Quick action from list' }).catch(() => {})
  }

  const remove = async (c: Contact) => {
    try {
      await contactsApi.remove(c.id)
      toast('Contact deleted.')
      refresh(['contacts'])
      list.reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const exportCsv = async () => {
    try {
      const all = await contactsApi.list({ ...params, page: 1, limit: 100 })
      downloadCsv(
        `${mode}.csv`,
        ['Name', 'Phone', 'Email', 'City', 'Property', 'Budget Max', 'Source', 'Agent', 'Stage', 'Next Follow-up'],
        all.items.map((c) => [c.name, c.phone, c.email, c.city, c.propertyInterest, c.budgetMax, c.source, c.agent?.name, c.stage, c.nextFollowup]),
      )
      if (all.total > all.items.length) toast(`Exported first ${all.items.length} of ${all.total}. Narrow the filters to export the rest.`, 'info')
      else toast('CSV exported.')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const columns: Column<Contact>[] = [
    ...(isManager && !isClients
      ? [{
          key: 'sel',
          header: (
            <input
              type="checkbox"
              className="checkbox"
              aria-label="Select all"
              checked={!!rows?.length && rows.every((r) => selected.has(r.id))}
              onChange={(e) => setSelected(e.target.checked ? new Set(rows?.map((r) => r.id)) : new Set())}
            />
          ),
          render: (c: Contact) => (
            <input type="checkbox" className="checkbox" checked={selected.has(c.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSel(c.id)} aria-label={`Select ${c.name}`} />
          ),
        }]
      : []),
    {
      key: 'name',
      header: isClients ? 'Profile' : 'Lead',
      sortKey: 'name',
      render: (c) => (
        <span className="cell-name">
          <Avatar name={c.name} contactId={c.id} hasPhoto={c.hasPhoto} version={c.updatedAt} />
          <span className="name-sub">{c.name}<small>{c.occupation || c.city || ''}</small></span>
        </span>
      ),
    },
    { key: 'phone', header: 'Phone', render: (c) => c.phone ?? '—' },
    ...(isClients ? [{ key: 'email', header: 'Email', render: (c: Contact) => c.email ?? '—' }] : []),
    { key: 'prop', header: isClients ? 'Interested In' : 'Property', render: (c) => c.propertyInterest ?? '—' },
    { key: 'budget', header: 'Budget', sortKey: 'budgetMax', render: (c) => money(c.budgetMax) },
    ...(!isClients ? [{ key: 'source', header: 'Source', sortKey: 'source', render: (c: Contact) => c.source }] : []),
    { key: 'agent', header: 'Agent', render: (c) => c.agent?.name ?? <span className="muted">Unassigned</span> },
    { key: 'stage', header: isClients ? 'Status' : 'Stage', sortKey: 'stage', render: (c) => <Badge value={c.stage} /> },
    {
      key: 'fu',
      header: 'Next Follow-up',
      sortKey: 'nextFollowup',
      render: (c) => <span className={c.nextFollowup && c.nextFollowup < today ? 'overdue' : undefined}>{fmtDate(c.nextFollowup)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <RowActions>
          {c.phone && <a className="btn sm" href={`tel:${phoneDigits(c.phone)}`} title="Call" onClick={() => logQuick(c, 'Call')}>📞</a>}
          {(c.whatsapp || c.phone) && (
            <a className="btn sm" href={`https://wa.me/${phoneDigits(c.whatsapp || c.phone)}`} target="_blank" rel="noreferrer" title="WhatsApp" onClick={() => logQuick(c, 'WhatsApp')}>💬</a>
          )}
          <button className="btn sm" title="Edit" onClick={() => setEditing(c)}>✏️</button>
          {isManager && <button className="btn sm" title="Delete" onClick={() => setDeleting(c)}>🗑</button>}
        </RowActions>
      ),
    },
  ]

  return (
    <>
      <PageHead
        title={isClients ? 'Clients' : 'Leads'}
        subtitle={isClients ? 'Qualified contacts — profiles, preferences and history' : 'Naye enquiries se lekar qualified leads tak'}
      >
        {!isClients && <Toggle value={view} options={[['table', 'Table'], ['kanban', 'Pipeline']]} onChange={setView} />}
        <button className="btn" onClick={exportCsv}>Export CSV</button>
        <button className="btn primary" onClick={() => setCreateOpen(true)}>+ Add {isClients ? 'Client' : 'Lead'}</button>
      </PageHead>

      <div className="block">
        <div className="filters">
          <FilterSelect
            value={filters.stage}
            onChange={setFilter('stage')}
            placeholder="All stages"
            options={(isClients ? meta?.clientStages : meta?.leadStages) ?? []}
          />
          <FilterSelect value={filters.source} onChange={setFilter('source')} placeholder="All sources" options={meta?.leadSources ?? []} />
          <FilterSelect
            value={filters.agentId}
            onChange={setFilter('agentId')}
            placeholder="All agents"
            options={[{ value: 'unassigned', label: 'Unassigned' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
          />
          <FilterSelect value={filters.priority} onChange={setFilter('priority')} placeholder="Any priority" options={meta?.priorities ?? []} />
          <FilterSelect value={filters.followupDue} onChange={setFilter('followupDue')} placeholder="Any follow-up" options={[{ value: 'true', label: 'Follow-up due' }]} />
          <FilterSelect value={filters.campaignId} onChange={setFilter('campaignId')} placeholder="Any campaign" options={campaigns.map((c) => ({ value: c.id, label: c.name }))} />
          {Object.values(filters).some(Boolean) && (
            <button className="btn sm ghost" onClick={() => setFilters(emptyFilters)}>Clear</button>
          )}
          <span className="muted" style={{ marginLeft: 'auto', fontSize: '.78rem' }}>
            {list.loading ? <Spinner /> : `${list.data?.total ?? 0} ${isClients ? 'clients' : 'leads'}`}
          </span>
        </div>
        {selected.size > 0 && !kanban && (
          <div className="filters" style={{ background: 'var(--forest-soft)' }}>
            <b>{selected.size} selected</b>
            <button className="btn sm" onClick={() => setBulkOpen(true)}>Assign to agent…</button>
            <button className="btn sm ghost" onClick={() => setSelected(new Set())}>Clear selection</button>
          </div>
        )}

        {kanban ? (
          list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
            <div style={{ padding: 12 }}>
              <Kanban
                stages={meta?.leadStages ?? []}
                items={rows ?? []}
                onOpen={(c) => navigate(`/contacts/${c.id}`)}
                renderCard={(c) => <ContactCard c={c} />}
                onMove={async (c, stage) => {
                  try {
                    await contactsApi.setStage(c.id, stage)
                    toast(`${c.name} → ${stage}`)
                  } catch (err) {
                    toast(errorMessage(err), 'error')
                  }
                  list.reload()
                }}
              />
              {(list.data?.total ?? 0) > 100 && <p className="muted">Showing the 100 most recently updated. Use filters to narrow down.</p>}
            </div>
          )
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              loading={list.loading}
              error={list.error}
              onRetry={list.reload}
              rowKey={(c) => c.id}
              onRowClick={(c) => navigate(`/contacts/${c.id}`)}
              sortBy={table.sortBy}
              sortOrder={table.sortOrder}
              onSort={table.toggleSort}
              empty={search || Object.values(filters).some(Boolean) ? 'No matches for these filters.' : `No ${mode} yet.`}
            />
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
          </>
        )}
      </div>

      {(createOpen || editing) && (
        <ContactForm
          contact={editing}
          defaultStage={isClients ? 'Qualified' : 'New'}
          onClose={() => {
            setCreateOpen(false)
            setEditing(null)
          }}
          onSaved={() => list.reload()}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={<>Delete <b>{deleting.name}</b>? Their visits, tasks, history and documents will also be deleted.</>}
          onConfirm={() => remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
      {bulkOpen && (
        <BulkAssign
          ids={[...selected]}
          onClose={() => setBulkOpen(false)}
          onDone={() => {
            setSelected(new Set())
            list.reload()
          }}
        />
      )}
    </>
  )
}

function BulkAssign({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: () => void }) {
  const { users } = useData()
  const toast = useToast()
  const [agentId, setAgentId] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      title={`Assign ${ids.length} lead(s)`}
      size="narrow"
      onClose={onClose}
      onSubmit={async () => {
        setBusy(true)
        try {
          const r = await contactsApi.bulkAssign(ids, agentId || null)
          toast(`${r.updated} lead(s) assigned.`)
          onDone()
          onClose()
        } catch (err) {
          toast(errorMessage(err), 'error')
        } finally {
          setBusy(false)
        }
      }}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy && <Spinner />} Assign</button>
        </>
      }
    >
      <label>Agent</label>
      <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
        <option value="">— Unassign —</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    </Modal>
  )
}

function ContactCard({ c }: { c: Contact }) {
  return (
    <>
      <div className="pname">{c.name}</div>
      <div className="pmeta">{c.propertyInterest || '—'} · {money(c.budgetMax)}</div>
      <span className="ptag">{c.source}</span>
    </>
  )
}
