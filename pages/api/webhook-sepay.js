import { getServiceClient } from '../../lib/supabase'
import { sendKeyEmail } from '../../lib/email'
import { getSetting, SETTING_AUTOLOAD_ENABLED } from '../../lib/settings'
import { autoloadKeysFromSupplier } from '../../lib/odooApi'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = getServiceClient()

  try {
    const body = req.body
    console.log('[Webhook] SePay received:', JSON.stringify(body))

    const { transferAmount, content, referenceCode, transferType } = body

    if (transferType !== 'in' && body.type !== 'in') {
      return res.status(200).json({ success: true, message: 'Ignored outgoing transaction' })
    }

    const contentStr = content || ''
    const match = contentStr.match(/M365Keys\s+([A-Z0-9]+)/i)
    if (!match) {
      return res.status(200).json({ success: true, message: 'No matching order in content' })
    }

    const orderId = match[1].toUpperCase()
    console.log('[Webhook] Processing order:', orderId)

    const { data: order, error: orderError } = await supabase
      .from('orders').select('*').eq('id', orderId).single()

    if (orderError || !order) {
      return res.status(200).json({ success: true, message: 'Order not found' })
    }

    if (order.payment_status === 'completed') {
      return res.status(200).json({ success: true, message: 'Order already completed' })
    }

    const receivedAmount = parseFloat(transferAmount)
    if (receivedAmount < order.total_amount * 0.99) {
      return res.status(200).json({ success: true, message: 'Amount mismatch' })
    }

    // Lấy key từ kho nội bộ
    let keyValues = await getKeysFromLocalStock(supabase, order)

    // Nếu không đủ → thử autoload từ Odoo
    if (!keyValues) {
      const autoloadEnabled = await getSetting(SETTING_AUTOLOAD_ENABLED)
      if (autoloadEnabled === 'true') {
        console.log('[Webhook] Local stock empty — trying Odoo autoload...')
        keyValues = await tryAutoloadFromOdoo(supabase, order, orderId)
      }

      if (!keyValues) {
        await supabase.from('orders').update({
          payment_status: 'completed',
          payment_ref: referenceCode,
          paid_at: new Date().toISOString(),
          note: (order.note || '') + '\n[STOCK_EMPTY]'
        }).eq('id', orderId)
        return res.status(200).json({ success: true, message: 'Payment received but no stock' })
      }
    }

    await supabase.from('orders').update({
      payment_status: 'completed',
      payment_ref: referenceCode,
      paid_at: new Date().toISOString()
    }).eq('id', orderId)

    const { data: prod } = await supabase.from('products').select('stock, sold_count').eq('id', order.product_id).single()
    if (prod) {
      await supabase.from('products').update({
        stock: Math.max(0, (prod.stock || 0) - order.quantity),
        sold_count: (prod.sold_count || 0) + order.quantity
      }).eq('id', order.product_id)
    }

    try {
      await sendKeyEmail({
        to: order.customer_email,
        customerName: order.customer_name,
        orderId,
        productName: order.product_name,
        keys: keyValues,
        totalAmount: order.total_amount
      })
    } catch (emailError) {
      console.error('[Webhook] Email failed:', emailError)
    }

    return res.status(200).json({ success: true, orderId, keysDelivered: keyValues.length })

  } catch (err) {
    console.error('[Webhook] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function getKeysFromLocalStock(supabase, order) {
  const { data: stockItems } = await supabase
    .from('stock').select('*')
    .eq('product_id', order.product_id)
    .is('order_id', null)
    .order('created_at', { ascending: true })
    .limit(order.quantity)

  if (!stockItems || stockItems.length < order.quantity) return null

  for (const k of stockItems.slice(0, order.quantity)) {
    await supabase.from('stock').update({ order_id: order.id, used_at: new Date().toISOString() }).eq('id', k.id)
  }
  return stockItems.slice(0, order.quantity).map(k => k.serial)
}

async function tryAutoloadFromOdoo(supabase, order, orderId) {
  try {
    const { data: product } = await supabase
      .from('products').select('odoo_product_code').eq('id', order.product_id).single()

    const productCode = product?.odoo_product_code
    if (!productCode) { console.warn('[Odoo] No odoo_product_code for product', order.product_id); return null }

    const { serials, pickingId } = await autoloadKeysFromSupplier({ productCode, quantity: order.quantity, orderId })
    if (!serials?.length) return null

    const stockRows = serials.map(s => ({
      product_id: order.product_id,
      serial: s,
      order_id: orderId,
      used_at: new Date().toISOString(),
      source: `odoo_picking_${pickingId}`
    }))

    const { error } = await supabase.from('stock').insert(stockRows)
    if (error) { console.error('[Odoo] Insert keys failed:', error); return null }

    await supabase.from('autoload_logs').insert({
      order_id: orderId, product_id: order.product_id, product_code: productCode,
      keys_loaded: serials.length, odoo_picking_id: pickingId, status: 'success',
      created_at: new Date().toISOString()
    }).catch(() => {})

    console.log(`[Odoo] Autoloaded ${serials.length} keys, picking #${pickingId}`)
    return serials

  } catch (err) {
    console.error('[Odoo] Autoload error:', err.message)
    await supabase.from('autoload_logs').insert({
      order_id: orderId, product_id: order.product_id, keys_loaded: 0,
      status: 'error', error_message: err.message, created_at: new Date().toISOString()
    }).catch(() => {})
    return null
  }
}
