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
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    let user = await findOne('users', { email })
    let isNewUser = false

    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10)
      const newUser = {
        id: uuidv4(),
        email,
        password: hashedPassword,
        name: email.split('@')[0],
        role: email.includes('admin') ? 'Admin' : 'User',
        password_changes_used: 0,
        membership_order: 'A7B9C2D',
        total_created_videos: 0,
        connected_social_accounts: 0,
        coins: 0,
        is_banned: false,
      }
      const inserted = await insert('users', newUser)
      user = inserted ?? newUser
      isNewUser = true
    }

    if (user.is_banned) {
      await logApiError('/api/auth/login', 'Blocked account login attempt', 403, user.id, user.email).catch(() => null)
      return NextResponse.json({ error: 'Akun ini diblokir' }, { status: 403 })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      await logApiError('/api/auth/login', 'Invalid credentials', 401, user.id, user.email).catch(() => null)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = generateToken({ id: user.id, email: user.email, name: user.name })
    await logUserActivity(user.id, user.email, isNewUser ? 'user.signup' : 'user.login', isNewUser ? 'New user registered and logged in' : 'User logged in').catch(() => null)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone ?? null,
        role: user.role ?? 'User',
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
    return NextResponse.json({ error: 'Login failed: ' + error.message }, { status: 500 })
  }
}
