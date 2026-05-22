import React, { useEffect, useState } from 'react'
import api from '../api'

export default function Warehouses({ user }) {
  const [warehouses, setWarehouses] = useState([])
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeWh, setActiveWh] = useState(null)
  const [subTab, setSubTab] = useState('stock')
  const [msg, setMsg] = useState(null)

  // Stock entry
  const [stockMode, setStockMode] = useState(null) // 'bulk' | 'single'
  const [bulkStock, setBulkStock] = useState({})
  const [singleItem, setSingleItem] = useState('')
  const [singleQty, setSingleQty] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const load = () => Promise.all([
    api.get('/warehouses'), api.get('/categories'), api.get('/items'), api.get('/tickets')
  ]).then(([w, c, it, tk]) => {
    let whs = w.data
    if (user?.role === 'warehouse') {
      whs = whs.filter(w => w._id === user.locationId)
      if (whs.length > 0) setActiveWh(whs[0]._id)
    }
    setWarehouses(whs)
    setCategories(c.data)
    setItems(Array.isArray(it.data) ? it.data : [])
    setTickets(Array.isArray(tk.data) ? tk.data : [])
    setLoading(false)
  })

  useEffect(() => { load() }, [])

  const saveItem = async () => {
    if (!editingItem) return
    await api.put(`/items/${editingItem._id}`, {
      name: editingItem.name,
      unit: editingItem.unit,
      reorderLevel: parseFloat(editingItem.reorderLevel) || 0
    })
    setEditingItem(null)
    showMsg('Item updated!')
    load()
  }

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  const wh = activeWh ? warehouses.find(w => w._id === activeWh) : null

  // Tickets for this warehouse
  const whTickets = wh ? tickets.filter(t =>
    (t.toId === wh._id || t.fromId === wh._id) && t.status === 'pending'
  ) : []

  const groupByCategory = (stock) => {
    const groups = {}
    stock.forEach(s => {
      const cat = s.item?.category || 'Uncategorised'
      const master = cat.includes('›') ? cat.split('›')[0].trim() : cat
      if (!groups[master]) groups[master] = []
      groups[master].push(s)
    })
    return groups
  }

  const getCatIcon = (name) => categories.find(c => c.name === name)?.icon || '📦'

  // Bulk stock submit
  const submitBulkStock = async () => {
    const entries = Object.entries(bulkStock).filter(([, qty]) => qty && parseFloat(qty) > 0)
    if (entries.length === 0) return showMsg('Enter at least one quantity', 'error')
    setBusy(true)
    try {
      for (const [itemId, qty] of entries) {
        await api.post('/purchase', { warehouseId: wh._id, itemId, quantity: parseFloat(qty), note: 'Initial stock entry' })
      }
      showMsg(`Stock updated for ${entries.length} items`)
      setBulkStock({})
      setStockMode(null)
      load()
    } catch (e) {
      showMsg(e.response?.data?.error || 'Error', 'error')
    }
    setBusy(false)
  }

  // Single item stock submit
  const submitSingleStock = async () => {
    if (!singleItem || !singleQty) return showMsg('Select item and enter quantity', 'error')
    setBusy(true)
    try {
      await api.post('/purchase', { warehouseId: wh._id, itemId: singleItem, quantity: parseFloat(singleQty), note: 'Stock entry' })
      showMsg('Stock added')
      setSingleItem(''); setSingleQty('')
      load()
    } catch (e) {
      showMsg(e.response?.data?.error || 'Error', 'error')
    }
    setBusy(false)
  }

  const updateTicketStatus = async (id, status) => {
    await api.put(`/tickets/${id}/status`, { status })
    showMsg(`Ticket ${status}`)
    load()
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const itemsByCategory = () => {
    const groups = {}
    items.forEach(item => {
      const cat = item.category || 'Uncategorised'
      const master = cat.includes('›') ? cat.split('›')[0].trim() : cat
      if (!groups[master]) groups[master] = []
      groups[master].push(item)
    })
    return groups
  }

  if (loading) return <div className="spinner"><div className="spin"/></div>

  return (
    <div className="page">
      {user?.role !== 'warehouse' && (
        <div className="page-tabs">
          <div className={`page-tab ${!activeWh ? 'active' : ''}`} onClick={() => { setActiveWh(null); setStockMode(null) }}>All</div>
          {warehouses.map(w => {
            const pendingCount = tickets.filter(t => (t.toId === w._id || t.fromId === w._id) && t.status === 'pending').length
            return (
              <div key={w._id} className={`page-tab ${activeWh === w._id ? 'active' : ''}`}
                onClick={() => { setActiveWh(w._id); setSubTab('stock'); setStockMode(null) }}
                style={{ position: 'relative' }}>
                {w.name}
                {pendingCount > 0 && (
                  <span style={{ marginLeft: 6, background: 'var(--danger)', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>{pendingCount}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* All warehouses overview */}
      {!activeWh && warehouses.map(w => {
        const pendingCount = tickets.filter(t => (t.toId === w._id || t.fromId === w._id) && t.status === 'pending').length
        return (
          <div className="card" key={w._id} onClick={() => { setActiveWh(w._id); setSubTab('stock') }} style={{ cursor: 'pointer' }}>
            <div className="card-header">
              <div>
                <div className="card-title">{w.name}</div>
                <div className="card-sub">{w.stock.length} item types · {Object.keys(groupByCategory(w.stock)).length} categories</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {pendingCount > 0 && <span className="badge badge-out">\ud83c\udfab {pendingCount} tickets</span>}
                <span className="badge badge-neutral">{w.stock.reduce((a, s) => a + s.quantity, 0)} units</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {Object.entries(groupByCategory(w.stock)).map(([cat, items]) => (
                <span key={cat} style={{ fontSize: 12, background: 'var(--surface2)', color: 'var(--text2)', padding: '3px 10px', borderRadius: 20 }}>
                  {getCatIcon(cat)} {cat} ({items.length})
                </span>
              ))}
              {w.stock.length === 0 && <span style={{ fontSize: 12, color: 'var(--text3)' }}>No stock yet — tap to add</span>}
            </div>
          </div>
        )
      })}

      {/* Single warehouse detail */}
      {wh && (
        <>
          {/* Header card with sub-tabs */}
          <div className="card" style={{ marginBottom: 8 }}>
            <div className="card-header">
              <div>
                <div className="card-title">{wh.name}</div>
                <div className="card-sub">{wh.stock.reduce((a, s) => a + s.quantity, 0)} total units</div>
              </div>
              {whTickets.length > 0 && (
                <span className="badge badge-out">\ud83c\udfab {whTickets.length} pending</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className={`page-tab ${subTab === 'stock' ? 'active' : ''}`} onClick={() => setSubTab('stock')}>Stock</button>
              <button className={`page-tab ${subTab === 'tickets' ? 'active' : ''}`} onClick={() => setSubTab('tickets')} style={{ position: 'relative' }}>
                Tickets
                {whTickets.length > 0 && <span style={{ marginLeft: 5, background: 'var(--danger)', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>{whTickets.length}</span>}
              </button>
              <button className={`page-tab ${subTab === 'add' ? 'active' : ''}`} onClick={() => setSubTab('add')}>+ Add Stock</button>
            </div>
          </div>

          {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

          {/* STOCK TAB */}
          {subTab === 'stock' && (
            wh.stock.length === 0 ? (
              <div className="card">
                <div className="empty">
                  <div className="empty-icon">📦</div>
                  No stock yet
                  <button className="btn btn-sm" style={{ marginTop: 12, background: 'var(--accent)', color: '#fff', border: 'none' }} onClick={() => setSubTab('add')}>+ Add Stock</button>
                </div>
              </div>
            ) : Object.entries(groupByCategory(wh.stock)).map(([cat, stockItems]) => (
              <div className="card" key={cat} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 20 }}>{getCatIcon(cat)}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{cat}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{stockItems.length} item type{stockItems.length > 1 ? 's' : ''}</div>
                  </div>
                  <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>{stockItems.reduce((a, s) => a + s.quantity, 0)} units</span>
                </div>
                {stockItems.map((s, i) => {
                  const reorder = s.item?.reorderLevel || 0
                  const low = s.quantity <= reorder && s.quantity > 0
                  const out = s.quantity === 0
                  const sub = s.item?.category?.includes('›') ? s.item.category.split('›')[1].trim() : null
                  return (
                    <div className="list-row" key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        {s.item?.imageUrl
                          ? <img src={s.item.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📦</div>
                        }
                        <div className="list-row-left">
                          <div className="list-row-name">{s.item?.name}</div>
                          <div className="list-row-sub">{sub && <span style={{ color: 'var(--accent)' }}>{sub} · </span>}reorder at {reorder}</div>
                        </div>
                      </div>
                      <div className="list-row-right">
                        <div className="list-qty">{s.quantity}</div>
                        <div className="list-unit">{s.item?.unit}</div>
                        {out && <span className="badge badge-out" style={{ marginTop: 4 }}>Out</span>}
                        {low && !out && <span className="badge badge-low" style={{ marginTop: 4 }}>Low</span>}
                      </div>
                      <button className="btn btn-sm" style={{ marginLeft: 8 }}
                        onClick={() => setEditingItem({ _id: s.item?._id, name: s.item?.name, unit: s.item?.unit, reorderLevel: s.item?.reorderLevel || 0 })}>
                        ✏️
                      </button>
                      {editingItem?._id === s.item?._id && (
                        <div style={{ gridColumn: '1/-1', padding: 10, background: 'var(--surface2)', borderRadius: 8, marginTop: 4 }}>
                          <div className="form-row" style={{ marginBottom: 8 }}>
                            <input className="form-input" style={{ margin: 0 }} value={editingItem.name}
                              onChange={e => setEditingItem(p => ({ ...p, name: e.target.value }))} placeholder="Item name" />
                            <select className="form-select" style={{ margin: 0 }} value={editingItem.unit}
                              onChange={e => setEditingItem(p => ({ ...p, unit: e.target.value }))}>
                              {['pieces','boxes','kg','grams','packets','rolls','sheets','dozen','sets','metres'].map(u => <option key={u}>{u}</option>)}
                            </select>
                            <input className="form-input" style={{ margin: 0, width: 80 }} type="number" value={editingItem.reorderLevel}
                              onChange={e => setEditingItem(p => ({ ...p, reorderLevel: e.target.value }))} placeholder="Reorder level" />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={saveItem}>💾 Save Changes</button>
                            <button className="btn btn-sm" onClick={() => setEditingItem(null)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}

          {/* ADD STOCK TAB */}
          {subTab === 'add' && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>Add stock to {wh.name}</div>

              {/* Mode selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setStockMode('single')} style={{
                  padding: '12px', borderRadius: 10, border: stockMode === 'single' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: stockMode === 'single' ? 'var(--accent-light)' : 'var(--surface)',
                  color: stockMode === 'single' ? 'var(--accent-text)' : 'var(--text)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer', fontWeight: stockMode === 'single' ? 600 : 400
                }}>
                  📦 Single Item<br /><span style={{ fontSize: 11, opacity: 0.7 }}>Add one item at a time</span>
                </button>
                <button onClick={() => setStockMode('bulk')} style={{
                  padding: '12px', borderRadius: 10, border: stockMode === 'bulk' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: stockMode === 'bulk' ? 'var(--accent-light)' : 'var(--surface)',
                  color: stockMode === 'bulk' ? 'var(--accent-text)' : 'var(--text)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer', fontWeight: stockMode === 'bulk' ? 600 : 400
                }}>
                  📋 Bulk Entry<br /><span style={{ fontSize: 11, opacity: 0.7 }}>Enter all items at once</span>
                </button>
              </div>

              {/* Single item form */}
              {stockMode === 'single' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Select item *</label>
                    <select className="form-select" value={singleItem} onChange={e => setSingleItem(e.target.value)}>
                      <option value="">— Select item —</option>
                      {Object.entries(itemsByCategory()).map(([cat, catItems]) => (
                        <optgroup key={cat} label={`${getCatIcon(cat)} ${cat}`}>
                          {catItems.map(i => <option key={i._id} value={i._id}>{i.name} ({i.unit})</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input className="form-input" type="number" min="0" value={singleQty} onChange={e => setSingleQty(e.target.value)} placeholder="0" />
                  </div>
                  <button className="btn btn-primary" onClick={submitSingleStock} disabled={busy}>
                    {busy ? 'Adding...' : '+ Add to Warehouse'}
                  </button>
                </>
              )}

              {/* Bulk entry form */}
              {stockMode === 'bulk' && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
                    Enter quantities for items currently in {wh.name}. Leave blank to skip.
                  </div>
                  {Object.entries(itemsByCategory()).map(([cat, catItems]) => (
                    <div key={cat} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>{getCatIcon(cat)}</span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text2)' }}>{cat}</span>
                      </div>
                      {catItems.map(item => (
                        <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          {item.imageUrl
                            ? <img src={item.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                            : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📦</div>
                          }
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.unit}</div>
                          </div>
                          <input type="number" min="0" placeholder="0"
                            value={bulkStock[item._id] || ''}
                            onChange={e => setBulkStock(p => ({ ...p, [item._id]: e.target.value }))}
                            style={{ width: 80, padding: '8px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'DM Sans', fontSize: 14, textAlign: 'right' }}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                  {items.length === 0 && <div className="empty"><div className="empty-icon">📦</div>Add items in Manage first</div>}
                  {items.length > 0 && (
                    <button className="btn btn-primary" onClick={submitBulkStock} disabled={busy}>
                      {busy ? 'Saving...' : '✓ Save All Stock'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* TICKETS TAB */}
          {subTab === 'tickets' && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Pending tickets for {wh.name}</div>
              {whTickets.length === 0 ? (
                <div className="empty"><div className="empty-icon">\ud83c\udfab</div>No pending tickets</div>
              ) : whTickets.map(ticket => (
                <div key={ticket._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--info)' }}>{ticket.type?.replace('_', ' ').toUpperCase()}</span>
                    <span style={{ fontFamily: 'DM Mono', fontSize: 13 }}>{ticket.quantity} {ticket.itemUnit}</span>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>{ticket.itemName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{ticket.fromName} → {ticket.toName}</div>
                  {ticket.note && <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 8 }}>"{ticket.note}"</div>}
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>{formatDate(ticket.createdAt)}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent-text)', border: 'none' }}
                      onClick={() => updateTicketStatus(ticket._id, 'approved')}>✓ Approve</button>
                    <button className="btn btn-sm btn-danger" onClick={() => updateTicketStatus(ticket._id, 'rejected')}>✕ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}