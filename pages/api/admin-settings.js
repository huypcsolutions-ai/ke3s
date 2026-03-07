import { getAllSettings, setSetting } from '../../lib/settings'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_change_me'

export default async function handler(req, res) {
  // Xác thực admin
  const auth = req.headers['x-admin-secret'] || req.query.secret
  if (auth !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const settings = await getAllSettings()
    // Ẩn password
    if (settings.odoo_api_key) settings.odoo_api_key = '••••••••'
    return res.status(200).json(settings)
  }

  if (req.method === 'POST') {
    const { key, value } = req.body
    if (!key) return res.status(400).json({ error: 'Missing key' })
    await setSetting(key, value)
    return res.status(200).json({ success: true, key, value })
  }

  return res.status(405).end()
}
