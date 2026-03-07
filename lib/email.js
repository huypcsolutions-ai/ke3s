import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

export async function sendKeyEmail({ to, customerName, orderId, productName, keys, totalAmount }) {
  const keyList = Array.isArray(keys) ? keys : [keys]
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0078d4, #106ebe); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; }
    .badge { display: inline-block; background: #00b294; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 10px; }
    .body { padding: 30px; }
    .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
    .order-info { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .order-info h3 { color: #0078d4; margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #666; }
    .info-value { color: #333; font-weight: 500; }
    .keys-section { margin: 24px 0; }
    .keys-section h3 { color: #333; font-size: 16px; margin-bottom: 16px; }
    .key-box { background: #f0f7ff; border: 2px dashed #0078d4; border-radius: 8px; padding: 16px 20px; margin-bottom: 12px; }
    .key-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .key-value { font-family: 'Courier New', monospace; font-size: 18px; font-weight: 700; color: #0078d4; letter-spacing: 2px; word-break: break-all; }
    .instructions { background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0; }
    .instructions h4 { color: #856404; margin: 0 0 10px; }
    .instructions ol { color: #856404; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; }
    .footer { background: #f8f9fa; padding: 24px 30px; text-align: center; font-size: 13px; color: #666; }
    .footer a { color: #0078d4; text-decoration: none; }
    .support { margin-top: 20px; padding: 16px; background: #e8f4fd; border-radius: 8px; }
    .support p { margin: 0; font-size: 13px; color: #0078d4; }
    .amount { font-size: 20px; font-weight: 700; color: #00b294; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Đơn hàng thành công!</h1>
      <p>Cảm ơn bạn đã mua sắm tại Microsoft 365 Keys</p>
      <span class="badge">✓ Thanh toán hoàn tất</span>
    </div>
    
    <div class="body">
      <div class="greeting">
        Xin chào <strong>${customerName || 'Quý khách'}</strong>,<br>
        Đơn hàng của bạn đã được xác nhận và key kích hoạt được gửi kèm bên dưới.
      </div>
      
      <div class="order-info">
        <h3>📋 Thông tin đơn hàng</h3>
        <div class="info-row">
          <span class="info-label">Mã đơn hàng</span>
          <span class="info-value">#${orderId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Sản phẩm</span>
          <span class="info-value">${productName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Số lượng</span>
          <span class="info-value">${keyList.length} key</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tổng thanh toán</span>
          <span class="info-value amount">${new Intl.NumberFormat('vi-VN').format(totalAmount)}đ</span>
        </div>
      </div>
      
      <div class="keys-section">
        <h3>🔑 Key kích hoạt của bạn</h3>
        ${keyList.map((key, i) => `
          <div class="key-box">
            <div class="key-label">Key ${keyList.length > 1 ? `#${i+1}` : 'kích hoạt'}</div>
            <div class="key-value">${key}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="instructions">
        <h4>📖 Hướng dẫn kích hoạt</h4>
        <ol>
          <li>Truy cập <strong>setup.office.com</strong> hoặc <strong>microsoft365.com/setup</strong></li>
          <li>Đăng nhập tài khoản Microsoft (hoặc tạo mới miễn phí)</li>
          <li>Nhập key kích hoạt vào ô "Nhập product key"</li>
          <li>Làm theo hướng dẫn trên màn hình để hoàn tất kích hoạt</li>
          <li>Tải xuống và cài đặt Office trên thiết bị của bạn</li>
        </ol>
      </div>
      
      <div class="support">
        <p>💬 Cần hỗ trợ? Liên hệ chúng tôi qua email hoặc chat trực tiếp trên website.</p>
      </div>
    </div>
    
    <div class="footer">
      <p>Email này được gửi tự động từ hệ thống. Vui lòng không trả lời email này.</p>
      <p>© 2024 Microsoft 365 Keys | <a href="#">Điều khoản dịch vụ</a> | <a href="#">Chính sách bảo mật</a></p>
    </div>
  </div>
</body>
</html>
  `

  await transporter.sendMail({
    from: `"Microsoft 365 Keys" <${process.env.SMTP_FROM}>`,
    to,
    subject: `🔑 Key kích hoạt ${productName} - Đơn hàng #${orderId}`,
    html
  })
}
