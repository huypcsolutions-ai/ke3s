import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

// ─── Activity logger ───────────────────────────────────────────────────────
// Ghi log hoạt động vào table logalls
// uid khách hàng: lấy từ localStorage (tạo mới nếu chưa có)
function getUid() {
  if (typeof window === 'undefined') return 'ssr'
  let uid = localStorage.getItem('m365_uid')
  if (!uid) {
    uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    localStorage.setItem('m365_uid', uid)
  }
  return uid
}

async function logActivity(action, meta = {}) {
  try {
    await supabase.from('logalls').insert({
      uid:     getUid(),
      action,
      meta,
      created_at: new Date().toISOString(),
    })
  } catch (e) {
    // log không ảnh hưởng UX
  }
}

// ─── Product Card ─────────────────────────────────────────────────────────

function getLicenseDetails(productName = '') {
  const name = productName.toLowerCase()

  if (name.includes('family')) {
    return ['6 người dùng', '1 năm · 1TB OneDrive/người', 'Windows, macOS, iOS, Android']
  }
  if (name.includes('personal')) {
    return ['1 người dùng · tối đa 5 thiết bị', '1 năm · 1TB OneDrive', 'Windows, macOS, iOS, Android']
  }
  if (name.includes('business')) {
    return ['Theo số lượng người dùng của gói', 'Theo thời hạn gói · OneDrive for Business', 'Windows, macOS, iOS, Android']
  }
  if (name.includes('2021') || name.includes('pro plus')) {
    return ['1 thiết bị', 'Vĩnh viễn · không kèm OneDrive', 'Windows']
  }
  return ['Thông tin theo mô tả sản phẩm', 'Vui lòng xem mô tả hoặc hỏi tư vấn', 'Kiểm tra tương thích trước khi mua']
}

function ProductCard({ product }) {
  const router = useRouter()
  const licenseDetails = getLicenseDetails(product.name)

  // Dùng forecasted = stock + stock_supplier để hiện còn/hết hàng
  const forecasted = product.forecasted ?? (product.stock + (product.stock_supplier || 0))
  const inStock = forecasted > 0

  // Hiển thị số tồn kho chi tiết (nội bộ + NCC)
  const stockLocal    = product.stock || 0
  const stockSupplier = product.stock_supplier || 0

  function handleBuy() {
    if (!inStock) return
    logActivity('buy_click', { product_code: product.odoo_product_code || product.id, product_name: product.name })
    router.push(`/dat-hang?product=${product.id}`)
  }

  return (
    <div className={`product-card${!inStock ? ' out-of-stock' : ''}`}>
      <div className={`product-badge${!inStock ? ' badge-out' : ''}`}>
        {inStock ? '✓ Còn hàng' : '✗ Hết hàng'}
      </div>

      <div className="product-img">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
        ) : null}
        <div className="product-img-fallback" style={{ display: product.image_url ? 'none' : 'flex' }}>
          💼
        </div>
      </div>

      <div className="product-body">
        <div className="product-name">{product.name}</div>
        <div className="product-desc">{product.description}</div>
        <ul className="product-license-details" aria-label="Thông tin gói bản quyền">
          <li><strong>Người dùng / thiết bị:</strong> {licenseDetails[0]}</li>
          <li><strong>Thời hạn / dung lượng:</strong> {licenseDetails[1]}</li>
          <li><strong>Nền tảng:</strong> {licenseDetails[2]}</li>
        </ul>

        <div className="product-price">
          {new Intl.NumberFormat('vi-VN').format(product.price)}đ
          <span> / key</span>
        </div>

        <div className="product-meta">
          <span>
            <span className="stars">★★★★★</span> 4.7
          </span>
          <span>Đã bán: {(product.sold_count || 0).toLocaleString()}</span>
        </div>

        {/* Hiển thị tồn kho dự báo nhỏ dưới giá */}
        {inStock && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: 12, fontSize: 11.5, color: 'var(--gray-500)'
          }}>
            <span style={{ color: 'var(--teal)', fontWeight: 600 }}>
              ● {forecasted} key sẵn sàng
            </span>
            {stockSupplier > 0 && (
              <span title={`Nội bộ: ${stockLocal} | Nhà cung cấp: ${stockSupplier}`}
                style={{ cursor: 'help', opacity: 0.7 }}>
                ({stockLocal} + {stockSupplier} NCC)
              </span>
            )}
          </div>
        )}

        <button
          className="btn btn-primary"
          disabled={!inStock}
          onClick={handleBuy}
        >
          {inStock ? '🛒 Mua ngay' : 'Tạm hết hàng'}
        </button>

        <div style={{ fontSize: 11.5, color: 'var(--gray-500)', textAlign: 'center', marginTop: 8 }}>
          Đã bán: {(product.sold_count || 0).toLocaleString()} &nbsp;|&nbsp; Đánh giá: ⭐ 4.7
        </div>
      </div>
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div className="product-card" style={{ pointerEvents: 'none' }}>
      <div className="skeleton" style={{ height: 160 }} />
      <div className="product-body">
        <div className="skeleton" style={{ height: 20, marginBottom: 8, width: '70%' }} />
        <div className="skeleton" style={{ height: 14, marginBottom: 4 }} />
        <div className="skeleton" style={{ height: 14, marginBottom: 16, width: '80%' }} />
        <div className="skeleton" style={{ height: 28, marginBottom: 16, width: '50%' }} />
        <div className="skeleton" style={{ height: 40, borderRadius: 8 }} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const logged = useRef(false)

  useEffect(() => {
    // Log page view (1 lần khi mount)
    if (!logged.current) {
      logged.current = true
      logActivity('view', { page: 'home' })
    }

    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, description, image_url, stock, stock_supplier, forecasted, sold_count, odoo_product_code, stock_supplier_synced_at')
        .order('created_at', { ascending: true })

      if (!error) setProducts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <Layout>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              🔐 Bản quyền chính hãng 100% từ Microsoft
            </div>
            <h1>
              Microsoft 365<br />
              Giá tốt · Giao ngay · An tâm dùng
            </h1>
            <p>
              Mua key bản quyền Microsoft 365 chính hãng. Nhận key tức thì qua email sau khi thanh toán.
              Hỗ trợ kích hoạt 24/7.
            </p>
            <div className="hero-stats">
              <div className="stat">
                <div className="stat-num">5,000+</div>
                <div className="stat-label">Khách hàng</div>
              </div>
              <a className="stat stat-link" href="/phan-hoi" title="Liên hệ để hỏi về đánh giá">
                <div className="stat-num">4.7★</div>
                <div className="stat-label">Đánh giá · hỏi thêm</div>
              </a>
              <div className="stat">
                <div className="stat-num">&lt;5 phút</div>
                <div className="stat-label">Giao hàng</div>
              </div>
              <div className="stat">
                <div className="stat-num">24/7</div>
                <div className="stat-label">Hỗ trợ</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PURCHASE STEPS */}
      <section className="purchase-steps" aria-labelledby="purchase-steps-title">
        <div className="container">
          <h2 id="purchase-steps-title">Mua hàng nhanh gọn trong 3 bước</h2>
          <ol className="purchase-steps-list">
            <li><span className="purchase-step-number">1</span><div><strong>Chọn gói & nhập email</strong><span>Chọn sản phẩm phù hợp và điền email nhận key.</span></div></li>
            <li><span className="purchase-step-number">2</span><div><strong>Quét mã QR thanh toán</strong><span>Thanh toán an toàn qua ngân hàng bằng VietQR.</span></div></li>
            <li><span className="purchase-step-number">3</span><div><strong>Nhận key tự động sau 1–5 phút</strong><span>Key được gửi về email sau khi xác nhận thanh toán.</span></div></li>
          </ol>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="trust-bar">
        <div className="container">
          <div className="trust-items">
            <div className="trust-item"><span className="icon">✅</span>Key chính hãng 100%</div>
            <div className="trust-item"><span className="icon">⚡</span>Nhận key trong 5 phút</div>
            <div className="trust-item"><span className="icon">🛡️</span>Bảo hành đổi key miễn phí</div>
            <div className="trust-item"><span className="trust-icon vietqr-mark" aria-hidden="true">VietQR</span>Thanh toán QR an toàn</div>
            <div className="trust-item"><span className="icon" aria-hidden="true">🎧</span>Hỗ trợ kích hoạt 24/7</div>
          </div>
        </div>
      </div>

      {/* PRODUCTS */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="section-title">🛍️ Sản phẩm đang có</div>
            {!loading && products.some(p => p.stock_supplier_synced_at) && (
              <span style={{ fontSize: 11, color: 'var(--gray-500)', fontStyle: 'italic' }}>
                🔄 Tồn kho NCC cập nhật lúc{' '}
                {new Date(
                  Math.max(...products.filter(p => p.stock_supplier_synced_at).map(p => new Date(p.stock_supplier_synced_at)))
                ).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="section-sub">Chọn gói phù hợp với nhu cầu của bạn</div>

          <div className="products-grid">
            {loading
              ? [1, 2, 3, 4].map(i => <ProductSkeleton key={i} />)
              : products.map(p => <ProductCard key={p.id} product={p} />)
            }
            {!loading && products.length === 0 && (
              <p style={{ color: 'var(--gray-500)', gridColumn: '1/-1', textAlign: 'center', padding: '60px 0' }}>
                Chưa có sản phẩm nào. Vui lòng quay lại sau.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* LICENSE COMPARISON */}
      <section className="license-comparison" aria-labelledby="license-comparison-title">
        <div className="container">
          <h2 id="license-comparison-title" className="section-title">So sánh nhanh các gói</h2>
          <p className="section-sub">Chọn theo số người dùng, thời hạn và thiết bị bạn cần.</p>
          <div className="comparison-scroll" role="region" aria-label="Bảng so sánh gói bản quyền" tabIndex="0">
            <table>
              <thead><tr><th scope="col">Gói bản quyền</th><th scope="col">Người dùng / thiết bị</th><th scope="col">Thời hạn / dung lượng</th><th scope="col">Nền tảng</th></tr></thead>
              <tbody>
                <tr><th scope="row">Microsoft 365 Personal</th><td>1 người · tối đa 5 thiết bị</td><td>1 năm · 1TB OneDrive</td><td>Windows, macOS, iOS, Android</td></tr>
                <tr><th scope="row">Microsoft 365 Family</th><td>Tối đa 6 người</td><td>1 năm · 1TB/người</td><td>Windows, macOS, iOS, Android</td></tr>
                <tr><th scope="row">Microsoft 365 Business</th><td>Theo số lượng người dùng</td><td>Theo gói · OneDrive for Business</td><td>Windows, macOS, iOS, Android</td></tr>
                <tr><th scope="row">Office 2021 Pro Plus</th><td>1 thiết bị</td><td>Vĩnh viễn · không kèm OneDrive</td><td>Windows</td></tr>
              </tbody>
            </table>
          </div>
          <p className="comparison-note">Quyền lợi có thể khác nhau theo phiên bản key. Vui lòng kiểm tra mô tả sản phẩm cụ thể trước khi thanh toán.</p>
        </div>
      </section>

      {/* WHY US */}
      <section style={{ background: 'var(--blue-light)', padding: '60px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div className="section-title">🏆 Tại sao chọn M365Keys?</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 24 }}>
            {[
              { icon: '🔐', title: 'Bản quyền chính hãng', desc: 'Key mua trực tiếp từ Microsoft, có thể kiểm tra trạng thái tại bất kỳ lúc nào.' },
              { icon: '⚡', title: 'Giao hàng tức thì', desc: 'Key gửi vào email ngay khi xác nhận thanh toán, không cần chờ đợi.' },
              { icon: '💰', title: 'Giá tốt nhất', desc: 'Cam kết giá thấp hơn store chính thức, không thêm phí ẩn.' },
              { icon: '🎧', title: 'Hỗ trợ 24/7', desc: 'Đội ngũ hỗ trợ sẵn sàng giải đáp mọi thắc mắc qua chat và email.' },
            ].map(item => (
              <div className="card" key={item.title} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{item.title}</div>
                <p style={{ fontSize: 13.5, color: 'var(--gray-500)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  )
}
