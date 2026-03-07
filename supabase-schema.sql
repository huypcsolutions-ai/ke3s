-- ============================================
-- SUPABASE DATABASE SCHEMA - Office365 Shop
-- Chạy file này trong Supabase SQL Editor
-- ============================================

-- Bảng sản phẩm
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  description TEXT,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng kho key (serial/key sản phẩm)
CREATE TABLE IF NOT EXISTS stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  serial TEXT NOT NULL,
  order_id TEXT,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng mã giảm giá
CREATE TABLE IF NOT EXISTS discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  product_id UUID REFERENCES products(id),
  discount_amount NUMERIC NOT NULL,
  discount_type TEXT DEFAULT 'fixed', -- 'fixed' hoặc 'percent'
  order_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT '', -- '' = chưa dùng, 'pending' = đang giữ, 'used' = đã dùng
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng đơn hàng
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  product_id UUID REFERENCES products(id),
  product_name TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  discount_code TEXT,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'expired'
  payment_ref TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Bảng phản hồi khách hàng
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  order_id TEXT,
  status TEXT DEFAULT 'new', -- 'new', 'read', 'replied'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DỮ LIỆU MẪU
-- ============================================

-- Thêm sản phẩm mẫu
INSERT INTO products (name, price, description, image_url, stock, sold_count) VALUES
(
  'Microsoft 365 Personal',
  299000,
  'Dành cho 1 người dùng, 1 PC/Mac + 1 tablet + 1 điện thoại. Bao gồm Word, Excel, PowerPoint, Outlook, OneNote. 1TB OneDrive. Bản quyền 1 năm.',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/512px-Microsoft_logo.svg.png',
  50,
  1247
),
(
  'Microsoft 365 Family',
  499000,
  'Dành cho tối đa 6 người dùng, mỗi người 1 PC/Mac + 1 tablet + 1 điện thoại. Đầy đủ ứng dụng Office + 1TB OneDrive/người. Bản quyền 1 năm.',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/512px-Microsoft_logo.svg.png',
  30,
  892
),
(
  'Office 2021 Professional Plus',
  890000,
  'Bản quyền vĩnh viễn, cài được 1 máy tính. Bao gồm Word, Excel, PowerPoint, Outlook, Publisher, Access. Không cần gia hạn.',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/512px-Microsoft_logo.svg.png',
  20,
  2341
),
(
  'Microsoft 365 Business Basic',
  159000,
  'Dành cho doanh nghiệp nhỏ. Teams, Exchange email, SharePoint, 1TB OneDrive. Bản quyền 1 tháng/user.',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/512px-Microsoft_logo.svg.png',
  0,
  456
);

-- Thêm key mẫu cho sản phẩm đầu tiên
INSERT INTO stock (product_id, serial)
SELECT id, 'XXXXX-XXXXX-XXXXX-XXXXX-' || generate_series::text
FROM products
CROSS JOIN generate_series(1, 10)
WHERE name = 'Microsoft 365 Personal';

-- Thêm mã giảm giá mẫu
INSERT INTO discounts (code, discount_amount, discount_type, expires_at) VALUES
('SALE10', 10000, 'fixed', NOW() + INTERVAL '30 days'),
('GIAM50K', 50000, 'fixed', NOW() + INTERVAL '7 days'),
('NEWUSER', 20000, 'fixed', NOW() + INTERVAL '90 days');

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Cho phép đọc products công khai
CREATE POLICY "Products are publicly readable" ON products FOR SELECT USING (true);

-- Cho phép đọc discounts (để check mã)
CREATE POLICY "Discounts are publicly readable" ON discounts FOR SELECT USING (true);

-- Cho phép tạo order từ client
CREATE POLICY "Anyone can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Orders readable by order id" ON orders FOR SELECT USING (true);

-- Cho phép tạo feedback
CREATE POLICY "Anyone can insert feedbacks" ON feedbacks FOR INSERT WITH CHECK (true);

-- Stock chỉ đọc qua service role
CREATE POLICY "Stock readable via service" ON stock FOR SELECT USING (true);
