import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const verifyToken = process.env.IG_WEBHOOK_VERIFY_TOKEN
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  // Webhook verification
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✓ Instagram Webhook verified')
    return new Response(challenge ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  } else {
    console.log('✗ Instagram Webhook verification failed')
    return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  
  console.log('📥 Instagram Webhook received:', {
    object: body.object,
    entry: body.entry?.[0]?.changes?.[0]?.field,
    timestamp: new Date().toISOString(),
  })

  // Webhook event handler
  if (body.object === 'instagram') {
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]

    if (changes) {
      const field = changes.field
      const value = changes.value

      // Handle different Instagram events
      switch (field) {
        case 'story':
          console.log('📖 Instagram Story event:', value)
          break
        case 'feed':
          console.log('📸 Instagram Feed event:', value)
          break
        case 'messages':
          console.log('💬 Instagram Message event:', value)
          break
        default:
          console.log('📢 Instagram Event:', field, value)
      }
    }
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
