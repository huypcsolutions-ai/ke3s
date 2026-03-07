import { checkSupplierStock } from '../../lib/odooApi'
import { getSetting } from '../../lib/settings'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_change_me'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = req.headers['x-admin-secret']
  if (auth !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' })

  const { productCode } = req.body

  try {
    const result = await checkSupplierStock(productCode || 'TEST')
    return res.status(200).json({
      success: true,
      message: 'Kết nối Odoo thành công',
      result
    })
  } catch (err) {
    return res.status(200).json({
      success: false,
      message: err.message
    })
  }
}
