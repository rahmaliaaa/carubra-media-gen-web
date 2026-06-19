import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../middleware/auth'
import { publishDueScheduledPosts } from '../../../../lib/socialPublish'

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await publishDueScheduledPosts(user.id)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process scheduled posts' }, { status: 500 })
  }
}
