-- ============================================================================
-- Carubra Database Schema for Supabase (PostgreSQL)
-- Updated: Full requirement alignment
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users Table
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'User' CHECK (role IN ('Admin', 'Developer', 'User')),
  password_changes_used INTEGER DEFAULT 0,
  password_changes_max INTEGER DEFAULT 5,
  membership_order TEXT DEFAULT NULL, -- di-generate saat user mendaftar (7 karakter alphanumeric acak)
  total_created_videos INTEGER DEFAULT 0,
  total_created_images INTEGER DEFAULT 0,
  connected_social_accounts INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0, -- default 0 sesuai requirement
  preferred_language TEXT DEFAULT 'id' CHECK (preferred_language IN ('id', 'en')),
  preferred_theme TEXT DEFAULT 'dark' CHECK (preferred_theme IN ('dark', 'light')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_membership_order ON users(membership_order);

-- Function: generate 7-karakter alphanumeric acak untuk membership_order
CREATE OR REPLACE FUNCTION generate_membership_order()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger: otomatis generate membership_order saat user baru dibuat
CREATE OR REPLACE FUNCTION set_membership_order()
RETURNS TRIGGER AS $$
DECLARE
  new_order TEXT;
  is_unique BOOLEAN := FALSE;
BEGIN
  IF NEW.membership_order IS NULL THEN
    LOOP
      new_order := generate_membership_order();
      -- Pastikan unik
      SELECT NOT EXISTS (
        SELECT 1 FROM users WHERE membership_order = new_order
      ) INTO is_unique;
      EXIT WHEN is_unique;
    END LOOP;
    NEW.membership_order := new_order;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_membership_order
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION set_membership_order();

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Membership Packages Table
-- ============================================================================
CREATE TABLE membership_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                          -- 'Pemula', 'Profesional', 'Content Creator', 'Pro Max'
  coins INTEGER NOT NULL,                      -- 100, 300, 500, 1000
  price INTEGER NOT NULL,                      -- harga dalam Rupiah
  description TEXT,                            -- deskripsi paket
  tag TEXT,                                    -- 'Untuk Pemula', 'Paling Populer', dll
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data membership packages
INSERT INTO membership_packages (name, coins, price, description, tag) VALUES
  ('Starter', 100, 15000, 'Cocok untuk pengguna baru yang ingin mencoba fitur AI', 'Untuk Pemula'),
  ('Professional', 300, 40000, 'Ideal untuk kreator konten yang aktif membuat konten harian', 'Paling Populer'),
  ('Creator', 500, 60000, 'Untuk content creator profesional dengan kebutuhan tinggi', 'Untuk Content Creator'),
  ('Pro Max', 1000, 100000, 'Akses penuh tanpa batas untuk tim dan agensi kreatif', 'Terbaik untuk Tim');

-- ============================================================================
-- Transactions Table (pembelian koin / membership)
-- ============================================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES membership_packages(id),
  coins_purchased INTEGER NOT NULL,
  amount INTEGER NOT NULL,                     -- harga bayar (Rupiah)
  payment_method TEXT,                         -- 'credit_card', 'bank_transfer', 'qris', dll
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  xendit_invoice_id TEXT,                      -- ID invoice dari Xendit
  xendit_payment_url TEXT,                     -- URL pembayaran Xendit
  invoice_number TEXT UNIQUE,                  -- nomor invoice internal (INV-YYYYMMDD-XXXX)
  payment_proof_url TEXT,                      -- URL bukti pembayaran
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(payment_status);
CREATE INDEX idx_transactions_xendit ON transactions(xendit_invoice_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

CREATE TRIGGER trigger_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function: generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

-- ============================================================================
-- Videos Table
-- ============================================================================
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,                                  -- judul script / video (untuk history)
  prompt TEXT NOT NULL,                        -- script / prompt dari user
  model TEXT DEFAULT 'text-to-video' CHECK (model IN ('text-to-video', 'image-to-video')),
  source_image_url TEXT,                       -- jika model = image-to-video
  resolution TEXT DEFAULT '480p' CHECK (resolution IN ('480p', '720p')),
  aspect_ratio TEXT DEFAULT '16:9' CHECK (aspect_ratio IN ('2:3', '3:2', '1:1', '16:9', '9:16')),
  duration INTEGER DEFAULT 30 CHECK (duration BETWEEN 1 AND 60), -- maks 60 detik
  coins_used INTEGER DEFAULT 2,                -- 2 koin 480p, 3 koin 720p
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  job_id TEXT,
  video_url TEXT,
  caption TEXT,                                -- caption yang di-generate
  generation_time_seconds INTEGER,             -- berapa detik proses generate
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_user_created ON videos(user_id, created_at DESC);
CREATE INDEX idx_videos_status ON videos(status);

CREATE TRIGGER trigger_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Images Table
-- ============================================================================
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,                                  -- judul untuk history
  prompt TEXT NOT NULL,
  model TEXT DEFAULT 'text-to-image' CHECK (model IN ('text-to-image', 'image-to-image')),
  source_image_url TEXT,                       -- jika model = image-to-image
  aspect_ratio TEXT DEFAULT '1:1' CHECK (aspect_ratio IN (
    '1:1', '9:16', '16:9', '3:4', '4:3', '4:5', '5:4', '3:2', '2:3', '21:9'
  )),
  -- resolusi aktual (di-resolve dari aspect_ratio, maks 2K)
  width INTEGER DEFAULT 1024,
  height INTEGER DEFAULT 1024,
  steps INTEGER DEFAULT 4,
  cfg_scale NUMERIC DEFAULT 1,
  coins_used INTEGER DEFAULT 1,                -- 1 koin per generate
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  image_url TEXT,
  caption TEXT,                                -- caption yang diminta/di-generate
  generation_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_images_user_id ON images(user_id);
CREATE INDEX idx_images_user_created ON images(user_id, created_at DESC);
CREATE INDEX idx_images_status ON images(status);

CREATE TRIGGER trigger_images_updated_at
  BEFORE UPDATE ON images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Social Connects Table
-- ============================================================================
CREATE TABLE social_connects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'youtube', 'twitter', 'threads', 'whatsapp')),
  account_username TEXT NOT NULL,
  account_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, account_id)
);

CREATE INDEX idx_social_connects_user_id ON social_connects(user_id);
CREATE INDEX idx_social_connects_platform ON social_connects(platform);
CREATE INDEX idx_social_connects_status ON social_connects(status);

CREATE TRIGGER trigger_social_connects_updated_at
  BEFORE UPDATE ON social_connects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Scheduled Posts Table
-- ============================================================================
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- sumber konten
  media_source TEXT DEFAULT 'upload' CHECK (media_source IN ('upload', 'generated_video', 'generated_image')),
  generated_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  generated_image_id UUID REFERENCES images(id) ON DELETE SET NULL,
  -- konten
  caption TEXT DEFAULT '',
  media_url TEXT,
  media_name TEXT,
  media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image', 'video')),
  -- jadwal
  scheduled_date DATE,
  scheduled_time TIME,
  -- platform & status
  platforms TEXT[] DEFAULT ARRAY[]::TEXT[],   -- ['instagram', 'tiktok', 'youtube', ...]
  post_types JSONB DEFAULT '{}'::jsonb,        -- config per platform jika berbeda
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'posted', 'failed', 'draft', 'cancelled')),
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_user_created ON scheduled_posts(user_id, created_at DESC);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_date ON scheduled_posts(scheduled_date);

CREATE TRIGGER trigger_scheduled_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Members Table
-- ============================================================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  role TEXT DEFAULT 'Viewer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_members_user_id ON members(user_id);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_status ON members(status);

-- ============================================================================
-- Content Analysis Table
-- ============================================================================
CREATE TABLE content_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB DEFAULT NULL,                   -- stores {title, description, imgCount, words, httpStatus, fetchedAt}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_analysis_user_id ON content_analysis(user_id);
CREATE INDEX idx_content_analysis_status ON content_analysis(status);
CREATE INDEX idx_content_analysis_user_created ON content_analysis(user_id, created_at DESC);

CREATE TRIGGER trigger_content_analysis_updated_at
  BEFORE UPDATE ON content_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analysis ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY users_select ON users
  FOR SELECT USING (auth.uid()::text = id::text OR role IN ('Admin', 'Developer'));
CREATE POLICY users_update ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Membership packages: semua user bisa lihat
CREATE POLICY packages_select ON membership_packages
  FOR SELECT USING (TRUE);

-- Transactions: user hanya lihat milik sendiri
CREATE POLICY transactions_select ON transactions
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY transactions_insert ON transactions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Videos
CREATE POLICY videos_select ON videos
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY videos_insert ON videos
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY videos_update ON videos
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY videos_delete ON videos
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Images
CREATE POLICY images_select ON images
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY images_insert ON images
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY images_update ON images
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY images_delete ON images
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Social Connects
CREATE POLICY social_connects_select ON social_connects
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY social_connects_insert ON social_connects
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY social_connects_update ON social_connects
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY social_connects_delete ON social_connects
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Scheduled Posts
CREATE POLICY scheduled_posts_select ON scheduled_posts
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY scheduled_posts_insert ON scheduled_posts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY scheduled_posts_update ON scheduled_posts
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY scheduled_posts_delete ON scheduled_posts
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Members
CREATE POLICY members_select ON members
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY members_insert ON members
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY members_update ON members
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY members_delete ON members
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Content Analysis
CREATE POLICY content_analysis_select ON content_analysis
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY content_analysis_insert ON content_analysis
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY content_analysis_update ON content_analysis
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY content_analysis_delete ON content_analysis
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- Helper Views (opsional, mempermudah query di backend)
-- ============================================================================

-- View: ringkasan profil user
CREATE VIEW user_profile_summary AS
SELECT
  u.id,
  u.email,
  u.name,
  u.phone,
  u.role,
  u.membership_order,
  u.coins,
  u.password_changes_used,
  u.password_changes_max,
  u.total_created_videos,
  u.total_created_images,
  u.connected_social_accounts,
  u.preferred_language,
  u.preferred_theme,
  u.created_at
FROM users u;

-- View: history transaksi dengan nama paket
CREATE VIEW transaction_history AS
SELECT
  t.id,
  t.user_id,
  t.coins_purchased,
  t.amount,
  t.payment_method,
  t.payment_status,
  t.invoice_number,
  t.payment_proof_url,
  t.xendit_payment_url,
  t.paid_at,
  t.created_at,
  mp.name AS package_name,
  mp.tag AS package_tag
FROM transactions t
LEFT JOIN membership_packages mp ON t.package_id = mp.id;

-- View: history video dengan info generate
CREATE VIEW video_history AS
SELECT
  v.id,
  v.user_id,
  v.title,
  v.prompt,
  v.model,
  v.resolution,
  v.aspect_ratio,
  v.duration,
  v.coins_used,
  v.status,
  v.video_url,
  v.caption,
  v.generation_time_seconds,
  v.created_at,
  v.updated_at
FROM videos v;

-- View: history image dengan info generate
CREATE VIEW image_history AS
SELECT
  i.id,
  i.user_id,
  i.title,
  i.prompt,
  i.model,
  i.aspect_ratio,
  i.width,
  i.height,
  i.coins_used,
  i.status,
  i.image_url,
  i.caption,
  i.generation_time_seconds,
  i.created_at,
  i.updated_at
FROM images i;