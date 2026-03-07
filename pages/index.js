import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

function ProductCard({ product }) {
  const router = useRouter()
  const inStock = product.stock > 0

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
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
          />
        ) : null}
        <div className="product-img-fallback" style={{ display: product.image_url ? 'none' : 'flex' }}>
          💼
        </div>
      </div>
      
      <div className="product-body">
        <div className="product-name">{product.name}</div>
        <div className="product-desc">{product.description}</div>
        
        <div className="product-price">
          {new Intl.NumberFormat('vi-VN').format(product.price)}đ
          <span> / key</span>
        </div>
        
        <div className="product-meta">
          <span>
            <span className="stars">★★★★★</span> 4.9
          </span>
          <span>Đã bán: {(product.sold_count || 0).toLocaleString()}</span>
        </div>
        
        <button
          className="btn btn-primary"
          disabled={!inStock}
          onClick={() => inStock && router.push(`/dat-hang?product=${product.id}`)}
        >
          {inStock ? '🛒 Mua ngay' : 'Tạm hết hàng'}
        </button>
        
        <div style={{ fontSize: 11.5, color: 'var(--gray-500)', textAlign: 'center', marginTop: 8 }}>
          Đã bán: {(product.sold_count || 0).toLocaleString()} &nbsp;|&nbsp; Đánh giá: ⭐ 4.9
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

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
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
              <div className="stat">
                <div className="stat-num">4.9★</div>
                <div className="stat-label">Đánh giá</div>
              </div>
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

      {/* TRUST BAR */}
      <div className="trust-bar">
        <div className="container">
          <div className="trust-items">
            <div className="trust-item"><span className="icon">✅</span>Key chính hãng 100%</div>
            <div className="trust-item"><span className="icon">⚡</span>Nhận key trong 5 phút</div>
            <div className="trust-item"><span className="icon">🛡️</span>Bảo hành đổi key miễn phí</div>
            <div className="trust-item"><span className="icon">💳</span>Thanh toán QR an toàn</div>
            <div className="trust-item"><span className="icon">🎧</span>Hỗ trợ kích hoạt 24/7</div>
          </div>
        </div>
      </div>

      {/* PRODUCTS */}
      <section className="section">
        <div className="container">
          <div className="section-title">🛍️ Sản phẩm đang có</div>
          <div className="section-sub">Chọn gói phù hợp với nhu cầu của bạn</div>
          
          <div className="products-grid">
            {loading
              ? [1,2,3,4].map(i => <ProductSkeleton key={i} />)
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
