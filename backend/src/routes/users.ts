import { Router, Response } from 'express'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { findOne, updateOne } from '../lib/supabase.js'

const router: Router = Router()

router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await findOne('users', { id: req.user?.id })
    if (!user) return res.status(404).json({ error: 'User not found' })
    
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        passwordChangesUsed: user.password_changes_used,
        membershipOrder: user.membership_order,
        totalCreatedVideos: user.total_created_videos,
        connectedSocialAccounts: user.connected_social_accounts,
        coins: user.coins
      }
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

router.get('/balance', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await findOne('users', { id: req.user?.id })
    res.json({ coins: user?.coins ?? 10 })
  } catch {
    res.status(500).json({ error: 'Failed to fetch balance' })
  }
})

router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone } = req.body

    const updated = await updateOne(
      'users',
      { id: req.user?.id },
      { name, phone, updated_at: new Date() }
    )

    if (!updated) return res.status(404).json({ error: 'User not found' })
    
    res.json({ 
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        phone: updated.phone,
        role: updated.role,
        passwordChangesUsed: updated.password_changes_used,
        membershipOrder: updated.membership_order,
        totalCreatedVideos: updated.total_created_videos,
        connectedSocialAccounts: updated.connected_social_accounts,
        coins: updated.coins
      }
    })
  } catch {
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

export default router
