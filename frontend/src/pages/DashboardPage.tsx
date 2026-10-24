import { Link, useNavigate } from 'react-router-dom'
import { Avatar, Badge, Bars, ErrorBox, KpiStrip, PageHead, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useLoad } from '../hooks/useList'
import { reportsApi } from '../services/crm'
import { fmtDate, money, phoneDigits, timeAgo, todayIso } from '../utils/format'

const FEED_IC: Record<string, string> = {
  Call: '📞',
  Email: '✉️',
  WhatsApp: '💬',
  Meeting: '🤝',
  Note: '📝',
  'Status Change': '🔁',
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useLoad(() => reportsApi.dashboard())

  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (loading && !data) return <div className="center-pad"><Spinner /> Loading dashboard…</div>
  if (!data) return null
  const k = data.kpis
  const today = todayIso()

  return (
    <>
      <PageHead
        title="Overview"
        subtitle={`Namaste, ${user?.name.split(' ')[0]} · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
      >
        <button className="btn" onClick={reload}>↻ Refresh</button>
        <Link className="btn primary" to="/leads?create=1">+ Add Lead</Link>
      </PageHead>

      <KpiStrip
        items={[
          ['Total Leads', k.totalLeads],
          ['New Today', k.newToday],
          ['Qualified Leads', k.qualifiedLeads],
          ['Follow-ups Due', k.followupsDue],
          ['Upcoming Visits', k.upcomingVisits],
          ['Active Deals', k.activeDeals],
          ['Closed Deals', k.closedDeals],
          ['Total Sales Value', money(k.totalSales)],
        ]}
      />

      <section className="block">
        <div className="block-head">
          <h2>Recent Leads</h2>
          <Link to="/leads" className="meta">View all {k.totalLeads} →</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lead</th><th>Phone</th><th>Property</th><th>Budget</th><th>Source</th><th>Agent</th><th>Stage</th><th>Next Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {data.recentLeads.length ? (
                data.recentLeads.map((c) => (
                  <tr key={c.id} className="rowclick" onClick={() => navigate(`/contacts/${c.id}`)}>
                    <td className="cell-name">
                      <Avatar name={c.name} contactId={c.id} hasPhoto={c.hasPhoto} />
                      <span className="name-sub">{c.name}<small>{c.city}</small></span>
                    </td>
                    <td>{c.phone ?? '—'}</td>
                    <td>{c.propertyInterest ?? '—'}</td>
                    <td>{money(c.budgetMax)}</td>
                    <td>{c.source}</td>
                    <td>{c.agentName ?? '—'}</td>
                    <td><Badge value={c.stage} /></td>
                    <td className={c.nextFollowup && c.nextFollowup < today ? 'overdue' : undefined}>{fmtDate(c.nextFollowup)}</td>
                  </tr>
                ))
              ) : (
                <tr className="empty-row"><td colSpan={8}>No leads yet. Add your first lead.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="split s-13-10">
        <section className="block">
          <div className="block-head"><h2>Today's Follow-ups</h2><Link to="/tasks" className="meta">Tasks →</Link></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Phone</th><th>Task</th><th>Priority</th><th>Agent</th></tr></thead>
              <tbody>
                {data.followups.length ? (
                  data.followups.map((f) => (
                    <tr key={f.kind + f.id} className={f.contactId ? 'rowclick' : undefined} onClick={() => f.contactId && navigate(`/contacts/${f.contactId}`)}>
                      <td>{f.contactName ?? '—'}</td>
                      <td>{f.phone ? <a href={`tel:${phoneDigits(f.phone)}`} onClick={(e) => e.stopPropagation()}>{f.phone}</a> : '—'}</td>
                      <td>{f.title}</td>
                      <td><Badge value={f.priority} /></td>
                      <td>{f.agentName ?? '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="empty-row"><td colSpan={5}>Nothing due today. 🎉</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="block">
          <div className="block-head"><h2>Lead Source Performance</h2><Link to="/marketing" className="meta">Details →</Link></div>
          <Bars rows={data.sources.map((s) => ({ label: s.source, value: s.count }))} />
        </section>
      </div>

      <div className="split s-1-1">
        <section className="block">
          <div className="block-head"><h2>Upcoming Site Visits</h2><Link to="/visits" className="meta">All visits →</Link></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Property</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
              <tbody>
                {data.upcomingVisits.length ? (
                  data.upcomingVisits.map((v) => (
                    <tr key={v.id}>
                      <td>{v.contactName}</td>
                      <td>{v.propertyTitle ?? '—'}</td>
                      <td>{fmtDate(v.visitDate)}</td>
                      <td>{v.visitTime ?? '—'}</td>
                      <td><Badge value={v.status} /></td>
                    </tr>
                  ))
                ) : (
                  <tr className="empty-row"><td colSpan={5}>No upcoming visits.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="block">
          <div className="block-head"><h2>Deal Summary</h2><Link to="/deals" className="meta">Pipeline →</Link></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Stage</th><th>Deals</th><th>Value</th></tr></thead>
              <tbody>
                {data.dealSummary.length ? (
                  data.dealSummary.map((d) => (
                    <tr key={d.stage}><td><Badge value={d.stage} /></td><td>{d.count}</td><td>{money(d.value)}</td></tr>
                  ))
                ) : (
                  <tr className="empty-row"><td colSpan={3}>No deals yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="block">
        <div className="block-head"><h2>Recent Activity</h2><Link to="/communications" className="meta">Communications →</Link></div>
        <div className="feed">
          {data.recentActivity.length ? (
            data.recentActivity.map((a) => (
              <div className="feed-item" key={a.id}>
                <div className="feed-ic">{FEED_IC[a.type] ?? '•'}</div>
                <div className="feed-text">
                  <b>{a.type}</b> · <Link to={`/contacts/${a.contactId}`}>{a.contactName}</Link>
                  {a.outcome && <> · {a.outcome}</>}
                  {a.notes && <div>{a.notes}</div>}
                  <div className="feed-time">{timeAgo(a.occurredAt)}{a.agentName && ` · ${a.agentName}`}</div>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No activity yet.</p>
          )}
        </div>
      </section>
    </>
  )
}
