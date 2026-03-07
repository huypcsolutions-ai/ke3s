import { useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { showToast } from '../lib/toast'

export default function PhanHoi() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '', order_id: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.message.trim()) {
      showToast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('feedbacks').insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      subject: form.subject,
      message: form.message,
      order_id: form.order_id || null
    })

    if (error) {
      showToast('Gửi phản hồi thất bại. Vui lòng thử lại.', 'error')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Layout title="Phản hồi & Hỗ trợ - M365Keys">
      {/* Hero */}
      <div className="guide-hero">
        <div className="container">
          <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, marginBottom: 10 }}>Phản hồi & Hỗ trợ</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', maxWidth: 480, margin: '0 auto', fontSize: 15 }}>
            Bạn gặp vấn đề? Cần hỗ trợ kích hoạt? Hãy để lại phản hồi và chúng tôi sẽ hỗ trợ trong 1-2 giờ.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="feedback-grid">
            {/* Form */}
            <div>
              {sent ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                  <h3 style={{ fontFamily: 'Syne', fontSize: 22, marginBottom: 12 }}>Gửi thành công!</h3>
                  <p style={{ color: 'var(--gray-500)', marginBottom: 28, lineHeight: 1.7 }}>
                    Cảm ơn bạn đã phản hồi. Chúng tôi sẽ liên hệ lại trong 1-2 giờ qua email hoặc điện thoại.
                  </p>
                  <button className="btn btn-primary" onClick={() => { setSent(false); setForm({ name:'', email:'', phone:'', subject:'', message:'', order_id:'' }) }}>
                    Gửi phản hồi khác
                  </button>
                </div>
              ) : (
                <div className="card">
                  <h3 style={{ fontFamily: 'Syne', fontSize: 20, marginBottom: 6 }}>📝 Gửi phản hồi</h3>
                  <p style={{ color: 'var(--gray-500)', fontSize: 13.5, marginBottom: 24 }}>Điền thông tin bên dưới để gửi yêu cầu hỗ trợ</p>

                  <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group">
                        <label className="form-label">Họ tên <span className="required">*</span></label>
                        <input className="form-input" placeholder="Nguyễn Văn A" value={form.name} onChange={update('name')} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" placeholder="email@example.com" value={form.email} onChange={update('email')} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group">
                        <label className="form-label">Số điện thoại</label>
                        <input className="form-input" type="tel" placeholder="0912345678" value={form.phone} onChange={update('phone')} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Mã đơn hàng (nếu có)</label>
                        <input className="form-input" placeholder="Ví dụ: ABC123" value={form.order_id} onChange={update('order_id')} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Chủ đề</label>
                      <select className="form-select" value={form.subject} onChange={update('subject')}>
                        <option value="">Chọn chủ đề...</option>
                        <option value="Lỗi key không kích hoạt được">🔑 Key không kích hoạt được</option>
                        <option value="Chưa nhận được email">📧 Chưa nhận được email</option>
                        <option value="Hỏi về sản phẩm">❓ Hỏi về sản phẩm</option>
                        <option value="Vấn đề thanh toán">💳 Vấn đề thanh toán</option>
                        <option value="Yêu cầu hoàn tiền">💰 Yêu cầu hoàn tiền</option>
                        <option value="Góp ý khác">💡 Góp ý khác</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Nội dung phản hồi <span className="required">*</span></label>
                      <textarea
                        className="form-textarea"
                        placeholder="Mô tả chi tiết vấn đề của bạn..."
                        rows={5}
                        value={form.message}
                        onChange={update('message')}
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                      {loading ? '⏳ Đang gửi...' : '📤 Gửi phản hồi'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Contact info */}
            <div>
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'Syne', fontSize: 18, marginBottom: 20 }}>📞 Thông tin liên hệ</h3>
                {[
                  { icon: '💬', title: 'Chat trực tiếp', desc: 'Nhấn vào icon chat góc phải dưới màn hình để trò chuyện ngay.', note: 'Phản hồi trong vài giây' },
                  { icon: '📧', title: 'Email hỗ trợ', desc: 'support@m365keys.vn', note: 'Phản hồi trong 1-2 giờ' },
                  { icon: '⏰', title: 'Thời gian hỗ trợ', desc: '8:00 - 22:00 tất cả các ngày trong tuần', note: 'Kể cả ngày lễ' },
                ].map(item => (
                  <div key={item.title} style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, background: 'var(--blue-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 13.5, color: 'var(--gray-600)', marginBottom: 2 }}>{item.desc}</div>
                      <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 500 }}>{item.note}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 style={{ fontFamily: 'Syne', fontSize: 18, marginBottom: 16 }}>⚡ Hỏi đáp nhanh</h3>
                {[
                  { q: 'Chưa nhận được key?', a: 'Kiểm tra spam/junk mail. Nếu vẫn không thấy, gửi phản hồi kèm mã đơn hàng.' },
                  { q: 'Key lỗi không kích hoạt?', a: 'Đổi key mới miễn phí trong 24h. Gửi phản hồi kèm ảnh chụp màn hình lỗi.' },
                  { q: 'Thanh toán rồi nhưng đơn pending?', a: 'Thường xử lý tự động trong 5 phút. Nếu quá lâu, gửi phản hồi kèm ảnh biên lai.' },
                ].map(({ q, a }) => (
                  <div key={q} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--blue)', marginBottom: 4 }}>❓ {q}</div>
                    <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6 }}>{a}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
