import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/middleware/auth'
import { getSupabaseAdmin, updateOne } from '@/lib/supabase'

const AVATAR_BUCKET = 'avatars'

/** Pastikan bucket ada, buat kalau belum */
async function ensureBucket() {
  const supabase = await getSupabaseAdmin()

  // Cek apakah bucket sudah ada
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
  if (listErr) throw listErr

  const exists = buckets?.some(b => b.id === AVATAR_BUCKET)
  if (!exists) {
    const { error: createErr } = await supabase.storage.createBucket(AVATAR_BUCKET, {
      public: true,               // URL publik agar foto bisa ditampilkan
      fileSizeLimit: 5 * 1024 * 1024, // maks 5 MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    })
    if (createErr) throw createErr
    console.log(`[avatar] Bucket "${AVATAR_BUCKET}" berhasil dibuat`)
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang dikirim' }, { status: 400 })
    }

    // Validasi tipe
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' },
        { status: 400 }
      )
    }

    // Validasi ukuran (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maks 5 MB.' },
        { status: 400 }
      )
    }

    // Auto-create bucket kalau belum ada
    await ensureBucket()

    // Upload file
    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext    = file.type.split('/')[1].replace('jpeg', 'jpg')
    const path   = `${user.id}/avatar.${ext}`

    const supabase = await getSupabaseAdmin()
    const storage  = supabase.storage.from(AVATAR_BUCKET)

    const { error: uploadErr } = await storage.upload(path, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: true,   // overwrite kalau sudah ada
    })
    if (uploadErr) throw uploadErr

    // Ambil public URL
    const { data: urlData } = storage.getPublicUrl(path)
    const publicUrl = urlData?.publicUrl
    if (!publicUrl) throw new Error('Gagal mendapatkan public URL')

    // Tambah cache-bust agar browser reload foto baru
    const avatarUrl = `${publicUrl}?t=${Date.now()}`

    // Simpan URL ke tabel users
    const updated = await updateOne('users', { id: user.id }, {
      avatar:     avatarUrl,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ avatarUrl, user: updated })

  } catch (error: any) {
    console.error('[avatar upload]', error)
    return NextResponse.json(
      { error: error.message ?? 'Gagal mengupload foto profil' },
      { status: 500 }
    )
  }
}
