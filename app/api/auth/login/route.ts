import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { generateToken } from '@/middleware/auth'
import { findOne, insert } from '@/lib/supabase'
import { logUserActivity, logApiError } from '@/lib/log'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 })
    }

    // Cek apakah user ada di database
    const user = await findOne('users', { email })

    // User tidak ditemukan
    if (!user) {
      return NextResponse.json(
        { error: 'Akun tidak ditemukan, silahkan melakukan register' },
        { status: 404 }
      )
    }

    // User diblokir
    if (user.is_banned) {
      await logApiError('/api/auth/login', 'Blocked account login attempt', 403, user.id, user.email).catch(() => null)
      return NextResponse.json({ error: 'Akun ini diblokir' }, { status: 403 })
    }

    // Cek password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      await logApiError('/api/auth/login', 'Login gagal (Password salah)', 401, user.id, user.email).catch(() => null)
      return NextResponse.json({ error: 'Login gagal (username/password salah)' }, { status: 401 })
    }

    // Login berhasil
    const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role })
    await logUserActivity(user.id, user.email, 'user.login', 'User logged in').catch(() => null)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone ?? null,
        role: user.role ?? 'User',
        avatar: user.avatar ?? null,
        passwordChangesUsed: user.password_changes_used ?? 0,
        membershipOrder: user.membership_order ?? 'A7B9C2D',
        totalCreatedVideos: user.total_created_videos ?? 0,
        connectedSocialAccounts: user.connected_social_accounts ?? 0,
        coins: user.coins ?? 0,
      },
      token,
    })
  } catch (error: any) {
    console.error('Login error:', error)
    await logApiError('/api/auth/login', error.message ?? 'Login failed', 500, null, null).catch(() => null)
    return NextResponse.json({ error: 'Login gagal: ' + error.message }, { status: 500 })
  }
}
