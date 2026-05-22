import React, { useState } from 'react'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!username || !password) return setError('Enter username and password')
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return }
      onLogin(data)
    } catch(e) {
      setError('Cannot connect to server')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>📦</div>
          <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: -0.5 }}>StockFlow</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Sign in to your account</div>
        </div>

        {error && <div style={{ background: '#FEF3F2', color: '#dc2626', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 500 }}>{error}</div>}

        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="form-input" value={username} onChange={e => setUsername(e.target.value.toLowerCase())}
            placeholder="your username" onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div style={{ position: 'relative' }}>
            <input className="form-input" type={showPass ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)} placeholder="your password"
              onKeyDown={e => e.key === 'Enter' && submit()} />
            <button type="button" onClick={() => setShowPass(!showPass)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
              {showPass ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <button onClick={submit} disabled={loading}
          style={{ width: '100%', padding: 14, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 8 }}>
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text3)' }}>
          Contact your admin if you forgot your password
        </div>
      </div>
    </div>
  )
}
