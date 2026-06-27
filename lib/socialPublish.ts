import { getSupabaseAdmin, updateOne } from './supabase'

function isDataUrl(value: string) {
  return typeof value === 'string' && value.startsWith('data:')
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/)
  if (!match) throw new Error('Invalid data URL format')
  const mimeType = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  return { mimeType, buffer }
}

async function downloadRemoteFile(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Unable to download remote media: ${response.status} ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const mimeType = response.headers.get('content-type') || 'application/octet-stream'
  return { buffer, mimeType }
}

function buildFormDataFile(buffer: Buffer, filename: string, mimeType: string) {
  const blob = new Blob([buffer], { type: mimeType })
  const formData = new FormData()
  formData.append('source', blob, filename)
  return formData
}

async function fetchMediaPayload(post: any) {
  if (!post.media_url) return null
  const isData = isDataUrl(post.media_url)
  if (isData) {
    const { mimeType, buffer } = parseDataUrl(post.media_url)
    return {
      isDataUrl: true,
      buffer,
      mimeType,
      filename: `upload-${post.id}.${mimeType.split('/')[1] || 'bin'}`,
    }
  }

  const { buffer, mimeType } = await downloadRemoteFile(post.media_url)
  return {
    isDataUrl: false,
    buffer,
    mimeType,
    filename: `remote-${post.id}.${mimeType.split('/')[1] || 'bin'}`,
    url: post.media_url,
  }
}

async function publishFacebook(post: any, connection: any) {
  const pageId = connection.account_id
  const accessToken = connection.access_token
  if (!pageId || !accessToken) throw new Error('Facebook page ID or access token missing.')

  if (post.media_type === 'image' && post.media_url) {
    const url = `https://graph.facebook.com/v18.0/${pageId}/photos`
    if (isDataUrl(post.media_url)) {
      const payload = await fetchMediaPayload(post)
      const form = new FormData()
      form.append('access_token', accessToken)
      form.append('caption', post.caption || '')
      form.append('source', new Blob([payload.buffer], { type: payload.mimeType }), payload.filename)
      const resp = await fetch(url, { method: 'POST', body: form })
      const data = await resp.json()
      if (!resp.ok || data.error) throw new Error(data.error?.message || 'Failed to publish Facebook image')
      return
    }

    const body = new URLSearchParams({
      access_token: accessToken,
      caption: post.caption || '',
      url: post.media_url,
    })
    const resp = await fetch(url, { method: 'POST', body })
    const data = await resp.json()
    if (!resp.ok || data.error) throw new Error(data.error?.message || 'Failed to publish Facebook image')
    return
  }

  if (post.media_type === 'video' && post.media_url) {
    const url = `https://graph.facebook.com/v18.0/${pageId}/videos`
    if (isDataUrl(post.media_url)) {
      const payload = await fetchMediaPayload(post)
      const form = new FormData()
      form.append('access_token', accessToken)
      form.append('description', post.caption || '')
      form.append('source', new Blob([payload.buffer], { type: payload.mimeType }), payload.filename)
      const resp = await fetch(url, { method: 'POST', body: form })
      const data = await resp.json()
      if (!resp.ok || data.error) throw new Error(data.error?.message || 'Failed to publish Facebook video')
      return
    }

    const body = new URLSearchParams({
      access_token: accessToken,
      description: post.caption || '',
      file_url: post.media_url,
    })
    const resp = await fetch(url, { method: 'POST', body })
    const data = await resp.json()
    if (!resp.ok || data.error) throw new Error(data.error?.message || 'Failed to publish Facebook video')
    return
  }

  const url = `https://graph.facebook.com/v18.0/${pageId}/feed`
  const body = new URLSearchParams({
    access_token: accessToken,
    message: post.caption || ' ',
  })
  const resp = await fetch(url, { method: 'POST', body })
  const data = await resp.json()
  if (!resp.ok || data.error) throw new Error(data.error?.message || 'Failed to publish Facebook post')
}

async function publishInstagram(post: any, connection: any) {
  const accountId = connection.account_id
  const accessToken = connection.access_token
  if (!accountId || !accessToken) throw new Error('Instagram account ID or access token missing.')
  if (!post.media_url) throw new Error('Instagram posting requires an image or video URL.')
  if (isDataUrl(post.media_url)) {
    throw new Error('Instagram publishing requires a publicly accessible media URL. Uploads must be hosted remotely.')
  }
  if (!['image', 'video'].includes(post.media_type)) {
    throw new Error('Instagram publishing currently supports only image or video posts.')
  }

  const containerUrl = `https://graph.facebook.com/v18.0/${accountId}/media`
  const params = new URLSearchParams({
    access_token: accessToken,
    caption: post.caption || '',
  })

  if (post.media_type === 'image') {
    params.append('image_url', post.media_url)
  } else {
    params.append('media_type', 'REELS')
    params.append('video_url', post.media_url)
  }

  const containerResp = await fetch(containerUrl, { method: 'POST', body: params })
  const containerData = await containerResp.json()
  if (!containerResp.ok || containerData.error) {
    throw new Error(containerData.error?.message || 'Failed to create Instagram media container')
  }

  const creationId = containerData.id
  if (!creationId) throw new Error('Instagram media container creation failed')

  const publishUrl = `https://graph.facebook.com/v18.0/${accountId}/media_publish`
  const publishResp = await fetch(publishUrl, {
    method: 'POST',
    body: new URLSearchParams({ access_token: accessToken, creation_id: creationId }),
  })
  const publishData = await publishResp.json()
  if (!publishResp.ok || publishData.error) {
    throw new Error(publishData.error?.message || 'Failed to publish Instagram media')
  }
}

async function triggerGowaWebhook(body: any) {
  const webhookUrl = process.env.GOWA_WEBHOOK_URL
  if (!webhookUrl) throw new Error('GOWA_WEBHOOK_URL is not configured.')

  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const errorText = await resp.text()
    throw new Error(`Failed to trigger GoWA webhook: ${resp.status} ${resp.statusText} ${errorText}`)
  }

  return resp.json().catch(() => null)
}

async function publishWhatsApp(post: any, connection: any) {
  const clientId = process.env.GOWA_CLIENT_ID
  const phone = connection.account_id
  if (!clientId) throw new Error('GOWA_CLIENT_ID tidak dikonfigurasi.')
  if (!phone) throw new Error('Nomor WhatsApp tidak ditemukan pada koneksi.')

  const payload = {
    source: 'carubra',
    platform: 'whatsapp',
    client_id: clientId,
    phone,
    text: post.caption || '',
    media_url: post.media_url || null,
    media_type: post.media_type || null,
    post_id: post.id,
    user_id: post.user_id,
  }

  await triggerGowaWebhook(payload)
}

// ─── Google OAuth Token Refresh ─────────────────────────────────────────────

async function refreshGoogleToken(connection: any): Promise<string> {
  const refreshToken = connection.refresh_token
  if (!refreshToken) throw new Error('Google refresh_token is missing. Please reconnect your YouTube account.')

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured.')

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await resp.json()
  if (!resp.ok || data.error) {
    throw new Error(data.error_description || data.error || 'Failed to refresh Google access token.')
  }

  const newAccessToken = data.access_token

  // Persist the new access token
  try {
    await updateOne('social_connects', { id: connection.id }, {
      access_token: newAccessToken,
      updated_at: new Date().toISOString(),
    })
  } catch (e) {
    console.warn('[refreshGoogleToken] Failed to persist new access token:', e)
  }

  return newAccessToken
}

async function getValidGoogleToken(connection: any): Promise<string> {
  // Try the existing token first
  const testResp = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + connection.access_token)
  if (testResp.ok) return connection.access_token

  // Token expired, refresh it
  console.log('[getValidGoogleToken] Access token expired, refreshing...')
  return refreshGoogleToken(connection)
}

// ─── YouTube Publisher ──────────────────────────────────────────────────────

async function publishYouTube(post: any, connection: any) {
  const accessToken = await getValidGoogleToken(connection)

  if (post.media_type !== 'video' && !post.media_url) {
    throw new Error('YouTube publishing requires a video file.')
  }

  // Get the video buffer
  const payload = await fetchMediaPayload(post)
  if (!payload) throw new Error('No media found for YouTube upload.')

  const title = (post.caption || 'Untitled Video').slice(0, 100)
  const description = post.caption || ''

  // Determine post type for shorts vs regular video
  const postTypes = post.post_types || {}
  const youtubePostType = postTypes.youtube || 'video'

  const metadata: any = {
    snippet: {
      title,
      description,
      categoryId: '22', // People & Blogs
    },
    status: {
      privacyStatus: 'public',
      selfDeclaredMadeForKids: false,
    },
  }

  // For Shorts, add #Shorts to title if not already present
  if (youtubePostType === 'shorts' && !title.toLowerCase().includes('#shorts')) {
    metadata.snippet.title = `${title} #Shorts`.slice(0, 100)
  }

  // Step 1: Initiate resumable upload
  const initResp = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(payload.buffer.length),
        'X-Upload-Content-Type': payload.mimeType,
      },
      body: JSON.stringify(metadata),
    }
  )

  if (!initResp.ok) {
    const errData = await initResp.json().catch(() => null)
    throw new Error(errData?.error?.message || `YouTube upload init failed: ${initResp.status}`)
  }

  const uploadUrl = initResp.headers.get('location')
  if (!uploadUrl) throw new Error('YouTube did not return an upload URL.')

  // Step 2: Upload video data to the resumable URL
  const uploadResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': payload.mimeType,
      'Content-Length': String(payload.buffer.length),
    },
    body: payload.buffer,
  })

  if (!uploadResp.ok) {
    const errData = await uploadResp.json().catch(() => null)
    throw new Error(errData?.error?.message || `YouTube video upload failed: ${uploadResp.status}`)
  }

  const videoData = await uploadResp.json()
  console.log('[publishYouTube] Video uploaded successfully. Video ID:', videoData.id)
}

// ─── TikTok Publisher ───────────────────────────────────────────────────────

async function publishTikTok(post: any, connection: any) {
  const accessToken = connection.access_token
  if (!accessToken) throw new Error('TikTok access token is missing.')

  if (post.media_type !== 'video') {
    throw new Error('TikTok publishing currently supports only video posts.')
  }

  const payload = await fetchMediaPayload(post)
  if (!payload) throw new Error('No media found for TikTok upload.')

  const caption = (post.caption || '').slice(0, 2200)

  // Step 1: Initialize direct post upload
  const initResp = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: caption,
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: payload.buffer.length,
        chunk_size: payload.buffer.length,
        total_chunk_count: 1,
      },
    }),
  })

  const initData = await initResp.json()
  if (!initResp.ok || initData.error?.code) {
    throw new Error(
      initData.error?.message || initData.error?.log_id || `TikTok upload init failed: ${initResp.status}`
    )
  }

  const uploadUrl = initData.data?.upload_url
  if (!uploadUrl) throw new Error('TikTok did not return an upload URL.')

  // Step 2: Upload video chunk
  const uploadResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': payload.mimeType,
      'Content-Range': `bytes 0-${payload.buffer.length - 1}/${payload.buffer.length}`,
      'Content-Length': String(payload.buffer.length),
    },
    body: payload.buffer,
  })

  if (!uploadResp.ok) {
    const errText = await uploadResp.text().catch(() => '')
    throw new Error(`TikTok video upload failed: ${uploadResp.status} ${errText}`)
  }

  console.log('[publishTikTok] Video uploaded successfully. Publish ID:', initData.data?.publish_id)
}

// ─── Twitter/X Publisher ────────────────────────────────────────────────────

async function uploadTwitterMedia(buffer: Buffer, mimeType: string, accessToken: string): Promise<string> {
  const totalBytes = buffer.length
  const mediaCategory = mimeType.startsWith('video') ? 'tweet_video' : 'tweet_image'

  // INIT
  const initParams = new URLSearchParams({
    command: 'INIT',
    total_bytes: String(totalBytes),
    media_type: mimeType,
    media_category: mediaCategory,
  })

  const initResp = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'CarubraMediaGenerator/1.0',
    },
    body: initParams,
  })

  // Helper for safe JSON parsing
  const safeJson = async (resp: Response) => {
    const text = await resp.text()
    try {
      return text ? JSON.parse(text) : {}
    } catch {
      return { error: { message: text || `HTTP ${resp.status}` } }
    }
  }

  const initData = await safeJson(initResp)
  if (!initResp.ok || !initData.media_id_string) {
    throw new Error(initData.error?.message || initData.error || `Twitter media INIT failed: ${initResp.status} - ${JSON.stringify(initData)}`)
  }

  const mediaId = initData.media_id_string

  // APPEND — send in chunks of 5MB
  const chunkSize = 5 * 1024 * 1024
  let segmentIndex = 0
  for (let offset = 0; offset < totalBytes; offset += chunkSize) {
    const chunk = buffer.subarray(offset, Math.min(offset + chunkSize, totalBytes))
    const form = new FormData()
    form.append('command', 'APPEND')
    form.append('media_id', mediaId)
    form.append('segment_index', String(segmentIndex))
    form.append('media_data', new Blob([chunk]).stream() as any)

    const appendResp = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'CarubraMediaGenerator/1.0',
      },
      body: form,
    })

    if (!appendResp.ok) {
      const errText = await appendResp.text()
      throw new Error(`Twitter media APPEND failed at segment ${segmentIndex}: ${appendResp.status} - ${errText}`)
    }
    segmentIndex++
  }

  // FINALIZE
  const finalizeParams = new URLSearchParams({
    command: 'FINALIZE',
    media_id: mediaId,
  })

  const finalizeResp = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'CarubraMediaGenerator/1.0',
    },
    body: finalizeParams,
  })

  const finalizeData = await safeJson(finalizeResp)
  if (!finalizeResp.ok) {
    throw new Error(finalizeData.error?.message || `Twitter media FINALIZE failed: ${finalizeResp.status} - ${JSON.stringify(finalizeData)}`)
  }

  // Wait for processing if video
  if (finalizeData.processing_info) {
    let processingInfo = finalizeData.processing_info
    while (processingInfo && processingInfo.state !== 'succeeded') {
      if (processingInfo.state === 'failed') {
        throw new Error(`Twitter media processing failed: ${processingInfo.error?.message || 'Unknown error'}`)
      }
      const waitSeconds = processingInfo.check_after_secs || 5
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))

      const statusResp = await fetch(
        `https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id=${mediaId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'CarubraMediaGenerator/1.0',
          },
        }
      )
      const statusData = await safeJson(statusResp)
      processingInfo = statusData.processing_info
    }
  }

  return mediaId
}

async function publishTwitter(post: any, connection: any) {
  const accessToken = connection.access_token
  if (!accessToken) throw new Error('Twitter access token is missing.')

  const tweetBody: any = {}
  if (post.caption) tweetBody.text = post.caption

  // Upload media if present
  if (post.media_url) {
    const payload = await fetchMediaPayload(post)
    if (payload) {
      const mediaId = await uploadTwitterMedia(payload.buffer, payload.mimeType, accessToken)
      tweetBody.media = { media_ids: [mediaId] }
    }
  }

  // Post tweet
  const tweetResp = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'CarubraMediaGenerator/1.0',
    },
    body: JSON.stringify(tweetBody),
  })

  const text = await tweetResp.text()
  let tweetData: any = {}
  try { tweetData = text ? JSON.parse(text) : {} } catch {}

  if (!tweetResp.ok || tweetData.errors) {
    const msg = tweetData.errors?.[0]?.message || tweetData.detail || `Twitter post failed: ${tweetResp.status} - ${text}`
    throw new Error(msg)
  }

  console.log('[publishTwitter] Tweet posted successfully. Tweet ID:', tweetData.data?.id)
}

async function publishPlatform(post: any, connection: any) {
  switch (connection.platform) {
    case 'facebook':
      return publishFacebook(post, connection)
    case 'instagram':
      return publishInstagram(post, connection)
    case 'whatsapp':
      return publishWhatsApp(post, connection)
    case 'youtube':
      return publishYouTube(post, connection)
    case 'tiktok':
      return publishTikTok(post, connection)
    case 'twitter':
    case 'x':
      return publishTwitter(post, connection)
    default:
      throw new Error(`Publishing for ${connection.platform} is not supported yet.`)
  }
}

export async function publishDueScheduledPosts(userId?: string, limit = 20) {
  const supabase = await getSupabaseAdmin()
  const now = new Date()
  
  // Ambil data yang berstatus scheduled. Batas dibesarkan untuk filter di memori.
  let query = supabase.from('scheduled_posts').select('*').in('status', ['scheduled', 'failed']).limit(limit * 5)
  if (userId) query = query.eq('user_id', userId)

  const { data: allScheduled, error: dueError } = await query
  if (dueError) throw dueError
  
  const duePosts = (allScheduled || []).filter((post: any) => {
    if (!post.scheduled_date || !post.scheduled_time) return false
    const postTime = new Date(`${post.scheduled_date}T${post.scheduled_time}`)
    return isNaN(postTime.getTime()) ? false : postTime <= now
  }).slice(0, limit)

  if (duePosts.length === 0) {
    return { posted: 0, failed: 0, errors: [] }
  }

  const { data: connections, error: connError } = await supabase
    .from('social_connects')
    .select('*')
    .eq('status', 'active')
    .in('platform', ['facebook', 'instagram', 'whatsapp', 'youtube', 'tiktok', 'twitter'])

  if (connError) throw connError

  const errors: string[] = []
  let posted = 0
  let failed = 0

  for (const post of duePosts) {
    try {
      const platforms = Array.isArray(post.platforms) ? post.platforms : []
      if (platforms.length === 0) {
        throw new Error('No platforms selected for scheduled post.')
      }

      for (const platform of platforms) {
        const connection = connections.find((conn: any) => conn.platform === platform && conn.user_id === post.user_id)
        if (!connection) {
          throw new Error(`Platform ${platform} is not connected.`)
        }
        await publishPlatform(post, connection)
      }

      await updateOne('scheduled_posts', { id: post.id }, { status: 'posted', updated_at: new Date().toISOString() })
      posted += 1
    } catch (error: any) {
      failed += 1
      errors.push(`Post ${post.id}: ${error?.message || String(error)}`)
      try {
        await updateOne('scheduled_posts', { id: post.id }, {
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
      } catch (updateError) {
        errors.push(`Unable to update failed status for ${post.id}: ${updateError?.message || String(updateError)}`)
      }
    }
  }

  return { posted, failed, errors }
}
