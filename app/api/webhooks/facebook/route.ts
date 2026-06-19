import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const verifyToken = process.env.FB_WEBHOOK_VERIFY_TOKEN
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  // Webhook verification
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✓ Facebook Webhook verified')
    return new Response(challenge ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  } else {
    console.log('✗ Facebook Webhook verification failed')
    return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  
  console.log('📥 Facebook Webhook received:', {
    object: body.object,
    entry: body.entry?.[0]?.messaging?.[0]?.sender?.id,
    timestamp: new Date().toISOString(),
  })

  // Webhook event handler
  if (body.object === 'page') {
    const entry = body.entry?.[0]

    if (entry?.messaging) {
      const messaging = entry.messaging[0]
      const sender = messaging.sender.id
      const recipient = messaging.recipient.id

      if (messaging.message) {
        console.log('💬 Facebook Message from', sender, ':', messaging.message.text)
      }
      if (messaging.postback) {
        console.log('🔘 Facebook Postback from', sender, ':', messaging.postback.payload)
      }
    }
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
