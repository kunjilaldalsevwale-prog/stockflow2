import React, { useEffect, useState } from 'react'
import api from '../api'

export default function Dashboard({ user }) {
  const [summary, setSummary] = useState([])
  const [items, setItems] = useState([])
  const [txns, setTxns] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/stock-summary'), api.get('/items'), api.get('/transactions'), api.get('/tickets')
    ]).then(([s, it, t, tk]) => {
      setSummary(Array.isArray(s.data) ? s.data : [])
      setItems(Array.isArray(it.data) ? it.data : [])
      setTxns(Array.isArray(t.data) ? t.data.slice(0, 5) : [])
      setTickets(Array.isArray(tk.data) ? tk.data : [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="spinner"><div className="spin"/></div>

  const totalItems = items.length
  const lowStock = summary.filter(s => s.item && s.total > 0 && s.total <= (s.item.reorderLevel || 0)).length
  const outOfStock = items.filter(i => !summary.find(s => s.item?._id === i._id && s.total > 0)).length
  const totalUnits = summary.reduce((acc, s) => acc + s.total, 0)

  // Pending tickets relevant to this user
  const pendingTickets = tickets.filter(t => {
    if (t.status !== 'pending') return false
    if (user?.role === 'admin') return true
    if (user?.role === 'warehouse') return t.toId === user.locationId || t.fromId === user.locationId
    if (user?.role === 'outlet') return t.fromId === user.locationId
    return false
  })

  const txnColor = (type) => ({ purchase: 'var(--accent)', transfer: 'var(--info)', sale: 'var(--warning)', return: 'var(--warn)' }[type] || 'var(--text2)')
  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="page">
      {/* Greeting */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 17 }}>
          {user?.role === 'admin' ? 'All Locations' : user?.locationName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
          {user?.role === 'admin' ? 'Admin dashboard' : `Logged in as ${user?.username}`}
        </div>
      </div>

      {/* Pending tickets alert */}
      {pendingTickets.length > 0 && (
        <div style={{ background: 'var(--warn-light)', border: '1px solid var(--warn)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--warn)' }}>\ud83c\udfab {pendingTickets.length} pending ticket{pendingTickets.length > 1 ? 's' : ''}</div>
            <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 2 }}>Requires your attention</div>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--warn)' }}>{pendingTickets.length}</span>
        </div>
      )}

      {/* Metrics */}
      <div className="section-title">Overview</div>
      <div className="metrics">
        <div className="metric">
          <div className="metric-val">{totalItems}</div>
          <div className="metric-label">Total Items</div>
        </div>
        <div className="metric">
          <div className="metric-val" style={{ color: 'var(--accent)' }}>{totalUnits}</div>
          <div className="metric-label">Total Units</div>
        </div>
        <div className="metric">
          <div className="metric-val" style={{ color: lowStock > 0 ? 'var(--warn)' : 'var(--text)' }}>{lowStock}</div>
          <div className="metric-label">Low Stock</div>
        </div>
        <div className="metric">
          <div className="metric-val" style={{ color: outOfStock > 0 ? 'var(--danger)' : 'var(--text)' }}>{outOfStock}</div>
          <div className="metric-label">Out of Stock</div>
        </div>
      </div>

      {/* Low/out stock alerts */}
      {(lowStock > 0 || outOfStock > 0) && (
        <div className="card">
          <div className="card-header"><span className="card-title">⚠ Stock Alerts</span></div>
          {summary.filter(s => s.item && (s.total === 0 || s.total <= (s.item.reorderLevel || 0))).map((s, i) => (
            <div className="list-row" key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                {s.item?.imageUrl
                  ? <img src={s.item.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📦</div>
                }
                <div className="list-row-left">
                  <div className="list-row-name">{s.item?.name}</div>
                  <div className="list-row-sub">Reorder at: {s.item?.reorderLevel} {s.item?.unit}</div>
                </div>
              </div>
              <span className={`badge ${s.total === 0 ? 'badge-out' : 'badge-low'}`}>
                {s.total === 0 ? 'Out' : `${s.total} left`}
              </span>
            </div>
          ))}
          {/* Items with no stock entry at all */}
          {items.filter(i => !summary.find(s => s.item?._id === i._id)).map((item, i) => (
            <div className="list-row" key={`no-${i}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📦</div>
                }
                <div className="list-row-left">
                  <div className="list-row-name">{item.name}</div>
                  <div className="list-row-sub">{item.category}</div>
                </div>
              </div>
              <span className="badge badge-out">No stock</span>
            </div>
          ))}
        </div>
      )}

      {/* Stock by item */}
      <div className="card">
        <div className="card-header"><span className="card-title">Stock by Item</span></div>
        <div style={{ padding: '0 0 12px 0' }}>
          <input
            className="form-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search items..."
            style={{ margin: 0 }}
          />
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.category||'').toLowerCase().includes(search.toLowerCase())).length === 0 && search ? (
          <div className="empty"><div className="empty-icon">🔍</div>No items match "{search}"</div>
        ) : items.length === 0 ? (
          <div className="empty"><div className="empty-icon">📦</div>No items added yet. Go to Manage to add items.</div>
        ) : items.map((item, i) => {
          const stockEntry = summary.find(s => s.item?._id === item._id)
          const total = stockEntry?.total || 0
          const reorder = item.reorderLevel || 0
          const low = total > 0 && total <= reorder
          const out = total === 0
          return (
            <div className="list-row" key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📦</div>
                }
                <div className="list-row-left">
                  <div className="list-row-name">{item.name}</div>
                  <div className="list-row-sub">{item.category}</div>
                </div>
              </div>
              <div className="list-row-right">
                <div className="list-qty" style={{ color: out ? 'var(--danger)' : low ? 'var(--warn)' : 'var(--text)' }}>{total}</div>
                <div className="list-unit">{item.unit}</div>
                {out && <span className="badge badge-out" style={{ marginTop: 4 }}>Out</span>}
                {low && <span className="badge badge-low" style={{ marginTop: 4 }}>Low</span>}
              </div>
            </div>
          )
        })}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="card-header"><span className="card-title">Recent Activity</span></div>
        {txns.length === 0 ? (
          <div className="empty"><div className="empty-icon">📋</div>No transactions yet</div>
        ) : txns.map((t, i) => (
          <div className="txn-row" key={i}>
            <div className="txn-top">
              <span className="txn-type" style={{ color: txnColor(t.type) }}>{t.type?.toUpperCase()}</span>
              <span className="txn-qty">{t.quantity} {t.itemUnit}</span>
            </div>
            <div className="txn-detail">{t.itemName} · {t.fromName} → {t.toName}</div>
            <div className="txn-time">{formatDate(t.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}