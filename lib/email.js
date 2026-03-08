// ─── Email thông báo hết hàng ──────────────────────────────────────────────
export async function sendOutOfStockEmail({ to, customerName, orderId, productName, totalAmount }) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body { font-family:'Segoe UI',Arial,sans-serif; background:#f5f5f5; margin:0; padding:0; }
  .container { max-width:600px; margin:40px auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
  .header { background:linear-gradient(135deg,#f59e0b,#d97706); padding:40px 30px; text-align:center; }
  .header h1 { color:white; margin:0; font-size:26px; }
  .body { padding:30px; }
  .alert-box { background:#fef3c7; border-left:4px solid #f59e0b; padding:18px 20px; border-radius:0 8px 8px 0; margin:20px 0; }
  .alert-box p { margin:0; color:#92400e; font-size:14px; line-height:1.7; }
  .info-row { display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px solid #eee; font-size:14px; }
  .info-label { color:#666; }
  .actions { margin-top:24px; }
  .btn { display:inline-block; padding:12px 24px; background:#0078d4; color:white; text-decoration:none; border-radius:8px; font-size:14px; font-weight:600; }
  .footer { background:#f8f9fa; padding:20px 30px; text-align:center; font-size:12px; color:#999; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>⚠️ Thông báo về đơn hàng #${orderId}</h1>
  </div>
  <div class="body">
    <p>Xin chào <strong>${customerName || 'Quý khách'}</strong>,</p>
    <p>Chúng tôi rất tiếc phải thông báo rằng đơn hàng <strong>#${orderId}</strong> của bạn đã <strong>nhận được thanh toán</strong>, tuy nhiên số lượng key <strong>${productName}</strong> hiện đã <strong>hết</strong> do có đơn hàng khác thanh toán cùng thời điểm.</p>

    <div class="alert-box">
      <p>✅ Chúng tôi đã nhận được số tiền <strong>${new Intl.NumberFormat('vi-VN').format(totalAmount)}đ</strong> từ bạn.<br>
      ⚠️ Tuy nhiên, số lượng key không đủ để xử lý đơn hàng của bạn lúc này.</p>
    </div>

    <p><strong>Bạn có 2 lựa chọn:</strong></p>
    <ol style="line-height:2;font-size:14px;color:#374151">
      <li>📦 <strong>Đặt lại với số lượng ít hơn</strong> — chúng tôi sẽ bổ sung hàng sớm</li>
      <li>💰 <strong>Yêu cầu hoàn tiền 100%</strong> qua form phản hồi</li>
    </ol>

    <div class="actions">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.vercel.app'}/phan-hoi?order=${orderId}" class="btn">
        📝 Gửi yêu cầu hoàn tiền / hỗ trợ
      </a>
    </div>

    <p style="margin-top:24px;font-size:13px;color:#6b7280">
      Chúng tôi xin lỗi về sự bất tiện này và cam kết xử lý hoàn tiền trong <strong>24 giờ</strong> nếu bạn yêu cầu.<br>
      Mã đơn hàng của bạn: <strong>#${orderId}</strong> — vui lòng lưu lại để đối chiếu.
    </p>
  </div>
  <div class="footer">
    <p>© 2024 M365Keys | Hỗ trợ: support@m365keys.vn</p>
  </div>
</div>
</body></html>`

  await transporter.sendMail({
    from: `"Microsoft 365 Keys" <${process.env.SMTP_FROM}>`,
    to,
    subject: `⚠️ Thông báo đơn hàng #${orderId} — Tạm hết hàng`,
    html,
  })
}
