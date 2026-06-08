import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/middleware/auth'

// OAuth start endpoint - returns redirect URL for each platform
export async function POST(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { platform } = params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  // OAuth URLs per platform - configure with your actual OAuth app credentials
  const oauthUrls: Record<string, string> = {
    instagram: `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${baseUrl}/api/social-connect/instagram/callback&scope=user_profile,user_media&response_type=code&state=${user.id}`,
    facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${baseUrl}/api/social-connect/facebook/callback&scope=pages_show_list,pages_read_engagement,pages_manage_posts&state=${user.id}`,
    youtube: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${baseUrl}/api/social-connect/youtube/callback&scope=https://www.googleapis.com/auth/youtube.upload&response_type=code&access_type=offline&state=${user.id}`,
    tiktok: `https://www.tiktok.com/auth/authorize/?client_key=${process.env.TIKTOK_CLIENT_KEY}&scope=user.info.basic,video.upload&response_type=code&redirect_uri=${baseUrl}/api/social-connect/tiktok/callback&state=${user.id}`,
    twitter: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=${baseUrl}/api/social-connect/twitter/callback&scope=tweet.read tweet.write users.read&state=${user.id}&code_challenge=challenge&code_challenge_method=plain`,
  }

  const url = oauthUrls[platform]
  if (!url) {
    return NextResponse.json({ error: `Platform ${platform} not supported for OAuth` }, { status: 400 })
  }

  return NextResponse.json({ url })
}
