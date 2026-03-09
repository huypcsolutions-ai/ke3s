import { getAllSettings, setSetting } from '../../lib/settings'
import { getServiceClient } from '../../lib/supabase'

async function logActivity(action, meta = {}) {
  const supabase = getServiceClient()
  const { error } = await supabase.from('logalls').insert({
    uid:        'admin',
    action,
    meta,
    created_at: new Date().toISOString(),
  })
  // In lỗi ra Vercel Function Logs để debug
  if (error) {
    console.error('[logalls] INSERT failed:', JSON.stringify(error))
  } else {
    console.log('[logalls] OK:', action)
  }
}

export default async function handler(req, res) {
  const ADMIN_SECRET = (process.env.ADMIN_SECRET || '').trim()
  const provided     = (req.headers['x-admin-secret'] || req.query.secret || '').trim()
  const ip           = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'

  if (!ADMIN_SECRET) {
    await logActivity('admin_login', { result: 'error', reason: 'ADMIN_SECRET_NOT_SET', ip })
    return res.status(500).json({ error: 'ADMIN_SECRET chưa được cấu hình trong Vercel env vars' })
  }

  if (provided !== ADMIN_SECRET) {
    await logActivity('admin_login', { result: 'fail', ip, hint: `len=${provided.length}` })
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    await logActivity('admin_login', { result: 'ok', ip })
    try {
      const settings = await getAllSettings()
      if (settings.odoo_api_key) settings.odoo_api_key = '••••••••'
      return res.status(200).json(settings)
    } catch (err) {
      console.error('[Admin] getAllSettings error:', err.message)
      return res.status(200).json({})
    }
  }

  if (req.method === 'POST') {
    const { key, value } = req.body
    if (!key) return res.status(400).json({ error: 'Missing key' })
    try {
      await setSetting(key, value)
      await logActivity('admin_setting_change', { key, ip })
      return res.status(200).json({ success: true, key, value })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).end()
}
