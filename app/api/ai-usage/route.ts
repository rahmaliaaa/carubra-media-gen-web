import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/middleware/auth'
import { logAiUsage } from '@/lib/log'

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { apiName, action, model, prompt, promptTokens, completionTokens, totalTokens, quotaRemaining, metadata } = body
  if (!apiName || !action) {
    return NextResponse.json({ error: 'apiName and action are required' }, { status: 400 })
  }

  try {
    const log = await logAiUsage(user.id, user.email, apiName, model ?? null, promptTokens ?? null, completionTokens ?? null, totalTokens ?? null, quotaRemaining ?? null, {
      action,
      prompt,
      ...metadata,
    })

    return NextResponse.json({ success: true, log }, { status: 201 })
  } catch (error: any) {
    console.error('AI usage log failed:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to log AI usage' }, { status: 500 })
  }
}
