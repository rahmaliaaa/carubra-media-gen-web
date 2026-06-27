import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/middleware/auth'

// OAuth start endpoint - returns redirect URL for each platform
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // const { platform } = await params
  const paramsData = await params
  const platform = paramsData.platform == 'x' ? 'twitter' : paramsData.platform // normalize 'x' to 'twitter'
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    process.env.FRONTEND_URL?.replace(/\/$/, '') ||
    req.nextUrl.origin

  const isLocalHost = baseUrl.startsWith('http://localhost') || baseUrl.startsWith('https://localhost') || baseUrl.startsWith('http://127.0.0.1') || baseUrl.startsWith('https://127.0.0.1')

  const normalizeUri = (uri?: string) => {
    const cleaned = uri?.trim().replace(/\/$/, '')
    return cleaned ? cleaned : undefined
  }

  const isConfigured = (value?: string) => {
    const cleaned = value?.trim()
    return Boolean(cleaned && !/(your_|replace_|dummy|example|changeme)/i.test(cleaned.toLowerCase()))
  }

  const envExists = (key: string) => isConfigured(process.env[key])

  const getRedirectUri = (platform: string) => {
    const localMap: Record<string, string | undefined> = {
      instagram:
        normalizeUri(process.env.INSTAGRAM_REDIRECT_URI) ||
        normalizeUri(process.env.IG_REDIRECT_URI),
      youtube:
        normalizeUri(process.env.YOUTUBE_REDIRECT_URI),
      tiktok:
        normalizeUri(process.env.TIKTOK_REDIRECT_URI),
      facebook:
        normalizeUri(process.env.FACEBOOK_REDIRECT_URI) ||
        normalizeUri(process.env.FB_REDIRECT_URI),
      twitter:
        normalizeUri(process.env.TWITTER_REDIRECT_URI) ||
        normalizeUri(process.env.X_REDIRECT_URI),
      threads:
        normalizeUri(process.env.THREADS_REDIRECT_URI),
    }

    const prodMap: Record<string, string | undefined> = {
      instagram:
        process.env.INSTAGRAM_REDIRECT_URI_VERCEL?.replace(/\/$/, '') ||
        process.env.INSTAGRAM_REDIRECT_URI?.replace(/\/$/, '') ||
        process.env.IG_REDIRECT_URI?.replace(/\/$/, ''),
      youtube:
        process.env.YOUTUBE_REDIRECT_URI_VERCEL?.replace(/\/$/, '') ||
        process.env.YOUTUBE_REDIRECT_URI?.replace(/\/$/, ''),
      tiktok:
        process.env.TIKTOK_REDIRECT_URI_VERCEL?.replace(/\/$/, '') ||
        process.env.TIKTOK_REDIRECT_URI?.replace(/\/$/, ''),
      facebook:
        process.env.FACEBOOK_REDIRECT_URI_VERCEL?.replace(/\/$/, '') ||
        process.env.FACEBOOK_REDIRECT_URI?.replace(/\/$/, '') ||
        process.env.FB_REDIRECT_URI?.replace(/\/$/, ''),
      twitter:
        process.env.TWITTER_REDIRECT_URI_VERCEL?.replace(/\/$/, '') ||
        process.env.TWITTER_REDIRECT_URI?.replace(/\/$/, '') ||
        process.env.X_REDIRECT_URI?.replace(/\/$/, ''),
      threads:
        process.env.THREADS_REDIRECT_URI_VERCEL?.replace(/\/$/, '') ||
        process.env.THREADS_REDIRECT_URI?.replace(/\/$/, ''),
    }

    return (isLocalHost ? localMap[platform] : prodMap[platform]) || `${baseUrl}/api/social-connect/${platform}/callback`
  }

  const instagramRedirectUri = getRedirectUri('instagram')
  const youtubeRedirectUri = getRedirectUri('youtube')
  const tiktokRedirectUri = getRedirectUri('tiktok')
  const facebookRedirectUri = getRedirectUri('facebook')
  const twitterRedirectUri = getRedirectUri('twitter')
  const threadsRedirectUri = getRedirectUri('threads')

  console.log('[social-connect/start] platform=%s baseUrl=%s instagramRedirectUri=%s facebookRedirectUri=%s youtubeRedirectUri=%s tiktokRedirectUri=%s twitterRedirectUri=%s threadsRedirectUri=%s', platform, baseUrl, instagramRedirectUri, facebookRedirectUri, youtubeRedirectUri, tiktokRedirectUri, twitterRedirectUri, threadsRedirectUri)

  const hasFacebookAppId = envExists('FACEBOOK_APP_ID') || envExists('FB_APP_ID')
  const hasFacebookAppSecret = envExists('FACEBOOK_APP_SECRET') || envExists('FB_APP_SECRET')
  const hasInstagramAppId = envExists('INSTAGRAM_CLIENT_ID') || envExists('IG_CLIENT_ID')
  const hasInstagramAppSecret = envExists('INSTAGRAM_CLIENT_SECRET') || envExists('IG_CLIENT_SECRET')

  const oauthUrls: Record<string, string> = {
    // Prefer Instagram Graph (Business) via Facebook dialog when FB app id and secret exist
    instagram: hasFacebookAppId && hasFacebookAppSecret
      ? `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID || process.env.FB_APP_ID}&redirect_uri=${encodeURIComponent(instagramRedirectUri)}&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement&response_type=code&state=${encodeURIComponent(user.id)}`
      : `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID || process.env.IG_CLIENT_ID}&redirect_uri=${encodeURIComponent(instagramRedirectUri)}&scope=user_profile,user_media&response_type=code&state=${encodeURIComponent(user.id)}`,
    facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID || process.env.FB_APP_ID}&redirect_uri=${encodeURIComponent(facebookRedirectUri)}&scope=pages_show_list,pages_read_engagement,pages_manage_posts&response_type=code&state=${encodeURIComponent(user.id)}`,
    youtube: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(youtubeRedirectUri)}&scope=${encodeURIComponent('openid email profile https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl')}&response_type=code&access_type=offline&prompt=consent&include_granted_scopes=true&state=${encodeURIComponent(user.id)}`,
    tiktok: `https://www.tiktok.com/auth/authorize/?client_key=${process.env.TIKTOK_CLIENT_KEY || process.env.TIKTOK_CLIENT_ID}&scope=user.info.basic,video.upload&response_type=code&redirect_uri=${encodeURIComponent(tiktokRedirectUri)}&state=${encodeURIComponent(user.id)}`,
    twitter: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_CLIENT_ID || process.env.X_CLIENT_ID}&redirect_uri=${encodeURIComponent(twitterRedirectUri)}&scope=${encodeURIComponent('tweet.read tweet.write users.read media.write offline.access')}&state=${encodeURIComponent(user.id)}&code_challenge=challenge&code_challenge_method=plain`,
    threads: `https://threads.net/oauth/authorize?client_id=${process.env.THREADS_CLIENT_ID}&redirect_uri=${encodeURIComponent(threadsRedirectUri)}&scope=${encodeURIComponent('threads_basic,threads_content_publish')}&response_type=code&state=${encodeURIComponent(user.id)}`,
  }

  if (platform === 'youtube' && !youtubeRedirectUri) {
    return NextResponse.json({ error: 'YouTube redirect URI not configured. Set YOUTUBE_REDIRECT_URI or YOUTUBE_REDIRECT_URI_VERCEL in .env.' }, { status: 500 })
  }

  if (platform === 'facebook' && !facebookRedirectUri) {
    return NextResponse.json({ error: 'Facebook redirect URI not configured. Set FACEBOOK_REDIRECT_URI or FACEBOOK_REDIRECT_URI_VERCEL in .env.' }, { status: 500 })
  }

  if (platform === 'instagram' && !instagramRedirectUri) {
    return NextResponse.json({ error: 'Instagram redirect URI not configured. Set INSTAGRAM_REDIRECT_URI, IG_REDIRECT_URI, or INSTAGRAM_REDIRECT_URI_VERCEL in .env.' }, { status: 500 })
  }

  if (platform === 'tiktok' && !tiktokRedirectUri) {
    return NextResponse.json({ error: 'TikTok redirect URI not configured. Set TIKTOK_REDIRECT_URI or TIKTOK_REDIRECT_URI_VERCEL in .env.' }, { status: 500 })
  }

  if (platform === 'twitter' && !twitterRedirectUri) {
    return NextResponse.json({ error: 'Twitter redirect URI not configured. Set TWITTER_REDIRECT_URI, X_REDIRECT_URI, or TWITTER_REDIRECT_URI_VERCEL in .env.' }, { status: 500 })
  }

  if (platform === 'threads' && !threadsRedirectUri) {
    return NextResponse.json({ error: 'Threads redirect URI not configured. Set THREADS_REDIRECT_URI or THREADS_REDIRECT_URI_VERCEL in .env.' }, { status: 500 })
  }

  // Validate credentials for selected platform
  const credentialGroups: Record<string, string[][]> = {
    instagram: hasFacebookAppId && hasFacebookAppSecret
      ? [['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'], ['FB_APP_ID', 'FB_APP_SECRET']]
      : [['INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET'], ['IG_CLIENT_ID', 'IG_CLIENT_SECRET']],
    facebook: [['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'], ['FB_APP_ID', 'FB_APP_SECRET']],
    youtube: [['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']],
    tiktok: [['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'], ['TIKTOK_CLIENT_ID', 'TIKTOK_CLIENT_SECRET']],
    twitter: [['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'], ['X_CLIENT_ID', 'X_CLIENT_SECRET']],
    threads: [['THREADS_CLIENT_ID', 'THREADS_CLIENT_SECRET']],
  }

  const selectedGroups = credentialGroups[platform] || []
  const hasValidCredentials = selectedGroups.some(group => group.every(key => Boolean(process.env[key])))

  if (!hasValidCredentials) {
    const groupHints = selectedGroups.map(group => group.join(' + ')).join(' or ')
    return NextResponse.json({
      error: `${platform} OAuth credentials not configured. Please set one of: ${groupHints}`
    }, { status: 500 })
  }

  const url = oauthUrls[platform]
  if (!url) {
    return NextResponse.json({ error: `Platform ${platform} not supported for OAuth` }, { status: 400 })
  }

  console.log('[social-connect/start] redirect url generated for %s', platform)
  return NextResponse.json({ url })
}