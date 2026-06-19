import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const verifyToken = process.env.TIKTOK_WEBHOOK_VERIFY_TOKEN
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  // Webhook verification
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✓ TikTok Webhook verified')
    return new Response(challenge ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  } else {
    console.log('✗ TikTok Webhook verification failed')
    return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 })
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-tiktok-signature')
  const body = await req.text()

  // Verify TikTok signature
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  if (signature && clientSecret) {
    const hmac = crypto.createHmac('sha256', clientSecret)
    hmac.update(body)
    const expectedSignature = hmac.digest('hex')

    if (signature !== expectedSignature) {
      console.log('✗ TikTok Webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
  }

  const data = JSON.parse(body)

  console.log('📥 TikTok Webhook received:', {
    type: data.type,
    timestamp: new Date().toISOString(),
  })

  // Webhook event handler
  if (data.data?.video) {
    console.log('🎬 TikTok Video event:', {
      videoId: data.data.video.id,
      title: data.data.video.title,
      viewCount: data.data.video.view_count,
    })
  }

  if (data.data?.user) {
    console.log('👤 TikTok User event:', {
      userId: data.data.user.id,
      username: data.data.user.username,
    })
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
