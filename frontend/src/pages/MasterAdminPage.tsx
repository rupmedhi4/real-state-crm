import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TextInput } from '../components/Form'
import { FormFooter, Modal } from '../components/Modal'
import { Spinner } from '../components/ui'
import { errorMessage, tokenStore } from '../services/api'
import { FEATURE_LABELS, masterStore, platformApi } from '../services/platform'
import type { AuditEntry, ClientAccount } from '../services/platform'

export function MasterAdminPage() {
  const [signedIn, setSignedIn] = useState(!!masterStore.get())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [admin, setAdmin] = useState('Master administrator')
  const [clients, setClients] = useState<ClientAccount[]>([])
  const [features, setFeatures] = useState<string[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<ClientAccount | 'new' | null>(null)
  const [resetting, setResetting] = useState<ClientAccount | null>(null)
  const [nextPassword, setNextPassword] = useState('')
  const load = async () => {
    try {
      const [me, list, flags, history] = await Promise.all([platformApi.me(), platformApi.clients(), platformApi.features(), platformApi.audit()])
      setAdmin(me.name); setClients(list); setFeatures(flags); setAudit(history)
    } catch (err) { setError(errorMessage(err)); }
  }
  useEffect(() => { if (signedIn) void load() }, [signedIn])
  const act = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(''); setNotice('')
    try { await action(); setNotice(success); await load() } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  if (!signedIn) return <div className="auth-page"><form className="auth-card" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try { const result = await platformApi.login(email.trim(), password); masterStore.set(result.accessToken); setPassword(''); setSignedIn(true) } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }}><div className="master-eyebrow">ESTATEFLOW PLATFORM</div><h1>Master admin</h1><p>Manage client workspaces, access and features.</p>
    {error && <div role="alert" className="form-error">{error}</div>}
    <TextInput label="Master email" type="email" value={email} onChange={setEmail} required autoComplete="username" />
    <TextInput label="Password" type="password" value={password} onChange={setPassword} required autoComplete="current-password" />
    <button className="btn primary" disabled={busy}>{busy && <Spinner />} Sign in to master console</button><div className="auth-foot"><Link to="/login">Client sign in</Link></div>
  </form></div>
  const visible = clients.filter((client) => `${client.name} ${client.slug} ${client.ownerEmail}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="master-console">
    <header className="master-header"><div><div className="master-eyebrow">ESTATEFLOW PLATFORM</div><strong>Master console</strong></div><div className="master-header-actions"><span>{admin}</span><button className="btn" onClick={() => { masterStore.clear(); tokenStore.clear(); window.location.assign('/master') }}>Sign out</button></div></header>
    <main className="master-content"><div className="master-heading"><div><h1>Your clients. One control centre.</h1><p className="muted">Create secure workspaces, choose features and control access.</p></div><button className="btn primary" onClick={() => setEditing('new')} disabled={busy}>+ New client</button></div>
      <div className="master-stats"><div><span>Total clients</span><strong>{clients.length}</strong></div><div><span>Active workspaces</span><strong>{clients.filter((c) => c.isActive).length}</strong></div><div><span>Suspended</span><strong>{clients.filter((c) => !c.isActive).length}</strong></div></div>
      {error && <div className="form-error" role="alert">{error} <button className="btn sm" onClick={() => void load()}>Retry</button></div>}{notice && <div className="master-notice" role="status">{notice}</div>}
      <section className="block"><div className="block-head"><h2>Client workspaces</h2><input aria-label="Search clients" placeholder="Search clients or workspace code…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="master-client-list">{visible.length === 0 && <div className="center-pad">{clients.length ? 'No matching clients.' : 'Create your first client to generate a separate CRM workspace.'}</div>}
          {visible.map((client) => <article key={client.id} className="master-client"><div className="master-client-title"><div className="master-client-avatar">{client.name.slice(0, 2).toUpperCase()}</div><div><h3>{client.name}</h3><span className="muted">{client.slug} · {client.ownerEmail}</span></div><span className={`master-status ${client.isActive ? 'active' : ''}`}>{client.isActive ? 'Active' : 'Suspended'}</span></div>
            <div className="master-feature-chips">{Object.entries(client.features).filter(([, on]) => on).map(([key]) => <span key={key}>{FEATURE_LABELS[key] || key}</span>)}</div>
            <div className="master-client-footer"><small className="muted">{client.maxImages} photos/property · Separate client data</small><div className="master-client-actions">
              <button className="btn sm" disabled={busy} onClick={() => setEditing(client)}>Features & settings</button>
              <button className="btn sm" disabled={busy} onClick={() => { setResetting(client); setNextPassword(''); setError('') }}>Reset owner password</button>
              <button className="btn sm" disabled={busy} onClick={() => void act(async () => { await navigator.clipboard.writeText(`${window.location.origin}/login?workspace=${encodeURIComponent(client.slug)}`) }, 'Client login link copied.')}>Copy login link</button>
              <button className="btn sm" disabled={busy} onClick={() => void act(() => platformApi.update(client.id, { isActive: !client.isActive }), client.isActive ? 'Client suspended. Existing sessions are blocked.' : 'Client reactivated.')}>{client.isActive ? 'Suspend' : 'Reactivate'}</button>
              <button className="btn sm primary" disabled={busy || !client.isActive} onClick={() => void act(async () => { const session = await platformApi.open(client.id); tokenStore.set(session.accessToken); window.location.assign('/') }, '')}>Open CRM ↗</button>
            </div></div></article>)}
        </div>
      </section>
      <section className="block"><div className="block-head"><h2>Recent master activity</h2><span className="muted">Latest 100 actions</span></div><div className="block-body">{audit.length ? audit.map((entry) => <div className="master-audit-row" key={entry.id}><span>{entry.clientName || 'Platform'}<small>{entry.action.replace(/\./g, ' · ').replace(/_/g, ' ')}</small></span><time>{new Date(entry.createdAt).toLocaleString()}</time></div>) : <p className="muted">Client and access changes will appear here.</p>}</div></section>
    </main>
    {editing && <ClientEditor client={editing === 'new' ? null : editing} features={features} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setNotice('Client saved. Share the workspace code and login credentials securely.'); void load() }} />}
    {resetting && <Modal title={`Reset password · ${resetting.name}`} onClose={() => { if (!busy) setResetting(null) }} onSubmit={() => { if (nextPassword.length < 8) { setError('Use at least 8 characters'); return } void act(async () => { await platformApi.password(resetting.id, nextPassword); setResetting(null); setNextPassword('') }, 'Owner password updated. Share it securely with the client.') }} footer={<FormFooter saving={busy} onCancel={() => setResetting(null)} label="Reset password" />}><p className="muted">Set a new password for the primary client administrator.</p>{error && <div className="form-error" role="alert">{error}</div>}<TextInput label="New password" type="password" value={nextPassword} onChange={setNextPassword} required autoComplete="new-password" /></Modal>}
  </div>
}

function ClientEditor({ client, features, onClose, onSaved }: { client: ClientAccount | null; features: string[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(client?.name || '')
  const [slug, setSlug] = useState(client?.slug || '')
  const [email, setEmail] = useState(client?.ownerEmail || '')
  const [password, setPassword] = useState('')
  const [maxImages, setMaxImages] = useState(client?.maxImages ?? 20)
  const [selected, setSelected] = useState<string[]>(client ? Object.keys(client.features).filter((key) => client.features[key]) : features)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    if (busy) return
    if (name.trim().length < 2 || (!client && (!/^[a-z0-9][a-z0-9-]{1,49}$/.test(slug) || !email || password.length < 8))) { setError('Enter a company name, a lowercase workspace code (2–50 letters/digits/hyphens), email and password of at least 8 characters.'); return }
    setBusy(true); setError('')
    try {
      if (client) await platformApi.update(client.id, { name, features: selected, maxImages })
      else await platformApi.create({ name, slug, ownerEmail: email, ownerPassword: password, features: selected, maxImages })
      onSaved()
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return <Modal title={client ? `Manage ${client.name}` : 'Create client workspace'} size="wide" onClose={() => { if (!busy) onClose() }} onSubmit={() => void save()} footer={<FormFooter saving={busy} onCancel={onClose} label={client ? 'Save settings' : 'Create client & login'} />}>
    {error && <div className="form-error" role="alert">{error}</div>}
    <fieldset disabled={busy} className="property-fields"><TextInput label="Company name" value={name} onChange={setName} required />
    {!client && <><TextInput label="Workspace code" value={slug} onChange={(value) => setSlug(value.toLowerCase().replace(/\s+/g, '-'))} placeholder="e.g. guwahati-realty" required /><div className="two-col"><TextInput label="Client admin email" type="email" value={email} onChange={setEmail} required /><TextInput label="Initial password" type="password" value={password} onChange={setPassword} required autoComplete="new-password" /></div></>}
    <TextInput label="Maximum photos per property" type="number" min={1} max={20} value={maxImages} onChange={(value) => setMaxImages(Number(value))} />
    <div className="section-label">Enabled features</div><p className="muted">Disabled modules are blocked by the API. Photo gallery also needs Property inventory.</p>
    <div className="master-feature-grid">{features.map((feature) => <label key={feature} className="master-feature-choice"><input type="checkbox" checked={selected.includes(feature)} onChange={(event) => setSelected((values) => event.target.checked ? [...values, feature] : values.filter((value) => value !== feature))} /><span>{FEATURE_LABELS[feature] || feature}</span></label>)}</div>
    {!client && <p className="muted">This creates an empty CRM with its own records and admin account. Keep the initial credentials before closing this form.</p>}</fieldset>
  </Modal>
}
