import React, { useEffect, useState } from 'react'
import api from '../api'

export default function Outlets({ user }) {
  const [outlets, setOutlets] = useState([])
  const [txns, setTxns] = useState([])
  const [gatepasses, setGatepasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const [tab, setTab] = useState('transfers')

  useEffect(() => {
    Promise.all([api.get('/outlets'), api.get('/transactions'), api.get('/gatepasses')])
      .then(([ou, tx, gp]) => {
        const outs = Array.isArray(ou.data) ? ou.data : []
        setOutlets(outs)
        setTxns(Array.isArray(tx.data) ? tx.data : [])
        setGatepasses(Array.isArray(gp.data) ? gp.data : [])
        // If outlet_manager, auto-select their outlet
        if (user?.role === 'outlet_manager' && user?.locationId) {
          setActiveId(user.locationId)
        }
        setLoading(false)
      })
  }, [])

  const formatDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) return <div className="spinner"><div className="spin" /></div>

  const outlet = outlets.find(o => o._id === activeId)
  const outletPasses = activeId ? gatepasses.filter(gp => gp.toOutletId === activeId) : []
  const pending = outletPasses.filter(gp => gp.status === 'pending')
  const inTransit = outletPasses.filter(gp => gp.status === 'dispatched')
  const received = outletPasses.filter(gp => gp.status === 'received')
  const outletTxns = activeId ? txns.filter(t => t.toId === activeId || t.fromId === activeId) : []

  // Summary: total received per item
  const receivedSummary = {}
  received.forEach(gp => {
    ;(gp.items || []).forEach(item => {
      if (!receivedSummary[item.itemId]) receivedSummary[item.itemId] = { name: item.itemName, unit: item.itemUnit, total: 0 }
      receivedSummary[item.itemId].total += Number(item.quantity)
    })
  })

  const tabBtn = (key, label, count) => (
    <button onClick={() => setTab(key)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: tab === key ? 'var(--accent)' : 'var(--surface2)', color: tab === key ? '#fff' : 'var(--text2)', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, fontWeight: tab === key ? 700 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
      {label}
      {count > 0 && <span style={{ background: tab === key ? 'rgba(255,255,255,0.3)' : 'var(--accent)', color: '#fff', borderRadius: 20, padding: '0 6px', fontSize: 11, fontWeight: 700 }}>{count}</span>}
    </button>
  )

  return (
    <div style={{ display: 'flex', gap: 16, minHeight: 500 }}>

      {/* Left: outlet list */}
      {user?.role !== 'outlet_manager' && (
        <div style={{ width: 180, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Outlets</div>
          {outlets.map(o => {
            const inT = gatepasses.filter(gp => gp.toOutletId === o._id && gp.status === 'dispatched').length
            const isActive = activeId === o._id
            return (
              <div key={o._id} onClick={() => { setActiveId(o._id); setTab('transfers') }}
                style={{ padding: '10px 12px', borderRadius: 10, marginBottom: 6, cursor: 'pointer', background: isActive ? 'var(--accent)' : 'var(--surface)', border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}` }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: isActive ? '#fff' : 'var(--text)' }}>🏪 {o.name}</div>
                {o.location && <div style={{ fontSize: 11, color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text3)', marginTop: 2 }}>{o.location}</div>}
                {inT > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: isActive ? '#fff' : '#d97706', background: isActive ? 'rgba(255,255,255,0.2)' : '#fef3c7', borderRadius: 20, padding: '2px 8px', display: 'inline-block' }}>
                    🚚 {inT} in transit
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Right: detail */}
      <div style={{ flex: 1 }}>
        {!outlet ? (
          <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏪</div>
            <div>Select an outlet to view details</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="card" style={{ marginBottom: 14, padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>🏪 {outlet.name}</div>
                  {outlet.location && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{outlet.location}</div>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ background: '#fef3c7', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 18, color: '#d97706' }}>{inTransit.length}</div>
                    <div style={{ fontSize: 10, color: '#92400e' }}>In Transit</div>
                  </div>
                  <div style={{ background: '#dcfce7', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 18, color: '#16a34a' }}>{received.length}</div>
                    <div style={{ fontSize: 10, color: '#166534' }}>Received</div>
                  </div>
                  <div style={{ background: 'var(--accent-light)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>{Object.keys(receivedSummary).length}</div>
                    <div style={{ fontSize: 10, color: 'var(--accent)' }}>Item Types</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {tabBtn('transfers', '🚚 Transfers', pending.length + inTransit.length)}
              {tabBtn('received', '✓ Received', received.length)}
              {tabBtn('transactions', '📋 Transactions', outletTxns.length)}
              {tabBtn('summary', '📦 Summary', Object.keys(receivedSummary).length)}
            </div>

            {/* Transfers tab */}
            {tab === 'transfers' && (
              <div>
                {pending.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>⏳ Pending ({pending.length})</div>
                    {pending.map(gp => <GatePassCard key={gp._id} gp={gp} color="#d97706" bg="#fef3c7" label="⏳ Pending" formatDate={formatDate} />)}
                  </div>
                )}
                {inTransit.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>🚚 In Transit ({inTransit.length})</div>
                    {inTransit.map(gp => <GatePassCard key={gp._id} gp={gp} color="#1e40af" bg="#dbeafe" label="🚚 In Transit" formatDate={formatDate} />)}
                  </div>
                )}
                {pending.length === 0 && inTransit.length === 0 && (
                  <div className="card"><div className="empty"><div className="empty-icon">🚚</div>No active transfers</div></div>
                )}
              </div>
            )}

            {/* Received tab */}
            {tab === 'received' && (
              <div>
                {received.length === 0
                  ? <div className="card"><div className="empty"><div className="empty-icon">📦</div>No received transfers yet</div></div>
                  : received.map(gp => <GatePassCard key={gp._id} gp={gp} color="#16a34a" bg="#dcfce7" label="✓ Received" formatDate={formatDate} />)
                }
              </div>
            )}

            {/* Transactions tab */}
            {tab === 'transactions' && (
              <div className="card">
                {outletTxns.length === 0
                  ? <div className="empty"><div className="empty-icon">📋</div>No transactions yet</div>
                  : outletTxns.map((t, i) => {
                    const isIn = t.toId === activeId
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: isIn ? '#dcfce7' : '#fee2e2', color: isIn ? '#166534' : '#991b1b' }}>
                            {isIn ? '↙ IN' : '↗ OUT'}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{t.itemName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.fromName} → {t.toName} · {formatDate(t.createdAt)}</div>
                          </div>
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: isIn ? '#16a34a' : '#dc2626' }}>
                          {isIn ? '+' : '-'}{t.quantity} {t.itemUnit}
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            )}

            {/* Summary tab */}
            {tab === 'summary' && (
              <div className="card">
                {Object.keys(receivedSummary).length === 0
                  ? <div className="empty"><div className="empty-icon">📦</div>No items received yet</div>
                  : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--surface2)' }}>
                          <th style={{ textAlign: 'left', padding: '8px' }}>Item</th>
                          <th style={{ textAlign: 'right', padding: '8px' }}>Total Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(receivedSummary).sort((a,b) => b.total - a.total).map((item, i) => (
                          <tr key={i}>
                            <td style={{ padding: '10px 8px', borderTop: '1px solid var(--border)', fontWeight: 500 }}>{item.name}</td>
                            <td style={{ textAlign: 'right', padding: '10px 8px', borderTop: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>
                              {item.total.toLocaleString('en-IN')} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>{item.unit}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function GatePassCard({ gp, color, bg, label, formatDate }) {
  const [open, setOpen] = useState(false)
  const total = (gp.items || []).reduce((a, i) => a + Number(i.quantity), 0)
  return (
    <div className="card" style={{ marginBottom: 8, borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div>
          <div style={{ fontWeight: 700, fontFamily: 'DM Mono, monospace', color: 'var(--accent)', fontSize: 13 }}>{gp.refNo}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>From {gp.fromWarehouseName}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDate(gp.createdAt)}{gp.driverName ? ` · ${gp.driverName}` : ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 18, color }}>{total}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>units</div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          {(gp.items || []).map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--surface2)' }}>
              <span>{item.itemName}</span>
              <span style={{ fontWeight: 700, fontFamily: 'DM Mono, monospace', color }}>{item.quantity} {item.itemUnit}</span>
            </div>
          ))}
          {gp.note && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text3)' }}>Note: {gp.note}</div>}
        </div>
      )}
    </div>
  )
}
