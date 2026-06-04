import { Router, Response } from 'express'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { find, findOne, insert } from '../lib/supabase.js'

const router: Router = Router()

// List analysis jobs for user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const docs = await find(
      'content_analysis',
      { user_id: req.user?.id },
      { orderBy: 'created_at', ascending: false }
    )
    res.json({ jobs: docs.map((d: any) => ({ id: d.id, url: d.url, status: d.status, createdAt: d.created_at })) })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Create a new analysis job
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL wajib diisi' })
    // basic validation
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch (e) {
      return res.status(400).json({ error: 'URL tidak valid' })
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Hanya protokol http/https yang didukung' })
    }
    const doc = {
      user_id: req.user?.id,
      url: url.trim(),
      status: 'pending',
      result: null,
      created_at: new Date(),
      updated_at: new Date(),
    }
    const result = await insert('content_analysis', doc)
    res.status(201).json({ job: { id: result.id, url: doc.url, status: doc.status, createdAt: doc.created_at } })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Optional: get job detail
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const doc = await findOne(
      'content_analysis',
      { id, user_id: req.user?.id }
    )
    if (!doc) return res.status(404).json({ error: 'Job tidak ditemukan' })
    res.json({ job: { id: doc.id, url: doc.url, status: doc.status, result: doc.result, createdAt: doc.created_at } })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
