import { NextRequest, NextResponse } from 'next/server'
import { find, deleteOne } from '@/lib/supabase'
import { getUserFromRequest } from '@/middleware/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const videos = await find('videos', { id, user_id: user.id })
    const video = videos?.[0] ?? null
    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

    return NextResponse.json({ video })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch video', detail: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    await deleteOne('videos', { id, user_id: user.id })
    return NextResponse.json({ message: 'Video deleted successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete video', detail: String(error) }, { status: 500 })
  }
}
