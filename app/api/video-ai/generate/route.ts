import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { insert } from '@/lib/supabase'
import { getUserFromRequest } from '@/middleware/auth'

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { prompt, style, duration } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const VIDEO_API_KEY = process.env.VIDEO_OPENROUTER_API_KEY || process.env.VIDEO_API_KEY
    const VIDEO_API_URL = process.env.VIDEO_OPENROUTER_URL || process.env.VIDEO_API_URL
    const VIDEO_MODEL = process.env.VIDEO_OPENROUTER_MODEL || process.env.VIDEO_MODEL || 'carubra/video'

    if (!VIDEO_API_KEY || !VIDEO_API_URL) {
      return NextResponse.json({ error: 'Server is not configured with video generation API credentials' }, { status: 500 })
    }

    const baseUrl = VIDEO_API_URL.replace(/\/$/, '')
    let fetchUrl = `${baseUrl}/v1/videos`
    if (baseUrl.endsWith('/v1')) {
      fetchUrl = `${baseUrl}/videos`
    }

    const newVideo = {
      id: uuidv4(),
      user_id: user.id,
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
        return NextResponse.json({ error: 'Video generation failed', detail: carubraData }, { status: response.status })
      }

      const jobId: string | null = carubraData?.id || null
      if (!jobId) {
        newVideo.status = 'failed'
        await insert('videos', newVideo)
        return NextResponse.json({ error: 'No video job ID returned', detail: carubraData }, { status: 502 })
      }

      // Simpan ke DB dengan status processing + jobId
      const finalVideo = {
        ...newVideo,
        job_id: jobId,
        status: 'processing',
      }
      await insert('videos', finalVideo)

      // Return 202
      return NextResponse.json({
        video: {
          id: finalVideo.id,
          jobId,
          status: 'processing',
        }
      }, { status: 202 })

    } catch (error: any) {
      newVideo.status = 'failed'
      console.error('[video-ai] Error:', error)
      try {
        await insert('videos', newVideo)
      } catch {}
      return NextResponse.json({ error: 'Failed to call video API', detail: String(error) }, { status: 502 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
