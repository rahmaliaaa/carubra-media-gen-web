import { Router, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { find, findOne, insert, updateOne, deleteOne } from '../lib/supabase.js'

const router: Router = Router()

// ─── Types ────────────────────────────────────────────────────────────────────
type VideoGeneration = {
  id: string
  user_id: string
  prompt: string
  style: string
  duration: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  job_id?: string
  video_url?: string
  caption?: string
  created_at: Date
}

// ─── GET all videos for user ──────────────────────────────────────────────────
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userVideos = await find(
      'videos',
      { user_id: req.user?.id },
      { orderBy: 'created_at', ascending: false }
    )
    res.json({ videos: userVideos })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch videos', detail: String(error) })
  }
})

// ─── POST generate video — langsung return 202 + jobId, TANPA polling ─────────
router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  const {
    prompt,
    style = '16-9',
    duration = 30,
  } = req.body as {
    prompt?: string
    style?: string
    duration?: number
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  const VIDEO_API_KEY = process.env.VIDEO_OPENROUTER_API_KEY || process.env.VIDEO_API_KEY
  const VIDEO_API_URL = process.env.VIDEO_OPENROUTER_URL || process.env.VIDEO_API_URL
  const VIDEO_MODEL   = process.env.VIDEO_OPENROUTER_MODEL || process.env.VIDEO_MODEL || 'google/veo-3.1-fast'

  if (!VIDEO_API_KEY || !VIDEO_API_URL) {
    return res.status(500).json({ error: 'Server is not configured with video generation API credentials' })
  }

  const baseUrl = VIDEO_API_URL.replace(/\/$/, '')
  let fetchUrl = `${baseUrl}/v1/videos`
  if (baseUrl.endsWith('/v1')) {
    fetchUrl = `${baseUrl}/videos`
  }

  const newVideo: VideoGeneration = {
    id: uuidv4(),
    user_id: req.user?.id || '',
    prompt,
    style,
    duration,
    status: 'processing',
    created_at: new Date(),
  }

  try {
    let response: globalThis.Response
    const headers: Record<string, string> = {
      Authorization: `Bearer ${VIDEO_API_KEY}`,
    }

    if (baseUrl.includes('openrouter.ai')) {
      headers['Content-Type'] = 'application/json'

      let aspect_ratio: string | undefined = undefined
      if (style) {
        aspect_ratio = style.replace('-', ':') // E.g. '16-9' -> '16:9'
      }

      const body = {
        model: VIDEO_MODEL,
        prompt: prompt,
        ...(aspect_ratio ? { aspect_ratio } : {}),
      }

      console.log(`[video-ai] Calling OpenRouter: ${fetchUrl}`)
      console.log(`[video-ai] Model: ${VIDEO_MODEL}, Prompt: ${prompt}, Aspect Ratio: ${aspect_ratio}`)

      response = await fetch(fetchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
    } else {
      const formData = new FormData()
      formData.append('model', VIDEO_MODEL)
      formData.append('prompt', prompt)

      console.log(`[video-ai] Calling Custom API: ${fetchUrl}`)
      console.log(`[video-ai] Model: ${VIDEO_MODEL}, Prompt: ${prompt}`)

      response = await fetch(fetchUrl, {
        method: 'POST',
        headers,
        body: formData,
      })
    }

    const rawText = await response.text()
    console.log(`[video-ai] Response status: ${response.status}`)
    console.log(`[video-ai] Response body: ${rawText.slice(0, 500)}`)

    let carubraData: any
    try { carubraData = JSON.parse(rawText) } catch { carubraData = rawText }

    if (!response.ok) {
      newVideo.status = 'failed'
      await insert('videos', newVideo)
      return res.status(response.status).json({ error: 'Video generation failed', detail: carubraData })
    }

    const jobId: string | null = carubraData?.id || null
    if (!jobId) {
      newVideo.status = 'failed'
      await insert('videos', newVideo)
      return res.status(502).json({ error: 'No video job ID returned', detail: carubraData })
    }

    // Simpan ke DB dengan status processing + jobId
    newVideo.job_id = jobId
    newVideo.status = 'processing'
    await insert('videos', newVideo)

    // ✅ Langsung return 202 — frontend yang polling via /status/:jobId
    return res.status(202).json({
      video: {
        id: newVideo.id,
        jobId,
        status: 'processing',
      }
    })

  } catch (error) {
    newVideo.status = 'failed'
    console.error('[video-ai] Error:', error)
    try {
      await insert('videos', newVideo)
    } catch {}
    return res.status(502).json({ error: 'Failed to call video API', detail: String(error) })
  }
})

// ─── GET status video by jobId — dipanggil frontend saat polling ──────────────
router.get('/status/:jobId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params

  const VIDEO_API_KEY = process.env.VIDEO_OPENROUTER_API_KEY || process.env.VIDEO_API_KEY
  const VIDEO_API_URL = process.env.VIDEO_OPENROUTER_URL || process.env.VIDEO_API_URL

  if (!VIDEO_API_KEY || !VIDEO_API_URL) {
    return res.status(500).json({ error: 'Server not configured' })
  }

  const baseUrl = VIDEO_API_URL.replace(/\/$/, '')
  let pollUrl = `${baseUrl}/v1/videos/${jobId}`
  if (baseUrl.endsWith('/v1')) {
    pollUrl = `${baseUrl}/videos/${jobId}`
  }

  try {
    const pollRes  = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${VIDEO_API_KEY}` },
    })
    const pollData = await pollRes.json()

    console.log('[video-ai] COMPLETED FULL DATA:', JSON.stringify(pollData, null, 2))

    if (pollData.status === 'completed') {
      const videoUrl =
        pollData?.unsigned_urls?.[0] ||
        pollData?.data?.[0]?.url     ||
        pollData?.data?.[0]?.uri     ||
        pollData?.videos?.[0]?.uri   ||
        pollData?.videos?.[0]?.url   ||
        pollData?.output?.[0]?.url   ||
        pollData?.videoUrl           ||
        pollData?.url                ||
        null

      try {
        await updateOne(
          'videos',
          { job_id: jobId },
          { status: 'completed', video_url: videoUrl }
        )
      } catch {}

      return res.json({ status: 'completed', videoUrl })
    }

    if (pollData.status === 'failed') {
      try {
        await updateOne(
          'videos',
          { job_id: jobId },
          { status: 'failed' }
        )
      } catch {}
      return res.json({ status: 'failed' })
    }

    return res.json({ status: 'processing' })

  } catch (error) {
    return res.status(502).json({ error: 'Failed to check video status', detail: String(error) })
  }
})

// ─── POST generate caption ────────────────────────────────────────────────────
router.post('/caption', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { script, videoId } = req.body

  const CAPTION_API_KEY = process.env.CAPTION_API_KEY
  const CAPTION_API_URL = process.env.CAPTION_API_URL
  const CAPTION_MODEL   = process.env.CAPTION_MODEL || 'utero/carubra-6.2.1'

  if (!CAPTION_API_KEY || !CAPTION_API_URL) {
    return res.status(500).json({ error: 'Caption API not configured' })
  }

  try {
    const response = await fetch(`${CAPTION_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CAPTION_API_KEY}`,
      },
      body: JSON.stringify({
        model: CAPTION_MODEL,
        messages: [
          {
            role: 'user',
            content: `Buatkan caption media sosial yang menarik dalam Bahasa Indonesia untuk video dengan deskripsi berikut. Caption harus singkat, engaging, dan sertakan 3-5 hashtag relevan. Balas HANYA dengan caption-nya saja, tanpa penjelasan tambahan.\n\nDeskripsi: "${script}"`,
          },
        ],
        max_tokens: 300,
      }),
    })

    const data    = await response.json()
    const caption: string = data?.choices?.[0]?.message?.content ?? ''

    if (videoId) {
      try {
        await updateOne(
          'videos',
          { id: videoId },
          { caption }
        )
      } catch (dbError) {
        console.error('[video-ai] Failed to update caption in DB:', dbError)
      }
    }

    return res.json({ caption })
  } catch (error) {
    return res.status(502).json({ error: 'Failed to generate caption', detail: String(error) })
  }
})

// ─── GET video by id ──────────────────────────────────────────────────────────
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const videos = await find('videos', { id: req.params.id, user_id: req.user?.id })
    const video = videos?.[0] ?? null
    if (!video) return res.status(404).json({ error: 'Video not found' })
    res.json({ video })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch video', detail: String(error) })
  }
})

// ─── DELETE video ─────────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await deleteOne('videos', { id: req.params.id, user_id: req.user?.id })
    res.json({ message: 'Video deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete video', detail: String(error) })
  }
})

export default router