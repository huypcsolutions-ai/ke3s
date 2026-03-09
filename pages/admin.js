import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'

// ─── Sub-components ────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }) {
  if (!msg) return null
  const colors  = { success:'#f0fdf4', error:'#fef2f2', info:'#eff6ff' }
  const borders = { success:'#22c55e', error:'#ef4444', info:'#3b82f6' }
  return (
    <div style={{
      position:'fixed', top:20, right:20, zIndex:9999,
      background:borders[type]||borders.info,
      border:`1.5px solid ${borders[type]||borders.info}`,
      borderLeft:`5px solid ${borders[type]||borders.info}`,
      background: colors[type]||colors.info,
      padding:'14px 20px', borderRadius:10,
      boxShadow:'0 4px 20px rgba(0,0,0,0.12)',
      maxWidth:380, fontSize:14, fontWeight:500,
      display:'flex', gap:10, alignItems:'flex-start',
      animation:'slideIn 0.3s ease'
    }}>
      <span>{type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span>
      <span style={{flex:1}}>{msg}</span>
      <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,lineHeight:1,color:'#999'}}>×</button>
    </div>
  )
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      style={{
        width:56, height:30, borderRadius:15, border:'none',
        cursor:disabled?'not-allowed':'pointer',
        background:value?'#0078d4':'#d1d5db',
        position:'relative', transition:'background 0.25s', flexShrink:0
      }}
    >
      <span style={{
        position:'absolute', top:3, left:value?28:3,
        width:24, height:24, background:'white', borderRadius:'50%',
        transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.25)'
      }} />
    </button>
  )
}

// ─── Login screen ──────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin-settings', {
        headers: { 'x-admin-secret': secret.trim() }
      })
      const data = await res.json()
      if (res.status === 401) {
        setError('Sai mật khẩu — kiểm tra lại ADMIN_SECRET trong Vercel')
      } else if (res.status === 500) {
        setError('ADMIN_SECRET chưa được set trong Vercel env vars')
      } else if (res.ok) {
        onLogin(secret.trim(), data)
      } else {
        setError('Lỗi: ' + (data.error || res.status))
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <>
      <Head><title>Admin — M365Keys</title></Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Be Vietnam Pro',sans-serif; background:#f0f4f8; min-height:100vh; display:flex; align-items:center; justify-content:center; }
        @keyframes slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:none} }
      `}</style>
      <div style={{background:'white',borderRadius:16,padding:'48px 40px',width:380,boxShadow:'0 20px 60px rgba(0,0,0,0.12)'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:40,marginBottom:12}}>🔐</div>
          <h1 style={{fontFamily:'Syne',fontSize:24,fontWeight:800}}>Admin Panel</h1>
          <p style={{color:'#6b7280',fontSize:13,marginTop:6}}>M365Keys — Quản trị hệ thống</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:6}}>Admin Secret Key</label>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="Nhập mật khẩu admin..."
            style={{
              width:'100%', padding:'11px 14px',
              border:`1.5px solid ${error?'#ef4444':'#e5e7eb'}`,
              borderRadius:8, fontSize:14, outline:'none',
              fontFamily:'Be Vietnam Pro', marginBottom:error?8:16
            }}
            autoFocus
          />
          {error && (
            <div style={{color:'#ef4444',fontSize:12,marginBottom:14,padding:'8px 12px',background:'#fef2f2',borderRadius:6}}>
              ❌ {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !secret}
            style={{
              width:'100%', padding:'12px',
              background: loading||!secret ? '#93c5fd' : '#0078d4',
              color:'white', border:'none', borderRadius:8,
              fontSize:15, fontWeight:700, cursor: loading||!secret?'not-allowed':'pointer',
              fontFamily:'Be Vietnam Pro'
            }}
          >
            {loading ? '⏳ Đang kiểm tra...' : '🔓 Đăng nhập'}
          </button>
        </form>

        <p style={{textAlign:'center',marginTop:16,fontSize:12,color:'#9ca3af'}}>
          Đặt <code style={{background:'#f3f4f6',padding:'1px 5px',borderRadius:4}}>ADMIN_SECRET</code> trong Vercel environment variables
        </p>

        <details style={{marginTop:14,borderTop:'1px solid #f3f4f6',paddingTop:14}}>
          <summary style={{fontSize:11.5,color:'#9ca3af',cursor:'pointer'}}>🔧 Vẫn không vào được?</summary>
          <div style={{marginTop:10,fontSize:12,color:'#6b7280',lineHeight:1.8}}>
            <ol style={{paddingLeft:18,lineHeight:2}}>
              <li>Vercel → Settings → Environment Variables → <code>ADMIN_SECRET</code></li>
              <li>Gõ lại thủ công (đừng copy-paste), bấm Save</li>
              <li>Deployments → Redeploy (bắt buộc sau khi đổi env)</li>
            </ol>
            <button
              onClick={async () => {
                const r = await fetch('/api/admin-settings', { headers:{'x-admin-secret': secret.trim()} })
                alert('HTTP ' + r.status + '\n' + (r.status===401?'❌ Sai secret':r.status===500?'⚠️ Chưa set env':'✅ OK'))
              }}
              style={{marginTop:8,padding:'7px 14px',background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:600,width:'100%'}}
            >
              🧪 Test kết nối
            </button>
          </div>
        </details>
      </div>
    </>
  )
}

// ─── Main admin page ───────────────────────────────────────────────────────

export default function AdminPage() {
  // ── tất cả hooks ở đây, không có gì ở trước ──
  const [authed, setAuthed]     = useState(false)
  const [secret, setSecret]     = useState('')
  const [settings, setSettings] = useState({})
  const [saving, setSaving]     = useState({})
  const [toast, setToast]       = useState(null)
  const [activeTab, setActiveTab] = useState('config')

  // Odoo test
  const [testCode, setTestCode]     = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testLoading, setTestLoading] = useState(false)

  // Autoload logs
  const [logs, setLogs]           = useState([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Sync stock logs
  const [syncLogs, setSyncLogs]           = useState([])
  const [syncLogsLoading, setSyncLogsLoading] = useState(false)
  const [syncing, setSyncing]             = useState(false)

  // ── helpers ──
  function showToast(msg, type='info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  function apiFetch(url, opts={}) {
    return fetch(url, {
      ...opts,
      headers: { 'Content-Type':'application/json', 'x-admin-secret': secret, ...(opts.headers||{}) }
    }).then(r => r.json())
  }

  // ── data loaders ──
  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res  = await fetch('/api/autoload-logs?secret=' + secret)
      const data = await res.json()
      setLogs(data.logs || [])
    } catch { showToast('Không tải được autoload logs', 'error') }
    setLogsLoading(false)
  }, [secret])

  const loadSyncLogs = useCallback(async () => {
    setSyncLogsLoading(true)
    try {
      const data = await apiFetch('/api/stock-sync-logs')
      setSyncLogs(data.logs || [])
    } catch { showToast('Không tải được sync logs', 'error') }
    setSyncLogsLoading(false)
  }, [secret])

  useEffect(() => {
    if (!authed) return
    if (activeTab === 'logs')  loadLogs()
    if (activeTab === 'sync')  loadSyncLogs()
  }, [authed, activeTab])

  // ── actions ──
  async function saveSetting(key, value) {
    setSaving(s => ({...s, [key]: true}))
    try {
      await apiFetch('/api/admin-settings', { method:'POST', body: JSON.stringify({key, value: String(value)}) })
      setSettings(s => ({...s, [key]: String(value)}))
      showToast('Đã lưu', 'success')
    } catch { showToast('Lỗi khi lưu', 'error') }
    setSaving(s => ({...s, [key]: false}))
  }

  async function testOdoo() {
    setTestLoading(true)
    setTestResult(null)
    try {
      const data = await apiFetch('/api/odoo-test', { method:'POST', body: JSON.stringify({ productCode: testCode }) })
      setTestResult(data)
    } catch (e) { setTestResult({ success:false, message: e.message }) }
    setTestLoading(false)
  }

  async function triggerManualSync() {
    setSyncing(true)
    try {
      const data = await apiFetch('/api/cron-sync-stock', { method:'POST' })
      if (data.success) { showToast('Sync xong: ' + data.synced + ' sản phẩm', 'success'); loadSyncLogs() }
      else showToast('Lỗi: ' + data.error, 'error')
    } catch { showToast('Lỗi kết nối', 'error') }
    setSyncing(false)
  }

  // ── login callback ──
  function handleLogin(sec, data) {
    setSecret(sec)
    setSettings(data)
    setAuthed(true)
  }

  // ── render: chưa đăng nhập ──
  if (!authed) return <LoginScreen onLogin={handleLogin} />

  // ── render: đã đăng nhập ──
  const autoloadOn = settings.autoload_enabled === 'true'
  const tabs = [
    { id:'config', label:'⚙️ Cấu hình' },
    { id:'odoo',   label:'🔗 Odoo' },
    { id:'sync',   label:'🔄 Sync Stock' },
    { id:'logs',   label:'📋 Autoload' },
  ]

  return (
    <>
      <Head><title>Admin — M365Keys</title></Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Be Vietnam Pro',sans-serif; background:#f0f4f8; }
        @keyframes slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>
      <Toast {...(toast||{})} onClose={() => setToast(null)} />

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0078d4,#005a9e)'}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:40,height:40,background:'rgba(255,255,255,0.2)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>⚙️</div>
            <div>
              <div style={{color:'white',fontFamily:'Syne',fontWeight:800,fontSize:18}}>Admin Panel</div>
              <div style={{color:'rgba(255,255,255,0.7)',fontSize:12}}>M365Keys — Quản trị hệ thống</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{
              padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:700,
              background: autoloadOn?'rgba(34,197,94,0.25)':'rgba(255,255,255,0.15)',
              color: autoloadOn?'#86efac':'rgba(255,255,255,0.8)',
              border: `1px solid ${autoloadOn?'rgba(34,197,94,0.4)':'rgba(255,255,255,0.2)'}`
            }}>
              {autoloadOn ? '● Autoload ON' : '○ Autoload OFF'}
            </div>
            <button
              onClick={() => { setAuthed(false); setSecret('') }}
              style={{padding:'8px 16px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:8,color:'white',cursor:'pointer',fontSize:13,fontWeight:600}}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:'white',borderBottom:'1px solid #e5e7eb',position:'sticky',top:0,zIndex:100}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'0 24px',display:'flex',gap:4}}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding:'14px 18px', border:'none', background:'none', cursor:'pointer',
                fontSize:13, fontWeight:600, fontFamily:'Be Vietnam Pro',
                color: activeTab===t.id ? '#0078d4' : '#6b7280',
                borderBottom: activeTab===t.id ? '2px solid #0078d4' : '2px solid transparent',
                transition:'all 0.15s'
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:900,margin:'0 auto',padding:'28px 24px'}}>

        {/* ── Tab: Cấu hình ── */}
        {activeTab === 'config' && (
          <div style={{display:'grid',gap:20}}>
            {/* Autoload toggle */}
            <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:16,marginBottom:4}}>🤖 Autoload từ Nhà cung cấp</div>
              <p style={{fontSize:13,color:'#6b7280',marginBottom:20,lineHeight:1.6}}>Khi kho nội bộ hết, tự động lấy key từ Odoo nhà cung cấp</p>
              <div style={{display:'flex',alignItems:'center',gap:16,padding:'16px 20px',background: autoloadOn?'#f0fdf4':'#f9fafb',borderRadius:10,border:`1px solid ${autoloadOn?'#bbf7d0':'#e5e7eb'}`}}>
                <Toggle value={autoloadOn} onChange={v => saveSetting('autoload_enabled', v)} disabled={saving.autoload_enabled} />
                <div>
                  <div style={{fontWeight:700,fontSize:14,color: autoloadOn?'#16a34a':'#374151'}}>
                    {autoloadOn ? '✅ Đang bật' : '⭕ Đang tắt'}
                  </div>
                  <div style={{fontSize:12,color:'#6b7280',marginTop:2}}>
                    {autoloadOn ? 'Hệ thống sẽ tự động lấy key từ Odoo khi hết hàng' : 'Khi hết hàng sẽ gửi email thông báo cho khách'}
                  </div>
                </div>
              </div>
            </div>

            {/* o_product_code guide */}
            <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:16,marginBottom:4}}>🗂️ Map sản phẩm với Nhà cung cấp</div>
              <p style={{fontSize:13,color:'#6b7280',marginBottom:16,lineHeight:1.6}}>
                Vào <strong>Supabase → Table Editor → products</strong>, cập nhật cột <code style={{background:'#f3f4f6',padding:'1px 6px',borderRadius:4}}>o_product_code</code> = Internal Reference của sản phẩm nhà cung cấp.
              </p>
              <div style={{background:'#f8f9fa',borderRadius:8,padding:'12px 16px',fontSize:12,fontFamily:'monospace',color:'#374151',lineHeight:2}}>
                <div>M365 Personal 1 năm → <strong>M365-PERSONAL-1Y</strong></div>
                <div>M365 Family 1 năm → <strong>M365-FAMILY-1Y</strong></div>
                <div>Office 2021 Pro → <strong>OFFICE-2021-PRO</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Odoo ── */}
        {activeTab === 'odoo' && (
          <div style={{display:'grid',gap:20}}>
            <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:16,marginBottom:16}}>🔗 Cấu hình Odoo nhà cung cấp</div>
              {['odoo_url','odoo_db','odoo_user','odoo_api_key'].map(key => {
                const conf = {
                  odoo_url:     { label:'Odoo URL',      type:'text',     placeholder:'https://supplier.odoo.com' },
                  odoo_db:      { label:'Database name', type:'text',     placeholder:'supplier_db' },
                  odoo_user:    { label:'Email / User',  type:'text',     placeholder:'admin@supplier.com' },
                  odoo_api_key: { label:'API Key',       type:'password', placeholder:'••••••••' },
                }[key]
                return (
                  <div key={key} style={{marginBottom:16}}>
                    <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:5}}>{conf.label}</label>
                    <div style={{display:'flex',gap:8}}>
                      <input
                        type={conf.type}
                        defaultValue={key==='odoo_api_key' ? '' : (settings[key]||'')}
                        placeholder={conf.placeholder}
                        id={'field-'+key}
                        style={{flex:1,padding:'10px 14px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:13,fontFamily:'Be Vietnam Pro',outline:'none'}}
                      />
                      <button
                        onClick={() => {
                          const val = document.getElementById('field-'+key).value
                          saveSetting(key, val)
                        }}
                        disabled={saving[key]}
                        style={{padding:'10px 18px',background:'#0078d4',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,whiteSpace:'nowrap'}}
                      >
                        {saving[key] ? '...' : 'Lưu'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Test Odoo */}
            <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:15,marginBottom:12}}>🧪 Test kết nối Odoo</div>
              <div style={{display:'flex',gap:8,marginBottom:16}}>
                <input
                  value={testCode}
                  onChange={e => setTestCode(e.target.value)}
                  placeholder="Nhập product code (VD: M365-PERSONAL-1Y)"
                  style={{flex:1,padding:'10px 14px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:13,fontFamily:'Be Vietnam Pro',outline:'none'}}
                />
                <button
                  onClick={testOdoo}
                  disabled={testLoading || !testCode}
                  style={{padding:'10px 20px',background:'#0078d4',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}
                >
                  {testLoading ? '⏳...' : '▶ Test'}
                </button>
              </div>
              {testResult && (
                <div style={{
                  padding:'14px 16px',borderRadius:8,fontSize:13,lineHeight:1.7,
                  background: testResult.success?'#f0fdf4':'#fef2f2',
                  border: `1px solid ${testResult.success?'#bbf7d0':'#fecaca'}`
                }}>
                  {testResult.success
                    ? <><strong style={{color:'#16a34a'}}>✅ Kết nối OK</strong><br/>Tồn kho available: <strong>{testResult.available}</strong></>
                    : <><strong style={{color:'#dc2626'}}>❌ Lỗi</strong><br/>{testResult.message}</>
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Sync Stock ── */}
        {activeTab === 'sync' && (
          <div style={{display:'grid',gap:20}}>
            <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:20,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontFamily:'Syne',fontWeight:700,fontSize:16,marginBottom:4}}>🔄 Sync Tồn Kho NCC</div>
                  <p style={{fontSize:13,color:'#6b7280',lineHeight:1.7,maxWidth:520}}>
                    Cập nhật <code style={{background:'#f3f4f6',padding:'1px 5px',borderRadius:4}}>stock_supplier</code> từ Odoo.
                    <code style={{background:'#f3f4f6',padding:'1px 5px',borderRadius:4,marginLeft:6}}>forecasted = stock + stock_supplier</code>
                  </p>
                </div>
                <button
                  onClick={triggerManualSync}
                  disabled={syncing}
                  style={{padding:'12px 22px',background:syncing?'#9ca3af':'#0078d4',color:'white',border:'none',borderRadius:10,cursor:syncing?'not-allowed':'pointer',fontWeight:700,fontSize:14,whiteSpace:'nowrap'}}
                >
                  {syncing ? '⏳ Đang sync...' : '▶ Chạy ngay'}
                </button>
              </div>
            </div>

            <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <div style={{fontFamily:'Syne',fontWeight:700,fontSize:15}}>📊 Lịch sử sync</div>
                <button onClick={loadSyncLogs} style={{padding:'7px 14px',background:'#f3f4f6',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:12}}>🔄 Refresh</button>
              </div>
              {syncLogsLoading ? (
                <div style={{textAlign:'center',padding:'40px',color:'#6b7280'}}>⏳ Đang tải...</div>
              ) : syncLogs.length === 0 ? (
                <div style={{textAlign:'center',padding:'40px',color:'#9ca3af'}}><div style={{fontSize:32,marginBottom:8}}>📭</div><p>Chưa có lịch sử sync</p></div>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
                    <thead>
                      <tr style={{borderBottom:'2px solid #e5e7eb'}}>
                        {['Bắt đầu','Kết thúc','Trạng thái','SP sync','Chi tiết'].map(h => (
                          <th key={h} style={{padding:'9px 12px',textAlign:'left',fontWeight:600,color:'#374151',whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {syncLogs.map((log,i) => (
                        <tr key={i} style={{borderBottom:'1px solid #f3f4f6',background:i%2===0?'white':'#fafafa'}}>
                          <td style={{padding:'9px 12px',whiteSpace:'nowrap',color:'#6b7280'}}>{log.started_at ? new Date(log.started_at).toLocaleString('vi-VN') : '—'}</td>
                          <td style={{padding:'9px 12px',whiteSpace:'nowrap',color:'#6b7280'}}>{log.finished_at ? new Date(log.finished_at).toLocaleString('vi-VN') : '—'}</td>
                          <td style={{padding:'9px 12px'}}>
                            <span style={{
                              padding:'2px 9px',borderRadius:100,fontSize:11,fontWeight:700,
                              background:log.status==='success'?'#dcfce7':log.status==='partial'?'#fef3c7':'#fee2e2',
                              color:log.status==='success'?'#16a34a':log.status==='partial'?'#92400e':'#dc2626'
                            }}>{log.status==='success'?'✅ OK':log.status==='partial'?'⚠️ Partial':log.status==='running'?'⏳ Running':'❌ Error'}</span>
                          </td>
                          <td style={{padding:'9px 12px',textAlign:'center'}}>
                            <span style={{background:'#dbeafe',color:'#1d4ed8',padding:'2px 8px',borderRadius:100,fontWeight:700}}>{log.products_synced||0}</span>
                          </td>
                          <td style={{padding:'9px 12px',maxWidth:260,fontSize:11,color:'#6b7280'}}>
                            {log.details?.synced
                              ? Object.entries(log.details.synced).map(([k,v]) => (
                                  <span key={k} style={{display:'inline-block',marginRight:6,background:'#f0fdf4',padding:'1px 6px',borderRadius:4,color:'#16a34a'}}>{k}: {v}</span>
                                ))
                              : log.error_message ? <span style={{color:'#ef4444'}}>{log.error_message}</span> : '—'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Autoload Logs ── */}
        {activeTab === 'logs' && (
          <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontFamily:'Syne',fontWeight:700,fontSize:16}}>📋 Autoload Logs</div>
                <p style={{fontSize:13,color:'#6b7280',marginTop:2}}>Lịch sử tự động nhập hàng từ Odoo</p>
              </div>
              <button onClick={loadLogs} style={{padding:'8px 16px',background:'#f3f4f6',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}}>🔄 Tải lại</button>
            </div>
            {logsLoading ? (
              <div style={{textAlign:'center',padding:'40px',color:'#6b7280'}}>⏳ Đang tải...</div>
            ) : logs.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px',color:'#9ca3af'}}><div style={{fontSize:36,marginBottom:10}}>📭</div><p>Chưa có log autoload nào</p></div>
            ) : (
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:'2px solid #e5e7eb'}}>
                      {['Thời gian','Đơn hàng','Sản phẩm','Key nạp','Picking Odoo','Trạng thái','Lỗi'].map(h => (
                        <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:600,color:'#374151',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log,i) => (
                      <tr key={i} style={{borderBottom:'1px solid #f3f4f6',background:i%2===0?'white':'#fafafa'}}>
                        <td style={{padding:'10px 12px',whiteSpace:'nowrap',color:'#6b7280'}}>{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                        <td style={{padding:'10px 12px',fontWeight:600,color:'#0078d4'}}>#{log.order_id}</td>
                        <td style={{padding:'10px 12px'}}>{log.product_code}</td>
                        <td style={{padding:'10px 12px',textAlign:'center'}}>
                          <span style={{background:'#dbeafe',color:'#1d4ed8',padding:'2px 8px',borderRadius:100,fontWeight:700}}>{log.keys_loaded}</span>
                        </td>
                        <td style={{padding:'10px 12px'}}>{log.odoo_picking_id ? '#'+log.odoo_picking_id : '—'}</td>
                        <td style={{padding:'10px 12px'}}>
                          <span style={{
                            padding:'3px 10px',borderRadius:100,fontSize:11,fontWeight:700,
                            background:log.status==='success'?'#dcfce7':'#fee2e2',
                            color:log.status==='success'?'#16a34a':'#dc2626'
                          }}>{log.status==='success'?'✅ OK':'❌ Lỗi'}</span>
                        </td>
                        <td style={{padding:'10px 12px',color:'#ef4444',fontSize:12,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {log.error_message||'—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  )
}
