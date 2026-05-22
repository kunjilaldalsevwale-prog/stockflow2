import React, { useEffect, useState } from 'react'
import api from '../api'

const emptyLine = () => ({ itemId: '', itemName: '', itemUnit: 'pieces', vendorCode: '', quantity: '', costPrice: '' })

export default function Vendors({ user }) {
  const [vendors, setVendors] = useState([])
  const [items, setItems] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeVendor, setActiveVendor] = useState(null)
  const [tab, setTab] = useState('invoices') // invoices | new
  const [msg, setMsg] = useState(null)
  const [search, setSearch] = useState('')

  // New invoice form
  const [form, setForm] = useState({
    invoiceNo: '', invoiceDate: new Date().toISOString().slice(0, 10),
    warehouseId: '', note: '',
    lines: [emptyLine()]
  })
  const [saving, setSaving] = useState(false)

  const load = () => Promise.all([
    api.get('/vendors'), api.get('/items'), api.get('/warehouses')
  ]).then(([v, it, wh]) => {
    setVendors(Array.isArray(v.data) ? v.data : [])
    setItems((Array.isArray(it.data) ? it.data : []).filter(i => i.category && i.category !== 'General'))
    setWarehouses(Array.isArray(wh.data) ? wh.data : [])
    setLoading(false)
  })

  const loadInvoices = (vendorId) => {
    api.get(`/invoices?vendorId=${vendorId}`).then(r => setInvoices(Array.isArray(r.data) ? r.data : []))
  }

  useEffect(() => { load() }, [])

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  const selectVendor = (v) => {
    setActiveVendor(v)
    setTab('invoices')
    loadInvoices(v._id)
    setForm({ invoiceNo: '', invoiceDate: new Date().toISOString().slice(0, 10), warehouseId: '', note: '', lines: [emptyLine()] })
  }

  const addLine = () => setForm(p => ({ ...p, lines: [...p.lines, emptyLine()] }))
  const removeLine = (i) => setForm(p => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }))
  const updateLine = (i, field, val) => setForm(p => {
    const lines = [...p.lines]
    lines[i] = { ...lines[i], [field]: val }
    // Auto-fill item details when item selected
    if (field === 'itemId') {
      const item = items.find(it => it._id === val)
      if (item) lines[i] = { ...lines[i], itemName: item.name, itemUnit: item.unit, vendorCode: item.vendorCode || '' }
    }
    return { ...p, lines }
  })

  const saveInvoice = async () => {
    if (!form.warehouseId) return showMsg('Select warehouse', 'error')
    const validLines = form.lines.filter(l => l.itemId && l.quantity && parseFloat(l.quantity) > 0)
    if (validLines.length === 0) return showMsg('Add at least one item with quantity', 'error')
    setSaving(true)
    try {
      const wh = warehouses.find(w => w._id === form.warehouseId)
      await api.post('/invoices', {
        vendorId: activeVendor._id,
        vendorName: activeVendor.name,
        invoiceNo: form.invoiceNo,
        invoiceDate: form.invoiceDate,
        warehouseId: form.warehouseId,
        warehouseName: wh?.name || '',
        items: validLines.map(l => ({ ...l, quantity: parseFloat(l.quantity), costPrice: parseFloat(l.costPrice) || 0 })),
        note: form.note
      })
      showMsg('Stock added successfully!')
      setForm({ invoiceNo: '', invoiceDate: new Date().toISOString().slice(0, 10), warehouseId: '', note: '', lines: [emptyLine()] })
      setTab('invoices')
      loadInvoices(activeVendor._id)
    } catch(e) {
      showMsg(e?.response?.data?.error || 'Error saving', 'error')
    }
    setSaving(false)
  }

  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  if (loading) return <div className="spinner"><div className="spin"/></div>

  const filteredVendors = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', gap: 16, minHeight: 500 }}>

      {/* Left panel - vendor list */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Vendors</div>
        <input className="form-input" style={{ marginBottom: 8, padding: '6px 10px', fontSize: 12 }}
          placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {filteredVendors.map(v => (
            <div key={v._id} onClick={() => selectVendor(v)}
              style={{ padding: '10px 12px', borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                background: activeVendor?._id === v._id ? 'var(--accent)' : 'var(--surface)',
                border: `1px solid ${activeVendor?._id === v._id ? 'var(--accent)' : 'var(--border)'}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: activeVendor?._id === v._id ? '#fff' : 'var(--text)' }}>🏭 {v.name}</div>
              {v.contact && <div style={{ fontSize: 11, color: activeVendor?._id === v._id ? 'rgba(255,255,255,0.7)' : 'var(--text3)', marginTop: 2 }}>{v.contact}</div>}
            </div>
          ))}
          {filteredVendors.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', padding: 8 }}>No vendors. Add in Item Master → Vendors.</div>}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1 }}>
        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        {!activeVendor ? (
          <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏭</div>
            <div>Select a vendor to view purchase history</div>
          </div>
        ) : (
          <>
            {/* Vendor header */}
            <div className="card" style={{ marginBottom: 14, padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>🏭 {activeVendor.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {[activeVendor.contact, activeVendor.email, activeVendor.gst].filter(Boolean).join(' · ')}
                  </div>
                  {activeVendor.address && <div style={{ fontSize: 12, color: 'var(--text3)' }}>📍 {activeVendor.address}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{ background: 'var(--accent-light)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'DM Mono', fontWeight: 800, fontSize: 20, color: 'var(--accent)' }}>{invoices.length}</div>
                    <div style={{ fontSize: 10, color: 'var(--accent)' }}>Invoices</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={() => setTab('invoices')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none',
                background: tab === 'invoices' ? 'var(--accent)' : 'var(--surface2)',
                color: tab === 'invoices' ? '#fff' : 'var(--text2)', fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: tab === 'invoices' ? 700 : 400, cursor: 'pointer' }}>
                📋 Purchase History
              </button>
              <button onClick={() => setTab('new')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none',
                background: tab === 'new' ? 'var(--accent)' : 'var(--surface2)',
                color: tab === 'new' ? '#fff' : 'var(--text2)', fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: tab === 'new' ? 700 : 400, cursor: 'pointer' }}>
                + New Purchase
              </button>
            </div>

            {/* Purchase history */}
            {tab === 'invoices' && (
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {invoices.length === 0 ? (
                  <div className="card"><div className="empty"><div className="empty-icon">📋</div>No purchases yet. Click "+ New Purchase" to add.</div></div>
                ) : invoices.map(inv => (
                  <div key={inv._id} className="card" style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'DM Mono', color: 'var(--accent)' }}>
                          {inv.invoiceNo ? `Invoice #${inv.invoiceNo}` : 'No Invoice No.'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                          {fmt(inv.invoiceDate)} · 🏭 {inv.warehouseName}
                        </div>
                        {inv.note && <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>"{inv.note}"</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'DM Mono', fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>{inv.totalQty} pcs</div>
                        {inv.totalCost > 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>₹{inv.totalCost.toLocaleString('en-IN')}</div>}
                      </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--surface2)' }}>
                          <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text2)', fontWeight: 500 }}>Item</th>
                          <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text2)', fontWeight: 500 }}>Vendor Code</th>
                          <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text2)', fontWeight: 500 }}>Qty</th>
                          <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text2)', fontWeight: 500 }}>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inv.items || []).map((item, i) => (
                          <tr key={i}>
                            <td style={{ padding: '7px 8px', borderTop: '1px solid var(--border)' }}>{item.itemName}</td>
                            <td style={{ padding: '7px 8px', borderTop: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text3)' }}>{item.vendorCode || '—'}</td>
                            <td style={{ textAlign: 'right', padding: '7px 8px', borderTop: '1px solid var(--border)', fontFamily: 'DM Mono', fontWeight: 700 }}>{item.quantity} {item.itemUnit}</td>
                            <td style={{ textAlign: 'right', padding: '7px 8px', borderTop: '1px solid var(--border)', fontFamily: 'DM Mono' }}>
                              {item.costPrice > 0 ? `₹${(item.quantity * item.costPrice).toLocaleString('en-IN')}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {/* New purchase form */}
            {tab === 'new' && (
              <div className="card">
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>New Purchase from {activeVendor.name}</div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Invoice Number</label>
                    <input className="form-input" value={form.invoiceNo} onChange={e => setForm(p => ({ ...p, invoiceNo: e.target.value }))} placeholder="e.g. INV-2024-001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Invoice Date</label>
                    <input className="form-input" type="date" value={form.invoiceDate} onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Received in Warehouse *</label>
                  <select className="form-select" value={form.warehouseId} onChange={e => setForm(p => ({ ...p, warehouseId: e.target.value }))}>
                    <option value="">— Select warehouse —</option>
                    {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                  </select>
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, marginTop: 4 }}>Items in this Invoice</div>

                {form.lines.map((line, i) => (
                  <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 8, background: line.itemId ? 'var(--accent-light)' : 'var(--surface2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>Item {i + 1}</span>
                      {form.lines.length > 1 && <button onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>✕</button>}
                    </div>
                    <div className="form-group">
                      <select className="form-select" value={line.itemId} onChange={e => updateLine(i, 'itemId', e.target.value)}>
                        <option value="">— Select item —</option>
                        {items.map(it => <option key={it._id} value={it._id}>{it.name} ({it.unit})</option>)}
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Vendor Code</label>
                        <input className="form-input" value={line.vendorCode} onChange={e => updateLine(i, 'vendorCode', e.target.value)} placeholder="e.g. V-001" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Qty ({line.itemUnit || 'pcs'})</label>
                        <input className="form-input" type="number" min="0" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} placeholder="0" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Cost Price (₹)</label>
                        <input className="form-input" type="number" min="0" value={line.costPrice} onChange={e => updateLine(i, 'costPrice', e.target.value)} placeholder="0" />
                      </div>
                    </div>
                  </div>
                ))}

                <button onClick={addLine} style={{ width: '100%', padding: 10, background: '#fff', border: '1.5px dashed var(--border)', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 12, fontFamily: 'Plus Jakarta Sans' }}>
                  + Add Another Item
                </button>

                {/* Summary */}
                <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>Total Items</span>
                    <strong>{form.lines.filter(l => l.itemId && l.quantity).length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                    <span>Total Qty</span>
                    <strong>{form.lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0), 0)} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                    <span>Total Cost</span>
                    <strong>₹{form.lines.reduce((s, l) => s + ((parseFloat(l.quantity) || 0) * (parseFloat(l.costPrice) || 0)), 0).toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Note (optional)</label>
                  <input className="form-input" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Any notes about this purchase" />
                </div>

                <button className="btn btn-primary" style={{ width: '100%', padding: 14, fontSize: 15 }} onClick={saveInvoice} disabled={saving}>
                  {saving ? '⏳ Saving...' : '✅ Save Invoice & Add Stock to Warehouse'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
