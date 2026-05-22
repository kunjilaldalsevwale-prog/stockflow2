import React, { useState, useEffect } from 'react'
import './App.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Warehouses from './pages/Warehouses'
import Outlets from './pages/Outlets'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import WhatsApp from './pages/WhatsApp'
import Transfers from './pages/Transfers'
import Staff from './pages/Staff'
import Vendors from './pages/Vendors'

const ALL_NAV = [
  { section: 'Overview', roles: ['admin','viewer','warehouse_manager','outlet_manager'], items: [
    { id: 'dashboard', label: 'Home', roles: ['admin','viewer','warehouse_manager','outlet_manager'], icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    { id: 'reports', label: 'Reports', roles: ['admin','viewer'], icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ]},
  { section: 'Operations', roles: ['admin','warehouse_manager','outlet_manager'], items: [
    { id: 'warehouses', label: 'Warehouses', roles: ['admin','warehouse_manager'], icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id: 'outlets', label: 'Outlets', roles: ['admin','outlet_manager'], icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
    { id: 'transfers', label: 'Transfers', roles: ['admin','warehouse_manager','outlet_manager'], icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg> },
    { id: 'whatsapp', label: 'WhatsApp', roles: ['admin'], icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
  ]},
  { section: 'Manage', roles: ['admin'], items: [
    { id: 'settings', label: 'Item Master', roles: ['admin'], icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
    { id: 'staff', label: 'Staff', roles: ['admin'], icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  ]}
]

const PAGES = { dashboard: Dashboard, warehouses: Warehouses, outlets: Outlets, reports: Reports, transfers: Transfers, whatsapp: WhatsApp, settings: Settings, staff: Staff, vendors: Vendors }
const TITLES = { dashboard: 'Dashboard', warehouses: 'Warehouses', outlets: 'Outlets', reports: 'Reports', transfers: 'Transfers', whatsapp: 'WhatsApp', settings: 'Item Master', staff: 'Staff Management' }

function BottomNav({ items, activePage, setPage }) {
  const [page, setNavPage] = React.useState(0)
  const pageSize = 5
  const totalPages = Math.ceil(items.length / pageSize)
  const visible = items.slice(page * pageSize, page * pageSize + pageSize)

  return (
    <nav className="bottom-nav" style={{ display: 'flex', alignItems: 'stretch', padding: 0 }}>
      {/* Left arrow */}
      {totalPages > 1 && (
        <button
          onClick={() => setNavPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          style={{ width: 32, flexShrink: 0, background: 'none', border: 'none', borderRight: '1px solid var(--border)', cursor: page === 0 ? 'default' : 'pointer', color: page === 0 ? 'var(--text3)' : 'var(--accent)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 0 ? 0.3 : 1 }}>
          ‹
        </button>
      )}

      {/* Visible tabs */}
      {visible.map(item => (
        <div key={item.id}
          className={`bottom-nav-item ${activePage === item.id ? 'active' : ''}`}
          onClick={() => setPage(item.id)}
          style={{ flex: 1 }}>
          {item.icon}
          <span>{item.label}</span>
        </div>
      ))}

      {/* Right arrow */}
      {totalPages > 1 && (
        <button
          onClick={() => setNavPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page === totalPages - 1}
          style={{ width: 32, flexShrink: 0, background: 'none', border: 'none', borderLeft: '1px solid var(--border)', cursor: page === totalPages - 1 ? 'default' : 'pointer', color: page === totalPages - 1 ? 'var(--text3)' : 'var(--accent)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === totalPages - 1 ? 0.3 : 1 }}>
          ›
        </button>
      )}

      {/* Page dots */}
      {totalPages > 1 && (
        <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 3 }}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: i === page ? 'var(--accent)' : 'var(--border)' }} />
          ))}
        </div>
      )}
    </nav>
  )
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sf_user')) } catch { return null }
  })
  const [page, setPage] = useState('dashboard')

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem('sf_user', JSON.stringify(userData))
    // Set default page based on role
    if (userData.role === 'outlet_manager') setPage('outlets')
    else if (userData.role === 'warehouse_manager') setPage('warehouses')
    else setPage('dashboard')
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('sf_user')
    setPage('dashboard')
  }

  // Check if user has no accounts yet - allow admin access
  const [hasStaff, setHasStaff] = useState(true)
  useEffect(() => {
    fetch('/api/staff').then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length === 0) setHasStaff(false)
    }).catch(() => {})
  }, [])

  // If no staff exists, allow direct admin access
  if (!user && !hasStaff) {
    const adminUser = { name: 'Admin', username: 'admin', role: 'admin' }
    return <div>
      <Login onLogin={login} />
      <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#fff', border: '1px solid #e8eaf0', borderRadius: 10, padding: '10px 16px', fontSize: 12, color: '#6b7280', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        No staff set up yet. <button onClick={() => login(adminUser)} style={{ color: '#6C63FF', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Enter as Admin →</button>
      </div>
    </div>
  }

  if (!user) return <Login onLogin={login} />

  // Filter nav based on role AND custom permissions
  const role = user.role || 'admin'
  const userPerms = user.permissions || null // null means use role defaults

  const canAccess = (itemId) => {
    if (role === 'admin') return true
    if (userPerms) {
      // Custom permissions map
      const permMap = {
        'dashboard': ['dashboard'],
        'reports': ['reports_view'],
        'warehouses': ['warehouses_view'],
        'outlets': ['outlets_view'],
        'transfers': ['transfers_view'],
        'whatsapp': ['whatsapp'],
        'settings': ['items_view'],
        'staff': [],
      }
      const needed = permMap[itemId] || []
      return needed.length === 0 || needed.some(p => userPerms.includes(p))
    }
    // Fall back to role-based
    const rolePerms = {
      warehouse_manager: ['dashboard','reports','warehouses','transfers','whatsapp','settings'],
      outlet_manager: ['dashboard','outlets','transfers'],
      viewer: ['dashboard','reports'],
    }
    return (rolePerms[role] || []).includes(itemId)
  }

  const visibleNav = ALL_NAV.map(section => ({
    ...section,
    items: section.items.filter(item => canAccess(item.id))
  })).filter(section => section.items.length > 0)

  const allItems = visibleNav.flatMap(s => s.items)
  const BOTTOM = allItems.slice(0, 5).map(i => i.id)

  // Ensure current page is accessible
  const currentPageItem = allItems.find(i => i.id === page)
  const activePage = currentPageItem ? page : allItems[0]?.id || 'dashboard'
  const Page = PAGES[activePage] || Dashboard

  const roleLabel = { admin: '👑 Admin', warehouse_manager: '🏭 Warehouse', outlet_manager: '🏪 Outlet', viewer: '👁 Viewer' }[role] || role

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">StockFlow</div>
          <div className="sidebar-logo-sub">Inventory Management</div>
        </div>

        {visibleNav.map(section => (
          <div className="sidebar-section" key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map(item => (
              <div key={item.id} className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => setPage(item.id)}>
                {item.icon}{item.label}
              </div>
            ))}
          </div>
        ))}

        {/* User info at bottom */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(108,99,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 13, flexShrink: 0 }}>
              {(user.name||"?")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{roleLabel}</div>
            </div>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <div className="topbar-title">{TITLES[activePage]}</div>
          <div className="topbar-right">
            {user.locationName && <div style={{ fontSize: 12, color: 'var(--text3)', marginRight: 8 }}>📍 {user.locationName}</div>}
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {(user.name||"?")[0].toUpperCase()}
            </div>
          </div>
        </div>
        <div className="page-content">
          <Page user={user} />
        </div>
      </div>

      <BottomNav items={allItems} activePage={activePage} setPage={setPage} />
    </div>
  )
}
