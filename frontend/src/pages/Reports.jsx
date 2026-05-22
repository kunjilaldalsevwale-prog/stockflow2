import React, { useEffect, useState } from 'react'
import api from '../api'

export default function Reports({ user }) {
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState([])
  const [categories, setCategories] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stock')

  // Stock Report filters
  const [filterMaster, setFilterMaster] = useState('')
  const [filterSub, setFilterSub] = useState('')
  const [filterSubSub, setFilterSubSub] = useState('')

  // By Warehouse filters
  const [whFilter, setWhFilter] = useState('')
  const [whMaster, setWhMaster] = useState('')
  const [whSub, setWhSub] = useState('')
  const [whSubSub, setWhSubSub] = useState('')

  // By Category filters
  const [catMaster, setCatMaster] = useState('')
  const [catSub, setCatSub] = useState('')
  const [catSubSub, setCatSubSub] = useState('')

  // Transactions filters
  const [txnType, setTxnType] = useState('all')
  const [txnFrom, setTxnFrom] = useState('')
  const [txnTo, setTxnTo] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/items'), api.get('/stock-summary'), api.get('/categories'),
      api.get('/warehouses'), api.get('/transactions')
    ]).then(([it, sm, ca, wh, tx]) => {
      setItems((Array.isArray(it.data) ? it.data : []).filter(i => i.category && i.category !== 'General' && i.category !== 'Uncategorised'))
      setSummary(Array.isArray(sm.data) ? sm.data : [])
      setCategories(Array.isArray(ca.data) ? ca.data : [])
      setWarehouses(Array.isArray(wh.data) ? wh.data : [])
      setTxns(Array.isArray(tx.data) ? tx.data : [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="spinner"><div className="spin"/></div>

  // Category hierarchy helpers
  const getMaster = cat => cat?.includes('›') ? cat.split('›')[0].trim() : cat
  const getSub = cat => cat?.includes('›') ? cat.split('›')[1]?.trim() : null
  const getSubSub = cat => cat?.split('›').length > 2 ? cat.split('›')[2]?.trim() : null
  const getCatIcon = name => categories.find(c => c.name === name)?.icon || '📦'

  const masterCats = [...new Set(items.map(i => getMaster(i.category)).filter(Boolean))]
  const subCats = (master) => [...new Set(items.filter(i => getMaster(i.category) === master).map(i => getSub(i.category)).filter(Boolean))]
  const subSubCats = (master, sub) => [...new Set(items.filter(i => getMaster(i.category) === master && getSub(i.category) === sub).map(i => getSubSub(i.category)).filter(Boolean))]

  // Build item stock data
  const itemStockData = items.map(item => {
    const entry = summary.find(s => s.item?._id === item._id)
    const total = entry?.total || 0
    const byWarehouse = entry?.byWarehouse || []
    const reorder = item.reorderLevel || 0
    const status = total === 0 ? 'out' : total <= reorder ? 'low' : 'ok'
    return { ...item, total, byWarehouse, status }
  })

  const totalItems = itemStockData.length
  const totalUnits = itemStockData.reduce((a, i) => a + i.total, 0)
  const lowCount = itemStockData.filter(i => i.status === 'low').length
  const outCount = itemStockData.filter(i => i.status === 'out').length

  const formatDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // Filter items for stock report
  const filteredStock = itemStockData.filter(i => {
    if (filterMaster && getMaster(i.category) !== filterMaster) return false
    if (filterSub && getSub(i.category) !== filterSub) return false
    if (filterSubSub && getSubSub(i.category) !== filterSubSub) return false
    return true
  })

  // Group by category for stock report
  const groupedStock = {}
  filteredStock.forEach(item => {
    const key = getMaster(item.category) || 'Other'
    if (!groupedStock[key]) groupedStock[key] = []
    groupedStock[key].push(item)
  })

  // Filter items for category report
  const filteredCat = itemStockData.filter(i => {
    if (catMaster && getMaster(i.category) !== catMaster) return false
    if (catSub && getSub(i.category) !== catSub) return false
    if (catSubSub && getSubSub(i.category) !== catSubSub) return false
    return true
  })

  // Group by full path for category report
  const groupedCat = {}
  filteredCat.forEach(item => {
    const master = getMaster(item.category) || 'Other'
    const sub = getSub(item.category)
    const subsub = getSubSub(item.category)
    const key = subsub ? `${master} › ${sub} › ${subsub}` : sub ? `${master} › ${sub}` : master
    if (!groupedCat[key]) groupedCat[key] = []
    groupedCat[key].push(item)
  })

  // CSV export
  const exportCSV = (data, filename) => {
    const rows = [['Item', 'Master Category', 'Sub Category', 'Sub-Sub Category', 'Full Category', 'Qty', 'Unit', 'Reorder Level', 'Status']]
    data.forEach(i => {
      const master = getMaster(i.category) || ''
      const sub = getSub(i.category) || ''
      const subsub = getSubSub(i.category) || ''
      // Clean category display - replace › with >
      const fullCat = (i.category || '').replace(/›/g, '>').replace(/›/g, '>')
      rows.push([i.name, master, sub, subsub, fullCat, i.total, i.unit, i.reorderLevel || 0, i.status])
    })
    // Add BOM for Excel UTF-8 support
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  // Styles
  const sel = { padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, cursor: 'pointer' }
  const tabBtn = (active) => ({ padding: '8px 16px', borderRadius: 8, border: 'none', background: active ? 'var(--accent)' : 'var(--surface2)', color: active ? '#fff' : 'var(--text2)', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' })
  const metricBox = (color) => ({ background: 'var(--surface)', borderRadius: 10, padding: '10px 14px', textAlign: 'center', flex: 1 })

  return (
    <div className="page">

      {/* ── TAB BAR with embedded dropdowns ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, alignItems: 'center' }}>

        {/* Stock Report tab */}
        <button style={tabBtn(activeTab === 'stock')} onClick={() => setActiveTab('stock')}>Stock Report</button>
        {activeTab === 'stock' && (
          <>
            <select style={sel} value={filterMaster} onChange={e => { setFilterMaster(e.target.value); setFilterSub(''); setFilterSubSub('') }}>
              <option value="">All Categories</option>
              {masterCats.map(m => <option key={m} value={m}>{getCatIcon(m)} {m}</option>)}
            </select>
            {filterMaster && subCats(filterMaster).length > 0 && (
              <select style={sel} value={filterSub} onChange={e => { setFilterSub(e.target.value); setFilterSubSub('') }}>
                <option value="">All Sub</option>
                {subCats(filterMaster).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {filterSub && subSubCats(filterMaster, filterSub).length > 0 && (
              <select style={sel} value={filterSubSub} onChange={e => setFilterSubSub(e.target.value)}>
                <option value="">All</option>
                {subSubCats(filterMaster, filterSub).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </>
        )}

        {/* By Warehouse tab */}
        <button style={tabBtn(activeTab === 'warehouse')} onClick={() => setActiveTab('warehouse')}>By Warehouse</button>
        {activeTab === 'warehouse' && (
          <>
            <select style={sel} value={whFilter} onChange={e => setWhFilter(e.target.value)}>
              <option value="">All Warehouses</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
            <select style={sel} value={whMaster} onChange={e => { setWhMaster(e.target.value); setWhSub(''); setWhSubSub('') }}>
              <option value="">All Categories</option>
              {masterCats.map(m => <option key={m} value={m}>{getCatIcon(m)} {m}</option>)}
            </select>
            {whMaster && subCats(whMaster).length > 0 && (
              <select style={sel} value={whSub} onChange={e => { setWhSub(e.target.value); setWhSubSub('') }}>
                <option value="">All Sub</option>
                {subCats(whMaster).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {whSub && subSubCats(whMaster, whSub).length > 0 && (
              <select style={sel} value={whSubSub} onChange={e => setWhSubSub(e.target.value)}>
                <option value="">All</option>
                {subSubCats(whMaster, whSub).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </>
        )}

        {/* By Category tab */}
        <button style={tabBtn(activeTab === 'category')} onClick={() => setActiveTab('category')}>By Category</button>
        {activeTab === 'category' && (
          <>
            <select style={sel} value={catMaster} onChange={e => { setCatMaster(e.target.value); setCatSub(''); setCatSubSub('') }}>
              <option value="">All Categories</option>
              {masterCats.map(m => <option key={m} value={m}>{getCatIcon(m)} {m}</option>)}
            </select>
            {catMaster && subCats(catMaster).length > 0 && (
              <select style={sel} value={catSub} onChange={e => { setCatSub(e.target.value); setCatSubSub('') }}>
                <option value="">All Sub</option>
                {subCats(catMaster).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {catSub && subSubCats(catMaster, catSub).length > 0 && (
              <select style={sel} value={catSubSub} onChange={e => setCatSubSub(e.target.value)}>
                <option value="">All</option>
                {subSubCats(catMaster, catSub).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </>
        )}

        {/* Transactions tab */}
        <button style={tabBtn(activeTab === 'txn')} onClick={() => setActiveTab('txn')}>Transactions</button>
        {activeTab === 'txn' && (
          <select style={sel} value={txnType} onChange={e => setTxnType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="purchase">Purchase</option>
            <option value="transfer">Transfer</option>
            <option value="received">Received</option>
          </select>
        )}

        {/* Export button */}
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => exportCSV(activeTab === 'category' ? filteredCat : filteredStock, `report-${activeTab}.csv`)}
            style={{ ...sel, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600 }}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* ── STOCK REPORT ── */}
      {activeTab === 'stock' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={metricBox()}><div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 22 }}>{totalItems}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Total Items</div></div>
            <div style={metricBox()}><div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 22, color: 'var(--accent)' }}>{totalUnits}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Total Units</div></div>
            <div style={metricBox()}><div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 22, color: '#d97706' }}>{lowCount}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Low Stock</div></div>
            <div style={metricBox()}><div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 22, color: '#dc2626' }}>{outCount}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Out of Stock</div></div>
          </div>

          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {Object.entries(groupedStock).map(([cat, catItems]) => (
            <div className="card" key={cat} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 20 }}>{getCatIcon(cat)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cat}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{catItems.length} items · {catItems.reduce((a, i) => a + i.total, 0)} units</div>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    <th style={{ textAlign: 'left', padding: '7px 8px', color: 'var(--text2)', fontWeight: 500 }}>Item</th>
                    <th style={{ textAlign: 'right', padding: '7px 8px', color: 'var(--text2)', fontWeight: 500 }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '7px 8px', color: 'var(--text2)', fontWeight: 500 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map((item, i) => (
                    <tr key={i} style={{ background: item.status === 'out' ? '#fff1f2' : item.status === 'low' ? '#fffbeb' : 'transparent' }}>
                      <td style={{ padding: '9px 8px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {item.imageUrl
                            ? <img src={item.imageUrl} alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                            : <div style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>📦</div>
                          }
                          <div>
                            <div style={{ fontWeight: 500 }}>{item.name}</div>
                            {getSub(item.category) && <div style={{ fontSize: 11, color: 'var(--accent)' }}>{getSub(item.category)}{getSubSub(item.category) ? ` › ${getSubSub(item.category)}` : ''}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '9px 8px', borderTop: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: item.status === 'out' ? '#dc2626' : item.status === 'low' ? '#d97706' : 'var(--accent)' }}>
                        {item.total} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>{item.unit}</span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '9px 8px', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: item.status === 'out' ? '#fee2e2' : item.status === 'low' ? '#fef3c7' : '#dcfce7', color: item.status === 'out' ? '#dc2626' : item.status === 'low' ? '#92400e' : '#166534' }}>
                          {item.status === 'out' ? 'Out' : item.status === 'low' ? 'Low' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {filteredStock.length === 0 && <div className="card"><div className="empty"><div className="empty-icon">📊</div>No items found</div></div>}
          </div>{/* end scroll */}
        </>
      )}

      {/* ── BY WAREHOUSE ── */}
      {activeTab === 'warehouse' && (
        <>
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {warehouses.filter(wh => !whFilter || wh._id === whFilter).map(wh => {
            const whItems = itemStockData.filter(item => {
              const inWh = item.byWarehouse?.some(b => b.warehouse?._id === wh._id && b.quantity > 0)
              if (!inWh) return false
              if (whMaster && getMaster(item.category) !== whMaster) return false
              if (whSub && getSub(item.category) !== whSub) return false
              if (whSubSub && getSubSub(item.category) !== whSubSub) return false
              return true
            }).map(item => ({
              ...item,
              whQty: item.byWarehouse?.find(b => b.warehouse?._id === wh._id)?.quantity || 0
            }))

            if (whItems.length === 0 && whFilter) return null

            return (
              <div className="card" key={wh._id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>🏭 {wh.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{whItems.length} items</div>
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 20, color: 'var(--accent)' }}>
                    {whItems.reduce((a, i) => a + i.whQty, 0)}
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)', marginLeft: 4 }}>units</span>
                  </div>
                </div>
                {whItems.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>No stock recorded</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface2)' }}>
                        <th style={{ textAlign: 'left', padding: '7px 8px', color: 'var(--text2)', fontWeight: 500 }}>Item</th>
                        <th style={{ textAlign: 'left', padding: '7px 8px', color: 'var(--text2)', fontWeight: 500 }}>Category</th>
                        <th style={{ textAlign: 'right', padding: '7px 8px', color: 'var(--text2)', fontWeight: 500 }}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {whItems.map((item, i) => (
                        <tr key={i}>
                          <td style={{ padding: '8px', borderTop: '1px solid var(--border)', fontWeight: 500 }}>{item.name}</td>
                          <td style={{ padding: '8px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)' }}>{item.category}</td>
                          <td style={{ textAlign: 'right', padding: '8px', borderTop: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--accent)' }}>
                            {item.whQty} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>{item.unit}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
          </div>{/* end scroll */}
        </>
      )}

      {/* ── BY CATEGORY ── */}
      {activeTab === 'category' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={metricBox()}><div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 22 }}>{filteredCat.length}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Items</div></div>
            <div style={metricBox()}><div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 22, color: 'var(--accent)' }}>{filteredCat.reduce((a,i)=>a+i.total,0)}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Total Units</div></div>
            <div style={metricBox()}><div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 22, color: '#d97706' }}>{filteredCat.filter(i=>i.status==='low').length}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Low</div></div>
            <div style={metricBox()}><div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 22, color: '#dc2626' }}>{filteredCat.filter(i=>i.status==='out').length}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Out</div></div>
          </div>

          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {Object.entries(groupedCat).map(([path, pathItems]) => (
            <div className="card" key={path} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{path}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{pathItems.length} items</div>
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>
                  {pathItems.reduce((a,i)=>a+i.total,0)}
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {pathItems.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {item.imageUrl ? <img src={item.imageUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} /> : <span style={{ fontSize: 14 }}>📦</span>}
                          <span style={{ fontWeight: 500 }}>{item.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', borderTop: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: item.status==='out'?'#dc2626':item.status==='low'?'#d97706':'var(--accent)' }}>
                        {item.total} {item.unit}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: item.status==='out'?'#fee2e2':item.status==='low'?'#fef3c7':'#dcfce7', color: item.status==='out'?'#dc2626':item.status==='low'?'#92400e':'#166534' }}>
                          {item.status==='out'?'Out':item.status==='low'?'Low':'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {filteredCat.length === 0 && <div className="card"><div className="empty"><div className="empty-icon">📦</div>No items found</div></div>}
          </div>{/* end scroll */}
        </>
      )}

      {/* ── TRANSACTIONS ── */}
      {activeTab === 'txn' && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Transactions ({txns.filter(t => txnType === 'all' || t.type === txnType).length})</div>
          {txns.filter(t => txnType === 'all' || t.type === txnType).length === 0
            ? <div className="empty"><div className="empty-icon">📋</div>No transactions yet</div>
            : txns.filter(t => txnType === 'all' || t.type === txnType).map((t, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: t.type==='purchase'?'#dcfce7':t.type==='transfer'?'#dbeafe':t.type==='received'?'#f0fdf4':'#f5f5f5', color: t.type==='purchase'?'#166534':t.type==='transfer'?'#1e40af':t.type==='received'?'#166534':'#374151' }}>
                      {(t.type||'').toUpperCase()}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{t.itemName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.fromName} → {t.toName}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 15 }}>{t.quantity} {t.itemUnit}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDate(t.createdAt)}</div>
                  </div>
                </div>
                {t.note && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>"{t.note}"</div>}
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
