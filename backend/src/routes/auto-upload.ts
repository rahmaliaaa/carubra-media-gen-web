import { Router, Response } from 'express'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { find, insert, deleteOne } from '../lib/supabase.js'

const router = Router()

const toClient = (doc: any) => ({
  id: doc.id,
  mediaSource: doc.media_source ?? 'upload',
  generatedContentId: doc.generated_content_id ?? null,
  caption: doc.caption ?? '',
  mediaUrl: doc.media_url ?? null,
  mediaName: doc.media_name ?? null,
  mediaType: doc.media_type ?? null,
  postTypes: doc.post_types ?? {},
  date: doc.date ?? '',
  time: doc.time ?? '',
  platforms: doc.platforms ?? [],
  status: doc.status ?? 'scheduled',
  createdAt: doc.created_at,
})

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const docs = await find(
      'scheduled_posts',
      { user_id: req.user?.id },
      { orderBy: 'created_at', ascending: false }
    )

    res.json({ posts: docs.map(toClient) })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      mediaSource,
      generatedContentId,
      caption,
      mediaUrl,
      mediaName,
      mediaType,
      postTypes,
      date,
      time,
      platforms,
      status,
    } = req.body

    const doc = {
      user_id: req.user?.id,
      media_source: mediaSource === 'generated' ? 'generated' : 'upload',
      generated_content_id: typeof generatedContentId === 'string' ? generatedContentId : null,
      caption: caption ?? '',
      media_url: mediaUrl ?? null,
      media_name: mediaName ?? null,
      media_type: ['image', 'video'].includes(mediaType) ? mediaType : null,
      post_types: typeof postTypes === 'object' && postTypes ? postTypes : {},
      date: date ?? '',
      time: time ?? '',
      platforms: Array.isArray(platforms) ? platforms : [],
      status: status ?? 'scheduled',
      created_at: new Date(),
      updated_at: new Date(),
    }

    const { data, error } = await insert('scheduled_posts', doc)
    
    if (error) {
      return res.status(500).json({ error: 'Failed to create post' })
    }

    res.status(201).json({
      post: toClient(data[0]),
    })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const deleted = await deleteOne(
      'scheduled_posts',
      {
        id,
        user_id: req.user?.id,
      }
    )

    if (!deleted) {
      return res.status(404).json({
        error: 'Postingan tidak ditemukan',
      })
    }

    res.json({
      message: 'Postingan berhasil dihapus',
    })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router