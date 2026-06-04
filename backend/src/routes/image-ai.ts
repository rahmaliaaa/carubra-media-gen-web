import { Router, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { find, insert, updateOne, deleteOne } from '../lib/supabase.js'

const router = Router()

// ─── Types ────────────────────────────────────────────────────────────────────
type ImageGeneration = {
  id: string
  user_id: string
  prompt: string
  width: number
  height: number
  steps: number
  cfg_scale: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  image_url?: string
  caption?: string
  created_at: Date
}

// ─── GET all images for user ──────────────────────────────────────────────────
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userImages = await find(
      'images',
      { user_id: req.user?.id },
      { orderBy: 'created_at', ascending: false }
    )
    res.json({ images: userImages })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch images', detail: String(error) })
  }
})

// ─── POST generate image ──────────────────────────────────────────────────────
router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  const {
    prompt,
    width = 1024,
    height = 1024,
    steps = 4,
    cfg_scale = 1,
    init_image,
    strength,
  } = req.body as {
    prompt?: string
    width?: number
    height?: number
    steps?: number
    cfg_scale?: number
    init_image?: string
    strength?: number
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  if (typeof width !== 'number' || typeof height !== 'number') {
    return res.status(400).json({ error: 'Width and height must be numbers' })
  }

  const IMAGE_API_KEY = process.env.IMAGE_API_KEY
  const IMAGE_API_URL = process.env.IMAGE_API_URL
  const IMAGE_MODEL = process.env.IMAGE_MODEL || 'carubra/image'

  if (!IMAGE_API_KEY || !IMAGE_API_URL) {
    return res.status(500).json({ error: 'Server is not configured with IMAGE_API_KEY or IMAGE_API_URL' })
  }

  const newImage: ImageGeneration = {
    id: uuidv4(),
    user_id: req.user?.id || '',
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
      // Some providers accept a `size` like '1024x1024' — include it.
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

    // Debug: log provider response body to help troubleshoot missing image URL
    console.log('[image-ai] Provider response body:', carubraData)

    if (!response.ok) {
      newImage.status = 'failed'
      await insert('images', newImage)
      return res.status(response.status).json({ error: 'Image generation failed', detail: carubraData })
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
      return res.status(502).json({ error: 'Response did not return a valid image', detail: carubraData })
    }

    newImage.status = 'completed'
    newImage.image_url = imageUrl

    await insert('images', newImage)

    return res.status(201).json({ image: newImage })
  } catch (error) {
    newImage.status = 'failed'
    console.error('[image-ai] Error:', error)
    try {
      await insert('images', newImage)
    } catch {}
    return res.status(502).json({ error: 'Failed to call image API', detail: String(error) })
  }
})

// ─── POST generate caption ────────────────────────────────────────────────────
router.post('/caption', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { imageUrl, prompt, imageId } = req.body

  const CAPTION_API_KEY = process.env.CAPTION_API_KEY
  const CAPTION_API_URL = process.env.CAPTION_API_URL
  const CAPTION_MODEL = process.env.CAPTION_MODEL || 'utero/carubra-6.2.1'

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
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              {
                type: 'text',
                text: `Buatkan caption menarik untuk gambar ini berdasarkan deskripsi: "${prompt}". Balas hanya caption saja tanpa penjelasan.`,
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    })

    const data = await response.json()
    const caption: string = data?.choices?.[0]?.message?.content ?? ''

    // ✅ FIX: Update DB dulu SEBELUM return response
    if (imageId) {
      try {
        await updateOne(
          'images',
          { id: imageId },
          { caption }
        )
      } catch (dbError) {
        console.error('[image-ai] Failed to update caption in DB:', dbError)
      }
    }

    return res.json({ caption })
  } catch (error) {
    return res.status(502).json({ error: 'Failed to generate caption', detail: String(error) })
  }
})

// ─── GET image by id ──────────────────────────────────────────────────────────
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const image = await find(
      'images',
      { id: req.params.id, user_id: req.user?.id }
    )
    if (!image || image.length === 0) return res.status(404).json({ error: 'Image not found' })
    res.json({ image: image[0] })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch image', detail: String(error) })
  }
})

// ─── DELETE image ─────────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await deleteOne(
      'images',
      { id: req.params.id, user_id: req.user?.id }
    )
    if (!deleted) return res.status(404).json({ error: 'Image not found' })
    res.json({ message: 'Image deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete image', detail: String(error) })
  }
})

export default router