import { getServiceClient } from '../../lib/supabase'
import { sendKeyEmail, sendOutOfStockEmail } from '../../lib/email'
import { getSetting, SETTING_AUTOLOAD_ENABLED } from '../../lib/settings'
import { autoloadKeysFromSupplier } from '../../lib/odooApi'

// ─── Activity logger (server-side) ────────────────────────────────────────
async function log(supabase, action, meta = {}) {
  try {
    await supabase.from('logalls').insert({
      uid: 'webhook_server',
      action,
      meta,
      created_at: new Date().toISOString(),
    })
  } catch (e) { /* non-blocking */ }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const supabase = getServiceClient()

  try {
    const body = req.body
    // Log raw webhook
    await log(supabase, 'webhook_received', { raw: JSON.stringify(body).slice(0, 1000) })

    const { transferAmount, content, referenceCode, transferType } = body

    if (transferType !== 'in' && body.type !== 'in') {
      return res.status(200).json({ success: true, message: 'Ignored outgoing' })
    }

    // Parse order ID
    const contentStr = content || ''
    const match = contentStr.match(/M365Keys\s+([A-Z0-9]+)/i)
    if (!match) {
      return res.status(200).json({ success: true, message: 'No order in content' })
    }

    const orderId = match[1].toUpperCase()

    // Lấy đơn hàng
    const { data: order } = await supabase
      .from('orders').select('*').eq('id', orderId).single()

    if (!order) {
      await log(supabase, 'payment_check', { order_id: orderId, result: 'order_not_found' })
      return res.status(200).json({ success: true, message: 'Order not found' })
    }

    if (order.payment_status === 'completed') {
      return res.status(200).json({ success: true, message: 'Already completed' })
    }

    // Kiểm tra số tiền
    const receivedAmount = parseFloat(transferAmount)
    if (receivedAmount < order.total_amount * 0.99) {
      await log(supabase, 'payment_check', {
        order_id: orderId,
        result: 'amount_mismatch',
        expected: order.total_amount,
        received: receivedAmount,
      })
      return res.status(200).json({ success: true, message: 'Amount mismatch' })
    }

    await log(supabase, 'payment_check', { order_id: orderId, result: 'ok', amount: receivedAmount })

    // ── Lấy key từ kho nội bộ ──────────────────────────────────────────
    let keyValues = await getKeysFromLocalStock(supabase, order)
    await log(supabase, 'stock_check', {
      order_id: orderId,
      result: keyValues ? 'ok' : 'empty',
      found: keyValues?.length || 0,
      needed: order.quantity,
    })

    // ── Autoload từ Odoo NCC nếu hết kho nội bộ ───────────────────────
    if (!keyValues) {
      const autoloadEnabled = await getSetting(SETTING_AUTOLOAD_ENABLED)

      if (autoloadEnabled === 'true') {
        await log(supabase, 'autoload_begin', { order_id: orderId })
        keyValues = await tryAutoloadFromOdoo(supabase, order, orderId)
        await log(supabase, 'autoload_result', {
          order_id: orderId,
          result: keyValues ? 'ok' : 'failed',
          qty: keyValues?.length || 0,
        })
      }

      // Vẫn không đủ — mark completed + gửi email thông báo hết hàng
      if (!keyValues) {
        await supabase.from('orders').update({
          payment_status: 'completed',
          payment_ref:    referenceCode,
          paid_at:        new Date().toISOString(),
          note:           (order.note || '') + '\n[STOCK_EMPTY]',
        }).eq('id', orderId)

        // Gửi email xin lỗi hết hàng
        try {
          await sendOutOfStockEmail({
            to:           order.customer_email,
            customerName: order.customer_name,
            orderId,
            productName:  order.product_name,
            totalAmount:  order.total_amount,
          })
          await log(supabase, 'email_send_not_enough', { order_id: orderId, result: 'ok' })
        } catch (emailErr) {
          await log(supabase, 'email_send_not_enough', { order_id: orderId, result: 'error', error: emailErr.message })
        }

        await log(supabase, 'order_complete', { order_id: orderId, result: 'stock_empty' })
        return res.status(200).json({ success: true, message: 'Stock empty — notified customer' })
      }
    }

    // ── Cập nhật DB ────────────────────────────────────────────────────
    await supabase.from('orders').update({
      payment_status: 'completed',
      payment_ref:    referenceCode,
      paid_at:        new Date().toISOString(),
    }).eq('id', orderId)

    const { data: prod } = await supabase
      .from('products').select('stock, sold_count').eq('id', order.product_id).single()
    if (prod) {
      await supabase.from('products').update({
        stock:      Math.max(0, (prod.stock || 0) - order.quantity),
        sold_count: (prod.sold_count || 0) + order.quantity,
      }).eq('id', order.product_id)
    }

    await log(supabase, 'db_update', { order_id: orderId, result: 'ok' })

    // ── Gửi email key ─────────────────────────────────────────────────
    try {
      await sendKeyEmail({
        to:           order.customer_email,
        customerName: order.customer_name,
        orderId,
        productName:  order.product_name,
        keys:         keyValues,
        totalAmount:  order.total_amount,
      })
      await log(supabase, 'email_send', { order_id: orderId, result: 'ok', qty: keyValues.length })
    } catch (emailErr) {
      console.error('[Webhook] Email failed:', emailErr.message)
      await log(supabase, 'email_send', { order_id: orderId, result: 'error', error: emailErr.message })
    }

    await log(supabase, 'order_complete', { order_id: orderId, result: 'ok', keys: keyValues.length })

    return res.status(200).json({ success: true, orderId, keysDelivered: keyValues.length })

  } catch (err) {
    console.error('[Webhook] Error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}

// ─── Lấy key từ kho nội bộ ────────────────────────────────────────────────
async function getKeysFromLocalStock(supabase, order) {
  const { data } = await supabase
    .from('stock').select('*')
    .eq('product_id', order.product_id)
    .is('order_id', null)
    .order('created_at', { ascending: true })
    .limit(order.quantity)

  if (!data || data.length < order.quantity) return null

  const keys = data.slice(0, order.quantity)
  for (const k of keys) {
    await supabase.from('stock')
      .update({ order_id: order.id, used_at: new Date().toISOString() })
      .eq('id', k.id)
  }
  return keys.map(k => k.serial)
}

// ─── Autoload từ Odoo ─────────────────────────────────────────────────────
async function tryAutoloadFromOdoo(supabase, order, orderId) {
  try {
    const { data: product } = await supabase
      .from('products').select('odoo_product_code').eq('id', order.product_id).single()

    const productCode = product?.odoo_product_code
    if (!productCode) return null

    const { serials, pickingId } = await autoloadKeysFromSupplier({
      productCode, quantity: order.quantity, orderId,
    })
    if (!serials?.length) return null

    await supabase.from('stock').insert(
      serials.map(s => ({
        product_id: order.product_id,
        serial:     s,
        order_id:   orderId,
        used_at:    new Date().toISOString(),
        source:     `odoo_picking_${pickingId}`,
      }))
    )

    await supabase.from('autoload_logs').insert({
      order_id:       orderId,
      product_id:     order.product_id,
      product_code:   productCode,
      keys_loaded:    serials.length,
      odoo_picking_id: pickingId,
      status:         'success',
      created_at:     new Date().toISOString(),
    }).catch(() => {})

    return serials
  } catch (err) {
    console.error('[Autoload]', err.message)
    await supabase.from('autoload_logs').insert({
      order_id:     orderId,
      product_id:   order.product_id,
      keys_loaded:  0,
      status:       'error',
      error_message: err.message,
      created_at:   new Date().toISOString(),
    }).catch(() => {})
    return null
  }
}
