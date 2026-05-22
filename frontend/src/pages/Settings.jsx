import React, { useEffect, useState } from 'react'
import api from '../api'

const UNITS = ['pieces', 'boxes', 'kg', 'grams', 'packets', 'rolls', 'sheets', 'dozen', 'sets', 'metres']

export default function Settings() {
  const [tab, setTab] = useState('categories')
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [stockSummary, setStockSummary] = useState([])
  const [vendors, setVendors] = useState([])
  const [txns, setTxns] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)

  const [activeCat, setActiveCat] = useState(null)
  const [activeSub, setActiveSub] = useState(null)
  const [activeSubSub, setActiveSubSub] = useState(null)
  const [newSubName, setNewSubName] = useState('')
  const [newSubSubName, setNewSubSubName] = useState({})
  const [addingCat, setAddingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('📦')
  const [showItemForm, setShowItemForm] = useState(null)
  const [iForm, setIForm] = useState({
    name: '', unit: 'pieces', reorderLevel: '',
    costPrice: '', sellingPrice: '',
    vendorId: '', vendorCode: '',
    warehouses: {}, // { warehouseId: qty }
    imageFile: null, imagePreview: null
  })
  const [vForm, setVForm] = useState({ name: '', contact: '', email: '', address: '', gst: '' })
  const [editingItem, setEditingItem] = useState(null)
  const [editingVendor, setEditingVendor] = useState(null)

  const load = () => Promise.all([
    api.get('/categories'), api.get('/items'), api.get('/stock-summary'), api.get('/vendors'), api.get('/transactions'), api.get('/warehouses')
  ]).then(([ca, it, sm, vn, tx, wh]) => {
    setCategories(ca.data)
    setItems(it.data)
    setStockSummary(Array.isArray(sm.data) ? sm.data : [])
    setVendors(vn.data)
    setTxns(tx.data)
    setLoading(false)
  })

  useEffect(() => { load() }, [])

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000) }

  const getStock = (itemId) => {
    const s = stockSummary.find(s => s.item?._id === itemId)
    return s?.total || 0
  }

  // Category actions
  const addCategory = async () => {
    if (!newCatName.trim()) return showMsg('Enter category name', 'error')
    const cat = await api.post('/categories', { name: newCatName.trim(), icon: newCatIcon })
    setNewCatName(''); setNewCatIcon('📦'); setAddingCat(false)
    showMsg('Category added'); load(); setActiveCat(cat.data._id)
  }
  const deleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return
    await api.delete(`/categories/${id}`)
    setActiveCat(null); setActiveSub(null); setActiveSubSub(null); load()
  }
  const addSub = async (catId) => {
    const name = newSubName.trim()
    if (!name) return showMsg('Enter subcategory name', 'error')
    await api.post(`/categories/${catId}/subcategory`, { name })
    setNewSubName(''); showMsg('Subcategory added'); load()
  }
  const deleteSub = async (catId, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    // delete items under this sub
    const subItems = items.filter(i => i.category === `${categories.find(c=>c._id===catId)?.name} › ${name}` || i.category?.startsWith(`${categories.find(c=>c._id===catId)?.name} › ${name} ›`))
    for (const item of subItems) await api.delete(`/items/${item._id}`)
    await api.delete(`/categories/${catId}/subcategory`, { data: { name } })
    setActiveSub(null); setActiveSubSub(null); load()
  }

  // Sub-sub category stored as "sub › subsub" in a special field
  const getSubSubs = (catName, subName) => {
    const cat = categories.find(c => c.name === catName)
    if (!cat) return []
    return (cat.subsubcategories || []).filter(s => s.startsWith(`${subName}:`)).map(s => s.split(':')[1])
  }
  const addSubSub = async (catId, subName, subSubName) => {
    if (!subSubName?.trim()) return showMsg('Enter name', 'error')
    const cat = categories.find(c => c._id === catId)
    const existing = cat?.subsubcategories || []
    const key = `${subName}:${subSubName.trim()}`
    if (existing.includes(key)) return showMsg('Already exists', 'error')
    await api.put(`/categories/${catId}`, { subsubcategories: [...existing, key] })
    setNewSubSubName(p => ({ ...p, [`${catId}-${subName}`]: '' }))
    showMsg('Added'); load()
  }
  const deleteSubSub = async (catId, subName, subSubName) => {
    const cat = categories.find(c => c._id === catId)
    const key = `${subName}:${subSubName}`
    const updated = (cat?.subsubcategories || []).filter(s => s !== key)
    await api.put(`/categories/${catId}`, { subsubcategories: updated })
    setActiveSubSub(null); load()
  }

  // Get items for a path
  const getItems = (catName, subName, subSubName) => {
    if (subSubName) return items.filter(i => i.category === `${catName} › ${subName} › ${subSubName}`)
    if (subName) return items.filter(i => i.category === `${catName} › ${subName}`)
    return []
  }

  const uploadImage = async (file) => {
    const formData = new FormData()
    formData.append('image', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    return data.url
  }

  const addItemInPath = async (catName, subName, subSubName) => {
    if (!iForm.name.trim()) return showMsg('Enter item name', 'error')
    const categoryLabel = subSubName
      ? `${catName} › ${subName} › ${subSubName}`
      : `${catName} › ${subName}`
    let imageUrl = null
    if (iForm.imageFile) {
      try { imageUrl = await uploadImage(iForm.imageFile) } catch {}
    }
    const vendor = vendors.find(v => v._id === iForm.vendorId)
    const res = await api.post('/items', {
      name: iForm.name.trim(), unit: iForm.unit,
      category: categoryLabel,
      reorderLevel: parseFloat(iForm.reorderLevel) || 0,
      costPrice: parseFloat(iForm.costPrice) || 0,
      sellingPrice: parseFloat(iForm.sellingPrice) || 0,
      vendorId: iForm.vendorId || null,
      vendorName: vendor?.name || '',
      vendorCode: iForm.vendorCode || '',
      imageUrl
    })
    // Add initial stock to warehouses
    const newItemId = res.data._id
    const itemCode = res.data.itemCode || ''
    for (const [whId, qty] of Object.entries(iForm.warehouses)) {
      if (qty && parseFloat(qty) > 0) {
        await api.post('/purchase', { warehouseId: whId, itemId: newItemId, quantity: parseFloat(qty), note: 'Initial stock' })
      }
    }
    showMsg(`Item added! Code: ${itemCode}`)
    setIForm({ name: '', unit: 'pieces', reorderLevel: '', costPrice: '', sellingPrice: '', vendorId: '', vendorCode: '', warehouses: {}, imageFile: null, imagePreview: null })
    setShowItemForm(null); load()
  }

  const saveItem = async () => {
    if (!editingItem || !editingItem.name.trim()) return
    await api.put(`/items/${editingItem._id}`, {
      name: editingItem.name,
      unit: editingItem.unit,
      reorderLevel: parseFloat(editingItem.reorderLevel) || 0,
      costPrice: parseFloat(editingItem.costPrice) || 0,
      sellingPrice: parseFloat(editingItem.sellingPrice) || 0,
      vendorId: editingItem.vendorId || null,
      vendorCode: editingItem.vendorCode || ''
    })
    setEditingItem(null)
    showMsg('Item updated!')
    load()
  }

  const deleteItem = async (id) => {
    if (!confirm('Delete?')) return
    await api.delete(`/items/${id}`); load()
  }

  const saveVendor = async () => {
    if (!editingVendor?.name) return showMsg('Vendor name required', 'error')
    await api.put(`/vendors/${editingVendor._id}`, editingVendor)
    setEditingVendor(null)
    showMsg('Vendor updated!')
    load()
  }

  const addVendor = async () => {
    if (!vForm.name) return showMsg('Vendor name required', 'error')
    await api.post('/vendors', vForm); showMsg('Vendor added'); setVForm({ name: '', contact: '', email: '', address: '', gst: '' }); load()
  }
  const deleteVendor = async (id) => {
    if (!confirm('Delete?')) return
    await api.delete(`/vendors/${id}`); load()
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const txnColor = (type) => ({ purchase: 'var(--accent)', transfer: 'var(--info)', sale: 'var(--warning)' }[type] || 'var(--text2)')

  const currentCat = categories.find(c => c._id === activeCat)

  const renderItemForm = (catName, subName, subSubName, key) => (
    showItemForm === key ? (
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>

        <div style={{ background: 'var(--accent-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: 'var(--accent)' }}>
          🏷️ Item code will be auto-generated on save
        </div>

        <div className="form-group">
          <label className="form-label">Product Name *</label>
          <input className="form-input" value={iForm.name} onChange={e => setIForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Red Box 12x12" autoFocus />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Unit</label>
            <select className="form-select" value={iForm.unit} onChange={e => setIForm(p => ({ ...p, unit: e.target.value }))}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Min Qty Alert</label>
            <input className="form-input" type="number" min="0" value={iForm.reorderLevel} onChange={e => setIForm(p => ({ ...p, reorderLevel: e.target.value }))} placeholder="0" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Cost Price (₹)</label>
            <input className="form-input" type="number" min="0" value={iForm.costPrice} onChange={e => setIForm(p => ({ ...p, costPrice: e.target.value }))} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Selling Price (₹)</label>
            <input className="form-input" type="number" min="0" value={iForm.sellingPrice} onChange={e => setIForm(p => ({ ...p, sellingPrice: e.target.value }))} placeholder="0" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Vendor</label>
            <select className="form-select" value={iForm.vendorId} onChange={e => setIForm(p => ({ ...p, vendorId: e.target.value }))}>
              <option value="">— No vendor —</option>
              {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Vendor Code</label>
            <input className="form-input" value={iForm.vendorCode} onChange={e => setIForm(p => ({ ...p, vendorCode: e.target.value }))} placeholder="e.g. V-001" />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="form-label" style={{ margin: 0 }}>Stock in Warehouses</label>
            <button type="button" style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setIForm(p => ({ ...p, whLines: [...(p.whLines || [{ whId: '', qty: '' }]), { whId: '', qty: '' }] }))}>
              + Add
            </button>
          </div>
          {(iForm.whLines || [{ whId: '', qty: '' }]).map((wl, wi) => (
            <div key={wi} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
              <select className="form-select" style={{ margin: 0, flex: 1 }} value={wl.whId}
                onChange={e => setIForm(p => { const nl = [...(p.whLines || [])]; nl[wi] = { ...nl[wi], whId: e.target.value }; return { ...p, whLines: nl } })}>
                <option value="">— Select warehouse —</option>
                {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
              <input className="form-input" type="number" min="0" style={{ width: 80, margin: 0 }} placeholder="Qty" value={wl.qty}
                onChange={e => setIForm(p => { const nl = [...(p.whLines || [])]; nl[wi] = { ...nl[wi], qty: e.target.value }; return { ...p, whLines: nl } })} />
              {(iForm.whLines || []).length > 1 && (
                <button type="button" style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '3px 7px', cursor: 'pointer' }}
                  onClick={() => setIForm(p => ({ ...p, whLines: (p.whLines || []).filter((_, i) => i !== wi) }))}>✕</button>
              )}
            </div>
          ))}
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', border: '1px dashed var(--border)', borderRadius: 8, cursor: 'pointer' }}>
            {iForm.imagePreview
              ? <img src={iForm.imagePreview} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
              : <span style={{ fontSize: 13, color: 'var(--text2)' }}>📷 Upload or take photo</span>}
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files[0]
                if (file) setIForm(p => ({ ...p, imageFile: file, imagePreview: URL.createObjectURL(file) }))
              }} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => addItemInPath(catName, subName, subSubName)}>+ Add Item</button>
          <button className="btn btn-sm btn-danger" onClick={() => { setShowItemForm(null); setIForm({ name: '', unit: 'pieces', reorderLevel: '', costPrice: '', sellingPrice: '', vendorId: '', vendorCode: '', warehouses: {}, whLines: [{ whId: '', qty: '' }], imageFile: null, imagePreview: null }) }}>Cancel</button>
        </div>
      </div>
    ) : null
  )

  const renderItems = (catName, subName, subSubName) => {
    const itms = getItems(catName, subName, subSubName)
    return itms.map(item => {
      const stock = getStock(item._id)
      return (
        <div key={item._id} className="list-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            {item.imageUrl
              ? <img src={item.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📦</div>
            }
            <div>
              <div className="list-row-name">{item.name}</div>
              <div className="list-row-sub">{item.unit}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', marginLeft: 12 }}>
            <div style={{ fontFamily: 'DM Mono', fontWeight: 600, fontSize: 16, color: stock === 0 ? 'var(--danger)' : stock <= (item.reorderLevel||0) ? 'var(--warn)' : 'var(--accent)' }}>{stock}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.unit}</div>
          </div>
          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            <button className="btn btn-sm" onClick={() => setEditingItem({ _id: item._id, name: item.name, unit: item.unit, reorderLevel: item.reorderLevel || 0, costPrice: item.costPrice || 0, sellingPrice: item.sellingPrice || 0, vendorId: item.vendorId || '', vendorCode: item.vendorCode || '' })}>✏️</button>
            <button className="btn btn-sm btn-danger" onClick={() => deleteItem(item._id)}>✕</button>
          </div>
        </div>
      )
    })
  }

  if (loading) return <div className="spinner"><div className="spin"/></div>

  return (
    <div className="page">
      {editingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>✏️ Edit Item</div>
            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input className="form-input" value={editingItem.name} onChange={e => setEditingItem(p => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-select" value={editingItem.unit} onChange={e => setEditingItem(p => ({ ...p, unit: e.target.value }))}>
                  {['pieces','boxes','kg','grams','packets','rolls','sheets','dozen','sets','metres'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Min Qty Alert</label>
                <input className="form-input" type="number" value={editingItem.reorderLevel} onChange={e => setEditingItem(p => ({ ...p, reorderLevel: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cost Price (₹)</label>
                <input className="form-input" type="number" min="0" value={editingItem.costPrice || ''} onChange={e => setEditingItem(p => ({ ...p, costPrice: e.target.value }))} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price (₹)</label>
                <input className="form-input" type="number" min="0" value={editingItem.sellingPrice || ''} onChange={e => setEditingItem(p => ({ ...p, sellingPrice: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vendor</label>
                <select className="form-select" value={editingItem.vendorId || ''} onChange={e => setEditingItem(p => ({ ...p, vendorId: e.target.value }))}>
                  <option value="">— No vendor —</option>
                  {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vendor Code</label>
                <input className="form-input" value={editingItem.vendorCode || ''} onChange={e => setEditingItem(p => ({ ...p, vendorCode: e.target.value }))} placeholder="e.g. V-001" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveItem}>💾 Save</button>
              <button className="btn" onClick={() => setEditingItem(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div className="page-tabs">
        <div className={`page-tab ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>Categories</div>
        <div className={`page-tab ${tab === 'vendors' ? 'active' : ''}`} onClick={() => setTab('vendors')}>Vendors</div>
        <div className={`page-tab ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>Log</div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {tab === 'categories' && (
        <>
          {/* Master category tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, maxHeight: 120, overflowY: 'auto', paddingRight: 4 }}>
            {categories.map(cat => (
              <button key={cat._id} onClick={() => { setActiveCat(activeCat === cat._id ? null : cat._id); setActiveSub(null); setActiveSubSub(null); setShowItemForm(null) }}
                style={{ padding: '9px 16px', borderRadius: 24, border: activeCat === cat._id ? '2px solid var(--accent)' : '1px solid var(--border)', background: activeCat === cat._id ? 'var(--accent-light)' : 'var(--surface)', color: activeCat === cat._id ? 'var(--accent-text)' : 'var(--text)', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: activeCat === cat._id ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{cat.icon}</span><span>{cat.name}</span>
                <span style={{ background: activeCat === cat._id ? 'var(--accent)' : 'var(--surface2)', color: activeCat === cat._id ? '#fff' : 'var(--text3)', borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{cat.subcategories?.length || 0}</span>
              </button>
            ))}
            <button onClick={() => setAddingCat(!addingCat)} style={{ padding: '9px 16px', borderRadius: 24, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text3)', fontFamily: 'DM Sans, sans-serif', fontSize: 14, cursor: 'pointer' }}>+ New Category</button>
          </div>

          {addingCat && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 12 }}>New master category</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <select className="form-select" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} style={{ width: 72 }}>
                  {['📦','👜','🎁','🧴','🍬','🎀','🧾','🪣','✂','🛍','🎊','🧵','🖨','🪡'].map(i => <option key={i} value={i}>{i}</option>)}
                </select>
                <input className="form-input" style={{ flex: 1 }} value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Ribbon" onKeyDown={e => e.key === 'Enter' && addCategory()} />
                <button className="btn btn-sm" style={{ background: 'var(--accent)', color: '#fff', border: 'none', height: 44 }} onClick={addCategory}>Add</button>
                <button className="btn btn-sm btn-danger" style={{ height: 44 }} onClick={() => setAddingCat(false)}>✕</button>
              </div>
            </div>
          )}

          {!currentCat && !addingCat && <div className="card"><div className="empty"><div className="empty-icon">👆</div>Select a category above</div></div>}

          {currentCat && (
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{currentCat.icon}</span>
                  <div><div className="card-title">{currentCat.name}</div><div className="card-sub">{currentCat.subcategories?.length || 0} subcategories</div></div>
                </div>
                <button className="btn btn-sm btn-danger" onClick={() => deleteCategory(currentCat._id)}>Delete</button>
              </div>

              {/* Subcategories */}
              {(currentCat.subcategories || []).map((sub, i) => {
                const subSubs = getSubSubs(currentCat.name, sub)
                const isOpenSub = activeSub === sub

                return (
                  <div key={i} style={{ marginBottom: 8 }}>
                    {/* Sub row */}
                    <div onClick={() => { setActiveSub(isOpenSub ? null : sub); setActiveSubSub(null); setShowItemForm(null) }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: isOpenSub ? '8px 8px 0 0' : 8, background: isOpenSub ? 'var(--accent-light)' : 'var(--surface2)', cursor: 'pointer', border: isOpenSub ? '1px solid var(--accent)' : '1px solid var(--border)', borderBottom: isOpenSub ? 'none' : undefined }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: isOpenSub ? 'var(--accent-text)' : 'var(--text)' }}>↳ {sub}</span>
                        <span style={{ fontSize: 11, background: 'var(--surface)', color: 'var(--text3)', padding: '1px 7px', borderRadius: 10 }}>{subSubs.length} sub · {getItems(currentCat.name, sub, null).length} items</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontSize: 12, color: isOpenSub ? 'var(--accent)' : 'var(--text3)' }}>{isOpenSub ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Expanded sub */}
                    {isOpenSub && (
                      <div style={{ border: '1px solid var(--accent)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '10px 12px', background: 'var(--surface)' }}>

                        {/* Sub-sub categories */}
                        {subSubs.map((ss, j) => {
                          const ssKey = `${sub}-${ss}`
                          const isOpenSS = activeSubSub === ssKey
                          const ssItems = getItems(currentCat.name, sub, ss)

                          return (
                            <div key={j} style={{ marginBottom: 6 }}>
                              <div onClick={() => { setActiveSubSub(isOpenSS ? null : ssKey); setShowItemForm(null) }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: isOpenSS ? '6px 6px 0 0' : 6, background: isOpenSS ? 'var(--info-light)' : 'var(--surface2)', cursor: 'pointer', border: isOpenSS ? '1px solid var(--info)' : '1px solid var(--border)', borderBottom: isOpenSS ? 'none' : undefined }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: isOpenSS ? 'var(--info)' : 'var(--text)' }}>↳↳ {ss}</span>
                                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{ssItems.length} items</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{isOpenSS ? '▲' : '▼'}</span>
                                  <button className="btn btn-sm btn-danger" style={{ padding: '2px 6px', fontSize: 11 }}
                                    onClick={e => { e.stopPropagation(); deleteSubSub(currentCat._id, sub, ss) }}>✕</button>
                                </div>
                              </div>

                              {/* Expanded sub-sub */}
                              {isOpenSS && (
                                <div style={{ border: '1px solid var(--info)', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '8px 10px', background: 'var(--surface)' }}>
                                  {renderItems(currentCat.name, sub, ss)}
                                  {renderItemForm(currentCat.name, sub, ss, ssKey)}
                                  {showItemForm !== ssKey && (
                                    <button className="btn btn-sm" style={{ background: 'var(--accent)', color: '#fff', border: 'none', width: '100%', marginTop: 8 }}
                                      onClick={() => { setShowItemForm(ssKey); setIForm({ name: '', unit: 'pieces', reorderLevel: '', imageFile: null, imagePreview: null }) }}>
                                      + Add Item to {ss}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* Direct items under sub (no sub-sub) */}
                        {renderItems(currentCat.name, sub, null)}

                        {/* Add sub-sub */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 8 }}>
                          <input className="form-input" placeholder={`Add sub-subcategory under ${sub}...`}
                            value={newSubSubName[`${currentCat._id}-${sub}`] || ''}
                            onChange={e => setNewSubSubName(p => ({ ...p, [`${currentCat._id}-${sub}`]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && addSubSub(currentCat._id, sub, newSubSubName[`${currentCat._id}-${sub}`])}
                            style={{ flex: 1 }} />
                          <button className="btn btn-sm" style={{ background: 'var(--info)', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}
                            onClick={() => addSubSub(currentCat._id, sub, newSubSubName[`${currentCat._id}-${sub}`])}>+ Sub-Sub</button>
                        </div>

                        {/* Add item directly to sub */}
                        {renderItemForm(currentCat.name, sub, null, `direct-${sub}`)}
                        {showItemForm !== `direct-${sub}` && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-sm" style={{ background: 'var(--accent)', color: '#fff', border: 'none', flex: 1 }}
                              onClick={() => { setShowItemForm(`direct-${sub}`); setIForm({ name: '', unit: 'pieces', reorderLevel: '', imageFile: null, imagePreview: null }) }}>
                              + Add Item to {sub}
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => deleteSub(currentCat._id, sub)}>Delete</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add subcategory */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input className="form-input" placeholder={`Add subcategory to ${currentCat.name}...`}
                  value={newSubName} onChange={e => setNewSubName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSub(currentCat._id)}
                  style={{ flex: 1 }} />
                <button className="btn btn-sm" style={{ background: 'var(--accent)', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}
                  onClick={() => addSub(currentCat._id)}>+ Add Sub</button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'vendors' && (
        <>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Add Vendor</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vendor name *</label>
                <input className="form-input" value={vForm.name} onChange={e => setVForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Ali Traders" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={vForm.contact} onChange={e => setVForm(p => ({ ...p, contact: e.target.value }))} placeholder="9876543210" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={vForm.email} onChange={e => setVForm(p => ({ ...p, email: e.target.value }))} placeholder="vendor@email.com" />
              </div>
              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input className="form-input" value={vForm.gst} onChange={e => setVForm(p => ({ ...p, gst: e.target.value }))} placeholder="e.g. 09AAACH7409R1Z4" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={vForm.address} onChange={e => setVForm(p => ({ ...p, address: e.target.value }))} placeholder="Full address" />
            </div>
            <button className="btn btn-primary" onClick={addVendor}>+ Add Vendor</button>
          </div>
          <div className="section-title">All Vendors ({vendors.length})</div>
          <div className="card">
            {vendors.length === 0 ? <div className="empty"><div className="empty-icon">🏭</div>No vendors yet.</div>
              : vendors.map(v => (
                <div key={v._id}>
                  <div className="list-row" onClick={() => setEditingVendor(editingVendor?._id === v._id ? null : { ...v })} style={{ cursor: 'pointer' }}>
                    <div className="list-row-left">
                      <div className="list-row-name">🏭 {v.name}</div>
                      <div className="list-row-sub">{[v.contact, v.email, v.gst].filter(Boolean).join(' · ') || 'Tap to edit'}</div>
                      {v.address && <div className="list-row-sub">📍 {v.address}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" onClick={e => { e.stopPropagation(); setEditingVendor({ ...v }) }}>✏️</button>
                      <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); deleteVendor(v._id) }}>✕</button>
                    </div>
                  </div>
                  {editingVendor?._id === v._id && (
                    <div style={{ padding: 12, background: 'var(--surface2)', borderRadius: 8, marginBottom: 8 }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Name *</label>
                          <input className="form-input" value={editingVendor.name} onChange={e => setEditingVendor(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Phone</label>
                          <input className="form-input" value={editingVendor.contact || ''} onChange={e => setEditingVendor(p => ({ ...p, contact: e.target.value }))} />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Email</label>
                          <input className="form-input" value={editingVendor.email || ''} onChange={e => setEditingVendor(p => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">GST</label>
                          <input className="form-input" value={editingVendor.gst || ''} onChange={e => setEditingVendor(p => ({ ...p, gst: e.target.value }))} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Address</label>
                        <input className="form-input" value={editingVendor.address || ''} onChange={e => setEditingVendor(p => ({ ...p, address: e.target.value }))} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveVendor}>💾 Save</button>
                        <button className="btn" onClick={() => setEditingVendor(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </>
      )}

      {tab === 'log' && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Transaction log</div>
          {txns.length === 0 ? <div className="empty"><div className="empty-icon">📋</div>No transactions yet.</div>
            : txns.map((t, i) => (
              <div className="txn-row" key={i}>
                <div className="txn-top">
                  <span className="txn-type" style={{ color: txnColor(t.type) }}>{t.type?.toUpperCase()}</span>
                  <span className="txn-qty">{t.quantity} {t.itemUnit}</span>
                </div>
                <div className="txn-detail">{t.itemName} · {t.fromName} → {t.toName}</div>
                {t.note && <div className="txn-detail" style={{ color: 'var(--text3)' }}>"{t.note}"</div>}
                <div className="txn-time">{formatDate(t.createdAt)}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}