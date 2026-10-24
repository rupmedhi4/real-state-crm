import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DataTable, Pagination, RowActions } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { FilterSelect } from '../components/Form'
import { DealForm } from '../components/forms/RecordForms'
import { Kanban } from '../components/Kanban'
import { ConfirmDialog } from '../components/Modal'
import { Badge, ErrorBox, KpiStrip, PageHead, Spinner, Toggle } from '../components/ui'
import { useIsManager } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useSearch } from '../context/SearchContext'
import { useToast } from '../context/ToastContext'
import { useCreateParam } from '../hooks/useCreateParam'
import { useList, useLoad, useTableState } from '../hooks/useList'
import { errorMessage } from '../services/api'
import { dealsApi } from '../services/crm'
import type { Deal } from '../types'
import { fmtDate, money } from '../utils/format'

export function DealsPage() {
  const toast = useToast()
  const isManager = useIsManager()
  const { meta, users } = useData()
  const { debounced: search } = useSearch()
  const table = useTableState('createdAt')
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [filters, setFilters] = useState({ stage: '', transactionStatus: '', agentId: '', status: '' })
  const [createOpen, setCreateOpen] = useCreateParam()
  const [editing, setEditing] = useState<Deal | null>(null)
  const [deleting, setDeleting] = useState<Deal | null>(null)
  const [params, setParams] = useSearchParams()
  const kanban = view === 'kanban'
  const list = useList(dealsApi.list, {
    ...(kanban ? { page: 1, limit: 100 } : table.params),
    ...filters,
    search,
  })
  const summary = useLoad(() => dealsApi.summary())
  const reload = () => {
    list.reload()
    summary.reload()
  }
  const setFilter = (k: keyof typeof filters) => (v: string) => {
    setFilters((f) => ({ ...f, [k]: v }))
    table.setPage(1)
  }

  // Deep link from a contact page: /deals?open=<id>
  useEffect(() => {
    const id = params.get('open')
    if (!id) return
    params.delete('open')
    setParams(params, { replace: true })
    dealsApi.get(id).then(setEditing).catch(() => {})
  }, [params, setParams])

  const remove = async (d: Deal) => {
    try {
      await dealsApi.remove(d.id)
      toast('Deal deleted.')
      reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const s = summary.data
  const columns: Column<Deal>[] = [
    { key: 'title', header: 'Deal', render: (d) => d.title ?? <span className="muted">Untitled</span> },
    { key: 'client', header: 'Client', render: (d) => d.contact?.name ?? '—' },
    { key: 'prop', header: 'Property', render: (d) => d.property?.title ?? '—' },
    { key: 'value', header: 'Value', sortKey: 'value', render: (d) => money(d.value) },
    { key: 'stage', header: 'Stage', sortKey: 'stage', render: (d) => <Badge value={d.stage} /> },
    { key: 'prob', header: 'Prob.', sortKey: 'probability', render: (d) => `${d.probability}%` },
    { key: 'comm', header: 'Commission', render: (d) => `${money(d.commissionAmount)} (${d.commissionPct}%)` },
    { key: 'tx', header: 'Transaction', render: (d) => <Badge value={d.transactionStatus} /> },
    { key: 'close', header: 'Closing', sortKey: 'expectedClosing', render: (d) => fmtDate(d.expectedClosing) },
    { key: 'agent', header: 'Agent', render: (d) => d.agent?.name ?? '—' },
    {
      key: 'actions',
      header: 'Actions',
      render: (d) => (
        <RowActions>
          <button className="btn sm" onClick={() => setEditing(d)}>✏️</button>
          {isManager && <button className="btn sm" onClick={() => setDeleting(d)}>🗑</button>}
        </RowActions>
      ),
    },
  ]

  return (
    <>
      <PageHead title="Deals & Sales Pipeline" subtitle="Opportunities ko close tak track karein">
        <Toggle value={view} options={[['kanban', 'Pipeline'], ['table', 'Table']]} onChange={setView} />
        <button className="btn primary" onClick={() => setCreateOpen(true)}>+ Add Deal</button>
      </PageHead>

      {s && (
        <KpiStrip
          items={[
            ['Pipeline Value', money(s.pipelineValue)],
            ['Weighted Value', money(s.weightedValue)],
            ['Open Deals', s.open],
            ['Won Deals', s.won],
            ['Lost Deals', s.lost],
            ['Win Rate', `${s.winRate}%`],
            ['Revenue (Won)', money(s.revenue)],
            ['Commission Earned', money(s.commissionEarned)],
          ]}
        />
      )}

      <div className="block">
        <div className="filters">
          {!kanban && <FilterSelect value={filters.stage} onChange={setFilter('stage')} placeholder="All stages" options={meta?.dealStages ?? []} />}
          <FilterSelect value={filters.status} onChange={setFilter('status')} placeholder="Open + closed" options={[{ value: 'open', label: 'Open only' }, { value: 'won', label: 'Won' }, { value: 'lost', label: 'Lost' }]} />
          <FilterSelect value={filters.transactionStatus} onChange={setFilter('transactionStatus')} placeholder="Any transaction status" options={meta?.transactionStatuses ?? []} />
          <FilterSelect value={filters.agentId} onChange={setFilter('agentId')} placeholder="All agents" options={users.map((u) => ({ value: u.id, label: u.name }))} />
          <span className="muted" style={{ marginLeft: 'auto', fontSize: '.78rem' }}>
            {list.loading ? <Spinner /> : `${list.data?.total ?? 0} deals`}
          </span>
        </div>
        {kanban ? (
          list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
            <div style={{ padding: 12 }}>
              <Kanban
                stages={meta?.dealStages ?? []}
                items={list.data?.items ?? []}
                onOpen={setEditing}
                onMove={async (d, stage) => {
                  try {
                    await dealsApi.setStage(d.id, stage)
                    toast(`Deal → ${stage}`)
                  } catch (err) {
                    toast(errorMessage(err), 'error')
                  }
                  reload()
                }}
                renderCard={(d) => (
                  <>
                    <div className="pname">{d.contact?.name ?? '—'}</div>
                    <div className="pmeta">{d.property?.title ?? d.title ?? '—'} · {money(d.value)}</div>
                    <span className="ptag">{d.probability}% probability</span>
                  </>
                )}
              />
            </div>
          )
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={list.data?.items}
              loading={list.loading}
              error={list.error}
              onRetry={list.reload}
              rowKey={(d) => d.id}
              onRowClick={setEditing}
              sortBy={table.sortBy}
              sortOrder={table.sortOrder}
              onSort={table.toggleSort}
              empty="No deals yet."
            />
            {list.data && (
              <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
            )}
          </>
        )}
      </div>

      {(createOpen || editing) && (
        <DealForm
          deal={editing}
          onClose={() => {
            setCreateOpen(false)
            setEditing(null)
          }}
          onSaved={reload}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={<>Delete this deal{deleting.title ? <> “<b>{deleting.title}</b>”</> : ''}? Documents attached to it are deleted too.</>}
          onConfirm={() => remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}
