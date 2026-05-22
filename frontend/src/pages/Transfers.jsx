import React, { useEffect, useState } from 'react'
import api from '../api'

const emptyItem = () => ({ itemId: '', itemName: '', itemUnit: 'pieces', quantity: '', category: '' })

const STATUS_CONFIG = {
  pending:    { label: '⏳ Pending',    color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  dispatched: { label: '🚚 Dispatched', color: '#1e40af', bg: '#dbeafe', border: '#93c5fd' },
  received:   { label: '✓ Received',   color: '#166534', bg: '#dcfce7', border: '#86efac' },
}

function PrintablePass({ pass, onClose }) {
  const buildHTML = () => {
    const itemRows = pass.items.map((item, i) => `<tr><td>${i+1}</td><td><b>${item.itemName}</b></td><td>${item.category||'—'}</td><td><b>${item.quantity}</b></td><td>${item.itemUnit}</td></tr>`).join('')
    const total = pass.items.reduce((a,i) => a + Number(i.quantity), 0)
    return `<!DOCTYPE html><html><head><title>Gate Pass ${pass.refNo}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;max-width:720px;margin:0 auto}table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#1a1d2e;color:#fff;padding:9px}td{padding:9px;border-bottom:1px solid #eee}.stamps{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:36px}.stamp-box{border:2px dashed #aaa;border-radius:8px;padding:16px;min-height:100px}@media print{@page{margin:20mm}}</style>
    </head><body>
    <h2>🚚 Gate Pass — ${pass.refNo}</h2>
    <p><b>From:</b> ${pass.fromWarehouseName} &nbsp;→&nbsp; <b>To:</b> ${pass.toOutletName}</p>
    ${pass.driverName ? `<p>Driver: ${pass.driverName} ${pass.vehicleNo ? '· '+pass.vehicleNo : ''}</p>` : ''}
    <table><thead><tr><th>#</th><th>Item</th><th>Category</th><th>Qty</th><th>Unit</th></tr></thead>
    <tbody>${itemRows}<tr><td colspan="3" style="text-align:right;font-weight:700">Total:</td><td><b>${total}</b></td><td></td></tr></tbody></table>
    <div class="stamps">
      <div class="stamp-box"><b>✓ Dispatched from Warehouse</b><br/><br/>Name: ____________________<br/><br/><small>Signature & Stamp</small></div>
      <div class="stamp-box"><b>✓ Received at Outlet</b><br/><br/>Name: ____________________<br/><br/><small>Signature & Stamp</small></div>
    </div></body></html>`
  }
  const open = (autoPrint) => {
    const blob = new Blob([buildHTML()], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const w = window.open(url, '_blank')
    if (w && autoPrint) w.onload = () => setTimeout(() => w.print(), 300)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div style={{ background:'#fff',borderRadius:16,padding:24,width:'100%',maxWidth:440,boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
          <div><div style={{ fontWeight:700,fontSize:18 }}>Gate Pass Created</div><div style={{ fontSize:13,color:'#6C63FF',fontFamily:'DM Mono,monospace' }}>{pass.refNo}</div></div>
          <button onClick={onClose} style={{ background:'#f5f5f5',border:'none',borderRadius:8,width:36,height:36,fontSize:20,cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ background:'#fffaeb',border:'1px solid #fde68a',borderRadius:10,padding:12,marginBottom:14,fontSize:13 }}>
          <div style={{ fontWeight:600,color:'#92400e' }}>⏳ Awaiting Warehouse Manager Approval</div>
          <div style={{ color:'#666',marginTop:4,fontSize:12 }}>Stock deducted only after dispatch is approved</div>
        </div>
        <div style={{ background:'#f7f8fa',borderRadius:10,padding:12,marginBottom:12,fontSize:13 }}>
          <b>{pass.fromWarehouseName} → {pass.toOutletName}</b>
          <div style={{ color:'#999',marginTop:4 }}>{pass.items.length} items · {pass.items.reduce((a,i)=>a+Number(i.quantity),0)} units</div>
        </div>
        {pass.items.map((item,i) => (
          <div key={i} style={{ display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f0f0f0',fontSize:13 }}>
            <span>{item.itemName}</span><span style={{ fontWeight:700,fontFamily:'DM Mono,monospace' }}>{item.quantity} {item.itemUnit}</span>
          </div>
        ))}
        <div style={{ display:'flex',gap:8,marginTop:20 }}>
          <button style={{ flex:1,padding:11,background:'#6C63FF',color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'Plus Jakarta Sans,sans-serif' }} onClick={() => open(true)}>🖨 Print</button>
          <button style={{ flex:1,padding:11,background:'#16a34a',color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'Plus Jakarta Sans,sans-serif' }} onClick={() => open(false)}>💾 Save PDF</button>
          <button style={{ padding:'11px 14px',background:'#f5f5f5',border:'1px solid #e0e0e0',borderRadius:10,cursor:'pointer' }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function ItemPicker({ item, idx, allItems, summary, onChange, onRemove }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const selected = allItems.find(i => i._id === item.itemId)
  const getAvail = (id) => (Array.isArray(summary) ? summary : []).find(s => s.item?._id === id)?.total || 0
  const filtered = allItems.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <div style={{ border:'1px solid #e8eaf0',borderRadius:10,padding:12,marginBottom:8,background:item.itemId?'#f0eeff':'#f7f8fa' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
        <span style={{ fontSize:12,fontWeight:600,color:'#9497A8' }}>Item {idx+1}</span>
        {onRemove && <button onClick={onRemove} style={{ background:'#fee2e2',border:'none',color:'#dc2626',borderRadius:6,padding:'3px 8px',fontSize:12,cursor:'pointer' }}>✕</button>}
      </div>
      {selected ? (
        <div style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:'#fff',borderRadius:8,border:'1.5px solid #6C63FF',cursor:'pointer',marginBottom:10 }} onClick={() => { setOpen(true); setSearch('') }}>
          {selected.imageUrl ? <img src={selected.imageUrl} alt="" style={{ width:38,height:38,borderRadius:7,objectFit:'cover',flexShrink:0 }} /> : <div style={{ width:38,height:38,borderRadius:7,background:'#EEF2FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>📦</div>}
          <div style={{ flex:1 }}><div style={{ fontWeight:600,fontSize:14 }}>{selected.name}</div><div style={{ fontSize:11,color:'#9497A8' }}>{selected.unit} · Available: <b style={{ color:getAvail(selected._id)>0?'#16a34a':'#dc2626' }}>{getAvail(selected._id)}</b></div></div>
          <span style={{ fontSize:12,color:'#6C63FF',fontWeight:600 }}>Change</span>
        </div>
      ) : (
        <div style={{ padding:'11px 14px',border:'1.5px dashed #d0d3e0',borderRadius:8,cursor:'pointer',color:'#9497A8',fontSize:13,marginBottom:10 }} onClick={() => { setOpen(true); setSearch('') }}>Tap to select item...</div>
      )}
      {open && (
        <div style={{ position:'relative',zIndex:50 }}>
          <div style={{ position:'absolute',top:4,left:0,right:0,background:'#fff',border:'1.5px solid #6C63FF',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',maxHeight:260,overflow:'hidden',display:'flex',flexDirection:'column' }}>
            <div style={{ padding:8,borderBottom:'1px solid #f0f0f0' }}><input className="form-input" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} autoFocus style={{ margin:0 }} /></div>
            <div style={{ overflowY:'auto',flex:1 }}>
              {filtered.map(i => (
                <div key={i._id} onClick={() => { onChange({...item,itemId:i._id,itemName:i.name,itemUnit:i.unit||'pieces',category:i.category||''}); setOpen(false); setSearch('') }}
                  style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 14px',cursor:'pointer',borderBottom:'1px solid #f7f8fa' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f0eeff'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  {i.imageUrl ? <img src={i.imageUrl} alt="" style={{ width:32,height:32,borderRadius:6,objectFit:'cover',flexShrink:0 }} /> : <div style={{ width:32,height:32,borderRadius:6,background:'#EEF2FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0 }}>📦</div>}
                  <div style={{ flex:1 }}><div style={{ fontWeight:600,fontSize:13 }}>{i.name}</div><div style={{ fontSize:11,color:'#9497A8' }}>{i.unit}</div></div>
                  <div style={{ fontSize:13,fontWeight:700,fontFamily:'DM Mono,monospace',color:getAvail(i._id)>0?'#16a34a':'#dc2626' }}>{getAvail(i._id)}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:8,borderTop:'1px solid #f0f0f0' }}><button onClick={()=>setOpen(false)} style={{ width:'100%',padding:'7px',background:'#f7f8fa',border:'1px solid #e8eaf0',borderRadius:8,cursor:'pointer',fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:13 }}>Cancel</button></div>
          </div>
        </div>
      )}
      {item.itemId && (
        <div style={{ display:'flex',gap:10 }}>
          <div style={{ flex:1 }}><label style={{ fontSize:12,fontWeight:600,color:'#4A4E69',display:'block',marginBottom:5 }}>Quantity *</label><input className="form-input" type="number" min="1" value={item.quantity} onChange={e=>onChange({...item,quantity:e.target.value})} placeholder="0" style={{ margin:0 }} /></div>
          <div style={{ flex:1 }}><label style={{ fontSize:12,fontWeight:600,color:'#4A4E69',display:'block',marginBottom:5 }}>Unit</label><input className="form-input" value={item.itemUnit} readOnly style={{ margin:0,background:'#f7f8fa',color:'#9497A8' }} /></div>
        </div>
      )}
    </div>
  )
}

export default function Transfers({ user }) {
  const [warehouses, setWarehouses] = useState([])
  const [outlets, setOutlets] = useState([])
  const [allItems, setAllItems] = useState([])
  const [summary, setSummary] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)
  const [printPass, setPrintPass] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ fromWh:'',toOut:'',driverName:'',vehicleNo:'',note:'',items:[emptyItem()] })

  const role = user?.role || 'admin'
  const userLocationId = user?.locationId
  const canCreateGatePass = role === 'admin' || role === 'warehouse_manager'
  const canApproveDispatch = (rec) => {
    if (role === 'admin') return true
    if (role === 'warehouse_manager') return rec.fromWarehouseId === userLocationId
    return false
  }
  const canConfirmReceipt = (rec) => {
    if (role === 'admin') return true
    if (role === 'outlet_manager') return rec.toOutletId === userLocationId
    return false
  }

  const load = async () => {
    try {
      const [wh, ou, it, sm] = await Promise.all([api.get('/warehouses'), api.get('/outlets'), api.get('/items'), api.get('/stock-summary')])
      const gpRes = await fetch('/api/gatepasses')
      const gpData = await gpRes.json().catch(() => [])
      setWarehouses(Array.isArray(wh.data)?wh.data:[])
      setOutlets(Array.isArray(ou.data)?ou.data:[])
      setAllItems((Array.isArray(it.data)?it.data:[]).filter(i=>i.category&&i.category!=='General'))
      setRecords(Array.isArray(gpData)?gpData:[])
      setSummary(Array.isArray(sm.data)?sm.data:[])
      setLoading(false)
    } catch(e) { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const showMsg = (text,type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000) }

  const submit = async () => {
    const wh = warehouses.find(w=>w._id===form.fromWh)
    const out = outlets.find(o=>o._id===form.toOut)
    if (!wh||!out) return showMsg('Select warehouse and outlet','error')
    // Role check: warehouse_manager can only dispatch from their warehouse
    if (role === 'warehouse_manager' && form.fromWh !== userLocationId)
      return showMsg(`You can only create dispatches from ${user.locationName}`, 'error')
    const validItems = form.items.filter(i=>i.itemId&&i.quantity&&parseFloat(i.quantity)>0)
    if (validItems.length===0) return showMsg('Add at least one item with quantity','error')
    setSubmitting(true)
    try {
      const res = await fetch('/api/gatepasses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        fromWarehouseId:wh._id,fromWarehouseName:wh.name,toOutletId:out._id,toOutletName:out.name,
        items:validItems.map(i=>({itemId:i.itemId,itemName:i.itemName,itemUnit:i.itemUnit||'pieces',category:i.category||'',quantity:parseFloat(i.quantity)})),
        driverName:form.driverName||'',vehicleNo:form.vehicleNo||'',note:form.note||''
      })})
      if (!res.ok) { const e=await res.json().catch(()=>({})); showMsg('Error: '+(e.error||'Failed'),'error'); setSubmitting(false); return }
      const data = await res.json()
      setPrintPass(data)
      setForm({fromWh:'',toOut:'',driverName:'',vehicleNo:'',note:'',items:[emptyItem()]})
      setShowForm(false); load()
    } catch(e) { showMsg('Network error','error') }
    setSubmitting(false)
  }

  const approveDispatch = async (rec) => {
    if (!canApproveDispatch(rec)) return showMsg('You can only approve dispatch from your assigned warehouse', 'error')
    if (!confirm(`Approve dispatch? Stock will be deducted from ${rec.fromWarehouseName}`)) return
    const r = await fetch(`/api/gatepasses/${rec._id}/dispatch`,{method:'PUT',headers:{'Content-Type':'application/json'}})
    if (r.ok) { showMsg('✅ Dispatched! Stock deducted from '+rec.fromWarehouseName); load() }
    else { const e=await r.json().catch(()=>({})); showMsg('Error: '+(e.error||'Failed'),'error') }
  }

  const confirmReceipt = async (rec, file) => {
    if (!canConfirmReceipt(rec)) return showMsg('You can only confirm receipt at your assigned outlet', 'error')
    let photoUrl = null
    if (file) { const fd=new FormData(); fd.append('image',file); const r=await fetch('/api/upload',{method:'POST',body:fd}); const d=await r.json(); photoUrl=d.url }
    const r = await fetch(`/api/gatepasses/${rec._id}/receive`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({photoUrl})})
    if (r.ok) { showMsg('📦 Received! Added to '+rec.toOutletName); load() }
    else { const e=await r.json().catch(()=>({})); showMsg('Error: '+(e.error||'Failed'),'error') }
  }

  // Filter records based on role
  const visibleRecords = records.filter(rec => {
    if (role === 'admin') return true
    if (role === 'warehouse_manager') return rec.fromWarehouseId === userLocationId
    if (role === 'outlet_manager') return rec.toOutletId === userLocationId
    return true
  })
  const filtered = filter==='all' ? visibleRecords : visibleRecords.filter(r=>r.status===filter)
  const formatDate = d => new Date(d).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})

  if (loading) return <div className="spinner"><div className="spin"/></div>

  return (
    <div>
      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
      {printPass && <PrintablePass pass={printPass} onClose={()=>setPrintPass(null)} />}

      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
        <div style={{ fontSize:13,color:'#9497A8' }}>{visibleRecords.length} gate passes</div>
        {canCreateGatePass && (
          <button className="btn btn-primary" onClick={()=>{ setShowForm(!showForm); setForm({fromWh:role==='warehouse_manager'?userLocationId:'',toOut:'',driverName:'',vehicleNo:'',note:'',items:[emptyItem()]}) }}>
            {showForm ? '✕ Cancel' : '+ New Dispatch / Gate Pass'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ fontWeight:700,fontSize:16,marginBottom:4 }}>New Dispatch + Gate Pass</div>
          <div style={{ fontSize:12,color:'#9497A8',marginBottom:16 }}>Stock deducted only after dispatch approval</div>
          <div style={{ background:'#f7f8fa',borderRadius:10,padding:14,marginBottom:12 }}>
            <div style={{ fontSize:12,fontWeight:700,color:'#4A4E69',marginBottom:10 }}>📍 Route</div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">From Warehouse *</label>
                <select className="form-select" value={form.fromWh} onChange={e=>setForm(p=>({...p,fromWh:e.target.value}))} disabled={role==='warehouse_manager'}>
                  <option value="">— Select —</option>
                  {warehouses.filter(w => role==='warehouse_manager' ? w._id===userLocationId : true).map(w=><option key={w._id} value={w._id}>{w.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">To Outlet *</label>
                <select className="form-select" value={form.toOut} onChange={e=>setForm(p=>({...p,toOut:e.target.value}))}>
                  <option value="">— Select —</option>
                  {outlets.map(o=><option key={o._id} value={o._id}>{o.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div style={{ background:'#f7f8fa',borderRadius:10,padding:14,marginBottom:12 }}>
            <div style={{ fontSize:12,fontWeight:700,color:'#4A4E69',marginBottom:10 }}>🚗 Driver / Vehicle (optional)</div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Driver name</label><input className="form-input" value={form.driverName} onChange={e=>setForm(p=>({...p,driverName:e.target.value}))} placeholder="e.g. Raju" /></div>
              <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Vehicle no.</label><input className="form-input" value={form.vehicleNo} onChange={e=>setForm(p=>({...p,vehicleNo:e.target.value}))} placeholder="e.g. UP 81 AB 1234" /></div>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Note (optional)</label><input className="form-input" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Any instructions..." /></div>
          <div style={{ fontSize:12,fontWeight:700,color:'#4A4E69',marginBottom:10 }}>📦 Items *</div>
          {form.items.map((item,idx) => (
            <ItemPicker key={idx} item={item} idx={idx} allItems={allItems} summary={summary}
              onChange={updated=>setForm(p=>{const arr=[...p.items];arr[idx]=updated;return{...p,items:arr}})}
              onRemove={form.items.length>1?()=>setForm(p=>({...p,items:p.items.filter((_,i)=>i!==idx)})):null} />
          ))}
          <button onClick={()=>setForm(p=>({...p,items:[...p.items,emptyItem()]}))} style={{ width:'100%',padding:'10px',background:'#fff',border:'1.5px dashed #d0d3e0',borderRadius:10,cursor:'pointer',fontSize:13,color:'#6C63FF',fontWeight:600,marginBottom:16,fontFamily:'Plus Jakarta Sans,sans-serif' }}>+ Add another item</button>
          <button className="btn btn-primary" style={{ width:'100%',padding:14,fontSize:15 }} onClick={submit} disabled={submitting}>
            {submitting ? '⏳ Creating...' : '🚚 Create Dispatch + Generate Gate Pass'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex',gap:8,marginBottom:14,flexWrap:'wrap' }}>
        {[{k:'all',l:'All'},{k:'pending',l:'⏳ Pending'},{k:'dispatched',l:'🚚 Dispatched'},{k:'received',l:'✓ Received'}].map(f=>(
          <button key={f.k} onClick={()=>setFilter(f.k)} style={{ padding:'7px 16px',borderRadius:20,border:filter===f.k?'2px solid #6C63FF':'1px solid #e8eaf0',background:filter===f.k?'#f0eeff':'#fff',color:filter===f.k?'#6C63FF':'#9497A8',fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:13,cursor:'pointer',fontWeight:filter===f.k?700:400 }}>{f.l}</button>
        ))}
        <span style={{ fontSize:12,color:'#9497A8',alignSelf:'center' }}>{filtered.length} records</span>
      </div>

      {filtered.length===0
        ? <div className="card"><div className="empty"><div className="empty-icon">🚚</div>No dispatches found</div></div>
        : filtered.map(rec => {
          const sc = STATUS_CONFIG[rec.status]||STATUS_CONFIG.pending
          const stages = ['pending','dispatched','received']
          const curIdx = stages.indexOf(rec.status)
          return (
            <div className="card" key={rec._id} style={{ marginBottom:12 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:700,fontSize:14,fontFamily:'DM Mono,monospace',color:'#6C63FF' }}>{rec.refNo}</div>
                  <div style={{ fontSize:13,color:'#4A4E69',marginTop:2 }}>{rec.fromWarehouseName} → {rec.toOutletName}</div>
                  <div style={{ fontSize:11,color:'#9497A8',marginTop:2 }}>{formatDate(rec.createdAt)}{rec.driverName?` · ${rec.driverName}`:''}</div>
                </div>
                <span style={{ fontWeight:700,fontSize:12,color:sc.color,background:sc.bg,border:`1px solid ${sc.border}`,padding:'4px 12px',borderRadius:20,whiteSpace:'nowrap' }}>{sc.label}</span>
              </div>

              {/* Progress */}
              <div style={{ display:'flex',alignItems:'center',gap:4,marginBottom:12 }}>
                {stages.map((s,i) => {
                  const done=i<=curIdx; const isCur=i===curIdx; const cfg=STATUS_CONFIG[s]
                  return (<React.Fragment key={s}>
                    <div style={{ display:'flex',alignItems:'center',gap:3 }}>
                      <div style={{ width:8,height:8,borderRadius:'50%',background:done?(isCur?cfg.color:'#9497A8'):'#e8eaf0' }}/>
                      <span style={{ fontSize:11,fontWeight:isCur?700:400,color:done?(isCur?cfg.color:'#4A4E69'):'#c0c4d4' }}>{cfg.label}</span>
                    </div>
                    {i<stages.length-1&&<div style={{ flex:1,height:1,background:i<curIdx?'#9497A8':'#e8eaf0',minWidth:12 }}/>}
                  </React.Fragment>)
                })}
              </div>

              <div style={{ borderTop:'1px solid #f0f2f5',borderBottom:'1px solid #f0f2f5',padding:'8px 0',marginBottom:10 }}>
                {rec.items.map((item,i)=>(
                  <div key={i} style={{ display:'flex',justifyContent:'space-between',fontSize:13,padding:'3px 0' }}>
                    <span>{item.itemName}</span><span style={{ fontWeight:700,fontFamily:'DM Mono,monospace' }}>{item.quantity} {item.itemUnit}</span>
                  </div>
                ))}
              </div>

              {rec.note&&<div style={{ fontSize:12,color:'#9497A8',marginBottom:10 }}>Note: {rec.note}</div>}

              <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                <button onClick={()=>setPrintPass(rec)} style={{ padding:'8px 14px',background:'#6C63FF',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13,fontFamily:'Plus Jakarta Sans,sans-serif' }}>🖨 Print</button>

                {rec.status==='pending' && canApproveDispatch(rec) && (
                  <button onClick={()=>approveDispatch(rec)} style={{ padding:'8px 14px',background:'#d97706',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13,fontFamily:'Plus Jakarta Sans,sans-serif' }}>✅ Approve Dispatch</button>
                )}
                {rec.status==='pending' && !canApproveDispatch(rec) && role!=='admin' && (
                  <span style={{ fontSize:12,color:'#9497A8',alignSelf:'center',fontStyle:'italic' }}>Awaiting warehouse manager approval</span>
                )}

                {rec.status==='dispatched' && canConfirmReceipt(rec) && (<>
                  <label style={{ padding:'8px 14px',background:'#16a34a',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13,fontFamily:'Plus Jakarta Sans,sans-serif' }}>
                    📷 Received + Photo
                    <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e=>{ if(e.target.files[0]) confirmReceipt(rec,e.target.files[0]) }} />
                  </label>
                  <button onClick={()=>confirmReceipt(rec,null)} style={{ padding:'8px 14px',background:'#f0fdf4',color:'#16a34a',border:'1px solid #86efac',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13,fontFamily:'Plus Jakarta Sans,sans-serif' }}>✓ Confirm Receipt</button>
                </>)}
                {rec.status==='dispatched' && !canConfirmReceipt(rec) && role!=='admin' && (
                  <span style={{ fontSize:12,color:'#9497A8',alignSelf:'center',fontStyle:'italic' }}>Awaiting outlet manager approval</span>
                )}

                {rec.photoUrl&&<a href={rec.photoUrl} target="_blank" rel="noopener noreferrer" style={{ padding:'8px 14px',background:'#f7f8fa',border:'1px solid #e8eaf0',borderRadius:8,textDecoration:'none',color:'#4A4E69',fontWeight:600,fontSize:13 }}>🖼 View Photo</a>}
              </div>
            </div>
          )
        })
      }
    </div>
  )
}
