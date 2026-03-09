import { getServiceClient } from '../../lib/supabase'
import { syncAllSupplierStock } from '../../lib/odooApi'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).end()
  }

  const ADMIN_SECRET = (process.env.ADMIN_SECRET || '').trim()

  // Xác thực: x-admin-secret (từ Admin Panel) hoặc Authorization Bearer (từ cron-job.org)
  const adminSecret = (req.headers['x-admin-secret'] || '').trim()
  const bearerToken = (req.headers['authorization'] || '').replace('Bearer ', '').trim()

  if (adminSecret !== ADMIN_SECRET && bearerToken !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = getServiceClient()
  const startedAt = new Date().toISOString()

  // Ghi log bắt đầu
  const { data: logRow } = await supabase
    .from('stock_sync_logs')
    .insert({ started_at: startedAt, status: 'running' })
    .select('id')
    .single()

  const logId = logRow?.id

  try {
    console.log('[CronSync] Starting...')
    const { synced, details, errors } = await syncAllSupplierStock(supabase)

    const finishedAt = new Date().toISOString()
    const hasErrors  = Object.keys(errors).length > 0
    const status     = synced === 0 && hasErrors ? 'error' : hasErrors ? 'partial' : 'success'

    if (logId) {
      await supabase.from('stock_sync_logs').update({
        finished_at:     finishedAt,
        status,
        products_synced: synced,
        details:         { synced: details, errors },
      }).eq('id', logId)
    }

    console.log(`[CronSync] Done — ${synced} synced, ${Object.keys(errors).length} errors`)
    return res.status(200).json({ success: true, status, synced, details, errors })

  } catch (err) {
    console.error('[CronSync] Error:', err.message)

    if (logId) {
      await supabase.from('stock_sync_logs').update({
        finished_at:   new Date().toISOString(),
        status:        'error',
        error_message: err.message,
      }).eq('id', logId)
    }

    return res.status(500).json({ error: err.message })
  }
}
