/**
 * odooApi.js — Tích hợp Odoo XML-RPC API
 * Dùng để:
 * 1. Kiểm tra tồn kho nhà cung cấp (stock.quant)
 * 2. Tạo phiếu chuyển kho (stock.picking)
 * 3. Lấy serial/lot key từ nhà cung cấp (stock.lot)
 */

const ODOO_URL   = process.env.ODOO_URL            // https://supplier.odoo.com
const ODOO_DB    = process.env.ODOO_DB             // tên database
const ODOO_USER  = process.env.ODOO_USER           // email đăng nhập
const ODOO_PASS  = process.env.ODOO_API_KEY        // API key hoặc mật khẩu

// ─── XML-RPC helper ────────────────────────────────────────────────────────

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
      .map(([k,v]) => `<member><name>${escXml(k)}</name>${xmlValue(v)}</member>`)
      .join('')
    return `<value><struct>${members}</struct></value>`
  }
  return `<value><string>${String(val)}</string></value>`
}

function escXml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
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
  const res  = await fetch(`${ODOO_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body
  })
  if (!res.ok) throw new Error(`Odoo HTTP ${res.status}: ${await res.text()}`)
  const text = await res.text()
  return parseXmlRpc(text)
}

function parseXmlRpc(xml) {
  // Trích xuất giá trị trả về từ XML-RPC response
  if (xml.includes('<fault>')) {
    const msg = xml.match(/<string>(.*?)<\/string>/s)?.[1] || 'Odoo fault'
    throw new Error(`Odoo fault: ${msg}`)
  }
  return parseValue(xml)
}

function parseValue(xml) {
  // int / i4
  let m = xml.match(/<(?:int|i4)>(.*?)<\/(?:int|i4)>/)
  if (m) return parseInt(m[1])

  // boolean
  m = xml.match(/<boolean>(.*?)<\/boolean>/)
  if (m) return m[1] === '1'

  // double
  m = xml.match(/<double>(.*?)<\/double>/)
  if (m) return parseFloat(m[1])

  // string
  m = xml.match(/<string>([\s\S]*?)<\/string>/)
  if (m) return m[1]

  // array
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

  // struct
  if (xml.includes('<struct>')) {
    const obj = {}
    const memberRx = /<member>\s*<name>(.*?)<\/name>\s*<value>([\s\S]*?)<\/value>\s*<\/member>/g
    let mm
    while ((mm = memberRx.exec(xml)) !== null) {
      obj[mm[1]] = parseValue(mm[2])
    }
    return obj
  }

  // nil / empty
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
  if (!_uid) throw new Error('Odoo authentication failed — kiểm tra ODOO_USER / ODOO_API_KEY')
  return _uid
}

async function callOdoo(model, method, args = [], kwargs = {}) {
  const uid = await getUid()
  return xmlRpc('/xmlrpc/2/object', 'execute_kw', [
    ODOO_DB, uid, ODOO_PASS,
    model, method, args, kwargs
  ])
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Kiểm tra tồn kho nhà cung cấp theo product_code (internal reference)
 * @returns {number} số lượng available trong stock.quant
 */
export async function checkSupplierStock(productCode) {
  // Tìm product.product theo default_code
  const productIds = await callOdoo('product.product', 'search', [[
    ['default_code', '=', productCode],
    ['active', '=', true]
  ]])
  if (!productIds?.length) return { available: 0, productId: null }

  const productId = productIds[0]

  // Đọc stock.quant
  const quants = await callOdoo('stock.quant', 'search_read', [[
    ['product_id', '=', productId],
    ['location_id.usage', '=', 'internal']
  ]], {
    fields: ['quantity', 'reserved_quantity', 'location_id']
  })

  const available = quants.reduce((sum, q) => {
    return sum + Math.max(0, (q.quantity || 0) - (q.reserved_quantity || 0))
  }, 0)

  return { available, productId, quants }
}

/**
 * Lấy danh sách lot/serial chưa dùng của sản phẩm
 * Sắp xếp mới nhất (ID lớn nhất) trước
 * @returns {Array<{id, name}>} 
 */
export async function getAvailableLots(productId, limit = 10) {
  // Tìm lot còn trong kho (chưa xuất)
  const lotIds = await callOdoo('stock.lot', 'search', [[
    ['product_id', '=', productId],
    ['product_qty', '>', 0]          // còn hàng theo lot
  ]], {
    order: 'id desc',
    limit
  })
  if (!lotIds?.length) return []

  const lots = await callOdoo('stock.lot', 'read', [lotIds], {
    fields: ['id', 'name', 'product_id', 'product_qty', 'ref']
  })

  return lots
}

/**
 * Tạo phiếu chuyển kho (stock.picking) tại nhà cung cấp
 * Picking type: outgoing từ kho nhà cung cấp → customer location
 * @returns {number} picking_id
 */
export async function createSupplierTransfer({ productId, lotIds, quantity, orderId, note }) {
  // Tìm picking type "Delivery Orders" (outgoing) của nhà cung cấp
  const pickingTypes = await callOdoo('stock.picking.type', 'search_read', [[
    ['code', '=', 'outgoing'],
    ['active', '=', true]
  ]], { fields: ['id', 'name', 'default_location_src_id', 'default_location_dest_id'], limit: 1 })

  if (!pickingTypes?.length) throw new Error('Không tìm thấy picking type outgoing trong Odoo')

  const pickingType = pickingTypes[0]

  // Tạo picking
  const pickingId = await callOdoo('stock.picking', 'create', [{
    picking_type_id: pickingType.id,
    origin: `M365Keys-${orderId}`,
    note: note || `Auto transfer for order ${orderId}`,
    move_ids_without_package: [[0, 0, {
      product_id: productId,
      product_uom_qty: quantity,
      name: `Auto transfer for order ${orderId}`,
      product_uom: 1  // Unit
    }]]
  }])

  if (!pickingId) throw new Error('Không thể tạo phiếu chuyển kho Odoo')

  // Validate picking (xác nhận)
  await callOdoo('stock.picking', 'action_confirm', [[pickingId]])

  // Gán lot/serial vào move lines
  const moveLines = await callOdoo('stock.move.line', 'search_read', [[
    ['picking_id', '=', pickingId]
  ]], { fields: ['id'] })

  if (moveLines?.length && lotIds?.length) {
    for (let i = 0; i < Math.min(moveLines.length, lotIds.length); i++) {
      await callOdoo('stock.move.line', 'write', [
        [moveLines[i].id],
        { lot_id: lotIds[i], qty_done: 1 }
      ])
    }
  }

  // Validate (Done)
  try {
    await callOdoo('stock.picking', 'button_validate', [[pickingId]])
  } catch (e) {
    // Một số version Odoo có wizard confirm, bỏ qua lỗi này
    console.warn('Validate picking warning (may need manual confirm):', e.message)
  }

  return pickingId
}

/**
 * Full flow: kiểm tra → tạo phiếu → trả về danh sách serial key
 * @param {string} productCode  — mã sản phẩm (default_code trong Odoo)
 * @param {number} quantity     — số lượng cần
 * @param {string} orderId      — mã đơn hàng để ghi vào origin
 * @returns {string[]} mảng serial key
 */
export async function autoloadKeysFromSupplier({ productCode, quantity, orderId }) {
  console.log(`[Odoo Autoload] Checking supplier stock for: ${productCode}, qty: ${quantity}`)

  // 1. Kiểm tra tồn kho
  const { available, productId } = await checkSupplierStock(productCode)
  console.log(`[Odoo Autoload] Available: ${available}, productId: ${productId}`)

  if (!productId) throw new Error(`Không tìm thấy sản phẩm "${productCode}" trong Odoo nhà cung cấp`)
  if (available < quantity) throw new Error(`Nhà cung cấp chỉ còn ${available} key, cần ${quantity}`)

  // 2. Lấy lot/serial mới nhất
  const lots = await getAvailableLots(productId, quantity)
  console.log(`[Odoo Autoload] Found ${lots.length} lots`)

  if (lots.length < quantity) throw new Error(`Không đủ lot/serial trong Odoo (còn ${lots.length})`)

  const selectedLots = lots.slice(0, quantity)
  const lotIds = selectedLots.map(l => l.id)
  const serials = selectedLots.map(l => l.name)  // lot name = serial key

  // 3. Tạo phiếu chuyển kho
  const pickingId = await createSupplierTransfer({
    productId,
    lotIds,
    quantity,
    orderId,
    note: `Autoload for M365Keys order ${orderId}`
  })
  console.log(`[Odoo Autoload] Transfer created: picking #${pickingId}`)

  return { serials, pickingId, lotIds }
}
