import { useState, useEffect } from 'react'
import Head from 'next/head'

const SETTINGS_KEYS = {
  autoload_enabled:   { label: 'Bật Autoload từ nhà cung cấp', type: 'toggle', desc: 'Khi tồn kho hết, tự động lấy key từ Odoo nhà cung cấp' },
  odoo_url:           { label: 'Odoo URL nhà cung cấp', type: 'text', placeholder: 'https://supplier.odoo.com', desc: 'URL đầy đủ của Odoo instance nhà cung cấp' },
  odoo_db:            { label: 'Odoo Database name', type: 'text', placeholder: 'supplier_db', desc: 'Tên database Odoo' },
  odoo_user:          { label: 'Odoo Email / Username', type: 'text', placeholder: 'admin@supplier.com', desc: 'Tài khoản đăng nhập Odoo' },
  odoo_api_key:       { label: 'Odoo API Key / Password', type: 'password', placeholder: '••••••••', desc: 'API Key (Settings → Technical → API Keys) hoặc mật khẩu' },
}

function Toast({ msg, type, onClose }) {
  if (!msg) return null
  const colors = { success: '#f0fdf4', error: '#fef2f2', info: '#eff6ff' }
  const borders = { success: '#22c55e', error: '#ef4444', info: '#3b82f6' }
  return (
    <div style={{
      position:'fixed', top:20, right:20, zIndex:9999,
      background: colors[type]||colors.info,
      border: `1.5px solid ${borders[type]||borders.info}`,
      borderLeft: `5px solid ${borders[type]||borders.info}`,
      padding:'14px 20px', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)',
      maxWidth:380, fontSize:14, fontWeight:500, display:'flex', gap:10, alignItems:'flex-start',
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
        width: 56, height: 30, borderRadius: 15, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: value ? '#0078d4' : '#d1d5db', position: 'relative', transition: 'background 0.25s',
        flexShrink: 0
      }}
    >
      <span style={{
        position:'absolute', top:3, left: value?28:3, width:24, height:24,
        background:'white', borderRadius:'50%', transition:'left 0.25s',
        boxShadow:'0 1px 4px rgba(0,0,0,0.25)'
      }} />
    </button>
  )
}

export default function AdminPage() {
  const [secret, setSecret]     = useState('')
  const [authed, setAuthed]     = useState(false)
  const [settings, setSettings] = useState({})
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState({})
  const [toast, setToast]       = useState(null)
  const [testCode, setTestCode] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testLoading, setTestLoading] = useState(false)
  const [logs, setLogs]         = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('config')

  function showToast(msg, type='info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function apiFetch(url, opts={}) {
    const res = await fetch(url, {
      ...opts,
      headers: { 'Content-Type':'application/json', 'x-admin-secret': secret.trim(), ...(opts.headers||{}) }
    })
    return res.json()
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin-settings', {
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret.trim()   // trim() phòng copy-paste thừa space
        }
      })
      const data = await res.json()
      if (res.status === 401) {
        showToast('Sai mật khẩu — kiểm tra lại ADMIN_SECRET trong Vercel env vars', 'error')
      } else if (res.status === 500) {
        showToast('ADMIN_SECRET chưa được set trong Vercel env vars', 'error')
      } else if (res.ok) {
        setSettings(data)
        setAuthed(true)
      } else {
        showToast('Lỗi: ' + (data.error || res.status), 'error')
      }
    } catch (err) {
      showToast('Lỗi kết nối tới server: ' + err.message, 'error')
    }
    setLoading(false)
  }

  async function saveSetting(key, value) {
    setSaving(s => ({...s, [key]: true}))
    try {
      await apiFetch('/api/admin-settings', {
        method:'POST', body: JSON.stringify({key, value: String(value)})
      })
      setSettings(s => ({...s, [key]: String(value)}))
      showToast('Đã lưu thành công', 'success')
    } catch { showToast('Lỗi khi lưu', 'error') }
    setSaving(s => ({...s, [key]: false}))
  }

  async function handleToggle(value) {
    await saveSetting('autoload_enabled', value)
  }

  async function testOdoo() {
    setTestLoading(true)
    setTestResult(null)
    try {
      const data = await apiFetch('/api/odoo-test', {
        method:'POST', body: JSON.stringify({ productCode: testCode })
      })
      setTestResult(data)
    } catch (e) { setTestResult({ success: false, message: e.message }) }
    setTestLoading(false)
  }

  async function loadLogs() {
    setLogsLoading(true)
    try {
      const res = await fetch('/api/autoload-logs?secret=' + secret)
      const data = await res.json()
      setLogs(data.logs || [])
    } catch { showToast('Không tải được logs', 'error') }
    setLogsLoading(false)
  }

  useEffect(() => {
    if (authed && activeTab === 'logs') loadLogs()
  }, [authed, activeTab])

  const autoloadOn = settings.autoload_enabled === 'true'

  if (!authed) {
    return (
      <>
        <Head><title>Admin — M365Keys</title></Head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
          * { box-sizing:border-box; margin:0; padding:0; }
          body { font-family:'Be Vietnam Pro',sans-serif; background:#f0f4f8; min-height:100vh; display:flex; align-items:center; justify-content:center; }
          @keyframes slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:none} }
        `}</style>
        <Toast {...(toast||{})} onClose={()=>setToast(null)} />
        <div style={{background:'white',borderRadius:16,padding:'48px 40px',width:380,boxShadow:'0 20px 60px rgba(0,0,0,0.12)'}}>
          <div style={{textAlign:'center',marginBottom:32}}>
            <div style={{fontSize:40,marginBottom:12}}>🔐</div>
            <h1 style={{fontFamily:'Syne',fontSize:24,fontWeight:800}}>Admin Panel</h1>
            <p style={{color:'#6b7280',fontSize:13,marginTop:6}}>M365Keys — Quản trị hệ thống</p>
          </div>
          <form onSubmit={handleLogin}>
            <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:6}}>Admin Secret Key</label>
            <input
              type="password"
              value={secret}
              onChange={e=>setSecret(e.target.value)}
              placeholder="Nhập mật khẩu admin..."
              style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:14,outline:'none',fontFamily:'Be Vietnam Pro',marginBottom:16}}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !secret}
              style={{width:'100%',padding:'12px',background:'#0078d4',color:'white',border:'none',borderRadius:8,fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'Be Vietnam Pro'}}
            >
              {loading ? '⏳ Đang kiểm tra...' : '🔓 Đăng nhập'}
            </button>
          </form>
          <p style={{textAlign:'center',marginTop:16,fontSize:12,color:'#9ca3af'}}>
            Đặt <code style={{background:'#f3f4f6',padding:'1px 5px',borderRadius:4}}>ADMIN_SECRET</code> trong Vercel environment variables
          </p>

          {/* Debug helper */}
          <details style={{marginTop:16,borderTop:'1px solid #f3f4f6',paddingTop:14}}>
            <summary style={{fontSize:11.5,color:'#9ca3af',cursor:'pointer',userSelect:'none'}}>🔧 Vẫn không vào được? Bấm để debug</summary>
            <div style={{marginTop:10,fontSize:12,color:'#6b7280',lineHeight:1.8}}>
              <p style={{marginBottom:8}}>Kiểm tra các bước sau:</p>
              <ol style={{paddingLeft:18,lineHeight:2}}>
                <li>Vào <strong>Vercel Dashboard → Settings → Environment Variables</strong></li>
                <li>Tìm biến <code style={{background:'#f3f4f6',padding:'1px 4px',borderRadius:3}}>ADMIN_SECRET</code> — copy giá trị ra</li>
                <li>Xoá khoảng trắng 2 đầu (nếu có) rồi paste vào ô nhập bên trên</li>
                <li>Sau khi sửa env var trên Vercel, phải <strong>Redeploy</strong> để có hiệu lực</li>
              </ol>
              <button
                onClick={async () => {
                  try {
                    const r = await fetch('/api/admin-settings', {
                      headers: { 'x-admin-secret': secret.trim() }
                    })
                    alert('HTTP Status: ' + r.status + '\n' + (r.status===401 ? '❌ Sai secret' : r.status===500 ? '⚠️ ADMIN_SECRET chưa set trong Vercel' : '✅ OK — thử đăng nhập lại'))
                  } catch(e) { alert('Lỗi fetch: ' + e.message) }
                }}
                style={{marginTop:10,padding:'7px 14px',background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:600,width:'100%'}}
              >
                🧪 Test kết nối ngay
              </button>
            </div>
          </details>
        </div>
      </>
    )
  }

  const [syncLogs, setSyncLogs]               = useState([])
  const [syncLogsLoading, setSyncLogsLoading] = useState(false)
  const [syncing, setSyncing]                 = useState(false)

  async function loadSyncLogs() {
    setSyncLogsLoading(true)
    try {
      const data = await apiFetch('/api/stock-sync-logs')
      setSyncLogs(data.logs || [])
    } catch { showToast('Không tải được sync logs', 'error') }
    setSyncLogsLoading(false)
  }

  async function triggerManualSync() {
    setSyncing(true)
    try {
      const data = await apiFetch('/api/cron-sync-stock', { method: 'POST' })
      if (data.success) {
        showToast('Sync xong: ' + data.synced + ' sản phẩm cập nhật', 'success')
        loadSyncLogs()
      } else {
        showToast('Lỗi sync: ' + data.error, 'error')
      }
    } catch (e) { showToast('Lỗi kết nối', 'error') }
    setSyncing(false)
  }

  useEffect(() => {
    if (authed && activeTab === 'sync') loadSyncLogs()
  }, [authed, activeTab])

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
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
      <Toast {...(toast||{})} onClose={()=>setToast(null)} />

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0078d4,#005a9e)',padding:'0',marginBottom:0}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:40,height:40,background:'rgba(255,255,255,0.2)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>⚙️</div>
            <div>
              <div style={{fontFamily:'Syne',fontWeight:800,fontSize:18,color:'white'}}>Admin Panel</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.7)'}}>M365Keys — Quản trị hệ thống</div>
            </div>
          </div>
          <a href="/" style={{color:'rgba(255,255,255,0.8)',fontSize:13,textDecoration:'none'}}>← Về trang chủ</a>
        </div>

        {/* Autoload Status Banner */}
        <div style={{background: autoloadOn ? 'rgba(0,178,148,0.3)' : 'rgba(239,68,68,0.25)', borderTop:'1px solid rgba(255,255,255,0.15)', padding:'12px 24px'}}>
          <div style={{maxWidth:900,margin:'0 auto',display:'flex',alignItems:'center',gap:16}}>
            <div style={{
              width:12,height:12,borderRadius:'50%',
              background: autoloadOn ? '#4ade80' : '#f87171',
              boxShadow: autoloadOn ? '0 0 8px #4ade80' : '0 0 8px #f87171',
              animation: autoloadOn ? 'pulse 2s infinite' : 'none'
            }}/>
            <span style={{color:'white',fontWeight:600,fontSize:14}}>
              Autoload từ nhà cung cấp: {autoloadOn ? '🟢 ĐANG BẬT' : '🔴 TẮT'}
            </span>
            <Toggle value={autoloadOn} onChange={handleToggle} />
            <span style={{color:'rgba(255,255,255,0.7)',fontSize:12}}>
              {autoloadOn ? 'Khi hết stock sẽ tự lấy key từ Odoo nhà cung cấp' : 'Không tự động nhập hàng khi hết stock'}
            </span>
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'28px 24px'}}>
        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:24,background:'white',padding:4,borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',width:'fit-content'}}>
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
              padding:'10px 22px',borderRadius:9,border:'none',cursor:'pointer',
              background: activeTab===t.id ? '#0078d4' : 'transparent',
              color: activeTab===t.id ? 'white' : '#4b5563',
              fontFamily:'Be Vietnam Pro',fontWeight:600,fontSize:14,transition:'all 0.15s'
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab: Cấu hình */}
        {activeTab === 'config' && (
          <div>
            {/* Autoload toggle card */}
            <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',marginBottom:20,border: autoloadOn ? '1.5px solid #0078d4' : '1.5px solid #e5e7eb'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:20}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                    <span style={{fontSize:22}}>🔄</span>
                    <span style={{fontFamily:'Syne',fontWeight:700,fontSize:17}}>Autoload từ nhà cung cấp</span>
                    <span style={{
                      padding:'2px 10px',borderRadius:100,fontSize:11,fontWeight:700,
                      background: autoloadOn ? '#dcfce7' : '#fee2e2',
                      color: autoloadOn ? '#16a34a' : '#dc2626'
                    }}>{autoloadOn ? 'BẬT' : 'TẮT'}</span>
                  </div>
                  <p style={{fontSize:13.5,color:'#6b7280',lineHeight:1.7}}>
                    Khi tồn kho nội bộ hết, hệ thống sẽ tự động:
                  </p>
                  <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:6}}>
                    {[
                      '① Kiểm tra tồn kho Odoo nhà cung cấp (stock.quant)',
                      '② Lấy serial/lot mới nhất từ Odoo (stock.lot)',
                      '③ Tạo phiếu chuyển kho trong Odoo (stock.picking)',
                      '④ Nhập key vào kho nội bộ và gửi email cho khách',
                    ].map(s => (
                      <div key={s} style={{fontSize:13,color:'#374151',display:'flex',gap:8}}>
                        <span style={{color:'#0078d4',flexShrink:0}}>●</span>{s}
                      </div>
                    ))}
                  </div>
                </div>
                <Toggle value={autoloadOn} onChange={handleToggle} />
              </div>
            </div>

            {/* Odoo product mapping */}
            <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:16,marginBottom:6}}>🏷️ Mapping mã sản phẩm Odoo</div>
              <p style={{fontSize:13,color:'#6b7280',marginBottom:16,lineHeight:1.6}}>
                Mỗi sản phẩm cần có <code style={{background:'#f3f4f6',padding:'1px 6px',borderRadius:4}}>odoo_product_code</code> tương ứng với <strong>Internal Reference</strong> trong Odoo nhà cung cấp. Cập nhật trong Supabase Table Editor → bảng <code style={{background:'#f3f4f6',padding:'1px 6px',borderRadius:4}}>products</code>.
              </p>
              <div style={{background:'#f8f9fa',borderRadius:10,padding:16,fontFamily:'monospace',fontSize:13,lineHeight:1.8}}>
                <div style={{color:'#6b7280',marginBottom:4}}>-- Ví dụ SQL:</div>
                <div style={{color:'#0078d4'}}>UPDATE products</div>
                <div><span style={{color:'#0078d4'}}>SET</span> odoo_product_code = <span style={{color:'#16a34a'}}>'M365-PERSONAL-1Y'</span></div>
                <div><span style={{color:'#0078d4'}}>WHERE</span> name = <span style={{color:'#16a34a'}}>'Microsoft 365 Personal'</span>;</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Odoo */}
        {activeTab === 'odoo' && (
          <div style={{display:'grid',gap:20}}>
            {/* Cấu hình Odoo */}
            <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:16,marginBottom:4}}>🔗 Kết nối Odoo nhà cung cấp</div>
              <p style={{fontSize:13,color:'#6b7280',marginBottom:20}}>
                Cấu hình này được lưu trong bảng <code style={{background:'#f3f4f6',padding:'1px 6px',borderRadius:4}}>settings</code> Supabase hoặc set qua biến môi trường Vercel.
              </p>

              <div style={{
                background:'#fffbeb',border:'1px solid #fbbf24',borderRadius:10,
                padding:'12px 16px',marginBottom:20,fontSize:13,color:'#92400e'
              }}>
                💡 <strong>Khuyến nghị:</strong> Đặt thông tin Odoo trong <strong>Vercel Environment Variables</strong> thay vì lưu database để bảo mật hơn:
                <code style={{display:'block',marginTop:6,background:'#fef3c7',padding:'6px 10px',borderRadius:6,fontSize:12}}>
                  ODOO_URL, ODOO_DB, ODOO_USER, ODOO_API_KEY
                </code>
              </div>

              {Object.entries(SETTINGS_KEYS).filter(([k]) => k!=='autoload_enabled').map(([key, meta]) => (
                <SettingRow
                  key={key} settingKey={key} meta={meta}
                  value={settings[key] || ''}
                  saving={saving[key]}
                  onChange={val => setSettings(s=>({...s,[key]:val}))}
                  onSave={val => saveSetting(key, val)}
                />
              ))}
            </div>

            {/* Test kết nối */}
            <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:16,marginBottom:4}}>🧪 Kiểm tra kết nối Odoo</div>
              <p style={{fontSize:13,color:'#6b7280',marginBottom:16}}>Nhập mã sản phẩm (Internal Reference) để test API</p>

              <div style={{display:'flex',gap:10}}>
                <input
                  value={testCode}
                  onChange={e=>setTestCode(e.target.value)}
                  placeholder="VD: M365-PERSONAL-1Y"
                  style={{flex:1,padding:'10px 14px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:14,outline:'none',fontFamily:'Be Vietnam Pro'}}
                  onKeyDown={e=>e.key==='Enter'&&testOdoo()}
                />
                <button
                  onClick={testOdoo}
                  disabled={testLoading}
                  style={{padding:'10px 20px',background:'#0078d4',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'Be Vietnam Pro',fontWeight:600,whiteSpace:'nowrap'}}
                >
                  {testLoading ? '⏳ Testing...' : '🔍 Kiểm tra'}
                </button>
              </div>

              {testResult && (
                <div style={{
                  marginTop:14, padding:16, borderRadius:10,
                  background: testResult.success ? '#f0fdf4' : '#fef2f2',
                  border: `1.5px solid ${testResult.success ? '#22c55e' : '#ef4444'}`
                }}>
                  <div style={{fontWeight:700,marginBottom:8,color: testResult.success ? '#16a34a' : '#dc2626'}}>
                    {testResult.success ? '✅ Kết nối thành công!' : '❌ Kết nối thất bại'}
                  </div>
                  <div style={{fontSize:13,color:'#374151'}}>{testResult.message}</div>
                  {testResult.result && (
                    <pre style={{marginTop:10,fontSize:11,background:'#f9fafb',padding:10,borderRadius:6,overflow:'auto'}}>
                      {JSON.stringify(testResult.result, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Logs */}
        {activeTab === 'logs' && (
          <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontFamily:'Syne',fontWeight:700,fontSize:16}}>📋 Autoload Logs</div>
                <p style={{fontSize:13,color:'#6b7280',marginTop:2}}>Lịch sử tự động nhập hàng từ Odoo</p>
              </div>
              <button onClick={loadLogs} style={{padding:'8px 16px',background:'#f3f4f6',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'Be Vietnam Pro',fontWeight:600,fontSize:13}}>
                🔄 Tải lại
              </button>
            </div>

            {logsLoading ? (
              <div style={{textAlign:'center',padding:'40px',color:'#6b7280'}}>⏳ Đang tải...</div>
            ) : logs.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px',color:'#9ca3af'}}>
                <div style={{fontSize:36,marginBottom:10}}>📭</div>
                <p>Chưa có log autoload nào</p>
              </div>
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
                    {logs.map((log, i) => (
                      <tr key={i} style={{borderBottom:'1px solid #f3f4f6',background: i%2===0?'white':'#fafafa'}}>
                        <td style={{padding:'10px 12px',whiteSpace:'nowrap',color:'#6b7280'}}>
                          {new Date(log.created_at).toLocaleString('vi-VN')}
                        </td>
                        <td style={{padding:'10px 12px',fontWeight:600,color:'#0078d4'}}>#{log.order_id}</td>
                        <td style={{padding:'10px 12px'}}>{log.product_code}</td>
                        <td style={{padding:'10px 12px',textAlign:'center'}}>
                          <span style={{background:'#dbeafe',color:'#1d4ed8',padding:'2px 8px',borderRadius:100,fontWeight:700}}>{log.keys_loaded}</span>
                        </td>
                        <td style={{padding:'10px 12px'}}>{log.odoo_picking_id ? `#${log.odoo_picking_id}` : '—'}</td>
                        <td style={{padding:'10px 12px'}}>
                          <span style={{
                            padding:'3px 10px',borderRadius:100,fontSize:11,fontWeight:700,
                            background: log.status==='success' ? '#dcfce7' : '#fee2e2',
                            color: log.status==='success' ? '#16a34a' : '#dc2626'
                          }}>{log.status==='success'?'✅ OK':'❌ Lỗi'}</span>
                        </td>
                        <td style={{padding:'10px 12px',color:'#ef4444',fontSize:12,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {log.error_message || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Sync Stock NCC */}
        {activeTab === 'sync' && (
          <div style={{display:'grid',gap:20}}>
            {/* Cron info */}
            <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:20,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontFamily:'Syne',fontWeight:700,fontSize:16,marginBottom:4}}>🔄 Sync Tồn Kho Nhà Cung Cấp</div>
                  <p style={{fontSize:13,color:'#6b7280',lineHeight:1.7,maxWidth:520}}>
                    Cron job chạy tự động mỗi <strong>1 giờ</strong> (lịch: <code style={{background:'#f3f4f6',padding:'1px 6px',borderRadius:4}}>0 * * * *</code>)
                    để cập nhật cột <code style={{background:'#f3f4f6',padding:'1px 6px',borderRadius:4}}>stock_supplier</code> từ Odoo.
                    Cột <code style={{background:'#f3f4f6',padding:'1px 6px',borderRadius:4}}>forecasted = stock + stock_supplier</code> tự tính.
                  </p>
                </div>
                <button
                  onClick={triggerManualSync}
                  disabled={syncing}
                  style={{padding:'12px 22px',background: syncing?'#9ca3af':'#0078d4',color:'white',border:'none',borderRadius:10,cursor: syncing?'not-allowed':'pointer',fontFamily:'Be Vietnam Pro',fontWeight:700,fontSize:14,whiteSpace:'nowrap',flexShrink:0}}
                >
                  {syncing ? '⏳ Đang sync...' : '▶ Chạy ngay'}
                </button>
              </div>

              <div style={{marginTop:20,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {[
                  {icon:'🔍', label:'Nguồn dữ liệu', val:'Odoo stock.quant'},
                  {icon:'📍', label:'Location filter', val:"ILIKE '%sale%' OR usage=internal"},
                  {icon:'⏰', label:'Tần suất', val:'Mỗi 1 giờ (Vercel Cron)'},
                ].map(item => (
                  <div key={item.label} style={{background:'#f8f9fa',borderRadius:10,padding:'14px 16px'}}>
                    <div style={{fontSize:20,marginBottom:6}}>{item.icon}</div>
                    <div style={{fontSize:11,color:'#9ca3af',marginBottom:3}}>{item.label}</div>
                    <div style={{fontSize:12.5,fontWeight:600,color:'#374151',fontFamily:'monospace'}}>{item.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync Logs */}
            <div style={{background:'white',borderRadius:14,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <div>
                  <div style={{fontFamily:'Syne',fontWeight:700,fontSize:15}}>📊 Lịch sử sync</div>
                  <p style={{fontSize:12,color:'#6b7280',marginTop:2}}>50 lần sync gần nhất</p>
                </div>
                <button onClick={loadSyncLogs} style={{padding:'7px 14px',background:'#f3f4f6',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'Be Vietnam Pro',fontWeight:600,fontSize:12}}>
                  🔄 Refresh
                </button>
              </div>

              {syncLogsLoading ? (
                <div style={{textAlign:'center',padding:'30px',color:'#6b7280'}}>⏳ Đang tải...</div>
              ) : syncLogs.length === 0 ? (
                <div style={{textAlign:'center',padding:'30px',color:'#9ca3af'}}>
                  <div style={{fontSize:32,marginBottom:8}}>📭</div>
                  <p>Chưa có lịch sử sync</p>
                </div>
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
                              background: log.status==='success'?'#dcfce7':log.status==='partial'?'#fef3c7':'#fee2e2',
                              color: log.status==='success'?'#16a34a':log.status==='partial'?'#92400e':'#dc2626'
                            }}>{log.status==='success'?'✅ OK':log.status==='partial'?'⚠️ Partial':log.status==='running'?'⏳ Running':'❌ Error'}</span>
                          </td>
                          <td style={{padding:'9px 12px',textAlign:'center'}}>
                            <span style={{background:'#dbeafe',color:'#1d4ed8',padding:'2px 8px',borderRadius:100,fontWeight:700}}>{log.products_synced || 0}</span>
                          </td>
                          <td style={{padding:'9px 12px',maxWidth:260,fontSize:11,color:'#6b7280'}}>
                            {log.details?.synced ? (
                              <div>
                                {Object.entries(log.details.synced).map(([k,v]) => (
                                  <span key={k} style={{display:'inline-block',marginRight:6,marginBottom:2,background:'#f0fdf4',padding:'1px 6px',borderRadius:4,color:'#16a34a'}}>{k}: {v}</span>
                                ))}
                                {log.details.errors && Object.keys(log.details.errors).length > 0 && (
                                  <div style={{marginTop:3,color:'#ef4444'}}>{Object.keys(log.details.errors).length} lỗi</div>
                                )}
                              </div>
                            ) : log.error_message ? (
                              <span style={{color:'#ef4444'}}>{log.error_message}</span>
                            ) : '—'}
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
      </div>
    </>
  )
}
