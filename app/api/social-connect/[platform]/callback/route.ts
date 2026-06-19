import { NextRequest, NextResponse } from 'next/server'
import { findOne, insert, updateOne } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')
  const errorDescription = req.nextUrl.searchParams.get('error_description')
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    process.env.FRONTEND_URL?.replace(/\/$/, '') ||
    req.nextUrl.origin

  const redirectToApp = (message: string) =>
    NextResponse.redirect(`${baseUrl}/dashboard/auto-upload?error=${encodeURIComponent(message)}`)

  const sendError = (message: string) => {
    console.error(`[social-connect/callback] ${platform}: ${message}`)
    return redirectToApp(message)
  }

  if (error) {
    return redirectToApp(errorDescription || error)
  }

  const supportedPlatforms = ['youtube', 'facebook', 'instagram', 'twitter', 'tiktok']
  if (!supportedPlatforms.includes(platform)) {
    return sendError(`Callback for platform ${platform} is not supported.`)
  }

  if (!code || !state) {
    return sendError('Missing code or state in OAuth callback.')
  }

  console.log(`[social-connect/callback] platform=${platform} state=${state} origin=${req.nextUrl.origin}`)

  const now = new Date().toISOString()
  let accountId = ''
  let accountUsername = ''
  let accessToken = ''
  let refreshToken: string | null = null

  const isConfigured = (value?: string) => {
    const cleaned = value?.trim()
    return Boolean(cleaned && !/(your_|replace_|dummy|example|changeme)/i.test(cleaned.toLowerCase()))
  }

  const isLocalHost = baseUrl.startsWith('http://localhost') || baseUrl.startsWith('https://localhost') || baseUrl.startsWith('http://127.0.0.1') || baseUrl.startsWith('https://127.0.0.1')

  const getRedirectUri = (platform: string) => {
    const localMap: Record<string, string | undefined> = {
      youtube:
        process.env.YOUTUBE_REDIRECT_URI?.replace(/\/$/, ''),
      facebook:
        process.env.FACEBOOK_REDIRECT_URI?.replace(/\/$/, '') ||
        process.env.FB_REDIRECT_URI?.replace(/\/$/, ''),
      instagram:
        process.env.INSTAGRAM_REDIRECT_URI?.replace(/\/$/, '') ||
        process.env.IG_REDIRECT_URI?.replace(/\/$/, ''),
      tiktok:
        process.env.TIKTOK_REDIRECT_URI?.replace(/\/$/, ''),
      twitter:
        process.env.TWITTER_REDIRECT_URI?.replace(/\/$/, '') ||
        process.env.X_REDIRECT_URI?.replace(/\/$/, ''),
    }

    const prodMap: Record<string, string | undefined> = {
      youtube:
        process.env.YOUTUBE_REDIRECT_URI_VERCEL?.replace(/\/$/, '') ||
        process.env.YOUTUBE_REDIRECT_URI?.replace(/\/$/, ''),
      facebook:
        process.env.FACEBOOK_REDIRECT_URI_VERCEL?.replace(/\/$/, '') ||
        process.env.FACEBOOK_REDIRECT_URI?.replace(/\/$/, '') ||
        process.env.FB_REDIRECT_URI?.replace(/\/$/, ''),
      instagram:
        process.env.INSTAGRAM_REDIRECT_URI_VERCEL?.replace(/\/$/, '') ||
        process.env.INSTAGRAM_REDIRECT_URI?.replace(/\/$/, '') ||
        process.env.IG_REDIRECT_URI?.replace(/\/$/, ''),
      tiktok:
        process.env.TIKTOK_REDIRECT_URI_VERCEL?.replace(/\/$/, '') ||
        process.env.TIKTOK_REDIRECT_URI?.replace(/\/$/, ''),
      twitter:
        process.env.TWITTER_REDIRECT_URI_VERCEL?.replace(/\/$/, '') ||
        process.env.TWITTER_REDIRECT_URI?.replace(/\/$/, '') ||
        process.env.X_REDIRECT_URI?.replace(/\/$/, ''),
    }

    return (isLocalHost ? localMap[platform] : prodMap[platform]) || `${baseUrl}/api/social-connect/${platform}/callback`
  }

  // YouTube Handler
  if (platform === 'youtube') {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return sendError('Google OAuth credentials are not configured.')
    }

    const youtubeRedirectUri = getRedirectUri('youtube')
    console.log('[social-connect/callback] YouTube OAuth callback redirect_uri:', youtubeRedirectUri)
    
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
      return sendError(message)
    }

    accessToken = tokenData.access_token
    refreshToken = tokenData.refresh_token

    const youtubeResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const youtubeData = await youtubeResponse.json()
    if (!youtubeResponse.ok) {
      const message = youtubeData.error?.message || 'Failed to retrieve YouTube channel information.'
      return sendError(message)
    }

    const channel = youtubeData.items?.[0]
    if (!channel) {
      const message = 'Tidak dapat menemukan channel YouTube untuk akun ini. Pastikan akun Google ini memiliki channel YouTube dan Anda menggunakan akun yang benar.'
      return sendError(message)
    }

    accountId = channel.id
    accountUsername = channel.snippet?.title || accountId
  }

  // Facebook Handler
  else if (platform === 'facebook') {
    const clientId = process.env.FACEBOOK_APP_ID || process.env.FB_APP_ID
    const clientSecret = process.env.FACEBOOK_APP_SECRET || process.env.FB_APP_SECRET
    if (!isConfigured(clientId) || !isConfigured(clientSecret)) {
      return sendError('Facebook OAuth credentials are not configured or still use placeholder values. Please set FACEBOOK_APP_ID/FB_APP_ID and FACEBOOK_APP_SECRET/FB_APP_SECRET correctly.')
    }

    const fbRedirectUri = getRedirectUri('facebook')
    console.log('[social-connect/callback] Facebook OAuth callback redirect_uri:', fbRedirectUri)

    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: fbRedirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()
      if (!tokenResponse.ok || tokenData.error) {
      const message = tokenData.error?.message || 'Failed to exchange Facebook OAuth code.'
      return sendError(message)
    }

    accessToken = tokenData.access_token

    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${accessToken}`)
    const userData = await userResponse.json()
    if (!userResponse.ok || userData.error) {
      const message = userData.error?.message || 'Failed to retrieve Facebook user information.'
      return sendError(message)
    }

    // Prefer Page access token when available, because the app is expecting a Facebook Page connection.
    const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`)
    const pagesData = await pagesResponse.json()
    if (pagesResponse.ok && Array.isArray(pagesData.data) && pagesData.data.length > 0) {
      const page = pagesData.data[0]
      accountId = page.id
      accountUsername = page.name || userData.name || page.id
      accessToken = page.access_token || accessToken
    } else {
      accountId = userData.id
      accountUsername = userData.name || userData.id
    }
  }

  // Instagram Handler
  else if (platform === 'instagram') {
    // Two possible Instagram OAuth flows:
    // 1) Instagram Basic Display (api.instagram.com) — uses INSTAGRAM_CLIENT_ID/SECRET
    // 2) Instagram Graph (Business) via Facebook OAuth — uses FACEBOOK_APP_ID/SECRET and Page->instagram_business_account
    const igRedirectUri = getRedirectUri('instagram')
    console.log('[social-connect/callback] Instagram OAuth callback redirect_uri:', igRedirectUri)

    const fbAppId = process.env.FACEBOOK_APP_ID || process.env.FB_APP_ID
    const fbAppSecret = process.env.FACEBOOK_APP_SECRET || process.env.FB_APP_SECRET

    // If FB app credentials exist, prefer Graph flow (Facebook dialog start produces code for FB token exchange)
    if (fbAppId && fbAppSecret) {
      try {
        const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: fbAppId,
            client_secret: fbAppSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: igRedirectUri,
          }),
        })

        const tokenData = await tokenResponse.json()
        if (!tokenResponse.ok || tokenData.error) {
          throw new Error(tokenData.error?.message || 'Failed to exchange code via Facebook.')
        }

        accessToken = tokenData.access_token

        // Get pages with instagram_business_account field and page access tokens
        const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`)
        const pagesData = await pagesRes.json()
        if (pagesRes.ok && Array.isArray(pagesData.data)) {
          // find first page with instagram_business_account
          const page = pagesData.data.find((p: any) => p.instagram_business_account && p.instagram_business_account.id)
          if (page) {
            const igId = page.instagram_business_account.id
            const pageToken = page.access_token || accessToken
            const igRes = await fetch(`https://graph.facebook.com/${igId}?fields=id,username,name&access_token=${pageToken}`)
            const igData = await igRes.json()
            if (igRes.ok && !igData.error) {
              accountId = igData.id
              accountUsername = igData.username || igData.name || igData.id
              // use page token as access token for posting later
              accessToken = pageToken
            }
          }
        }

        // If we couldn't get IG account via page, fall back to Basic Display below
        if (!accountId) {
          throw new Error('Instagram Business account not found on any pages.')
        }
      } catch (err: any) {
        console.log('Instagram Graph flow failed, falling back to Basic Display:', err.message)
        // fall through to Basic Display flow
      }
    }

    // If Graph flow didn't produce accountId, try Basic Display exchange (existing behavior)
    if (!accountId) {
      const clientId = process.env.INSTAGRAM_CLIENT_ID || process.env.IG_CLIENT_ID
      const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.IG_CLIENT_SECRET
      if (!clientId || !clientSecret) {
        return sendError('Instagram OAuth credentials are not configured.')
      }

      const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: igRedirectUri,
        }),
      })

      const tokenData = await tokenResponse.json()
      if (!tokenResponse.ok || tokenData.error) {
        const message = tokenData.error?.message || 'Failed to exchange Instagram OAuth code.'
        return sendError(message)
      }

      accessToken = tokenData.access_token

      const userResponse = await fetch(`https://graph.instagram.com/v18.0/me?fields=id,username,name&access_token=${accessToken}`)
      const userData = await userResponse.json()
      if (!userResponse.ok || userData.error) {
        const message = userData.error?.message || 'Failed to retrieve Instagram user information.'
        return sendError(message)
      }

      accountId = userData.id
      accountUsername = userData.username || userData.name || userData.id
    }
  }

  else if (platform === 'tiktok') {
    const clientKey = process.env.TIKTOK_CLIENT_KEY || process.env.TIKTOK_CLIENT_ID
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET
    if (!clientKey || !clientSecret) {
      return sendError('TikTok OAuth credentials are not configured.')
    }

    const tiktokRedirectUri = getRedirectUri('tiktok')
    const tokenResponse = await fetch('https://open-api.tiktok.com/oauth/access_token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: tiktokRedirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || tokenData.error) {
      const message = tokenData.error_description || tokenData.error || 'Failed to exchange TikTok OAuth code.'
      return sendError(message)
    }

    accessToken = tokenData.data?.access_token || tokenData.data?.accessToken || tokenData.access_token
    accountId = tokenData.data?.open_id || tokenData.data?.openId || tokenData.open_id || tokenData.openId || state
    accountUsername = accountId
  }

  else if (platform === 'twitter') {
    const clientId = process.env.TWITTER_CLIENT_ID || process.env.X_CLIENT_ID
    const clientSecret = process.env.TWITTER_CLIENT_SECRET || process.env.X_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return sendError('Twitter OAuth credentials are not configured.')
    }

    const twitterRedirectUri = getRedirectUri('twitter')
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: twitterRedirectUri,
        code_verifier: 'challenge',
      }),
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || tokenData.error) {
      const message = tokenData.error_description || tokenData.error || 'Failed to exchange Twitter OAuth code.'
      return sendError(message)
    }

    accessToken = tokenData.access_token
    refreshToken = tokenData.refresh_token || null

    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userData = await userResponse.json()
    if (!userResponse.ok || userData.error) {
      const message = userData.error?.message || 'Failed to retrieve Twitter user information.'
      return sendError(message)
    }

    accountId = userData.data?.id || ''
    accountUsername = userData.data?.username || userData.data?.name || accountId
  }

  else {
    return sendError(`Callback handler for platform ${platform} not yet implemented.`)
  }

  const existing = await findOne('social_connects', { user_id: state, platform })
  const connectionData: any = {
    user_id: state,
    platform,
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
    await updateOne('social_connects', { user_id: state, platform }, connectionData)
  }

  return NextResponse.redirect(`${baseUrl}/dashboard/auto-upload`)
}
