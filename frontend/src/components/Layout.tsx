import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useSearch } from '../context/SearchContext'
import { initials } from '../utils/format'

const NAV = [
  {
    group: 'Workspace',
    items: [
      { to: '/', label: 'Overview', ic: '📊' },
      { to: '/leads', label: 'Leads', ic: '🧲' },
      { to: '/clients', label: 'Clients', ic: '👥' },
      { to: '/properties', label: 'Properties', ic: '🏢' },
      { to: '/deals', label: 'Deals & Pipeline', ic: '💼' },
      { to: '/visits', label: 'Site Visits', ic: '📍' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: '/tasks', label: 'Tasks & Follow-ups', ic: '✅' },
      { to: '/communications', label: 'Communications', ic: '💬' },
      { to: '/marketing', label: 'Marketing & Sources', ic: '📣' },
      { to: '/agents', label: 'Agents & Teams', ic: '🧑‍💼' },
      { to: '/reports', label: 'Reports & Analytics', ic: '📈' },
      { to: '/documents', label: 'Documents', ic: '📁' },
      { to: '/settings', label: 'Settings', ic: '⚙️' },
    ],
  },
]

// "Create New" opens the matching page with its create dialog.
const CREATE = [
  ['Lead', '/leads?create=1'],
  ['Client', '/clients?create=1'],
  ['Property', '/properties?create=1'],
  ['Deal', '/deals?create=1'],
  ['Site Visit', '/visits?create=1'],
  ['Task', '/tasks?create=1'],
]

export function Layout() {
  const { user, logout } = useAuth()
  const { settings } = useData()
  const { query, setQuery } = useSearch()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menu, setMenu] = useState<'create' | 'user' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="app">
      <div className={`sidebar-backdrop ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="mark">🏠</div>
          <span className="brand-name">{settings?.companyName?.split(' ')[0] || 'Estateflow'}</span>
        </div>
        <nav>
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="navgroup-title">{g.group}</div>
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  title={it.label}
                >
                  <span className="ic">{it.ic}</span>
                  <span className="label">{it.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <button className="collapse-btn" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? '⟩' : '⟨ Collapse'}
        </button>
      </aside>

      <div className="main">
        <div className="topbar" ref={menuRef}>
          <button className="menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <div className="gsearch">
            <span className="ic">🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search this page…"
              aria-label="Search"
            />
          </div>
          <div className="topbar-right">
            <div className="dropdown">
              <button className="create-btn" onClick={() => setMenu(menu === 'create' ? null : 'create')}>
                + <span className="txt">Create New</span>
              </button>
              {menu === 'create' && (
                <div className="create-menu">
                  {CREATE.map(([label, to]) => (
                    <button
                      key={label}
                      onClick={() => {
                        setMenu(null)
                        navigate(to)
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="dropdown">
              <button className="user-chip" onClick={() => setMenu(menu === 'user' ? null : 'user')}>
                <div className="av">{initials(user?.name)}</div>
                <span className="who" style={{ textAlign: 'left' }}>
                  {user?.name}
                  <small>{user?.role}</small>
                </span>
              </button>
              {menu === 'user' && (
                <div className="create-menu">
                  <button
                    onClick={() => {
                      setMenu(null)
                      navigate('/settings')
                    }}
                  >
                    My profile
                  </button>
                  <button
                    onClick={() => {
                      logout()
                      navigate('/login')
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
