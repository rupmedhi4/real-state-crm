import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ContactForm } from '../components/forms/ContactForm'
import { ActivityForm, DealForm, DocumentForm, TaskForm, VisitForm } from '../components/forms/RecordForms'
import { ConfirmDialog } from '../components/Modal'
import { Avatar, Badge, ErrorBox, Spinner } from '../components/ui'
import { useAuth, useIsManager } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useList, useLoad } from '../hooks/useList'
import { downloadFile, errorMessage } from '../services/api'
import { activitiesApi, contactsApi, dealsApi, documentsApi, tasksApi, visitsApi } from '../services/crm'
import { fmtDate, fmtDateTime, fmtSize, money, phoneDigits } from '../utils/format'

type Dialog = 'edit' | 'activity' | 'visit' | 'task' | 'deal' | 'doc' | 'delete' | null

export function ContactDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isManager = useIsManager()
  const { hasRole } = useAuth()
  const { meta, users, refresh } = useData()
  const [dialog, setDialog] = useState<Dialog>(null)
  const contact = useLoad(() => contactsApi.get(id), [id])
  const byContact = { contactId: id, limit: 50 }
  const history = useList(activitiesApi.list, { ...byContact, sortBy: 'occurredAt', sortOrder: 'DESC' })
  const deals = useList(dealsApi.list, byContact)
  const visits = useList(visitsApi.list, { ...byContact, sortBy: 'visitDate', sortOrder: 'DESC' })
  const tasks = useList(tasksApi.list, byContact)
  const docs = useList(documentsApi.list, byContact)

  if (contact.error) return <ErrorBox message={contact.error} onRetry={contact.reload} />
  if (!contact.data) return <div className="center-pad"><Spinner /> Loading…</div>
  const c = contact.data
  const defaults = { contactId: c.id }

  const quick = async (patch: () => Promise<unknown>, msg: string) => {
    try {
      await patch()
      toast(msg)
      contact.reload()
      history.reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const reloadAll = () => {
    contact.reload()
    history.reload()
    deals.reload()
    visits.reload()
    tasks.reload()
    docs.reload()
  }

  return (
    <>
      <Link to={meta?.clientStages.includes(c.stage) ? '/clients' : '/leads'} className="back-link">← Back</Link>
      <div className="page-head">
        <div className="detail-head">
          <Avatar name={c.name} contactId={c.id} hasPhoto={c.hasPhoto} size={56} version={c.updatedAt} />
          <div>
            <h1>{c.name}</h1>
            <p>
              <Badge value={c.stage} /> <Badge value={c.priority} /> · {c.source}
              {c.campaign && <> · {c.campaign.name}</>} · added {fmtDate(c.createdAt)}
            </p>
          </div>
        </div>
        <div className="page-actions">
          {c.phone && <a className="btn" href={`tel:${phoneDigits(c.phone)}`}>📞 Call</a>}
          {(c.whatsapp || c.phone) && (
            <a className="btn" href={`https://wa.me/${phoneDigits(c.whatsapp || c.phone)}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>
          )}
          {c.email && <a className="btn" href={`mailto:${c.email}`}>✉️ Email</a>}
          <button className="btn primary" onClick={() => setDialog('edit')}>Edit</button>
          {isManager && <button className="btn danger" onClick={() => setDialog('delete')}>Delete</button>}
        </div>
      </div>

      <div className="split s-1-2">
        <div>
          <section className="block">
            <div className="block-head"><h2>Profile</h2></div>
            <div className="block-body">
              <dl className="kv">
                <dt>Phone</dt><dd>{c.phone ?? '—'}</dd>
                <dt>WhatsApp</dt><dd>{c.whatsapp ?? '—'}</dd>
                <dt>Email</dt><dd>{c.email ?? '—'}</dd>
                <dt>City</dt><dd>{c.city ?? '—'}</dd>
                <dt>Address</dt><dd>{c.address ?? '—'}</dd>
                <dt>Occupation</dt><dd>{c.occupation ?? '—'}</dd>
              </dl>
            </div>
          </section>
          <section className="block">
            <div className="block-head"><h2>Requirement & Preferences</h2></div>
            <div className="block-body">
              <dl className="kv">
                <dt>Looking for</dt><dd>{c.propertyInterest ?? '—'}</dd>
                <dt>Type / Intent</dt><dd>{c.propertyCategory} · {c.intent}{c.configuration && ` · ${c.configuration}`}</dd>
                <dt>Budget</dt>
                <dd>
                  {c.budgetMin && c.budgetMax
                    ? `${money(c.budgetMin)} – ${money(c.budgetMax)}`
                    : c.budgetMax
                      ? `up to ${money(c.budgetMax)}`
                      : c.budgetMin
                        ? `from ${money(c.budgetMin)}`
                        : '—'}
                </dd>
                <dt>Preferences</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{c.preferences ?? '—'}</dd>
              </dl>
            </div>
          </section>
          <section className="block">
            <div className="block-head"><h2>Status & Assignment</h2></div>
            <div className="block-body">
              <label style={{ marginTop: 0 }}>Stage</label>
              <select value={c.stage} onChange={(e) => quick(() => contactsApi.setStage(c.id, e.target.value), `Stage → ${e.target.value}`)}>
                {meta?.leadStages.map((s) => <option key={s}>{s}</option>)}
              </select>
              <label>Assigned Agent</label>
              {hasRole('ADMIN', 'MANAGER') ? (
                <select
                  value={c.agentId ?? ''}
                  onChange={(e) => quick(() => contactsApi.assign(c.id, e.target.value || null), 'Lead reassigned.')}
                >
                  <option value="">— Unassigned —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              ) : (
                <div>{c.agent?.name ?? 'Unassigned'}</div>
              )}
              <label>Next Follow-up</label>
              <input
                type="date"
                value={c.nextFollowup ?? ''}
                onChange={(e) => quick(() => contactsApi.update(c.id, { nextFollowup: e.target.value || null }), 'Follow-up date saved.')}
              />
            </div>
          </section>
        </div>

        <div>
          <section className="block">
            <div className="block-head">
              <h2>Interaction History</h2>
              <button className="btn sm primary" onClick={() => setDialog('activity')}>+ Log Activity</button>
            </div>
            <div className="feed">
              {history.loading && !history.data ? <p className="muted"><Spinner /></p> : history.data?.items.length ? (
                history.data.items.map((a) => (
                  <div className="feed-item" key={a.id}>
                    <div className="feed-ic">{a.type === 'Call' ? '📞' : a.type === 'WhatsApp' ? '💬' : a.type === 'Email' ? '✉️' : a.type === 'Meeting' ? '🤝' : a.type === 'Status Change' ? '🔁' : '📝'}</div>
                    <div className="feed-text">
                      <b>{a.type}</b>{a.outcome && <> · <Badge value={a.outcome} /></>}
                      {a.notes && <div style={{ whiteSpace: 'pre-wrap' }}>{a.notes}</div>}
                      <div className="feed-time">{fmtDateTime(a.occurredAt)}{a.agent && ` · ${a.agent.name}`}</div>
                    </div>
                  </div>
                ))
              ) : <p className="muted">No interactions logged yet.</p>}
            </div>
          </section>

          <section className="block">
            <div className="block-head"><h2>Deals</h2><button className="btn sm" onClick={() => setDialog('deal')}>+ New Deal</button></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Deal</th><th>Property</th><th>Value</th><th>Stage</th><th>Transaction</th></tr></thead>
                <tbody>
                  {deals.data?.items.length ? deals.data.items.map((d) => (
                    <tr key={d.id} className="rowclick" onClick={() => navigate(`/deals?open=${d.id}`)}>
                      <td>{d.title ?? '—'}</td><td>{d.property?.title ?? '—'}</td><td>{money(d.value)}</td>
                      <td><Badge value={d.stage} /></td><td><Badge value={d.transactionStatus} /></td>
                    </tr>
                  )) : <tr className="empty-row"><td colSpan={5}>No deals.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="block">
            <div className="block-head"><h2>Site Visits</h2><button className="btn sm" onClick={() => setDialog('visit')}>+ Schedule</button></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Property</th><th>Agent</th><th>Status</th><th>Feedback</th></tr></thead>
                <tbody>
                  {visits.data?.items.length ? visits.data.items.map((v) => (
                    <tr key={v.id}>
                      <td>{fmtDate(v.visitDate)} {v.visitTime}</td><td>{v.property?.title ?? '—'}</td>
                      <td>{v.agent?.name ?? '—'}</td><td><Badge value={v.status} /></td><td className="wrap">{v.feedback ?? '—'}</td>
                    </tr>
                  )) : <tr className="empty-row"><td colSpan={5}>No visits.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="block">
            <div className="block-head"><h2>Tasks</h2><button className="btn sm" onClick={() => setDialog('task')}>+ Add Task</button></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Title</th><th>Due</th><th>Owner</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {tasks.data?.items.length ? tasks.data.items.map((t) => (
                    <tr key={t.id}>
                      <td>{t.title}</td><td>{fmtDate(t.dueDate)} {t.dueTime}</td><td>{t.assignee?.name ?? '—'}</td>
                      <td><Badge value={t.status} /></td>
                      <td>{t.status !== 'Completed' && (
                        <button className="btn sm" onClick={() => quick(() => tasksApi.complete(t.id).then(tasks.reload), 'Task completed.')}>✔ Done</button>
                      )}</td>
                    </tr>
                  )) : <tr className="empty-row"><td colSpan={5}>No tasks.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="block">
            <div className="block-head"><h2>Documents</h2><button className="btn sm" onClick={() => setDialog('doc')}>+ Upload</button></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>File</th><th>Category</th><th>Size</th><th>Uploaded</th><th></th></tr></thead>
                <tbody>
                  {docs.data?.items.length ? docs.data.items.map((d) => (
                    <tr key={d.id}>
                      <td>📄 {d.originalName}</td><td>{d.category}</td><td>{fmtSize(d.sizeBytes)}</td><td>{fmtDate(d.createdAt)}</td>
                      <td><button className="btn sm" onClick={() => downloadFile(`/documents/${d.id}/download`, d.originalName).catch((e) => toast(errorMessage(e), 'error'))}>⬇</button></td>
                    </tr>
                  )) : <tr className="empty-row"><td colSpan={5}>No documents.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {dialog === 'edit' && <ContactForm contact={c} onClose={() => setDialog(null)} onSaved={reloadAll} />}
      {dialog === 'activity' && <ActivityForm defaults={defaults} onClose={() => setDialog(null)} onSaved={history.reload} />}
      {dialog === 'visit' && <VisitForm defaults={defaults} onClose={() => setDialog(null)} onSaved={() => { visits.reload(); tasks.reload() }} />}
      {dialog === 'task' && <TaskForm defaults={defaults} onClose={() => setDialog(null)} onSaved={tasks.reload} />}
      {dialog === 'deal' && <DealForm defaults={defaults} onClose={() => setDialog(null)} onSaved={deals.reload} />}
      {dialog === 'doc' && <DocumentForm defaults={defaults} onClose={() => setDialog(null)} onSaved={docs.reload} />}
      {dialog === 'delete' && (
        <ConfirmDialog
          message={<>Delete <b>{c.name}</b> permanently? Visits, tasks, history and documents linked to them are deleted too.</>}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            try {
              await contactsApi.remove(c.id)
              refresh(['contacts'])
              toast('Contact deleted.')
              navigate('/leads')
            } catch (err) {
              toast(errorMessage(err), 'error')
            }
          }}
        />
      )}
    </>
  )
}
