import { useEffect, useState } from 'react'
import { SelectInput, TextInput } from '../components/Form'
import { Badge, PageHead, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { errorMessage } from '../services/api'
import { settingsApi, usersApi } from '../services/crm'
import type { Settings } from '../types'

export function SettingsPage() {
  const { hasRole } = useAuth()
  return (
    <>
      <PageHead title="Settings" subtitle="Profile, company details aur CRM configuration" />
      <div className="split s-1-1">
        <div>
          <ProfileCard />
          <PasswordCard />
        </div>
        <div>
          <CompanyCard editable={hasRole('ADMIN')} />
          <ConfigCard />
        </div>
      </div>
    </>
  )
}

function ProfileCard() {
  const { user, refreshUser } = useAuth()
  const { refresh } = useData()
  const toast = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await usersApi.updateMe({ name, phone })
      await refreshUser()
      refresh(['users'])
      toast('Profile saved.')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="block">
      <div className="block-head"><h2>My Profile</h2><Badge value={user?.role} /></div>
      <form className="block-body" onSubmit={(e) => { e.preventDefault(); save() }}>
        <TextInput label="Name" value={name} onChange={setName} required />
        <TextInput label="Email (login)" value={user?.email} onChange={() => {}} />
        <TextInput label="Phone" value={phone} onChange={setPhone} />
        <div style={{ marginTop: 12 }}><button className="btn primary" disabled={busy}>{busy && <Spinner />} Save Profile</button></div>
      </form>
    </section>
  )
}

function PasswordCard() {
  const toast = useToast()
  const [v, setV] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof v) => (val: string) => setV((p) => ({ ...p, [k]: val }))

  const save = async () => {
    if (v.next.length < 8) return setError('New password must be at least 8 characters')
    if (v.next !== v.confirm) return setError('Passwords do not match')
    setBusy(true)
    setError(null)
    try {
      await usersApi.changePassword(v.current, v.next)
      setV({ current: '', next: '', confirm: '' })
      toast('Password changed.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="block">
      <div className="block-head"><h2>Change Password</h2></div>
      <form className="block-body" onSubmit={(e) => { e.preventDefault(); save() }}>
        {error && <div className="form-error">{error}</div>}
        <TextInput label="Current Password" type="password" value={v.current} onChange={set('current')} required autoComplete="current-password" />
        <div className="two-col">
          <TextInput label="New Password" type="password" value={v.next} onChange={set('next')} required autoComplete="new-password" />
          <TextInput label="Confirm" type="password" value={v.confirm} onChange={set('confirm')} required autoComplete="new-password" />
        </div>
        <div style={{ marginTop: 12 }}><button className="btn primary" disabled={busy}>{busy && <Spinner />} Update Password</button></div>
      </form>
    </section>
  )
}

function CompanyCard({ editable }: { editable: boolean }) {
  const { settings, refresh } = useData()
  const toast = useToast()
  const [v, setV] = useState<Settings | null>(settings)
  const [busy, setBusy] = useState(false)
  useEffect(() => setV(settings), [settings])
  if (!v) return <section className="block"><div className="center-pad"><Spinner /></div></section>
  const set = (k: keyof Settings) => (val: string) => setV((p) => (p ? { ...p, [k]: val } : p))

  const save = async () => {
    setBusy(true)
    try {
      await settingsApi.update(v)
      refresh(['settings'])
      toast('Company profile saved.')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="block">
      <div className="block-head"><h2>Company Profile</h2>{!editable && <span className="meta">Admins only</span>}</div>
      <form className="block-body" onSubmit={(e) => { e.preventDefault(); save() }}>
        <fieldset disabled={!editable} style={{ border: 'none', padding: 0, margin: 0 }}>
          <TextInput label="Company Name" value={v.companyName} onChange={set('companyName')} />
          <TextInput label="Tagline" value={v.tagline} onChange={set('tagline')} />
          <div className="two-col">
            <TextInput label="Phone" value={v.companyPhone} onChange={set('companyPhone')} />
            <TextInput label="Email" value={v.companyEmail} onChange={set('companyEmail')} />
          </div>
          <TextInput label="Address" value={v.companyAddress} onChange={set('companyAddress')} />
          <div className="two-col">
            <SelectInput label="Currency" value={v.currency} onChange={set('currency')} options={['INR']} />
            <SelectInput label="Date Format" value={v.dateFormat} onChange={set('dateFormat')} options={['DD/MM/YYYY', 'YYYY-MM-DD']} />
          </div>
          {editable && <div style={{ marginTop: 12 }}><button className="btn primary" disabled={busy}>{busy && <Spinner />} Save Profile</button></div>}
        </fieldset>
      </form>
    </section>
  )
}

function ConfigCard() {
  const { meta } = useData()
  if (!meta) return null
  const rows: [string, string[]][] = [
    ['Lead Sources', meta.leadSources],
    ['Lead Pipeline Stages', meta.leadStages],
    ['Deal Stages', meta.dealStages],
    ['Transaction Statuses', meta.transactionStatuses],
    ['Site Visit Statuses', meta.visitStatuses],
    ['Document Categories', meta.documentCategories],
  ]
  return (
    <section className="block">
      <div className="block-head"><h2>CRM Configuration</h2></div>
      <div className="block-body">
        {rows.map(([label, values]) => (
          <div key={label} style={{ marginBottom: 10 }}>
            <label style={{ marginTop: 0 }}>{label}</label>
            <div style={{ fontSize: '.82rem' }}>{values.join(label.includes('Stages') ? ' → ' : ', ')}</div>
          </div>
        ))}
        <label>Roles & Permissions</label>
        <ul style={{ fontSize: '.82rem', margin: '4px 0 0', paddingLeft: 18 }}>
          <li><b>Admin</b> — everything, including company settings and admin accounts.</li>
          <li><b>Manager</b> — manage team members, reassign leads, delete records, manage campaigns.</li>
          <li><b>Agent</b> — create and update leads, properties, deals, visits, tasks and documents.</li>
        </ul>
      </div>
    </section>
  )
}
