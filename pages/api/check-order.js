import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  const { orderId } = req.query
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' })

  const { data, error } = await supabase
    .from('orders')
    .select('id, payment_status, paid_at, total_amount, product_name, quantity')
    .eq('id', orderId)
    .single()

  if (error) return res.status(404).json({ error: 'Order not found' })

  return res.status(200).json(data)
}
