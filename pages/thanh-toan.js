import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { BANK_LIST, BANK_CONFIG, generateVietQR, generateDeeplink } from '../lib/bankConfig'

const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT || '134150399'
const BANK_ACCOUNT_NAME = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || 'HOANG HUY HAI'
const DEFAULT_BANK = process.env.NEXT_PUBLIC_BANK_ID || 'acb'
const TIMEOUT = 15 * 60 // 15 phút

function isMobile() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

function getPreferredBank() {
  if (typeof window === 'undefined') return DEFAULT_BANK
  try {
    const saved = localStorage.getItem('preferred_bank')
    if (saved && BANK_CONFIG[saved]) return saved
  } catch (e) {}
  return DEFAULT_BANK
}

export default function ThanhToan() {
  const router = useRouter()
  const { order: orderId, amount } = router.query

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedBank, setSelectedBank] = useState(DEFAULT_BANK)
  const [timeLeft, setTimeLeft] = useState(TIMEOUT)
  const [status, setStatus] = useState('waiting') // 'waiting', 'success', 'expired'
  const intervalRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    setSelectedBank(getPreferredBank())
  }, [])

  useEffect(() => {
    if (!orderId) return
    async function loadOrder() {
      const { data } = await supabase.from('orders').select('*').eq('id', orderId).single()
      if (data) {
        setOrder(data)
        if (data.payment_status === 'completed') setStatus('success')
      }
      setLoading(false)
    }
    loadOrder()
  }, [orderId])

  // Countdown timer
  useEffect(() => {
    if (status !== 'waiting') return
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setStatus('expired')
          clearInterval(intervalRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [status])

  // Poll for payment
  useEffect(() => {
    if (!orderId || status !== 'waiting') return
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .single()
      
      if (data?.payment_status === 'completed') {
        setStatus('success')
        clearInterval(pollRef.current)
      }
    }, 5000)
    return () => clearInterval(pollRef.current)
  }, [orderId, status])

  function handleBankSelect(bankId) {
    setSelectedBank(bankId)
    try { localStorage.setItem('preferred_bank', bankId) } catch (e) {}
  }

  function handleOpenApp() {
    const amtNum = parseInt(amount) || 0
    const desc = `M365Keys ${orderId}`
    const bank = BANK_CONFIG[selectedBank]
    if (!bank) return

    //const deeplink = generateDeeplink({ bankId: selectedBank, accountNo: BANK_ACCOUNT, amount: amtNum, description: desc })
   // if (!deeplink) return

    if (isMobile()) {
      
      // Try app deeplink first, fallback to web      window.location.href = deeplink.appUrl      setTimeout(() => {        window.open(bank.webUrl, '_blank')      }, 2000)

              // TẠO DEEPLINK THEO CHUẨN TÀI LIỆU VIETQR.IO
        // Tham số: app (id ngân hàng khách chọn), ba (stk@bank của bạn), am (số tiền), tn (nội dung)
        const deepLink = `https://dl.vietqr.io/pay` + 
                         `?app=${selectedBank}` + 
                         `&ba=${BANK_ACCOUNT}@${selectedBank}` + 
                         `&am=${amtNum}` + 
                         `&tn=${encodeURIComponent(orderId)}` +  
                        "&url=https://payos.vn";
        
        window.location.href = deepLink;

        // Fallback: Nếu không mở được app sau 2.5 giây, cuộn xuống ảnh QR
        setTimeout(() => {
            if (!document.hidden) {
                document.getElementById("qr-img").scrollIntoView({ behavior: "smooth" });
            }
        }, 2500);
    } else {
      window.open(bank.webUrl, '_blank')
    }
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const amtNum = parseInt(amount) || order?.total_amount || 0
  const desc = `M365Keys ${orderId}`
  const qrUrl = selectedBank && orderId
    ? generateVietQR({ bankId: selectedBank, accountNo: BANK_ACCOUNT, accountName: BANK_ACCOUNT_NAME, amount: amtNum, description: desc })
    : null

  if (loading) {
    return (
      <Layout title="Thanh toán">
        <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>⏳</div>
          <p style={{ marginTop: 16 }}>Đang tải thông tin đơn hàng...</p>
        </div>
      </Layout>
    )
  }

  if (status === 'success') {
    return (
      <Layout title="Thanh toán thành công">
        <div className="container" style={{ padding: '60px 20px' }}>
          <div className="payment-success">
            <div className="success-icon">🎉</div>
            <h2 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Thanh toán thành công!</h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: 8 }}>
              Đơn hàng <strong>#{orderId}</strong>
            </p>
            <p style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, color: 'var(--blue)', marginBottom: 24 }}>
              {new Intl.NumberFormat('vi-VN').format(amtNum)}đ
            </p>
            <div style={{
              background: 'var(--teal-light)',
              border: '1.5px solid var(--teal)',
              borderRadius: 12,
              padding: '20px 32px',
              maxWidth: 480,
              margin: '0 auto 28px',
            }}>
              <div style={{ fontSize: 20, marginBottom: 10 }}>📧</div>
              <p style={{ color: 'var(--teal)', fontWeight: 600, fontSize: 15 }}>
                Key kích hoạt đã được gửi về email của bạn!
              </p>
              <p style={{ color: 'var(--teal)', fontSize: 13, marginTop: 6 }}>
                Vui lòng kiểm tra hòm thư (kể cả thư mục Spam) và làm theo hướng dẫn trong email.
              </p>
            </div>
            <a href="/" className="btn btn-primary btn-lg">🏠 Quay lại trang chủ</a>
          </div>
        </div>
      </Layout>
    )
  }

  if (status === 'expired') {
    return (
      <Layout title="Đơn hàng hết hạn">
        <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>⏰</div>
          <h2 style={{ fontFamily: 'Syne', marginBottom: 12 }}>Đơn hàng đã hết thời gian</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: 28 }}>
            Thời gian thanh toán 15 phút đã hết. Vui lòng đặt lại đơn hàng.
          </p>
          <a href="/" className="btn btn-primary btn-lg">🔄 Đặt lại</a>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Thanh toán - VietQR">
      <div className="container" style={{ padding: '40px 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Syne', fontSize: 24 }}>💳 Thanh toán đơn hàng</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 4 }}>
            Quét mã QR hoặc chuyển khoản theo thông tin bên dưới
          </p>
        </div>

        <div className="payment-layout">
          {/* LEFT: QR + Bank */}
          <div>
            <div className="qr-box" style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <span className={`countdown${timeLeft < 120 ? ' urgent' : ''}`}>
                  ⏱ {formatTime(timeLeft)}
                </span>
                <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>
                  Thời gian còn lại để hoàn tất thanh toán
                </p>
              </div>

              {/* QR Code */}
              <div className="qr-img-wrap">
                {qrUrl ? (
                  <img src={qrUrl} alt="VietQR" />
                ) : (
                  <div style={{ padding: 20, color: 'var(--gray-500)', fontSize: 13 }}>Chọn ngân hàng để hiển thị QR</div>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--blue)', fontFamily: 'Syne' }}>
                  {new Intl.NumberFormat('vi-VN').format(amtNum)}đ
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                  Nội dung: <strong>{desc}</strong>
                </div>
              </div>

              {/* Bank select */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Chọn ngân hàng:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {BANK_LIST.map(bank => (
                    <button
                      key={bank.id}
                      onClick={() => handleBankSelect(bank.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: selectedBank === bank.id ? '2px solid var(--blue)' : '1.5px solid var(--gray-200)',
                        background: selectedBank === bank.id ? 'var(--blue-light)' : 'white',
                        color: selectedBank === bank.id ? 'var(--blue)' : 'var(--gray-700)',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s',
                        fontFamily: 'Be Vietnam Pro'
                      }}
                    >
                      <img src={bank.logo} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
                      {bank.shortName}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-teal btn-lg"
                onClick={handleOpenApp}
                style={{ width: '100%' }}
              >
                📱 {isMobile() ? 'Mở app ngân hàng' : 'Mở web ngân hàng'} ({BANK_CONFIG[selectedBank]?.name || selectedBank})
              </button>

              <p style={{ fontSize: 11.5, color: 'var(--gray-500)', marginTop: 10, lineHeight: 1.6 }}>
                Hệ thống sẽ tự động xác nhận sau khi nhận được thanh toán.<br />
                Key kích hoạt sẽ gửi về email của bạn.
              </p>
            </div>

            {/* Status indicator */}
            <div style={{
              background: '#fffbeb', border: '1px solid #fbbf24',
              borderRadius: 10, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <div style={{ width: 12, height: 12, background: '#fbbf24', borderRadius: '50%', animation: 'pulse 2s infinite', flexShrink: 0 }} />
              <div style={{ fontSize: 13 }}>
                <strong>Đang chờ thanh toán...</strong><br />
                <span style={{ color: 'var(--gray-500)' }}>Trang sẽ tự cập nhật khi nhận được tiền</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Order detail */}
          <div>
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, color: 'var(--gray-700)' }}>📋 Chi tiết đơn hàng</div>

              <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                {[
                  ['Mã đơn hàng', `#${orderId}`],
                  ['Sản phẩm', order?.product_name],
                  ['Số lượng', `${order?.quantity || 1} key`],
                  ['Đơn giá', `${new Intl.NumberFormat('vi-VN').format(order?.unit_price || 0)}đ`],
                  order?.discount_amount > 0 && ['Giảm giá', `-${new Intl.NumberFormat('vi-VN').format(order.discount_amount)}đ`],
                  ['Email nhận key', order?.customer_email],
                ].filter(Boolean).map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--gray-200)', fontSize: 13.5 }}>
                    <span style={{ color: 'var(--gray-500)' }}>{label}</span>
                    <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: 200, wordBreak: 'break-word' }}>{val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: 18, fontWeight: 700, fontFamily: 'Syne', color: 'var(--blue)' }}>
                  <span>Tổng</span>
                  <span>{new Intl.NumberFormat('vi-VN').format(amtNum)}đ</span>
                </div>
              </div>

              {/* Account info */}
              <div style={{ background: 'var(--blue-light)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--blue)' }}>
                  🏦 Thông tin chuyển khoản
                </div>
                {[
                  ['Ngân hàng', BANK_CONFIG[DEFAULT_BANK]?.name || DEFAULT_BANK],
                  ['Số tài khoản', BANK_ACCOUNT],
                  ['Chủ tài khoản', BANK_ACCOUNT_NAME],
                  ['Số tiền', `${new Intl.NumberFormat('vi-VN').format(amtNum)}đ`],
                  ['Nội dung CK', desc],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                    <span style={{ color: 'var(--gray-600)' }}>{label}</span>
                    <span style={{ fontWeight: 600, color: label === 'Nội dung CK' ? '#ef4444' : 'var(--blue-dark)', maxWidth: 180, textAlign: 'right' }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, padding: 12, background: '#fef2f2', borderRadius: 8, fontSize: 12, color: '#b91c1c' }}>
                ⚠️ Vui lòng ghi đúng nội dung chuyển khoản <strong>{desc}</strong> để đơn hàng được xử lý tự động.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
