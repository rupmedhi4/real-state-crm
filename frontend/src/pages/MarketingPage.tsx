import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, Pagination, RowActions } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { SelectInput, TextInput } from '../components/Form'
import { CampaignForm } from '../components/forms/RecordForms'
import { ConfirmDialog } from '../components/Modal'
import { Badge, PageHead, Spinner } from '../components/ui'
import { useIsManager } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useSearch } from '../context/SearchContext'
import { useToast } from '../context/ToastContext'
import { useList, useLoad, useTableState } from '../hooks/useList'
import { errorMessage } from '../services/api'
import { contactsApi, marketingApi } from '../services/crm'
import type { Campaign } from '../types'
import { fmtDate, money } from '../utils/format'

export function MarketingPage() {
  const toast = useToast()
  const isManager = useIsManager()
  const { refresh } = useData()
  const { debounced: search } = useSearch()
  const sources = useLoad(() => marketingApi.sources())
  const table = useTableState('createdAt')
  const campaigns = useList(marketingApi.campaigns.list, { ...table.params, search })
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<Campaign | null>(null)

  const columns: Column<Campaign>[] = [
    { key: 'name', header: 'Campaign', sortKey: 'name', render: (c) => <Link to={`/leads?campaign=${c.id}`} onClick={(e) => e.stopPropagation()}>{c.name}</Link> },
    { key: 'source', header: 'Channel', render: (c) => c.source },
    { key: 'dates', header: 'Runs', sortKey: 'startDate', render: (c) => `${fmtDate(c.startDate)} → ${c.endDate ? fmtDate(c.endDate) : 'ongoing'}` },
    { key: 'status', header: 'Status', render: (c) => <Badge value={c.status} /> },
    { key: 'budget', header: 'Budget', sortKey: 'budget', render: (c) => money(c.budget) },
    { key: 'leads', header: 'Leads', render: (c) => c.leads ?? 0 },
    { key: 'q', header: 'Qualified+', render: (c) => c.qualified ?? 0 },
    { key: 'won', header: 'Won', render: (c) => c.won ?? 0 },
    { key: 'conv', header: 'Conversion', render: (c) => `${c.conversion ?? 0}%` },
    { key: 'cpl', header: 'Cost / Lead', render: (c) => money(c.costPerLead) },
    { key: 'rev', header: 'Revenue', render: (c) => money(c.revenue) },
    ...(isManager
      ? [{
          key: 'actions',
          header: 'Actions',
          render: (c: Campaign) => (
            <RowActions>
              <button className="btn sm" onClick={() => setEditing(c)}>✏️</button>
              <button className="btn sm" onClick={() => setDeleting(c)}>🗑</button>
            </RowActions>
          ),
        }]
      : []),
  ]

  return (
    <>
      <PageHead title="Marketing & Lead Sources" subtitle="Har source aur campaign kitna perform kar raha hai">
        {isManager && <button className="btn primary" onClick={() => setCreateOpen(true)}>+ New Campaign</button>}
      </PageHead>

      <section className="block">
        <div className="block-head"><h2>Source Performance</h2><span className="meta">From all leads and won deals</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Source</th><th>Leads</th><th>Qualified+</th><th>Deals Won</th><th>Revenue</th><th>Conversion</th></tr></thead>
            <tbody>
              {sources.loading && !sources.data ? (
                <tr className="loading-row"><td colSpan={6}><Spinner /></td></tr>
              ) : sources.data?.length ? (
                sources.data.map((s) => (
                  <tr key={s.source}>
                    <td>{s.source}</td><td>{s.leads}</td><td>{s.qualified}</td><td>{s.won}</td><td>{money(s.revenue)}</td><td>{s.conversion}%</td>
                  </tr>
                ))
              ) : (
                <tr className="empty-row"><td colSpan={6}>No leads yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Campaigns</h2></div>
        <DataTable
          columns={columns}
          rows={campaigns.data?.items}
          loading={campaigns.loading}
          error={campaigns.error}
          onRetry={campaigns.reload}
          rowKey={(c) => c.id}
          sortBy={table.sortBy}
          sortOrder={table.sortOrder}
          onSort={table.toggleSort}
          empty="No campaigns yet."
        />
        {campaigns.data && (
          <Pagination page={campaigns.data.page} totalPages={campaigns.data.totalPages} total={campaigns.data.total} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize} />
        )}
      </section>

      <LeadCapture
        onCaptured={() => {
          sources.reload()
          campaigns.reload()
        }}
      />

      {(createOpen || editing) && (
        <CampaignForm
          campaign={editing}
          onClose={() => {
            setCreateOpen(false)
            setEditing(null)
          }}
          onSaved={campaigns.reload}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={<>Delete campaign <b>{deleting.name}</b>? Its leads stay, without the campaign link.</>}
          onConfirm={async () => {
            try {
              await marketingApi.campaigns.remove(deleting.id)
              refresh(['campaigns'])
              toast('Campaign deleted.')
              campaigns.reload()
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

/** Internal enquiry form — saves a real lead through the API (legacy demo form). */
function LeadCapture({ onCaptured }: { onCaptured: () => void }) {
  const toast = useToast()
  const { meta, campaigns, refresh } = useData()
  const [v, setV] = useState({ name: '', phone: '', propertyInterest: '', source: 'Website', campaignId: '' })
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof v) => (val: string) => setV((p) => ({ ...p, [k]: val }))

  const submit = async () => {
    if (v.name.trim().length < 2) return toast('Enter the visitor name', 'error')
    setBusy(true)
    try {
      await contactsApi.create({ ...v, campaignId: v.campaignId || null, stage: 'New' })
      toast('Enquiry saved to Leads.')
      setV({ name: '', phone: '', propertyInterest: '', source: v.source, campaignId: v.campaignId })
      refresh(['contacts'])
      onCaptured()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="block">
      <div className="block-head">
        <h2>Quick Enquiry Capture</h2>
        <span className="meta">Walk-in or phone enquiry → saved straight to Leads</span>
      </div>
      <form className="block-body" style={{ maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); submit() }}>
        <div className="two-col">
          <TextInput label="Full Name" required value={v.name} onChange={set('name')} placeholder="Visitor name" />
          <TextInput label="Phone" value={v.phone} onChange={set('phone')} placeholder="98xxxxxxxx" />
        </div>
        <TextInput label="Interested Property" value={v.propertyInterest} onChange={set('propertyInterest')} placeholder="e.g. 2BHK in Dispur" />
        <div className="two-col">
          <SelectInput label="Source" value={v.source} onChange={set('source')} options={meta?.leadSources ?? []} />
          <SelectInput label="Campaign" value={v.campaignId} onChange={set('campaignId')} placeholder="— none —" options={campaigns.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn primary" disabled={busy}>{busy && <Spinner />} Save Enquiry</button>
        </div>
      </form>
    </section>
  )
}
