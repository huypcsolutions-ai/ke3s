# 🔑 M365Keys — Website bán key Microsoft 365

Website bán key Microsoft 365 bản quyền với thanh toán VietQR tự động.

## ✨ Tính năng

- 🏠 **Trang chủ sản phẩm** — Load từ Supabase, hiển thị tồn kho real-time
- 🛒 **Trang đặt hàng** — Điều chỉnh số lượng, mã giảm giá, validate form
- 💳 **Thanh toán VietQR** — QR động, deeplink app ngân hàng, đếm ngược 15 phút
- 📧 **Gửi key tự động** — Nhận webhook SePay → lấy key từ kho → gửi email
- 💬 **Chatbot hỗ trợ** — Trả lời tự động các câu hỏi thường gặp
- 📖 **Hướng dẫn** — 3 bước đặt hàng + bài viết hướng dẫn
- 📝 **Phản hồi** — Form gửi yêu cầu hỗ trợ

---

## 🗄️ Cài đặt Database (Supabase)

### 1. Tạo project Supabase

Truy cập [supabase.com](https://supabase.com) → New Project

### 2. Chạy SQL schema

Vào **SQL Editor** → Paste toàn bộ nội dung file `supabase-schema.sql` → Run

File này tạo các bảng:
- `products` — Sản phẩm
- `stock` — Kho key/serial
- `discounts` — Mã giảm giá
- `orders` — Đơn hàng
- `feedbacks` — Phản hồi khách

### 3. Thêm Function (nếu dùng)

```sql
-- Giảm stock tự động
CREATE OR REPLACE FUNCTION decrement_stock(product_id UUID, amount INT)
RETURNS void AS $$
  UPDATE products SET stock = GREATEST(0, stock - amount) WHERE id = product_id;
$$ LANGUAGE SQL;
```

---

## 🚀 Deploy lên Vercel + GitHub

### 1. Đẩy code lên GitHub

```bash
cd office365-shop
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/m365keys.git
git push -u origin main
```

### 2. Import vào Vercel

1. Truy cập [vercel.com](https://vercel.com) → New Project
2. Import từ GitHub repository vừa tạo
3. Framework: **Next.js** (tự detect)
4. Thêm Environment Variables (xem bên dưới)
5. Deploy!

### 3. Environment Variables trên Vercel

| Variable | Giá trị |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (secret) |
| `SMTP_HOST` | smtp.gmail.com |
| `SMTP_PORT` | 587 |
| `SMTP_USER` | email@gmail.com |
| `SMTP_PASS` | App Password (Google) |
| `SMTP_FROM` | email@gmail.com |
| `NEXT_PUBLIC_BANK_ID` | MB (hoặc VCB, TCB...) |
| `NEXT_PUBLIC_BANK_ACCOUNT` | Số tài khoản nhận tiền |
| `NEXT_PUBLIC_BANK_ACCOUNT_NAME` | Tên chủ tài khoản |

---

## 📧 Cấu hình Gmail để gửi email

1. Vào Google Account → Security → 2-Step Verification (bật)
2. Security → App passwords → Tạo mật khẩu ứng dụng
3. Dùng mật khẩu đó làm `SMTP_PASS`

---

## 💳 Cấu hình SePay Webhook

1. Đăng ký tài khoản tại [sepay.vn](https://sepay.vn)
2. Kết nối tài khoản ngân hàng
3. Vào cài đặt Webhook → Thêm URL:
   ```
   https://your-domain.vercel.app/api/webhook-sepay
   ```
4. Chọn sự kiện: **Giao dịch nhận tiền**

### Format nội dung chuyển khoản
Webhook tìm kiếm nội dung theo format: `M365Keys ORDERID`

Ví dụ: `M365Keys LJ3K8X4512`

---

## 📦 Thêm key vào kho

Trong Supabase → Table Editor → `stock`:

```sql
-- Thêm nhiều key cho 1 sản phẩm
INSERT INTO stock (product_id, serial) VALUES
('PRODUCT-UUID', 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX'),
('PRODUCT-UUID', 'YYYYY-YYYYY-YYYYY-YYYYY-YYYYY');
```

---

## 🏗️ Cấu trúc project

```
office365-shop/
├── pages/
│   ├── index.js          # Trang chủ - sản phẩm
│   ├── dat-hang.js       # Trang đặt hàng
│   ├── thanh-toan.js     # Trang thanh toán VietQR
│   ├── huong-dan.js      # Trang hướng dẫn
│   ├── phan-hoi.js       # Trang phản hồi
│   └── api/
│       ├── webhook-sepay.js  # Nhận webhook thanh toán
│       ├── check-order.js    # Kiểm tra trạng thái đơn
│       └── check-discount.js # Kiểm tra mã giảm giá
├── components/
│   └── Layout.js         # Header, Footer, Chatbot
├── lib/
│   ├── supabase.js       # Supabase client
│   ├── bankConfig.js     # Cấu hình ngân hàng + VietQR
│   ├── email.js          # Gửi email key
│   └── toast.js          # Thông báo toast
├── styles/
│   └── globals.css       # CSS toàn bộ
├── supabase-schema.sql   # Schema database
└── vercel.json           # Cấu hình Vercel
```

---

## 🛠️ Chạy local

```bash
npm install
cp .env.local.example .env.local
# Điền các biến môi trường vào .env.local
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

---

## 🔄 Luồng thanh toán tự động

```
Khách chuyển khoản
    ↓
SePay nhận giao dịch
    ↓
SePay gọi webhook: /api/webhook-sepay
    ↓
Hệ thống tìm orderId trong nội dung CK
    ↓
Kiểm tra số tiền khớp với đơn hàng
    ↓
Lấy key từ bảng stock (chưa dùng)
    ↓
Gán key cho đơn hàng + cập nhật trạng thái
    ↓
Gửi email key cho khách hàng
    ↓
Trang thanh toán tự cập nhật → "Thành công"
```

---

## 📱 Ngân hàng hỗ trợ

MB, Vietcombank, Techcombank, BIDV, Vietinbank, ACB, TPBank, VPBank, MSB, OCB

---

## 📞 Hỗ trợ

Nếu gặp vấn đề khi triển khai, kiểm tra:
1. Supabase RLS policies có đúng không
2. Environment variables đã đầy đủ chưa
3. SePay webhook URL có đúng không
4. Gmail App Password đã tạo chưa
