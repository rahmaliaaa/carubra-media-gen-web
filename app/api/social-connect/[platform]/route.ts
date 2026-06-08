import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/middleware/auth'
import { deleteOne } from '@/lib/supabase'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteOne('social_connects', { user_id: user.id, platform: params.platform })
    return NextResponse.json({ message: 'Disconnected successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
