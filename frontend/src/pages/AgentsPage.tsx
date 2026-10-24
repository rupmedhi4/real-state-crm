import { useState } from 'react'
import { UserForm } from '../components/forms/RecordForms'
import { ConfirmDialog } from '../components/Modal'
import { Badge, ErrorBox, PageHead, Spinner } from '../components/ui'
import { useAuth, useIsManager } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useLoad } from '../hooks/useList'
import { errorMessage } from '../services/api'
import { agentsApi, usersApi } from '../services/crm'
import type { AgentStats, User } from '../types'
import { initials, money } from '../utils/format'

export function AgentsPage() {
  const toast = useToast()
  const isManager = useIsManager()
  const { user, hasRole } = useAuth()
  const { refresh } = useData()
  const stats = useLoad(() => agentsApi.stats())
  const [editing, setEditing] = useState<User | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<AgentStats | null>(null)

  const canManage = (a: AgentStats) => isManager && (a.role !== 'ADMIN' || hasRole('ADMIN'))
  const openEdit = async (a: AgentStats) => {
    try {
      setEditing(await usersApi.get(a.id))
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <>
      <PageHead title="Agents & Teams" subtitle="Team performance ek nazar me">
        {isManager && <button className="btn primary" onClick={() => setCreateOpen(true)}>+ Add Agent</button>}
      </PageHead>
      <div className="block">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th><th>Access</th><th>Phone</th><th>Assigned Leads</th><th>Active Deals</th><th>Site Visits</th>
                <th>Follow-ups Due</th><th>Open Tasks</th><th>Won Deals</th><th>Revenue</th>{isManager && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {stats.error ? (
                <tr><td colSpan={11}><ErrorBox message={stats.error} onRetry={stats.reload} /></td></tr>
              ) : stats.loading && !stats.data ? (
                <tr className="loading-row"><td colSpan={11}><Spinner /> Loading…</td></tr>
              ) : (
                stats.data?.map((a) => (
                  <tr key={a.id} style={a.isActive ? undefined : { opacity: 0.55 }}>
                    <td className="cell-name">
                      <div className="avatar-fallback">{initials(a.name)}</div>
                      <span className="name-sub">{a.name}{a.id === user?.id && ' (you)'}<small>{a.designation} · {a.email}</small></span>
                    </td>
                    <td><Badge value={a.role} />{!a.isActive && <> <Badge value="Disabled" /></>}</td>
                    <td>{a.phone ?? '—'}</td>
                    <td>{a.assignedLeads}</td>
                    <td>{a.activeDeals}</td>
                    <td>{a.siteVisits}</td>
                    <td className={a.followupsDue ? 'overdue' : undefined}>{a.followupsDue}</td>
                    <td>{a.openTasks}</td>
                    <td>{a.wonDeals}</td>
                    <td>{money(a.revenue)}</td>
                    {isManager && (
                      <td>
                        {canManage(a) && (
                          <div className="row-actions">
                            <button className="btn sm" onClick={() => openEdit(a)}>✏️</button>
                            {a.id !== user?.id && <button className="btn sm" onClick={() => setDeleting(a)}>🗑</button>}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted" style={{ fontSize: '.78rem' }}>
        Access roles are enforced by the API: Admins manage everything, Managers manage the team and can delete or reassign records, Agents work on records but cannot delete or reassign them.
      </p>

      {(createOpen || editing) && (
        <UserForm
          member={editing}
          onClose={() => {
            setCreateOpen(false)
            setEditing(null)
          }}
          onSaved={stats.reload}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={<>Remove <b>{deleting.name}</b>? Their leads, deals and tasks stay but become unassigned. To keep history, consider disabling the account instead.</>}
          confirmLabel="Remove"
          onConfirm={async () => {
            try {
              await usersApi.remove(deleting.id)
              refresh(['users'])
              toast('Team member removed.')
              stats.reload()
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
