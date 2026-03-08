/**
 * /api/cron-sync-stock
 *
 * Vercel Cron Job — chạy mỗi 1 giờ để sync stock_supplier từ Odoo NCC.
 * Vercel gọi endpoint này tự động theo lịch trong vercel.json.
 *
 * Có thể gọi thủ công từ Admin Panel hoặc bằng curl:
 *   curl -X POST https://your-domain.vercel.app/api/cron-sync-stock \
 *     -H "Authorization: Bearer CRON_SECRET"
 */

import { getServiceClient } from '../../lib/supabase'
import { syncAllSupplierStock } from '../../lib/odooApi'
import { getSetting } from '../../lib/settings'

const CRON_SECRET = process.env.CRON_SECRET || process.env.ADMIN_SECRET || 'cron_secret'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).end()
  }

  // Xác thực: Vercel gửi header Authorization: Bearer CRON_SECRET
  // hoặc có thể gọi thủ công với header x-admin-secret
  const authHeader = req.headers['authorization'] || ''
  const adminSecret = req.headers['x-admin-secret'] || ''
  const cronToken = authHeader.replace('Bearer ', '').trim()

  if (cronToken !== CRON_SECRET && adminSecret !== (process.env.ADMIN_SECRET || 'admin_change_me')) {
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
    // Kiểm tra autoload enabled không bắt buộc — sync stock NCC luôn chạy
    // độc lập với autoload_enabled (sync là đọc, không tạo picking)
    console.log('[CronSync] Starting supplier stock sync...')

    const { synced, details, errors } = await syncAllSupplierStock(supabase)

    const finishedAt = new Date().toISOString()
    const hasErrors  = Object.keys(errors).length > 0
    const status     = synced === 0 ? 'error' : hasErrors ? 'partial' : 'success'

    // Cập nhật log
    if (logId) {
      await supabase.from('stock_sync_logs').update({
        finished_at:     finishedAt,
        status,
        products_synced: synced,
        details:         { synced: details, errors },
      }).eq('id', logId)
    }

    console.log(`[CronSync] Done — ${synced} products synced, ${Object.keys(errors).length} errors`)

    return res.status(200).json({
      success: true,
      status,
      synced,
      details,
      errors,
      started_at:  startedAt,
      finished_at: finishedAt,
    })

  } catch (err) {
    console.error('[CronSync] Fatal error:', err.message)

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
