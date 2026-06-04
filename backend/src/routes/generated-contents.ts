import { Router, Response } from 'express'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { find } from '../lib/supabase.js'

const router = Router()

// Return list of generated images/videos created by user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // images collection used by image-ai route
    const docs = await find(
      'images',
      { user_id: req.user?.id, status: 'completed' },
      { orderBy: 'created_at', ascending: false }
    )

    const contents = docs.map((d: any) => ({
      id: d.id,
      mediaUrl: d.image_url,
      mediaType: 'image',
      prompt: d.prompt ?? '',
      createdAt: d.created_at,
    }))

    res.json({ contents })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
