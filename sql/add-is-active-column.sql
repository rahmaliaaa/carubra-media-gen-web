-- Tambahkan kolom is_active di membership_packages agar tidak error saat create-invoice
ALTER TABLE public.membership_packages ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
