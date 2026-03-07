import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useRef, useEffect } from 'react'

const BOT_RESPONSES = {
  default: [
    'Xin chào! Tôi có thể giúp bạn tìm hiểu về sản phẩm Microsoft 365 hoặc hỗ trợ đặt hàng. Bạn cần hỗ trợ gì ạ?',
    'Cảm ơn bạn đã liên hệ! Bạn có thể đặt câu hỏi về sản phẩm, giá cả, hoặc quy trình mua hàng.'
  ],
  price: 'Giá sản phẩm của chúng tôi rất cạnh tranh:\n• Microsoft 365 Personal: 299.000đ/năm\n• Microsoft 365 Family: 499.000đ/năm\n• Office 2021 Professional Plus: 890.000đ (vĩnh viễn)\n\nNhấn "Mua ngay" trên trang chủ để đặt hàng.',
  how: 'Quy trình đặt hàng rất đơn giản:\n1️⃣ Chọn sản phẩm → Nhấn Mua ngay\n2️⃣ Điền thông tin → Thanh toán qua QR\n3️⃣ Nhận key qua email trong vài phút!',
  delivery: 'Key kích hoạt sẽ được gửi ngay vào email của bạn sau khi xác nhận thanh toán thành công, thường trong vòng 1-5 phút.',
  activate: 'Cách kích hoạt:\n1. Truy cập setup.office.com\n2. Đăng nhập tài khoản Microsoft\n3. Nhập key nhận được qua email\n4. Làm theo hướng dẫn là xong!',
  support: 'Bạn cần hỗ trợ thêm vui lòng:\n📧 Gửi phản hồi tại trang "Phản hồi"\n📞 Hoặc để lại email và chúng tôi sẽ liên hệ lại trong 1-2 giờ.',
  refund: 'Chính sách đổi trả: Key lỗi hoặc không kích hoạt được sẽ được đổi miễn phí trong 24h. Vui lòng liên hệ qua trang Phản hồi.',
  discount: 'Chúng tôi thường có mã giảm giá cho khách hàng mới và dịp đặc biệt. Nhập mã tại ô "Mã giảm giá" khi đặt hàng.',
}

function getResponse(msg) {
  const m = msg.toLowerCase()
  if (m.includes('giá') || m.includes('bao nhiêu') || m.includes('tiền')) return BOT_RESPONSES.price
  if (m.includes('mua') || m.includes('đặt') || m.includes('order') || m.includes('quy trình')) return BOT_RESPONSES.how
  if (m.includes('nhận') || m.includes('bao lâu') || m.includes('giao') || m.includes('nhanh')) return BOT_RESPONSES.delivery
  if (m.includes('kích hoạt') || m.includes('activate') || m.includes('cài')) return BOT_RESPONSES.activate
  if (m.includes('hỗ trợ') || m.includes('liên hệ') || m.includes('support')) return BOT_RESPONSES.support
  if (m.includes('hoàn') || m.includes('đổi') || m.includes('trả') || m.includes('refund')) return BOT_RESPONSES.refund
  if (m.includes('giảm giá') || m.includes('voucher') || m.includes('mã')) return BOT_RESPONSES.discount
  return BOT_RESPONSES.default[Math.floor(Math.random() * BOT_RESPONSES.default.length)]
}

function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Xin chào! 👋 Tôi là trợ lý hỗ trợ. Tôi có thể giúp gì cho bạn?' }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  function sendMsg(text) {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    setMessages(m => [...m, { from: 'user', text: msg }])
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(m => [...m, { from: 'bot', text: getResponse(msg) }])
    }, 800 + Math.random() * 600)
  }

  return (
    <>
      <button className="chatbot-toggle" onClick={() => setOpen(o => !o)} title="Chat hỗ trợ">
        {open ? '✕' : '💬'}
      </button>
      <div className={`chatbot-window${open ? ' open' : ''}`}>
        <div className="chat-header">
          <div className="chat-avatar">🤖</div>
          <div className="chat-header-info">
            <h4>Hỗ trợ trực tuyến</h4>
            <p><span className="chat-online" />Đang hoạt động</p>
          </div>
        </div>
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg msg-${m.from}`}>
              <div className="msg-bubble" style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
            </div>
          ))}
          {typing && (
            <div className="msg msg-bot msg-typing">
              <div className="msg-bubble">
                <span className="dot"/><span className="dot"/><span className="dot"/>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="chat-quick-replies">
          {['Giá sản phẩm', 'Quy trình mua', 'Cách kích hoạt', 'Chính sách đổi trả'].map(q => (
            <button key={q} className="quick-reply" onClick={() => sendMsg(q)}>{q}</button>
          ))}
        </div>
        <div className="chat-input-area">
          <input
            className="chat-input"
            placeholder="Nhập câu hỏi..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMsg()}
          />
          <button className="chat-send" onClick={() => sendMsg()}>➤</button>
        </div>
      </div>
    </>
  )
}

export default function Layout({ children, title = 'Microsoft 365 Keys - Bản quyền chính hãng' }) {
  const router = useRouter()

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Mua key Microsoft 365 bản quyền chính hãng, giao hàng tức thì qua email. Giá tốt nhất Việt Nam." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div id="toast-container" />

      <header className="header">
        <div className="container">
          <div className="header-inner">
            <Link href="/" className="logo">
              <div className="logo-icon">
                <span/><span/><span/><span/>
              </div>
              <span className="logo-text">M365<span>Keys</span></span>
            </Link>
            <nav className="nav">
              <Link href="/" className={router.pathname === '/' ? 'active' : ''}>🏠 Sản phẩm</Link>
              <Link href="/huong-dan" className={router.pathname === '/huong-dan' ? 'active' : ''}>📖 Hướng dẫn</Link>
              <Link href="/phan-hoi" className={router.pathname === '/phan-hoi' ? 'active' : ''}>💬 Phản hồi</Link>
              <Link href="/phan-hoi" className="nav-cta">Liên hệ ngay</Link>
            </nav>
            <button
              className="btn btn-outline btn-sm"
              style={{ display: 'none' }}
              id="mobile-menu-btn"
            >☰</button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="logo" style={{ marginBottom: 16 }}>
                <div className="logo-icon">
                  <span/><span/><span/><span/>
                </div>
                <span className="logo-text" style={{ color: 'white' }}>M365<span>Keys</span></span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.8 }}>
                Cung cấp bản quyền Microsoft 365 chính hãng với giá tốt nhất.<br/>
                Giao key tức thì, hỗ trợ 24/7.
              </p>
            </div>
            <div>
              <h4>Sản phẩm</h4>
              <ul>
                <li><Link href="/">Microsoft 365 Personal</Link></li>
                <li><Link href="/">Microsoft 365 Family</Link></li>
                <li><Link href="/">Office 2021 Pro Plus</Link></li>
                <li><Link href="/">Microsoft 365 Business</Link></li>
              </ul>
            </div>
            <div>
              <h4>Hỗ trợ</h4>
              <ul>
                <li><Link href="/huong-dan">Hướng dẫn mua hàng</Link></li>
                <li><Link href="/huong-dan">Cách kích hoạt</Link></li>
                <li><Link href="/phan-hoi">Gửi phản hồi</Link></li>
                <li><Link href="/phan-hoi">Kiểm tra đơn hàng</Link></li>
              </ul>
            </div>
            <div>
              <h4>Chính sách</h4>
              <ul>
                <li><a href="#">Chính sách bảo mật</a></li>
                <li><a href="#">Điều khoản dịch vụ</a></li>
                <li><a href="#">Chính sách đổi trả</a></li>
                <li><a href="#">Cam kết bảo hành</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2024 M365Keys. Tất cả quyền được bảo lưu. | Microsoft là thương hiệu của Microsoft Corporation.</p>
          </div>
        </div>
      </footer>

      <Chatbot />
    </>
  )
}
