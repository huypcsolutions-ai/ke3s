import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { code, productId } = req.body
  if (!code) return res.status(400).json({ error: 'Missing code' })

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('discounts')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .is('order_id', null)
    .or('status.is.null,status.eq.')
    .gte('expires_at', now)
    .single()

  if (error || !data) {
    return res.status(200).json({ valid: false, message: 'Mã không hợp lệ hoặc đã hết hạn' })
  }

  if (data.product_id && productId && data.product_id !== productId) {
    return res.status(200).json({ valid: false, message: 'Mã không áp dụng cho sản phẩm này' })
  }

  return res.status(200).json({
    valid: true,
    discount: {
      id: data.id,
      code: data.code,
      discount_amount: data.discount_amount,
      discount_type: data.discount_type,
      expires_at: data.expires_at
    }
  })
}
