import { useState } from 'react'
import { Bars, KpiStrip, PageHead, Spinner } from '../components/ui'
import { useLoad } from '../hooks/useList'
import { agentsApi, dealsApi, reportsApi } from '../services/crm'
import { downloadCsv, money } from '../utils/format'

/** All figures are aggregated by the API from live database records. */
export function ReportsPage() {
  const [months, setMonths] = useState(12)
  const summary = useLoad(() => dealsApi.summary())
  const dash = useLoad(() => reportsApi.dashboard())
  const status = useLoad(() => reportsApi.leadStatus())
  const funnel = useLoad(() => reportsApi.funnel())
  const revenue = useLoad(() => reportsApi.revenue(months), [months])
  const visits = useLoad(() => reportsApi.visits())
  const inventory = useLoad(() => reportsApi.inventory())
  const agents = useLoad(() => agentsApi.stats())

  const s = summary.data
  return (
    <>
      <PageHead title="Reports & Analytics" subtitle="Sab kuch actual database records se calculate hota hai">
        <button
          className="btn"
          disabled={!agents.data}
          onClick={() =>
            downloadCsv(
              'agent-performance.csv',
              ['Agent', 'Role', 'Leads', 'Active Deals', 'Won Deals', 'Revenue', 'Visits', 'Activities'],
              (agents.data ?? []).map((a) => [a.name, a.role, a.assignedLeads, a.activeDeals, a.wonDeals, a.revenue, a.siteVisits, a.activitiesLogged]),
            )
          }
        >
          Export Agent CSV
        </button>
      </PageHead>

      {s && dash.data ? (
        <KpiStrip
          items={[
            ['Total Leads', dash.data.kpis.totalLeads],
            ['Won Deals', s.won],
            ['Lost Deals', s.lost],
            ['Win Rate', `${s.winRate}%`],
            ['Pipeline Value', money(s.pipelineValue)],
            ['Revenue (Won)', money(s.revenue)],
            ['Commission', money(s.commissionEarned)],
          ]}
        />
      ) : (
        <div className="center-pad"><Spinner /></div>
      )}

      <div className="split s-1-1">
        <section className="block">
          <div className="block-head"><h2>Lead Status Distribution</h2></div>
          <Bars rows={(status.data ?? []).map((r) => ({ label: r.stage, value: r.count }))} />
        </section>
        <section className="block">
          <div className="block-head"><h2>Conversion Funnel</h2><span className="meta">Leads that reached each stage</span></div>
          <Bars rows={(funnel.data ?? []).map((r) => ({ label: r.stage, value: r.count, display: `${r.count} · ${r.percent}%` }))} />
        </section>
      </div>

      <section className="block">
        <div className="block-head"><h2>Agent Performance</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Agent</th><th>Leads</th><th>Active Deals</th><th>Deals Won</th><th>Revenue (Won)</th><th>Site Visits</th><th>Activities Logged</th></tr></thead>
            <tbody>
              {agents.data?.length ? agents.data.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td><td>{a.assignedLeads}</td><td>{a.activeDeals}</td><td>{a.wonDeals}</td>
                  <td>{money(a.revenue)}</td><td>{a.siteVisits}</td><td>{a.activitiesLogged}</td>
                </tr>
              )) : <tr className="empty-row"><td colSpan={7}>{agents.loading ? <Spinner /> : 'No agents.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="block">
        <div className="block-head">
          <h2>Revenue by Month (Won Deals)</h2>
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} style={{ width: 'auto' }}>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Month</th><th>Deals Won</th><th>Revenue</th><th>Commission</th></tr></thead>
            <tbody>
              {revenue.data?.length ? revenue.data.map((r) => (
                <tr key={r.month}><td>{r.month}</td><td>{r.deals}</td><td>{money(r.revenue)}</td><td>{money(r.commission)}</td></tr>
              )) : <tr className="empty-row"><td colSpan={4}>{revenue.loading ? <Spinner /> : 'No won deals in this period.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="split s-1-1">
        <section className="block">
          <div className="block-head"><h2>Site Visit Outcomes</h2></div>
          <Bars rows={(visits.data ?? []).map((r) => ({ label: r.status, value: r.count }))} empty="No visits yet." />
        </section>
        <section className="block">
          <div className="block-head"><h2>Property Inventory</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Status</th><th>Listing</th><th>Count</th><th>Total Value</th></tr></thead>
              <tbody>
                {inventory.data?.length ? inventory.data.map((r) => (
                  <tr key={r.status + r.listingType}><td>{r.status}</td><td>{r.listingType}</td><td>{r.count}</td><td>{money(r.value)}</td></tr>
                )) : <tr className="empty-row"><td colSpan={4}>{inventory.loading ? <Spinner /> : 'No properties.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}
