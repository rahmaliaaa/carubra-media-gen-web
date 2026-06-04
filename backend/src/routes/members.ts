import { Router, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { find, findOne, insert, updateOne, deleteOne } from '../lib/supabase.js'

const router = Router()

type Member = {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive'
  role: string
  createdAt: Date
}

// Get all members
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const members = await find('members', {})
    const transformed = members.map((m: any) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      status: m.status,
      role: m.role,
      createdAt: m.created_at
    }))
    res.json({ members: transformed })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Add member
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role = 'Viewer' } = req.body

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' })
    }

    const newMember = {
      id: uuidv4(),
      name,
      email,
      status: 'active',
      role,
      created_at: new Date()
    }

    await insert('members', newMember)
    res.status(201).json({ member: { 
      id: newMember.id, 
      name, 
      email, 
      status: 'active', 
      role, 
      createdAt: newMember.created_at 
    } })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Update member
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, email, status, role } = req.body

    const existing = await findOne('members', { id })
    if (!existing) {
      return res.status(404).json({ error: 'Member not found' })
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (status) updateData.status = status
    if (role) updateData.role = role

    await updateOne('members', { id }, updateData)

    const updated = await findOne('members', { id })
    res.json({ member: { 
      id: updated.id, 
      name: updated.name, 
      email: updated.email, 
      status: updated.status, 
      role: updated.role, 
      createdAt: updated.created_at 
    } })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Delete member
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    
    const deleted = await deleteOne('members', { id })
    
    if (!deleted) {
      return res.status(404).json({ error: 'Member not found' })
    }

    res.json({ message: 'Member deleted successfully' })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
