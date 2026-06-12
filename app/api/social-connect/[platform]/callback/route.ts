import { NextRequest, NextResponse } from 'next/server'
import { findOne, insert, updateOne } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  const platform = params.platform
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    process.env.FRONTEND_URL?.replace(/\/$/, '') ||
    req.nextUrl.origin

  if (error) {
    return NextResponse.redirect(`${baseUrl}/dashboard/auto-upload?error=${encodeURIComponent(error)}`)
  }

  if (platform !== 'youtube') {
    return NextResponse.json({ error: `Callback for platform ${platform} is not supported` }, { status: 400 })
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state in OAuth callback' }, { status: 400 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Google OAuth credentials are not configured' }, { status: 500 })
  }

  const youtubeRedirectUri =
    process.env.YOUTUBE_REDIRECT_URI?.replace(/\/$/, '') ||
    `${baseUrl}/api/social-connect/youtube/callback`
  console.log('YouTube OAuth callback redirect_uri:', youtubeRedirectUri)
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: youtubeRedirectUri,
    }),
  })

  const tokenData = await tokenResponse.json()
  if (!tokenResponse.ok) {
    const message = tokenData.error_description || tokenData.error || 'Failed to exchange Google OAuth code.'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const accessToken = tokenData.access_token
  const refreshToken = tokenData.refresh_token

  const youtubeResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const youtubeData = await youtubeResponse.json()
  if (!youtubeResponse.ok) {
    const message = youtubeData.error?.message || 'Failed to retrieve YouTube channel information.'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const channel = youtubeData.items?.[0]
  if (!channel) {
    return NextResponse.json({
      error: 'Tidak dapat menemukan channel YouTube untuk akun ini. Pastikan akun Google ini memiliki channel YouTube dan Anda menggunakan akun yang benar.',
      youtubeData,
    }, { status: 400 })
  }

  const accountId = channel.id
  const accountUsername = channel.snippet?.title || accountId
  const now = new Date().toISOString()

  const existing = await findOne('social_connects', { user_id: state, platform: 'youtube' })
  const connectionData: any = {
    user_id: state,
    platform: 'youtube',
    account_username: accountUsername,
    account_id: accountId,
    access_token: accessToken,
    status: 'active',
    updated_at: now,
  }

  if (refreshToken) {
    connectionData.refresh_token = refreshToken
  }

  if (!existing) {
    connectionData.created_at = now
    await insert('social_connects', connectionData)
  } else {
    await updateOne('social_connects', { user_id: state, platform: 'youtube' }, connectionData)
  }

  return NextResponse.redirect(`${baseUrl}/dashboard/auto-upload`)
}
