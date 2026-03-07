import { getServiceClient } from '../../lib/supabase'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_change_me'

export default async function handler(req, res) {
  const auth = req.headers['x-admin-secret'] || req.query.secret
  if (auth !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('autoload_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ logs: data || [] })
}
