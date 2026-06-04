import { Router, Response } from 'express'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import qs from 'querystring'

const router: Router = Router()

// ─── Helper: upsert social_connect ke Supabase ────────────────────────────────
async function upsertSocialConnect(data: {
  user_id: string
  platform: string
  account_username: string
  account_id: string
  access_token: string
  refresh_token?: string | null
  token_expiry?: Date | null
}) {
  const supabase = await getSupabaseAdmin()

  // Gunakan onConflict hanya user_id + platform (sama seperti MongoDB yang pakai userId + platform)
  // Ini mencegah gagal upsert saat account_id berbeda
  const { error } = await supabase
    .from('social_connects')
    .upsert(
      {
        ...data,
        status: 'active',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' } // FIX: hapus account_id dari conflict key
    )

  if (error) throw new Error(error.message)
}

// ─── GET connections ──────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const supabase = await getSupabaseAdmin()
    const { data, error } = await supabase
      .from('social_connects')
      .select('platform, account_username, created_at')
      .eq('user_id', req.user?.id)
      // FIX: hapus filter status 'active' — bisa menyebabkan data tidak terbaca
      // jika kolom status null atau nilainya berbeda

    if (error) throw new Error(error.message)

    res.json({
      connections: (data ?? []).map((d: any) => ({
        platform: d.platform,
        username: d.account_username,
        connectedAt: d.created_at,
      })),
    })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ─── POST manual connect (fallback untuk TikTok & X) ─────────────────────────
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { platform, username } = req.body
    if (!platform || !username) {
      return res.status(400).json({ error: 'Platform dan username wajib diisi' })
    }

    await upsertSocialConnect({
      user_id: req.user?.id ?? 'unknown',
      platform,
      account_username: username,
      account_id: username,
      access_token: 'manual',
    })

    res.status(201).json({ connection: { platform, username, connectedAt: new Date() } })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════════════════════
// INSTAGRAM
// ════════════════════════════════════════════════════════════════════════════

router.post('/instagram/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const clientId = process.env.IG_CLIENT_ID
    const redirectUri = process.env.IG_REDIRECT_URI ||
      `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/social-connect/instagram/callback`

    if (!clientId) return res.status(500).json({ error: 'IG_CLIENT_ID not configured' })

    const state = Buffer.from(JSON.stringify({ userId: req.user?.id })).toString('base64')

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
      response_type: 'code',
      state,
    })

    res.json({ url: `https://www.facebook.com/v18.0/dialog/oauth?${params}` })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/instagram/callback', async (req, res: Response) => {
  try {
    const { code, state } = req.query as any
    if (!code) return res.status(400).send('Missing code')

    const clientId = process.env.IG_CLIENT_ID
    const clientSecret = process.env.IG_CLIENT_SECRET
    const redirectUri = process.env.IG_REDIRECT_URI ||
      `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/social-connect/instagram/callback`

    if (!clientId || !clientSecret) return res.status(500).send('IG credentials not configured')

    // 1. Tukar code → access token
    const tokenRes = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: qs.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok) {
      console.error('IG token error', tokenJson)
      return res.status(500).send('Failed to exchange token')
    }

    const accessToken = tokenJson.access_token

    // 2. Ambil username Instagram
    let username = ''
    let igAccountId = ''
    try {
      const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`)
      const pagesJson = await pagesRes.json()
      const page = pagesJson.data?.[0]

      if (page?.id) {
        const igRes = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`)
        const igJson = await igRes.json()
        igAccountId = igJson.instagram_business_account?.id || ''

        if (igAccountId) {
          const profileRes = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}?fields=username&access_token=${accessToken}`)
          const profileJson = await profileRes.json()
          username = profileJson.username || ''
        }
      }

      // Fallback: pakai nama FB user
      if (!username) {
        const meRes = await fetch(`https://graph.facebook.com/v18.0/me?fields=name&access_token=${accessToken}`)
        const meJson = await meRes.json()
        username = meJson.name || ''
      }
    } catch (e) {
      console.error('IG username fetch error', e)
    }

    // 3. Decode userId dari state
    let userId = null
    try {
      if (state) userId = JSON.parse(Buffer.from(state, 'base64').toString()).userId
    } catch {}

    // 4. Simpan ke Supabase
    await upsertSocialConnect({
      user_id: userId ?? 'unknown',
      platform: 'instagram',
      account_username: username,
      account_id: igAccountId || username,
      access_token: accessToken,
      refresh_token: tokenJson.refresh_token || null,
      token_expiry: null,
    })

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/auto-upload`)
  } catch (err: any) {
    console.error(err)
    res.status(500).send('OAuth callback error')
  }
})

// ════════════════════════════════════════════════════════════════════════════
// FACEBOOK
// ════════════════════════════════════════════════════════════════════════════

router.post('/facebook/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const clientId = process.env.IG_CLIENT_ID // satu Meta app
    const redirectUri = process.env.FB_REDIRECT_URI ||
      `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/social-connect/facebook/callback`

    if (!clientId) return res.status(500).json({ error: 'FB client ID not configured' })

    const state = Buffer.from(JSON.stringify({ userId: req.user?.id })).toString('base64')

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,public_profile',
      response_type: 'code',
      state,
    })

    res.json({ url: `https://www.facebook.com/v18.0/dialog/oauth?${params}` })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/facebook/callback', async (req, res: Response) => {
  try {
    const { code, state } = req.query as any
    if (!code) return res.status(400).send('Missing code')

    const clientId = process.env.IG_CLIENT_ID
    const clientSecret = process.env.IG_CLIENT_SECRET
    const redirectUri = process.env.FB_REDIRECT_URI ||
      `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/social-connect/facebook/callback`

    // 1. Tukar code → token
    const tokenRes = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: qs.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok) {
      console.error('FB token error', tokenJson)
      return res.status(500).send('Failed to exchange token')
    }

    const accessToken = tokenJson.access_token

    // 2. Ambil nama FB user & page ID
    let username = ''
    let pageId = ''
    try {
      const meRes = await fetch(`https://graph.facebook.com/v18.0/me?fields=name&access_token=${accessToken}`)
      const meJson = await meRes.json()
      username = meJson.name || ''

      const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`)
      const pagesJson = await pagesRes.json()
      pageId = pagesJson.data?.[0]?.id || ''
    } catch (e) {
      console.error('FB username fetch error', e)
    }

    // 3. Decode userId
    let userId = null
    try {
      if (state) userId = JSON.parse(Buffer.from(state, 'base64').toString()).userId
    } catch {}

    // 4. Simpan ke Supabase
    await upsertSocialConnect({
      user_id: userId ?? 'unknown',
      platform: 'facebook',
      account_username: username,
      account_id: pageId || username,
      access_token: accessToken,
      refresh_token: tokenJson.refresh_token || null,
      token_expiry: null,
    })

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/auto-upload`)
  } catch (err: any) {
    console.error(err)
    res.status(500).send('OAuth callback error')
  }
})

// ════════════════════════════════════════════════════════════════════════════
// YOUTUBE
// ════════════════════════════════════════════════════════════════════════════

router.post('/youtube/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI ||
      `${process.env.BACKEND_URL}/api/social-connect/youtube/callback`

    if (!clientId) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' })

    const state = Buffer.from(JSON.stringify({ userId: req.user?.id })).toString('base64')

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state,
    })

    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/youtube/callback', async (req, res: Response) => {
  try {
    const { code, state } = req.query as any
    if (!code) return res.status(400).send('Missing code')

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI ||
      `${process.env.BACKEND_URL}/api/social-connect/youtube/callback`

    // 1. Tukar code → token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok) return res.status(500).send('Token exchange failed')

    // 2. Ambil info channel YouTube
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${tokenJson.access_token}` } }
    )
    const channelJson = await channelRes.json()
    const channel = channelJson.items?.[0]
    const username = channel?.snippet?.title ?? ''
    const channelId = channel?.id ?? ''

    // 3. Decode userId
    let userId = null
    try {
      userId = JSON.parse(Buffer.from(state, 'base64').toString()).userId
    } catch {}

    // 4. Simpan ke Supabase
    await upsertSocialConnect({
      user_id: userId ?? 'unknown',
      platform: 'youtube',
      account_username: username,
      account_id: channelId || username,
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token || null,
      token_expiry: tokenJson.expires_in
        ? new Date(Date.now() + tokenJson.expires_in * 1000)
        : null,
    })

    res.redirect(`${process.env.FRONTEND_URL}/dashboard/auto-upload`)
  } catch (err: any) {
    console.error(err)
    res.status(500).send('OAuth callback error')
  }
})

// ════════════════════════════════════════════════════════════════════════════
// DELETE (disconnect)
// ════════════════════════════════════════════════════════════════════════════

router.delete('/:platform', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const supabase = await getSupabaseAdmin()

    // FIX: Supabase bisa return count = null meski berhasil delete,
    // jadi cek error saja — jangan andalkan count
    const { error } = await supabase
      .from('social_connects')
      .delete()
      .eq('user_id', req.user?.id)
      .eq('platform', req.params.platform)

    if (error) throw new Error(error.message)

    res.json({ message: 'Koneksi berhasil diputus' })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router