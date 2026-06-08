import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/middleware/auth'
import { find } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const docs = await find('generated_contents', { user_id: user.id }, { orderBy: 'created_at', ascending: false })
    const contents = docs.map((doc: any) => ({
      _id: doc.id,
      mediaUrl: doc.media_url,
      mediaType: doc.media_type,
      prompt: doc.prompt,
      createdAt: doc.created_at,
    }))
    return NextResponse.json({ contents })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
