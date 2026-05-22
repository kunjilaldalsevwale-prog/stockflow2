import React, { useEffect, useState } from 'react'
import api from '../api'

export default function WhatsApp({ user }) {
  const [warehouses, setWarehouses] = useState([])
  const [outlets, setOutlets] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const [toType, setToType] = useState('warehouse')
  const [toId, setToId] = useState('')
  const [message, setMessage] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [photos, setPhotos] = useState([])
  const [fromName, setFromName] = useState('')

  useEffect(() => {
    Promise.all([api.get('/warehouses'), api.get('/outlets'), api.get('/items')])
      .then(([wh, ou, it]) => {
        setWarehouses(wh.data)
        setOutlets(ou.data)
        setItems(it.data)
        setLoading(false)
      })
  }, [])

  const savePhone = async (type, id, phone) => {
    await api.put(`/${type}s/${id}`, { phone })
    if (type === 'warehouse') {
      setWarehouses(p => p.map(w => w._id === id ? { ...w, phone } : w))
    } else {
      setOutlets(p => p.map(o => o._id === id ? { ...o, phone } : o))
    }
  }

  const toList = toType === 'warehouse' ? warehouses : outlets
  const toEntity = toList.find(e => e._id === toId)

  const toggleItem = (item) => {
    setSelectedItems(p =>
      p.find(i => i._id === item._id)
        ? p.filter(i => i._id !== item._id)
        : [...p, item]
    )
  }

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => setPhotos(p => [...p, { url: ev.target.result, name: file.name }])
      reader.readAsDataURL(file)
    })
  }

  const buildWhatsAppMessage = () => {
    let text = `*StockFlow Request*\
`
    text += `From: ${fromName || 'StockFlow'}\
`
    if (selectedItems.length > 0) {
      text += `\
*Items Requested:*\
`
      selectedItems.forEach(item => {
        text += `\u2022 ${item.name} (${item.unit}) — ${item.category}\
`
      })
    }
    if (message) {
      text += `\
*Message:*\
${message}`
    }
    text += `\
\
_Sent via StockFlow_`
    return text
  }

  const sendWhatsApp = () => {
    if (!toEntity?.phone) return alert('Please add a WhatsApp number for this location first')
    const phone = toEntity.phone.replace(/[^0-9]/g, '')
    const fullPhone = phone.startsWith('91') ? phone : `91${phone}`
    const text = buildWhatsAppMessage()
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const canSend = toId && toEntity?.phone && (message || selectedItems.length > 0)

  if (loading) return <div className="spinner"><div className="spin" /></div>

  return (
    <div className="page">
      {/* Phone number setup */}
      <div className="section-title">WhatsApp Numbers</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 12, fontSize: 13 }}>Set WhatsApp numbers for each location</div>
        {warehouses.map(wh => (
          <PhoneRow key={wh._id} name={wh.name} phone={wh.phone} icon="🏭"
            onSave={phone => savePhone('warehouse', wh._id, phone)} />
        ))}
        {outlets.map(ou => (
          <PhoneRow key={ou._id} name={ou.name} phone={ou.phone} icon="🏪"
            onSave={phone => savePhone('outlet', ou._id, phone)} />
        ))}
      </div>

      {/* Send message */}
      <div className="section-title">Send WhatsApp Request</div>
      <div className="card">
        {/* From */}
        <div className="form-group">
          <label className="form-label">Your name / location</label>
          <input className="form-input" value={fromName} onChange={e => setFromName(e.target.value)} placeholder="e.g. Outlet 1 Manager" />
        </div>

        {/* To */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Send to</label>
            <select className="form-select" value={toType} onChange={e => { setToType(e.target.value); setToId('') }}>
              <option value="warehouse">Warehouse</option>
              <option value="outlet">Outlet</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Select location</label>
            <select className="form-select" value={toId} onChange={e => setToId(e.target.value)}>
              <option value="">— Select —</option>
              {toList.map(e => (
                <option key={e._id} value={e._id}>
                  {e.name} {e.phone ? '✓' : '⚠ no number'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {toId && !toEntity?.phone && (
          <div className="alert alert-warning">⚠ No WhatsApp number set for {toEntity?.name}. Add it above first.</div>
        )}

        {/* Select items */}
        <div className="form-group">
          <label className="form-label">Items to request (optional)</label>
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
            {items.filter(i => i.category && i.category !== 'General').map(item => {
              const selected = selectedItems.find(s => s._id === item._id)
              return (
                <div key={item._id} onClick={() => toggleItem(item)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 6, marginBottom: 4, cursor: 'pointer', background: selected ? 'var(--accent-light)' : 'transparent', border: selected ? '1px solid var(--accent)' : '1px solid transparent' }}>
                  <input type="checkbox" readOnly checked={!!selected} style={{ accentColor: 'var(--accent)', width: 18, height: 18 }} />
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                    : <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📦</div>
                  }
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.category}</div>
                  </div>
                </div>
              )
            })}
            {items.filter(i => i.category && i.category !== 'General').length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text3)', padding: 8 }}>No items — add items in Manage first</div>
            )}
          </div>
        </div>

        {/* Message */}
        <div className="form-group">
          <label className="form-label">Message</label>
          <textarea className="form-input" rows={4} value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Type your request here..." style={{ resize: 'none', fontFamily: 'DM Sans' }} />
        </div>

        {/* Photos */}
        <div className="form-group">
          <label className="form-label">Attach photos (will open in WhatsApp)</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px dashed var(--border)', borderRadius: 8, cursor: 'pointer' }}>
            <span style={{ fontSize: 24 }}>📷</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Add product photos</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Select or take photos · Send manually in WhatsApp</div>
            </div>
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotos} />
          </label>
          {photos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p.url} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
                  <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: -4, right: -4, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ))}
            </div>
          )}
          {photos.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              ℹ Photos will open in your WhatsApp — attach them there before sending
            </div>
          )}
        </div>

        {/* Preview */}
        {(message || selectedItems.length > 0) && (
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'var(--text2)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Message preview:</div>
            {buildWhatsAppMessage()}
          </div>
        )}

        {/* Send button */}
        <button
          className="btn btn-primary"
          onClick={sendWhatsApp}
          disabled={!canSend}
          style={{ background: canSend ? '#25D366' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          {canSend ? `Send to ${toEntity?.name} on WhatsApp` : 'Select recipient & add message'}
        </button>
      </div>
    </div>
  )
}

function PhoneRow({ name, phone, icon, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(phone || '')

  return (
    <div className="list-row">
      <div className="list-row-left">
        <div className="list-row-name">{icon} {name}</div>
        {!editing
          ? <div className="list-row-sub" style={{ color: phone ? 'var(--accent)' : 'var(--text3)' }}>
              {phone ? `+91 ${phone}` : 'No number set'}
            </div>
          : <input className="form-input" value={val} onChange={e => setVal(e.target.value)}
              placeholder="10-digit number" style={{ marginTop: 4 }}
              onKeyDown={e => { if (e.key === 'Enter') { onSave(val); setEditing(false) } }} />
        }
      </div>
      {!editing
        ? <button className="btn btn-sm" onClick={() => setEditing(true)}>{phone ? 'Edit' : 'Add'}</button>
        : <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm" style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}
              onClick={() => { onSave(val); setEditing(false) }}>✓</button>
            <button className="btn btn-sm btn-danger" onClick={() => setEditing(false)}>✕</button>
          </div>
      }
    </div>
  )
}
