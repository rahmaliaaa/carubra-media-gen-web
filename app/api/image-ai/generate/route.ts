import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { insert } from '@/lib/supabase'
import { getUserFromRequest } from '@/middleware/auth'

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const {
      prompt,
      width = 1024,
      height = 1024,
      steps = 4,
      cfg_scale = 1,
      init_image,
      strength,
    } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (typeof width !== 'number' || typeof height !== 'number') {
      return NextResponse.json({ error: 'Width and height must be numbers' }, { status: 400 })
    }

    const IMAGE_API_KEY = process.env.IMAGE_API_KEY
    const IMAGE_API_URL = process.env.IMAGE_API_URL
    const IMAGE_MODEL = process.env.IMAGE_MODEL || 'carubra/image'

    if (!IMAGE_API_KEY || !IMAGE_API_URL) {
      return NextResponse.json({ error: 'Server is not configured with IMAGE_API_KEY or IMAGE_API_URL' }, { status: 500 })
    }

    const newImage = {
      id: uuidv4(),
      user_id: user.id,
      prompt,
      width,
      height,
      steps,
      cfg_scale,
      status: 'processing',
      created_at: new Date(),
    }

    try {
      const payload: Record<string, unknown> = {
        model: IMAGE_MODEL,
        prompt,
        width,
        height,
        steps,
        cfg_scale,
        size: `${width}x${height}`,
        n: 1,
      }

      if (init_image) payload.init_image = init_image
      if (strength) payload.strength = strength

      console.log(`[image-ai] Calling ${IMAGE_API_URL}/v1/images/generations`)
      console.log(`[image-ai] Model: ${IMAGE_MODEL}, Prompt: ${prompt}`)
      console.log('[image-ai] Payload:', payload)

      const response = await fetch(`${IMAGE_API_URL}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${IMAGE_API_KEY}`,
        },
        body: JSON.stringify(payload),
      })

      const rawText = await response.text()
      console.log(`[image-ai] Response status: ${response.status}`)

      let carubraData: any
      try {
        carubraData = JSON.parse(rawText)
      } catch {
        carubraData = rawText
      }

      console.log('[image-ai] Provider response body:', carubraData)

      if (!response.ok) {
        newImage.status = 'failed'
        await insert('images', newImage)
        return NextResponse.json({ error: 'Image generation failed', detail: carubraData }, { status: response.status })
      }

      const item = carubraData?.data?.[0]
      const imageUrl: string | null =
        item?.url ||
        (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null) ||
        (carubraData?.b64_json ? `data:image/png;base64,${carubraData.b64_json}` : null) ||
        null

      if (!imageUrl) {
        console.warn('[image-ai] No image URL found in provider response')
        newImage.status = 'failed'
        await insert('images', newImage)
        return NextResponse.json({ error: 'Response did not return a valid image', detail: carubraData }, { status: 502 })
      }

      const completedImage = {
        ...newImage,
        status: 'completed',
        image_url: imageUrl,
      }

      await insert('images', completedImage)

      return NextResponse.json({ image: completedImage }, { status: 201 })
    } catch (error: any) {
      newImage.status = 'failed'
      console.error('[image-ai] Error:', error)
      try {
        await insert('images', newImage)
      } catch {}
      return NextResponse.json({ error: 'Failed to call image API', detail: String(error) }, { status: 502 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
