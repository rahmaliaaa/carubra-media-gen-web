-- SQL to create basic tables used by the app. Run this in Supabase SQL editor.
-- If you see "table not found in schema cache", re-run this script in your Supabase SQL editor
-- and refresh the table metadata in the Supabase dashboard after deployment.

-- Users table (if not present)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  name text,
  phone text,
  role text DEFAULT 'User',
  coins integer DEFAULT 0,
  password text,
  password_changes_used integer DEFAULT 0,
  membership_order text,
  is_banned boolean DEFAULT false,
  total_created_videos integer DEFAULT 0,
  connected_social_accounts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Example admin account: insert a user with role='Admin' and a bcrypt-hashed password.
-- Run this in Supabase SQL editor after creating the users table.
INSERT INTO public.users (email, name, role, password) VALUES ('adminkece@carubra.com', 'Admin Kece', 'Admin', '$2a$10$hbqC4rjLOT1YM1fvgOsAB.uHitJRNMQEC4iRh1Z4848uNV1osFT32');

-- Social connects
CREATE TABLE IF NOT EXISTS public.social_connects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  platform text,
  account_username text,
  account_id text,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Scheduled posts
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  platform text,
  content text,
  scheduled_at timestamptz,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Generated contents
CREATE TABLE IF NOT EXISTS public.generated_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  title text,
  content text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Helpful index for queries by user
CREATE INDEX IF NOT EXISTS idx_generated_contents_user_id ON public.generated_contents (user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON public.scheduled_posts (user_id);
CREATE INDEX IF NOT EXISTS idx_social_connects_user_id ON public.social_connects (user_id);

CREATE TABLE IF NOT EXISTS public.membership_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  coins integer NOT NULL,
  price text NOT NULL,
  description text,
  tag text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.membership_packages(id),
  coins_purchased integer DEFAULT 0,
  amount integer DEFAULT 0,
  payment_method text,
  payment_status text DEFAULT 'pending',
  xendit_invoice_id text,
  xendit_payment_url text,
  invoice_number text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_package_id ON public.transactions (package_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions (payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_email text,
  action text,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text,
  error_message text,
  status_code integer,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_email text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_email text,
  api_name text,
  model text,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  quota_remaining integer,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_error_logs_endpoint ON public.api_error_logs (endpoint);
CREATE INDEX IF NOT EXISTS idx_api_error_logs_created_at ON public.api_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_api_name ON public.ai_usage_logs (api_name);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs (created_at DESC);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;

-- Grant minimal privileges to anon (optional) - adjust for your environment
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_contents TO anon;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_posts TO anon;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_connects TO anon;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon;
