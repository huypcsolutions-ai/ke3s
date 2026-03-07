import { getServiceClient } from '../../lib/supabase'
import { sendKeyEmail } from '../../lib/email'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = getServiceClient()

  try {
    const body = req.body
    console.log('SePay webhook received:', JSON.stringify(body))

    // Xác thực webhook từ SePay
    // SePay gửi: transferAmount, content, referenceCode, ...
    const {
      transferAmount,
      content,
      referenceCode,
      transferType
    } = body

    // Chỉ xử lý giao dịch nhận tiền (IN)
    if (transferType !== 'in' && body.type !== 'in') {
      return res.status(200).json({ success: true, message: 'Ignored outgoing transaction' })
    }

    // Tìm mã đơn hàng trong nội dung chuyển khoản
    // Nội dung format: "M365Keys ORDERID"
    const contentStr = content || ''
    const match = contentStr.match(/M365Keys\s+([A-Z0-9]+)/i)
    
    if (!match) {
      console.log('No order ID found in content:', contentStr)
      return res.status(200).json({ success: true, message: 'No matching order in content' })
    }

    const orderId = match[1].toUpperCase()
    console.log('Processing order:', orderId)

    // Lấy đơn hàng
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.log('Order not found:', orderId)
      return res.status(200).json({ success: true, message: 'Order not found' })
    }

    // Kiểm tra đã thanh toán chưa
    if (order.payment_status === 'completed') {
      return res.status(200).json({ success: true, message: 'Order already completed' })
    }

    // Kiểm tra số tiền (cho phép sai lệch nhỏ do phí)
    const expectedAmount = order.total_amount
    const receivedAmount = parseFloat(transferAmount)
    
    if (receivedAmount < expectedAmount * 0.99) {
      console.log(`Amount mismatch: expected ${expectedAmount}, received ${receivedAmount}`)
      return res.status(200).json({ success: true, message: 'Amount mismatch' })
    }

    // Lấy key từ kho stock
    const { data: stockItems, error: stockError } = await supabase
      .from('stock')
      .select('*')
      .eq('product_id', order.product_id)
      .is('order_id', null)
      .limit(order.quantity)

    if (stockError || !stockItems || stockItems.length < order.quantity) {
      console.error('Not enough stock:', stockError, stockItems?.length, 'needed:', order.quantity)
      // Vẫn mark là completed nhưng gửi email thông báo hết key
      await supabase.from('orders').update({
        payment_status: 'completed',
        payment_ref: referenceCode,
        paid_at: new Date().toISOString(),
        note: (order.note || '') + '\n[STOCK_EMPTY]'
      }).eq('id', orderId)
      return res.status(200).json({ success: true, message: 'Payment received but stock empty' })
    }

    // Lấy đúng số lượng key
    const keys = stockItems.slice(0, order.quantity)
    const keyValues = keys.map(k => k.serial)

    // Update stock - gán order_id cho từng key
    for (const k of keys) {
      await supabase.from('stock').update({
        order_id: orderId,
        used_at: new Date().toISOString()
      }).eq('id', k.id)
    }

    // Cập nhật đơn hàng thành completed
    await supabase.from('orders').update({
      payment_status: 'completed',
      payment_ref: referenceCode,
      paid_at: new Date().toISOString()
    }).eq('id', orderId)

    // Giảm stock count trong products
    await supabase.rpc('decrement_stock', {
      product_id: order.product_id,
      amount: order.quantity
    }).catch(() => {
      // Fallback nếu function chưa có
      supabase.from('products')
        .update({ stock: supabase.raw(`stock - ${order.quantity}`) })
        .eq('id', order.product_id)
    })

    // Tăng sold_count
    const { data: prod } = await supabase.from('products').select('sold_count').eq('id', order.product_id).single()
    if (prod) {
      await supabase.from('products').update({ sold_count: (prod.sold_count || 0) + order.quantity }).eq('id', order.product_id)
    }

    // Gửi email
    try {
      await sendKeyEmail({
        to: order.customer_email,
        customerName: order.customer_name,
        orderId,
        productName: order.product_name,
        keys: keyValues,
        totalAmount: order.total_amount
      })
      console.log('Email sent to:', order.customer_email)
    } catch (emailError) {
      console.error('Email failed:', emailError)
      // Không fail webhook vì email lỗi
    }

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      orderId,
      keysDelivered: keyValues.length
    })

  } catch (err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
