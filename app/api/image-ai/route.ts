import { NextRequest, NextResponse } from 'next/server'
import { find } from '@/lib/supabase'
import { getUserFromRequest } from '@/middleware/auth'

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const userImages = await find(
      'images',
      { user_id: user.id },
      { orderBy: 'created_at', ascending: false }
    )
    return NextResponse.json({ images: userImages })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch images', detail: String(error) }, { status: 500 })
  }
}
