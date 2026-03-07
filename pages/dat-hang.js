import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { showToast } from '../lib/toast'

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePhone(phone) {
  return /^(0|\+84)[3-9][0-9]{8}$/.test(phone.replace(/\s/g, ''))
}

function generateOrderId() {
  const now = Date.now()
  const base36 = now.toString(36).toUpperCase()
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `${base36}${rand}`
}

export default function DatHang() {
  const router = useRouter()
  const { product: productId } = router.query

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [discountCode, setDiscountCode] = useState('')
  const [discountInfo, setDiscountInfo] = useState(null)
  const [checkingDiscount, setCheckingDiscount] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '', email: '', phone: '', note: ''
  })

  useEffect(() => {
    if (!productId) return
    async function load() {
      const { data } = await supabase.from('products').select('*').eq('id', productId).single()
      setProduct(data)
      setLoading(false)
    }
    load()
  }, [productId])

  const unitPrice = product?.price || 0
  const subtotal = unitPrice * qty
  const discountAmt = discountInfo
    ? (discountInfo.discount_type === 'percent'
        ? Math.round(subtotal * discountInfo.discount_amount / 100)
        : discountInfo.discount_amount)
    : 0
  const total = Math.max(0, subtotal - discountAmt)

  async function handleCheckDiscount() {
    if (!discountCode.trim()) return
    setCheckingDiscount(true)
    setDiscountInfo(null)

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .eq('code', discountCode.trim().toUpperCase())
      .is('order_id', null)
      .or('status.is.null,status.eq.')
      .gte('expires_at', now)
      .single()

    if (!error && data) {
      // Check product_id match (nếu có)
      if (data.product_id && data.product_id !== productId) {
        showToast('Mã giảm giá không áp dụng cho sản phẩm này', 'error')
        setCheckingDiscount(false)
        return
      }

      // Set pending
      await supabase.from('discounts').update({ status: 'pending' }).eq('id', data.id)

      setDiscountInfo(data)
      showToast(`✅ Áp dụng mã thành công! Giảm ${data.discount_type === 'percent' ? data.discount_amount + '%' : new Intl.NumberFormat('vi-VN').format(data.discount_amount) + 'đ'}`, 'success')
    } else {
      showToast('Mã giảm giá không hợp lệ hoặc đã hết hạn', 'error')
    }
    setCheckingDiscount(false)
  }

  function focusField(id) {
    setTimeout(() => {
      const el = document.getElementById(id)
      el?.focus()
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  async function handleSubmit() {
    if (!validateEmail(form.email)) {
      showToast('Email không hợp lệ. Vui lòng kiểm tra lại.', 'error')
      focusField('input-email')
      return
    }
    if (form.phone && !validatePhone(form.phone)) {
      showToast('Số điện thoại không hợp lệ', 'error')
      focusField('input-phone')
      return
    }

    setSubmitting(true)
    const orderId = generateOrderId()

    const orderData = {
      id: orderId,
      customer_name: form.name,
      customer_email: form.email,
      customer_phone: form.phone,
      product_id: product.id,
      product_name: product.name,
      quantity: qty,
      unit_price: unitPrice,
      discount_code: discountInfo ? discountCode.toUpperCase() : null,
      discount_amount: discountAmt,
      total_amount: total,
      payment_status: 'pending',
      note: form.note
    }

    const { error } = await supabase.from('orders').insert(orderData)

    if (error) {
      showToast('Lỗi tạo đơn hàng. Vui lòng thử lại.', 'error')
      setSubmitting(false)
      return
    }

    // Cập nhật discount order_id
    if (discountInfo) {
      await supabase.from('discounts')
        .update({ order_id: orderId, status: 'used' })
        .eq('id', discountInfo.id)
    }

    router.push(`/thanh-toan?order=${orderId}&amount=${total}`)
  }

  if (loading) {
    return (
      <Layout title="Đặt hàng">
        <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p>Đang tải...</p>
        </div>
      </Layout>
    )
  }

  if (!product) {
    return (
      <Layout title="Đặt hàng">
        <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p>Không tìm thấy sản phẩm. <a href="/">Quay lại trang chủ</a></p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={`Đặt hàng - ${product.name}`}>
      <div className="container" style={{ padding: '40px 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <a href="/" style={{ color: 'var(--gray-500)', textDecoration: 'none', fontSize: 14 }}>← Quay lại</a>
          <h2 style={{ fontFamily: 'Syne', fontSize: 24, marginTop: 8 }}>🛒 Đặt hàng</h2>
        </div>

        <div className="order-layout">
          {/* LEFT: Order form */}
          <div>
            {/* Product summary */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: 'var(--gray-700)' }}>📦 Thông tin sản phẩm</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{
                  width: 72, height: 72, background: 'var(--blue-light)',
                  borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, flexShrink: 0
                }}>
                  {product.image_url
                    ? <img src={product.image_url} alt="" style={{ width: 50, height: 50, objectFit: 'contain' }} />
                    : '💼'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{product.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--gray-500)', lineHeight: 1.6, marginBottom: 8 }}>{product.description}</div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, color: 'var(--blue)', fontSize: 18 }}>
                    {new Intl.NumberFormat('vi-VN').format(product.price)}đ / key
                  </div>
                </div>
              </div>

              {/* Qty */}
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Số lượng:</span>
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                  <input
                    className="qty-val"
                    type="number"
                    min="1"
                    max={product.stock}
                    value={qty}
                    onChange={e => setQty(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                  />
                  <button className="qty-btn" onClick={() => setQty(q => Math.min(product.stock, q + 1))}>+</button>
                </div>
                <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Còn {product.stock} key</span>
              </div>
            </div>

            {/* Discount code */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: 'var(--gray-700)' }}>🏷️ Mã giảm giá</div>
              <div className="discount-row">
                <input
                  className="form-input"
                  placeholder="Nhập mã giảm giá (nếu có)"
                  value={discountCode}
                  onChange={e => { setDiscountCode(e.target.value); setDiscountInfo(null) }}
                  style={{ textTransform: 'uppercase' }}
                />
                <button
                  className="btn btn-outline"
                  onClick={handleCheckDiscount}
                  disabled={checkingDiscount || !discountCode.trim()}
                >
                  {checkingDiscount ? '...' : 'Kiểm tra'}
                </button>
              </div>
              {discountInfo && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--teal-light)', borderRadius: 6, fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>
                  ✅ Mã hợp lệ — Giảm {discountInfo.discount_type === 'percent' ? discountInfo.discount_amount + '%' : new Intl.NumberFormat('vi-VN').format(discountInfo.discount_amount) + 'đ'}
                </div>
              )}
            </div>

            {/* Customer info */}
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, color: 'var(--gray-700)' }}>👤 Thông tin khách hàng</div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-email">
                  Email <span className="required">*</span>
                </label>
                <span className="form-note">Email dùng để nhận thông tin kích hoạt sản phẩm, vui lòng kiểm tra.</span>
                <input
                  id="input-email"
                  className={`form-input${form.email && !validateEmail(form.email) ? ' error' : ''}`}
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-name">Họ và tên</label>
                <input
                  id="input-name"
                  className="form-input"
                  placeholder="Nguyễn Văn A"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-phone">Số điện thoại</label>
                <input
                  id="input-phone"
                  className={`form-input${form.phone && !validatePhone(form.phone) ? ' error' : ''}`}
                  type="tel"
                  placeholder="0912345678"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú</label>
                <textarea
                  className="form-textarea"
                  placeholder="Ghi chú thêm (nếu có)..."
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Price summary + CTA */}
          <div>
            <div className="card" style={{ position: 'sticky', top: 80 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, color: 'var(--gray-700)' }}>💰 Tổng đơn hàng</div>

              <div className="price-summary">
                <div className="price-row">
                  <span>Đơn giá</span>
                  <span>{new Intl.NumberFormat('vi-VN').format(unitPrice)}đ</span>
                </div>
                <div className="price-row">
                  <span>Số lượng</span>
                  <span>× {qty}</span>
                </div>
                <div className="price-row">
                  <span>Tạm tính</span>
                  <span>{new Intl.NumberFormat('vi-VN').format(subtotal)}đ</span>
                </div>
                {discountAmt > 0 && (
                  <div className="price-row discount">
                    <span>🏷️ Giảm giá</span>
                    <span>−{new Intl.NumberFormat('vi-VN').format(discountAmt)}đ</span>
                  </div>
                )}
                <div className="price-row total">
                  <span>Tổng thanh toán</span>
                  <span>{new Intl.NumberFormat('vi-VN').format(total)}đ</span>
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={submitting || !form.email}
                style={{ width: '100%' }}
              >
                {submitting ? '⏳ Đang xử lý...' : '💳 Tiến hành thanh toán'}
              </button>

              <div style={{ marginTop: 16, padding: 12, background: 'var(--gray-50)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.7 }}>
                  🔒 Thanh toán an toàn qua VietQR<br />
                  📧 Key gửi về email sau khi thanh toán<br />
                  🔄 Hỗ trợ đổi key nếu có lỗi
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
