import React, { useEffect, useState } from 'react'
import api from '../api'

const ROLES = [
  { value: 'admin', label: '👑 Admin', desc: 'Full access to everything' },
  { value: 'warehouse_manager', label: '🏭 Warehouse Manager', desc: 'Manages warehouse operations' },
  { value: 'outlet_manager', label: '🏪 Outlet Manager', desc: 'Manages outlet operations' },
  { value: 'viewer', label: '👁 Viewer', desc: 'Read-only access' },
  { value: 'custom', label: '⚙️ Custom', desc: 'Choose exactly what they can access' },
]

const ROLE_COLORS = {
  admin: { bg: '#EEF2FF', color: '#4338CA' },
  warehouse_manager: { bg: '#FEF3C7', color: '#92400E' },
  outlet_manager: { bg: '#D1FAE5', color: '#065F46' },
  viewer: { bg: '#F3F4F6', color: '#374151' },
  custom: { bg: '#FDF2F8', color: '#86198F' },
}

const ALL_FEATURES = [
  { section: 'Overview', features: [
    { id: 'dashboard', label: '🏠 Dashboard', desc: 'View main dashboard and stats' },
    { id: 'reports_view', label: '📊 Reports — View', desc: 'View stock reports, transactions' },
    { id: 'reports_export', label: '📊 Reports — Export', desc: 'Export CSV from reports' },
  ]},
  { section: 'Warehouse', features: [
    { id: 'warehouses_view', label: '🏭 Warehouses — View', desc: 'View warehouse stock' },
    { id: 'warehouses_add_stock', label: '🏭 Warehouses — Add Stock', desc: 'Add stock to warehouses' },
  ]},
  { section: 'Transfers', features: [
    { id: 'transfers_view', label: '🚚 Transfers — View', desc: 'View gate passes and dispatches' },
    { id: 'transfers_create', label: '🚚 Transfers — Create', desc: 'Create new gate passes' },
    { id: 'transfers_approve_dispatch', label: '🚚 Approve Dispatch', desc: 'Approve dispatch (deducts stock)' },
    { id: 'transfers_confirm_receipt', label: '🚚 Confirm Receipt', desc: 'Confirm items received at outlet' },
  ]},
  { section: 'Outlets', features: [
    { id: 'outlets_view', label: '🏪 Outlets — View', desc: 'View outlet transfers and history' },
  ]},
  { section: 'Item Master', features: [
    { id: 'items_view', label: '📦 Item Master — View', desc: 'View items and categories' },
    { id: 'items_add', label: '📦 Item Master — Add Items', desc: 'Add new items to categories' },
    { id: 'items_edit', label: '📦 Item Master — Edit', desc: 'Edit existing items' },
    { id: 'vendors_view', label: '🏭 Vendors — View', desc: 'View vendor list' },
    { id: 'vendors_add', label: '🏭 Vendors — Add/Edit', desc: 'Add and edit vendors' },
    { id: 'purchase_record', label: '🛒 Record Purchase', desc: 'Record vendor purchases' },
  ]},
  { section: 'Communication', features: [
    { id: 'whatsapp', label: '💬 WhatsApp', desc: 'Send WhatsApp messages to locations' },
  ]},
]

// Default permissions per role
const ROLE_DEFAULT_PERMISSIONS = {
  admin: ALL_FEATURES.flatMap(s => s.features.map(f => f.id)),
  warehouse_manager: ['dashboard', 'reports_view', 'warehouses_view', 'warehouses_add_stock', 'transfers_view', 'transfers_create', 'transfers_approve_dispatch', 'items_view', 'whatsapp'],
  outlet_manager: ['dashboard', 'transfers_view', 'transfers_confirm_receipt', 'outlets_view'],
  viewer: ['dashboard', 'reports_view', 'warehouses_view', 'outlets_view', 'items_view'],
  custom: [],
}

function PermissionsMatrix({ permissions, onChange }) {
  const toggle = (id) => {
    if (permissions.includes(id)) onChange(permissions.filter(p => p !== id))
    else onChange([...permissions, id])
  }
  const toggleSection = (features) => {
    const ids = features.map(f => f.id)
    const allOn = ids.every(id => permissions.includes(id))
    if (allOn) onChange(permissions.filter(p => !ids.includes(p)))
    else onChange([...new Set([...permissions, ...ids])])
  }

  return (
    <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      {ALL_FEATURES.map((section, si) => (
        <div key={section.section}>
          {/* Section header */}
          <div style={{ background: '#F7F8FA', padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1 }}>{section.section}</div>
            <button type="button" onClick={() => toggleSection(section.features)}
              style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {section.features.every(f => permissions.includes(f.id)) ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          {/* Features */}
          {section.features.map(feature => (
            <div key={feature.id} onClick={() => toggle(feature.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: si < ALL_FEATURES.length - 1 || feature !== section.features[section.features.length-1] ? '1px solid #F7F8FA' : 'none', cursor: 'pointer', background: permissions.includes(feature.id) ? '#F0EEFF' : '#fff', transition: 'background 0.1s' }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${permissions.includes(feature.id) ? 'var(--accent)' : 'var(--border)'}`, background: permissions.includes(feature.id) ? 'var(--accent)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.1s' }}>
                {permissions.includes(feature.id) && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{feature.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{feature.desc}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function Staff() {
  const [staff, setStaff] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [outlets, setOutlets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState(null)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'viewer', locationId: '', locationName: '', locationType: '', active: true, permissions: ROLE_DEFAULT_PERMISSIONS.viewer })

  const load = () => Promise.all([api.get('/staff'), api.get('/warehouses'), api.get('/outlets')])
    .then(([s, w, o]) => {
      setStaff(Array.isArray(s.data) ? s.data : [])
      setWarehouses(Array.isArray(w.data) ? w.data : [])
      setOutlets(Array.isArray(o.data) ? o.data : [])
      setLoading(false)
    })

  useEffect(() => { load() }, [])

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000) }

  const handleRoleChange = (role) => {
    setForm(p => ({
      ...p, role,
      permissions: ROLE_DEFAULT_PERMISSIONS[role] || [],
      locationId: '', locationName: '',
      locationType: role === 'warehouse_manager' ? 'warehouse' : role === 'outlet_manager' ? 'outlet' : ''
    }))
  }

  const handleLocationChange = (id) => {
    const list = form.locationType === 'warehouse' ? warehouses : outlets
    const found = list.find(x => x._id === id)
    setForm(p => ({ ...p, locationId: id, locationName: found?.name || '' }))
  }

  const submit = async () => {
    if (!form.name || !form.username) return showMsg('Name and username required', 'error')
    if (!editing && !form.password) return showMsg('Password required', 'error')
    if ((form.role === 'warehouse_manager' || form.role === 'outlet_manager') && !form.locationId)
      return showMsg('Please assign a location', 'error')
    try {
      if (editing) await api.put(`/staff/${editing._id}`, form)
      else await api.post('/staff', form)
      showMsg(editing ? 'Staff updated!' : 'Staff created!')
      setShowForm(false); setEditing(null)
      setForm({ name: '', username: '', password: '', role: 'viewer', locationId: '', locationName: '', locationType: '', active: true, permissions: ROLE_DEFAULT_PERMISSIONS.viewer })
      load()
    } catch(e) { showMsg(e.response?.data?.error || 'Error saving', 'error') }
  }

  const startEdit = (s) => {
    setEditing(s)
    setForm({ name: s.name, username: s.username, password: '', role: s.role, locationId: s.locationId||'', locationName: s.locationName||'', locationType: s.locationType||'', active: s.active, permissions: s.permissions || ROLE_DEFAULT_PERMISSIONS[s.role] || [] })
    setShowForm(true)
    setTimeout(() => document.getElementById('staff-form')?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const toggleActive = async (s) => {
    await api.put(`/staff/${s._id}`, { ...s, active: !s.active })
    load()
  }

  const deleteStaff = async (id) => {
    if (!confirm('Delete this staff profile?')) return
    await api.delete(`/staff/${id}`)
    showMsg('Deleted'); load()
  }

  if (loading) return <div className="spinner"><div className="spin" /></div>

  const grouped = ROLES.reduce((a, r) => ({ ...a, [r.value]: [] }), {})
  staff.forEach(s => { if (grouped[s.role] !== undefined) grouped[s.role].push(s) })

  return (
    <div>
      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>{staff.length} profiles · {staff.filter(s => s.active).length} active</div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', username: '', password: '', role: 'viewer', locationId: '', locationName: '', locationType: '', active: true, permissions: ROLE_DEFAULT_PERMISSIONS.viewer }) }}>
          {showForm && !editing ? '✕ Cancel' : '+ Add Staff'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div id="staff-form" className="card" style={{ marginBottom: 20, border: '2px solid var(--accent)' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{editing ? `Edit — ${editing.name}` : 'New Staff Profile'}</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rajesh Kumar" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input className="form-input" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))} placeholder="e.g. rajesh" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{editing ? 'New Password (blank = keep current)' : 'Password *'}</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showPass ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder={editing ? 'Leave blank to keep' : 'Set password'} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Role */}
          <div className="form-group">
            <label className="form-label">Role *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ROLES.map(r => {
                const rc = ROLE_COLORS[r.value] || { bg: '#f5f5f5', color: '#333' }
                return (
                  <div key={r.value} onClick={() => handleRoleChange(r.value)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `2px solid ${form.role === r.value ? 'var(--accent)' : 'var(--border)'}`, background: form.role === r.value ? 'var(--accent-light)' : 'var(--surface2)', cursor: 'pointer' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${form.role === r.value ? 'var(--accent)' : 'var(--border)'}`, background: form.role === r.value ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {form.role === r.value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.desc}</div>
                    </div>
                    {form.role === r.value && form.role !== 'admin' && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--accent)' }}>SELECTED</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Location */}
          {(form.role === 'warehouse_manager' || form.role === 'outlet_manager') && (
            <div className="form-group">
              <label className="form-label">Assign to {form.role === 'warehouse_manager' ? 'Warehouse' : 'Outlet'} *</label>
              <select className="form-select" value={form.locationId} onChange={e => handleLocationChange(e.target.value)}>
                <option value="">— Select —</option>
                {(form.role === 'warehouse_manager' ? warehouses : outlets).map(x => <option key={x._id} value={x._id}>{x.name}</option>)}
              </select>
            </div>
          )}

          {/* Permissions matrix - shown for all non-admin roles */}
          {form.role !== 'admin' && (
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: 10 }}>
                Feature Access
                <span style={{ fontWeight: 400, color: 'var(--text3)', marginLeft: 8 }}>({form.permissions.length} features enabled)</span>
              </label>
              <PermissionsMatrix permissions={form.permissions} onChange={perms => setForm(p => ({ ...p, permissions: perms }))} />
            </div>
          )}

          {editing && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
                <span style={{ fontSize: 14 }}>Active (can log in)</span>
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit}>{editing ? '💾 Save Changes' : '+ Create Staff Profile'}</button>
            <button className="btn" onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Staff list */}
      {ROLES.map(role => {
        const members = grouped[role.value] || []
        if (members.length === 0) return null
        const rc = ROLE_COLORS[role.value] || { bg: '#f5f5f5', color: '#333' }
        return (
          <div key={role.value} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: rc.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              {role.label}
              <span style={{ background: rc.bg, color: rc.color, padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>{members.length}</span>
            </div>
            {members.map(s => {
              const perms = s.permissions || ROLE_DEFAULT_PERMISSIONS[s.role] || []
              return (
                <div key={s._id} className="card" style={{ marginBottom: 8, opacity: s.active ? 1 : 0.6, borderLeft: `3px solid ${rc.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: rc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: rc.color, flexShrink: 0 }}>
                      {(s.name||'?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                        {!s.active && <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 20 }}>INACTIVE</span>}
                        {s.role === 'custom' && <span style={{ fontSize: 10, fontWeight: 700, color: '#86198F', background: '#FDF2F8', padding: '2px 8px', borderRadius: 20 }}>⚙️ Custom ({perms.length} features)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>@{s.username}</div>
                      {s.locationName && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>📍 {s.locationName}</div>}
                      {/* Show enabled features as pills */}
                      {s.role !== 'admin' && perms.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {perms.slice(0, 5).map(p => {
                            const feat = ALL_FEATURES.flatMap(sec => sec.features).find(f => f.id === p)
                            return feat ? <span key={p} style={{ fontSize: 10, background: '#F0F2F5', color: '#4A4E69', padding: '2px 7px', borderRadius: 20 }}>{feat.label.split('—')[0].trim()}</span> : null
                          })}
                          {perms.length > 5 && <span style={{ fontSize: 10, color: 'var(--text3)', padding: '2px 4px' }}>+{perms.length - 5} more</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => startEdit(s)} style={{ fontSize: 12 }}>✏️ Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteStaff(s._id)} style={{ fontSize: 12 }}>🗑</button>
                      </div>
                      <button className="btn btn-sm" onClick={() => toggleActive(s)}
                        style={{ fontSize: 11, background: s.active ? '#FEF3C7' : '#D1FAE5', color: s.active ? '#92400E' : '#065F46', border: 'none' }}>
                        {s.active ? '⏸ Deactivate' : '▶ Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {staff.length === 0 && !showForm && (
        <div className="card"><div className="empty"><div className="empty-icon">👥</div><div>No staff profiles yet</div></div></div>
      )}
    </div>
  )
}
