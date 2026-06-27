-- Tambah kolom avatar ke tabel users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar text;
