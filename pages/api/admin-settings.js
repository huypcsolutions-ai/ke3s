import { getAllSettings, setSetting } from '../../lib/settings'

export default async function handler(req, res) {
  // Lấy secret từ env — trim() để tránh khoảng trắng thừa
  const ADMIN_SECRET = (process.env.ADMIN_SECRET || '').trim()

  // Lấy secret từ header — trim() phòng copy-paste thừa space
  const provided = (
    req.headers['x-admin-secret'] ||
    req.query.secret ||
    ''
  ).trim()

  // So sánh
  if (!ADMIN_SECRET) {
    // ADMIN_SECRET chưa được set trong env
    return res.status(500).json({ error: 'ADMIN_SECRET chưa được cấu hình trong Vercel env vars' })
  }

  if (provided !== ADMIN_SECRET) {
    // Log để debug (chỉ hiện ở server log Vercel, không lộ ra client)
    console.warn('[Admin] Auth fail — provided length:', provided.length, '| expected length:', ADMIN_SECRET.length)
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const settings = await getAllSettings()
      // Ẩn password
      if (settings.odoo_api_key) settings.odoo_api_key = '••••••••'
      return res.status(200).json(settings)
    } catch (err) {
      console.error('[Admin] getAllSettings error:', err.message)
      // Trả về object rỗng thay vì lỗi — admin vẫn vào được dù settings table chưa có
      return res.status(200).json({})
    }
  }

  if (req.method === 'POST') {
    const { key, value } = req.body
    if (!key) return res.status(400).json({ error: 'Missing key' })
    try {
      await setSetting(key, value)
      return res.status(200).json({ success: true, key, value })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).end()
}
