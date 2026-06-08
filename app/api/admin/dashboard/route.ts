import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, isAdminUser } from '@/lib/admin'
import { find } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!isAdminUser(admin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await find('users', {}, { orderBy: 'created_at', ascending: false, limit: 200 })
  const contents = await find('generated_contents', {}, { orderBy: 'created_at', ascending: false, limit: 200 })

  const adminCount = users.filter((user: any) => user.role?.toString().toLowerCase().includes('admin')).length
  const totalCoins = users.reduce((sum: number, user: any) => sum + (Number(user.coins) || 0), 0)
  const bannedCount = users.filter((user: any) => user.is_banned).length
  const membershipCount = users.filter((user: any) => user.membership_order).length

  return NextResponse.json({
    totalUsers: users.length,
    adminCount,
    totalCoins,
    contentCount: contents.length,
    bannedUsers: bannedCount,
    membershipUsers: membershipCount,
  })
}
