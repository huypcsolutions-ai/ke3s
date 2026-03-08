/**
 * odooApi.js — Tích hợp Odoo XML-RPC API
 * Chức năng:
 * 1. Kiểm tra tồn kho nhà cung cấp (stock.quant) — location ILIKE 'sale'
 * 2. Sync stock_supplier định kỳ cho tất cả sản phẩm
 * 3. Tạo phiếu chuyển kho (stock.picking) khi autoload
 * 4. Lấy serial/lot key từ nhà cung cấp (stock.lot)
 */

const ODOO_URL  = process.env.ODOO_URL      // https://supplier.odoo.com
const ODOO_DB   = process.env.ODOO_DB       // tên database
const ODOO_USER = process.env.ODOO_USER     // email đăng nhập
const ODOO_PASS = process.env.ODOO_API_KEY  // API key hoặc mật khẩu

// ─── XML-RPC helpers ───────────────────────────────────────────────────────

function xmlValue(val) {
  if (val === null || val === undefined) return '<value><boolean>0</boolean></value>'
  if (typeof val === 'boolean')  return `<value><boolean>${val ? 1 : 0}</boolean></value>`
  if (typeof val === 'number' && Number.isInteger(val)) return `<value><int>${val}</int></value>`
  if (typeof val === 'number')   return `<value><double>${val}</double></value>`
  if (typeof val === 'string')   return `<value><string>${escXml(val)}</string></value>`
  if (Array.isArray(val)) {
    return `<value><array><data>${val.map(xmlValue).join('')}</data></array></value>`
  }
  if (typeof val === 'object') {
    const members = Object.entries(val)
      .map(([k, v]) => `<member><name>${escXml(k)}</name>${xmlValue(v)}</member>`)
      .join('')
    return `<value><struct>${members}</struct></value>`
  }
  return `<value><string>${String(val)}</string></value>`
}

function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildCall(method, params) {
  return `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>${params.map(p => `<param>${xmlValue(p)}</param>`).join('')}</params>
</methodCall>`
}

async function xmlRpc(endpoint, method, params) {
  const body = buildCall(method, params)
  const res = await fetch(`${ODOO_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body,
  })
  if (!res.ok) throw new Error(`Odoo HTTP ${res.status}: ${await res.text()}`)
  const text = await res.text()
  return parseXmlRpc(text)
}

function parseXmlRpc(xml) {
  if (xml.includes('<fault>')) {
    const msg = xml.match(/<string>(.*?)<\/string>/s)?.[1] || 'Odoo fault'
    throw new Error(`Odoo fault: ${msg}`)
  }
  return parseValue(xml)
}

function parseValue(xml) {
  let m
  m = xml.match(/<(?:int|i4)>(.*?)<\/(?:int|i4)>/)
  if (m) return parseInt(m[1])

  m = xml.match(/<boolean>(.*?)<\/boolean>/)
  if (m) return m[1] === '1'

  m = xml.match(/<double>(.*?)<\/double>/)
  if (m) return parseFloat(m[1])

  m = xml.match(/<string>([\s\S]*?)<\/string>/)
  if (m) return m[1]

  if (xml.includes('<array>')) {
    const dataMatch = xml.match(/<array>\s*<data>([\s\S]*?)<\/data>\s*<\/array>/)
    if (dataMatch) {
      const items = []
      const valueRx = /<value>([\s\S]*?)<\/value>/g
      let vm
      while ((vm = valueRx.exec(dataMatch[1])) !== null) {
        items.push(parseValue(vm[1]))
      }
      return items
    }
  }

  if (xml.includes('<struct>')) {
    const obj = {}
    const memberRx = /<member>\s*<name>(.*?)<\/name>\s*<value>([\s\S]*?)<\/value>\s*<\/member>/g
    let mm
    while ((mm = memberRx.exec(xml)) !== null) {
      obj[mm[1]] = parseValue(mm[2])
    }
    return obj
  }

  if (xml.includes('<nil/>') || xml.trim() === '') return null
  return xml
}

// ─── Auth ──────────────────────────────────────────────────────────────────

let _uid = null

async function getUid() {
  if (_uid) return _uid
  _uid = await xmlRpc('/xmlrpc/2/common', 'authenticate', [
    ODOO_DB, ODOO_USER, ODOO_PASS, {}
  ])
  if (!_uid) throw new Error('Odoo auth failed — kiểm tra ODOO_USER / ODOO_API_KEY')
  return _uid
}

async function callOdoo(model, method, args = [], kwargs = {}) {
  const uid = await getUid()
  return xmlRpc('/xmlrpc/2/object', 'execute_kw', [
    ODOO_DB, uid, ODOO_PASS,
    model, method, args, kwargs,
  ])
}

// ─── Stock check ───────────────────────────────────────────────────────────

/**
 * Kiểm tra tồn kho NCC theo product_code (default_code / Internal Reference).
 * Lọc stock.quant tại location có complete_name ILIKE '%sale%'
 * HOẶC location.usage = 'internal' (bắt tất cả kho nội bộ).
 *
 * @param {string} productCode - Odoo Internal Reference
 * @returns {{ available: number, onHand: number, reserved: number,
 *             productId: number|null, quants: array }}
 */
export async function checkSupplierStock(productCode) {
  // 1. Tìm product.product
  const productIds = await callOdoo('product.product', 'search', [[
    ['default_code', '=', productCode],
    ['active', '=', true],
  ]])
  if (!productIds?.length) return { available: 0, onHand: 0, reserved: 0, productId: null, quants: [] }

  const productId = productIds[0]

  // 2. Lấy quants — location ILIKE 'sale' OR usage = internal
  const quants = await callOdoo('stock.quant', 'search_read', [[
    ['product_id', '=', productId],
    '|',
    ['location_id.complete_name', 'ilike', 'sale'],
    ['location_id.usage', '=', 'internal'],
  ]], {
    fields: ['quantity', 'reserved_quantity', 'location_id'],
  })

  const onHand   = quants.reduce((s, q) => s + Math.max(0, q.quantity || 0), 0)
  const reserved = quants.reduce((s, q) => s + Math.max(0, q.reserved_quantity || 0), 0)
  const available = Math.max(0, onHand - reserved)

  return { available, onHand, reserved, productId, quants }
}

// ─── Bulk sync (cron) ──────────────────────────────────────────────────────

/**
 * Sync stock_supplier cho TẤT CẢ sản phẩm có odoo_product_code.
 * Gọi từ cron API /api/cron-sync-stock (Vercel Cron Jobs, mỗi 1h).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - service role client
 * @returns {{ synced: number, details: object, errors: object }}
 */
export async function syncAllSupplierStock(supabase) {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, odoo_product_code')
    .not('odoo_product_code', 'is', null)
    .neq('odoo_product_code', '')

  if (error) throw new Error(`Fetch products failed: ${error.message}`)
  if (!products?.length) return { synced: 0, details: {}, errors: {} }

  const details = {}
  const errors  = {}
  let synced = 0

  for (const product of products) {
    try {
      const { available } = await checkSupplierStock(product.odoo_product_code)

      const { error: upErr } = await supabase
        .from('products')
        .update({
          stock_supplier:           available,
          stock_supplier_synced_at: new Date().toISOString(),
        })
        .eq('id', product.id)

      if (upErr) throw new Error(upErr.message)

      details[product.odoo_product_code] = available
      synced++
      console.log(`[StockSync] ${product.name} (${product.odoo_product_code}) → ${available}`)
    } catch (err) {
      console.error(`[StockSync] Error ${product.odoo_product_code}:`, err.message)
      errors[product.odoo_product_code] = err.message
    }
  }

  return { synced, details, errors }
}

// ─── Lots ──────────────────────────────────────────────────────────────────

/**
 * Lấy danh sách lot/serial khả dụng (mới nhất trước).
 */
export async function getAvailableLots(productId, limit = 10) {
  const lotIds = await callOdoo('stock.lot', 'search', [[
    ['product_id', '=', productId],
    ['product_qty', '>', 0],
  ]], { order: 'id desc', limit })

  if (!lotIds?.length) return []

  return callOdoo('stock.lot', 'read', [lotIds], {
    fields: ['id', 'name', 'product_id', 'product_qty', 'ref'],
  })
}

// ─── Transfer ─────────────────────────────────────────────────────────────

/**
 * Tạo và validate phiếu chuyển kho (stock.picking) outgoing.
 */
export async function createSupplierTransfer({ productId, lotIds, quantity, orderId, note }) {
  const pickingTypes = await callOdoo('stock.picking.type', 'search_read', [[
    ['code', '=', 'outgoing'],
    ['active', '=', true],
  ]], { fields: ['id', 'name', 'default_location_src_id', 'default_location_dest_id'], limit: 1 })

  if (!pickingTypes?.length) throw new Error('Không tìm thấy picking type outgoing')

  const pickingId = await callOdoo('stock.picking', 'create', [{
    picking_type_id: pickingTypes[0].id,
    origin: `M365Keys-${orderId}`,
    note: note || `Auto transfer for order ${orderId}`,
    move_ids_without_package: [[0, 0, {
      product_id:      productId,
      product_uom_qty: quantity,
      name:            `Auto transfer for order ${orderId}`,
      product_uom:     1,
    }]],
  }])

  if (!pickingId) throw new Error('Không tạo được picking Odoo')

  await callOdoo('stock.picking', 'action_confirm', [[pickingId]])

  const moveLines = await callOdoo('stock.move.line', 'search_read', [[
    ['picking_id', '=', pickingId],
  ]], { fields: ['id'] })

  if (moveLines?.length && lotIds?.length) {
    for (let i = 0; i < Math.min(moveLines.length, lotIds.length); i++) {
      await callOdoo('stock.move.line', 'write', [
        [moveLines[i].id],
        { lot_id: lotIds[i], qty_done: 1 },
      ])
    }
  }

  try {
    await callOdoo('stock.picking', 'button_validate', [[pickingId]])
  } catch (e) {
    console.warn('Validate picking warning:', e.message)
  }

  return pickingId
}

// ─── Full autoload flow ───────────────────────────────────────────────────

/**
 * Full flow khi autoload: check NCC → lấy lots → tạo picking → trả serials.
 */
export async function autoloadKeysFromSupplier({ productCode, quantity, orderId }) {
  console.log(`[Autoload] ${productCode} qty=${quantity}`)

  const { available, productId } = await checkSupplierStock(productCode)
  if (!productId) throw new Error(`Không tìm thấy "${productCode}" trong Odoo NCC`)
  if (available < quantity) throw new Error(`NCC còn ${available}, cần ${quantity}`)

  const lots = await getAvailableLots(productId, quantity)
  if (lots.length < quantity) throw new Error(`Không đủ lot (còn ${lots.length})`)

  const selected = lots.slice(0, quantity)
  const lotIds   = selected.map(l => l.id)
  const serials  = selected.map(l => l.name)

  const pickingId = await createSupplierTransfer({ productId, lotIds, quantity, orderId })
  console.log(`[Autoload] Picking #${pickingId} created`)

  return { serials, pickingId, lotIds }
}
