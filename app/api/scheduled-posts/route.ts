import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/middleware/auth'
import { find, insert } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

const toClient = (doc: any) => ({
  id: doc.id,
  _id: doc.id,
  mediaSource: doc.media_source ?? 'upload',
  generatedContentId: doc.generated_content_id ?? null,
  caption: doc.caption ?? '',
  mediaUrl: doc.media_url ?? null,
  mediaName: doc.media_name ?? null,
  mediaType: doc.media_type ?? null,
  postTypes: doc.post_types ?? {},
  date: doc.date ?? '',
  time: doc.time ?? '',
  platforms: doc.platforms ?? [],
  status: doc.status ?? 'scheduled',
  createdAt: doc.created_at,
})

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const docs = await find('scheduled_posts', { user_id: user.id }, { orderBy: 'created_at', ascending: false })
    return NextResponse.json({ posts: docs.map(toClient) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const {
      mediaSource, generatedContentId, caption,
      mediaUrl, mediaName, mediaType,
      postTypes, date, time, platforms, status,
    } = await req.json()

    const doc = {
      id: uuidv4(),
      user_id: user.id,
      media_source: mediaSource === 'generated' ? 'generated' : 'upload',
      generated_content_id: typeof generatedContentId === 'string' ? generatedContentId : null,
      caption: caption ?? '',
      media_url: mediaUrl ?? null,
      media_name: mediaName ?? null,
      media_type: ['image', 'video'].includes(mediaType) ? mediaType : null,
      post_types: typeof postTypes === 'object' && postTypes ? postTypes : {},
      date: date ?? '',
      time: time ?? '',
      platforms: Array.isArray(platforms) ? platforms : [],
      status: status ?? 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const result = await insert('scheduled_posts', doc)
    return NextResponse.json({ post: toClient(result) }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
