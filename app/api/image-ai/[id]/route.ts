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
    const images = await find('images', { id, user_id: user.id })
    const image = images?.[0] ?? null
    if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    return NextResponse.json({ image })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch image', detail: String(error) }, { status: 500 })
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
    const deleted = await deleteOne('images', { id, user_id: user.id })
    if (!deleted) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    return NextResponse.json({ message: 'Image deleted successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete image', detail: String(error) }, { status: 500 })
  }
}
