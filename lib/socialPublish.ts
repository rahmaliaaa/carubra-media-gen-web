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

async function publishPlatform(post: any, connection: any) {
  switch (connection.platform) {
    case 'facebook':
      return publishFacebook(post, connection)
    case 'instagram':
      return publishInstagram(post, connection)
    case 'whatsapp':
      return publishWhatsApp(post, connection)
    default:
      throw new Error(`Publishing for ${connection.platform} is not supported yet.`)
  }
}

export async function publishDueScheduledPosts(userId?: string, limit = 20) {
  const supabase = await getSupabaseAdmin()
  const now = new Date()
  
  // Ambil data yang berstatus scheduled. Batas dibesarkan untuk filter di memori.
  let query = supabase.from('scheduled_posts').select('*').eq('status', 'scheduled').limit(limit * 5)
  if (userId) query = query.eq('user_id', userId)

  const { data: allScheduled, error: dueError } = await query
  if (dueError) throw dueError
  
  const duePosts = (allScheduled || []).filter((post: any) => {
    if (!post.scheduled_date || !post.scheduled_time) return false
    const postTime = new Date(`${post.scheduled_date}T${post.scheduled_time}`)
    return isNaN(postTime.getTime()) ? false : postTime <= now
  }).slice(0, limit)

  if (duePosts.length === 0) {
    return { published: 0, failed: 0, errors: [] }
  }

  const { data: connections, error: connError } = await supabase
    .from('social_connects')
    .select('*')
    .eq('status', 'active')
    .in('platform', ['facebook', 'instagram', 'whatsapp'])

  if (connError) throw connError

  const errors: string[] = []
  let published = 0
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

      await updateOne('scheduled_posts', { id: post.id }, { status: 'published', updated_at: new Date().toISOString() })
      published += 1
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

  return { published, failed, errors }
}
