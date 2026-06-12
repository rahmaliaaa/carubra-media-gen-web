import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/middleware/auth'
import { findOne, updateOne } from '@/lib/supabase'

export async function PUT(req: NextRequest) {
  const authUser = getUserFromRequest(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = await req.json()

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All password fields are required' }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Password confirmation does not match' }, { status: 400 })
    }

    const userRow = await findOne('users', { id: authUser.id })
    if (!userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isValid = await bcrypt.compare(currentPassword, userRow.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    const nextCount = (userRow.password_changes_used ?? 0) + 1

    const updatedUser = await updateOne('users', { id: authUser.id }, {
      password: hashedPassword,
      password_changes_used: nextCount,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({
      user: {
        passwordChangesUsed: updatedUser.password_changes_used ?? nextCount,
      },
    })
  } catch (error: any) {
    console.error('[PUT /api/users/password]', error)
    return NextResponse.json({ error: error?.message ?? 'Password update failed' }, { status: 500 })
  }
}
