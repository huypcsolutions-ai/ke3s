import { useState } from 'react'
import Layout from '../components/Layout'

const GUIDE_ARTICLES = [
  {
    icon: '🔑',
    title: 'Hướng dẫn kích hoạt Microsoft 365 Personal/Family',
    desc: 'Chi tiết từng bước kích hoạt tài khoản Microsoft 365 trên máy tính Windows, Mac và thiết bị di động.',
    time: '5 phút đọc',
    tags: ['Kích hoạt', 'Personal', 'Family'],
    content: `**Bước 1:** Truy cập setup.office.com hoặc microsoft365.com/setup\n\n**Bước 2:** Đăng nhập tài khoản Microsoft (tạo mới miễn phí nếu chưa có)\n\n**Bước 3:** Nhập product key gồm 25 ký tự nhận qua email\n\n**Bước 4:** Chọn quốc gia và ngôn ngữ → Nhấn "Tiếp theo"\n\n**Bước 5:** Tải xuống và cài đặt Office theo hướng dẫn trên màn hình\n\n**Lưu ý:** Key chỉ kích hoạt được 1 lần. Giữ key an toàn sau khi kích hoạt.`
  },
  {
    icon: '💻',
    title: 'Cách cài đặt Office 2021 Professional Plus',
    desc: 'Hướng dẫn tải và cài Office 2021 bản Pro Plus với key bản quyền vĩnh viễn, không cần tài khoản Microsoft.',
    time: '8 phút đọc',
    tags: ['Office 2021', 'Cài đặt', 'Pro Plus'],
    content: `**Bước 1:** Tải Office 2021 từ trang chính thức Microsoft hoặc sử dụng Office Deployment Tool\n\n**Bước 2:** Chạy file cài đặt với quyền Administrator\n\n**Bước 3:** Sau khi cài xong, mở bất kỳ app Office (Word, Excel...)\n\n**Bước 4:** Vào File → Account → Kích hoạt Office\n\n**Bước 5:** Nhập product key 25 ký tự\n\n**Quan trọng:** Office 2021 Pro Plus không yêu cầu tài khoản Microsoft, key kích hoạt vĩnh viễn.`
  },
  {
    icon: '📱',
    title: 'Cài đặt Microsoft 365 trên điện thoại iOS/Android',
    desc: 'Hướng dẫn đăng nhập và sử dụng đầy đủ tính năng Office trên thiết bị di động sau khi có bản quyền.',
    time: '4 phút đọc',
    tags: ['Mobile', 'iOS', 'Android'],
    content: null
  },
  {
    icon: '☁️',
    title: 'Kích hoạt và sử dụng OneDrive 1TB',
    desc: '1TB cloud storage đi kèm Microsoft 365. Hướng dẫn cài đặt OneDrive, sync file và chia sẻ.',
    time: '6 phút đọc',
    tags: ['OneDrive', '1TB', 'Cloud'],
    content: null
  },
  {
    icon: '👥',
    title: 'Chia sẻ Microsoft 365 Family cho người thân',
    desc: 'Gói Family cho phép chia sẻ với tối đa 6 người. Cách mời thành viên và quản lý đăng ký.',
    time: '5 phút đọc',
    tags: ['Family', 'Chia sẻ'],
    content: null
  },
  {
    icon: '🔄',
    title: 'Chuyển từ Office 2019 sang Microsoft 365',
    desc: 'So sánh sự khác biệt và cách nâng cấp lên Microsoft 365 mà không mất dữ liệu cũ.',
    time: '7 phút đọc',
    tags: ['Nâng cấp', 'Office 2019'],
    content: null
  },
  {
    icon: '❓',
    title: 'Xử lý lỗi "Key đã được sử dụng"',
    desc: 'Các lỗi thường gặp khi kích hoạt và cách xử lý. Hướng dẫn liên hệ hỗ trợ khi cần.',
    time: '4 phút đọc',
    tags: ['Lỗi', 'Xử lý'],
    content: null
  },
  {
    icon: '🏢',
    title: 'Microsoft 365 Business Basic dành cho doanh nghiệp',
    desc: 'Hướng dẫn thiết lập Teams, Exchange email và SharePoint cho tổ chức nhỏ.',
    time: '10 phút đọc',
    tags: ['Business', 'Teams', 'Email'],
    content: null
  }
]

function ArticleModal({ article, onClose }) {
  if (!article) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'white', borderRadius: 16, maxWidth: 600, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700 }}>{article.icon} {article.title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-500)' }}>✕</button>
        </div>
        {article.content ? (
          <div style={{ lineHeight: 1.9, color: 'var(--gray-700)', fontSize: 14.5 }}>
            {article.content.split('\n\n').map((para, i) => (
              <p key={i} style={{ marginBottom: 14 }} dangerouslySetInnerHTML={{
                __html: para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              }} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-500)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
            <p>Nội dung đang được cập nhật.<br />Vui lòng liên hệ chat để được hỗ trợ trực tiếp.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HuongDan() {
  const [activeArticle, setActiveArticle] = useState(null)

  return (
    <Layout title="Hướng dẫn - M365Keys">
      {/* Hero */}
      <div className="guide-hero">
        <div className="container">
          <div style={{ fontSize: 48, marginBottom: 12 }}>📖</div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, marginBottom: 10 }}>Trung tâm hướng dẫn</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', maxWidth: 500, margin: '0 auto', fontSize: 15 }}>
            Tất cả hướng dẫn bạn cần để mua và kích hoạt Microsoft 365 thành công
          </p>
        </div>
      </div>

      {/* 3 STEPS */}
      <div style={{ background: 'white', padding: '60px 0', borderBottom: '1px solid var(--gray-200)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div className="section-title">🚀 Quy trình 3 bước đơn giản</div>
            <div className="section-sub" style={{ marginBottom: 0 }}>Từ lúc chọn sản phẩm đến khi có key trong tay</div>
          </div>

          <div className="steps-row">
            <div className="step">
              <div className="step-num">1</div>
              <div style={{ background: 'var(--blue-light)', borderRadius: 12, padding: '20px 16px' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🛒</div>
                <div className="step-title">Đặt hàng</div>
                <div className="step-desc">
                  Chọn sản phẩm phù hợp → Nhấn Mua ngay → Điền email và thông tin → Nhấn Tiến hành thanh toán
                </div>
              </div>
            </div>

            <div className="step">
              <div className="step-num">2</div>
              <div style={{ background: '#fff3e0', borderRadius: 12, padding: '20px 16px' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>💳</div>
                <div className="step-title">Thanh toán</div>
                <div className="step-desc">
                  Quét mã VietQR hoặc mở app ngân hàng → Chuyển khoản đúng số tiền và nội dung → Hệ thống tự xác nhận
                </div>
              </div>
            </div>

            <div className="step">
              <div className="step-num">3</div>
              <div style={{ background: 'var(--teal-light)', borderRadius: 12, padding: '20px 16px' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📧</div>
                <div className="step-title">Nhận key</div>
                <div className="step-desc">
                  Key kích hoạt gửi vào email trong 1-5 phút → Truy cập setup.office.com → Kích hoạt là xong!
                </div>
              </div>
            </div>
          </div>

          {/* Timeline detail */}
          <div style={{ maxWidth: 600, margin: '40px auto 0', background: 'var(--gray-50)', borderRadius: 12, padding: '24px 32px' }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, marginBottom: 16, textAlign: 'center' }}>
              ⏱️ Thời gian từng bước
            </div>
            {[
              ['🖱️ Chọn & điền form đặt hàng', '~2 phút'],
              ['💳 Quét QR chuyển khoản', '~1 phút'],
              ['⚡ Hệ thống xử lý tự động', '1-5 phút'],
              ['📧 Nhận key trong email', 'Tức thì'],
              ['🔑 Kích hoạt xong', '~3 phút'],
            ].map(([step, time]) => (
              <div key={step} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--gray-200)', fontSize: 14 }}>
                <span>{step}</span>
                <span style={{ color: 'var(--teal)', fontWeight: 600 }}>{time}</span>
              </div>
            ))}
            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>
              🎉 Tổng cộng chỉ khoảng 10 phút!
            </div>
          </div>
        </div>
      </div>

      {/* GUIDE ARTICLES */}
      <section className="section">
        <div className="container">
          <div className="section-title">📚 Bài hướng dẫn chi tiết</div>
          <div className="section-sub">Nhấn vào bài viết để xem hướng dẫn đầy đủ</div>

          <div className="guide-articles">
            {GUIDE_ARTICLES.map((article) => (
              <div
                key={article.title}
                className="guide-card"
                onClick={() => setActiveArticle(article)}
              >
                <div className="guide-icon">{article.icon}</div>
                <div>
                  <div className="guide-card-title">{article.title}</div>
                  <div className="guide-card-desc">{article.desc}</div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {article.tags.map(tag => (
                      <span key={tag} style={{
                        padding: '2px 8px', background: 'var(--blue-light)', color: 'var(--blue)',
                        borderRadius: 100, fontSize: 11, fontWeight: 500
                      }}>{tag}</span>
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--gray-500)' }}>🕐 {article.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <div style={{ background: 'var(--blue-light)', padding: '60px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div className="section-title">❓ Câu hỏi thường gặp</div>
          </div>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {[
              { q: 'Key Microsoft 365 mua ở đây có chính hãng không?', a: 'Có, tất cả key đều là bản quyền chính hãng từ Microsoft, bạn có thể kiểm tra trạng thái tại portal.office.com.' },
              { q: 'Sau khi thanh toán bao lâu thì nhận được key?', a: 'Hệ thống tự động xử lý trong 1-5 phút sau khi xác nhận thanh toán. Key sẽ gửi về email bạn đã đăng ký.' },
              { q: 'Tôi có thể dùng 1 key cho nhiều máy không?', a: 'Microsoft 365 Personal cho phép cài trên 5 thiết bị nhưng đăng nhập cùng lúc trên 1 máy. Office 2021 chỉ dùng cho 1 máy duy nhất.' },
              { q: 'Key bị lỗi không kích hoạt được thì sao?', a: 'Chúng tôi đổi key mới miễn phí trong 24 giờ. Gửi phản hồi kèm mã đơn hàng và ảnh chụp lỗi là được.' },
              { q: 'Có thể mua nhiều key cùng lúc không?', a: 'Có thể, bạn chỉnh số lượng tại trang đặt hàng. Mỗi key sẽ gửi về email đăng ký của bạn.' },
            ].map(({ q, a }, i) => (
              <FAQItem key={i} question={q} answer={a} />
            ))}
          </div>
        </div>
      </div>

      <ArticleModal article={activeArticle} onClose={() => setActiveArticle(null)} />
    </Layout>
  )
}

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        background: 'white', borderRadius: 10, marginBottom: 10,
        border: `1.5px solid ${open ? 'var(--blue)' : 'var(--gray-200)'}`,
        overflow: 'hidden', transition: 'border-color 0.15s'
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '16px 20px', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: 'Be Vietnam Pro', fontSize: 15, fontWeight: 600, textAlign: 'left',
          color: 'var(--gray-900)'
        }}
      >
        {question}
        <span style={{ fontSize: 18, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none', flexShrink: 0, marginLeft: 12 }}>+</span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 16px', fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.7 }}>
          {answer}
        </div>
      )}
    </div>
  )
}
