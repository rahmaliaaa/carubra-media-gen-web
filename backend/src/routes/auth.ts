import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { generateToken } from '../middleware/auth.js'
import { findOne, insert } from '../lib/supabase.js'

const router = Router()

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    let user = await findOne('users', { email })

    if (!user) {
      // Auto-register jika belum ada
      const hashedPassword = await bcrypt.hash(password, 10)
      const newUser = {
        id: uuidv4(),
        email,
        password: hashedPassword,
        name: email.split('@')[0],
        role: email.includes('admin') ? 'Admin' : 'User',
        password_changes_used: 0,
        membership_order: 'A7B9C2D',
        total_created_videos: 0,
        connected_social_accounts: 0,
        coins: 0,
      }

      // FIX: insert return { data, error } — tangkap dengan benar
      const { data: inserted, error: insertError } = await insert('users', newUser)
      if (insertError) {
        console.error('Auto-register error:', insertError)
        return res.status(500).json({ error: 'Auto-registration failed: ' + insertError.message })
      }

      // Pakai data yang dikembalikan Supabase (sudah include generated fields)
      user = inserted?.[0] ?? newUser
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = generateToken({ id: user.id, email: user.email, name: user.name })

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone ?? null,              // FIX: phone bisa null
        role: user.role ?? 'User',
        passwordChangesUsed: user.password_changes_used ?? 0,
        membershipOrder: user.membership_order ?? 'A7B9C2D',
        totalCreatedVideos: user.total_created_videos ?? 0,
        connectedSocialAccounts: user.connected_social_accounts ?? 0,
        coins: user.coins ?? 0,
      },
      token,
    })
  } catch (error: any) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed: ' + error.message })
  }
})

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const existingUser = await findOne('users', { email })
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name: name ?? email.split('@')[0],       // FIX: name opsional di register
      role: 'User',
      password_changes_used: 0,
      membership_order: 'B1C2D3E',
      total_created_videos: 0,
      connected_social_accounts: 0,
      coins: 0,
    }

    const { data: inserted, error: insertError } = await insert('users', newUser)
    if (insertError) {
      console.error('Insert error:', insertError)
      return res.status(500).json({ error: 'Registration failed: ' + insertError.message })
    }

    const savedUser = inserted?.[0] ?? newUser

    const token = generateToken({ id: savedUser.id, email: savedUser.email, name: savedUser.name })

    res.status(201).json({
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        phone: savedUser.phone ?? null,
        role: savedUser.role ?? 'User',
        passwordChangesUsed: savedUser.password_changes_used ?? 0,
        membershipOrder: savedUser.membership_order ?? 'B1C2D3E',
        totalCreatedVideos: savedUser.total_created_videos ?? 0,
        connectedSocialAccounts: savedUser.connected_social_accounts ?? 0,
        coins: savedUser.coins ?? 0,
      },
      token,
    })
  } catch (error: any) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Registration failed: ' + error.message })
  }
})

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' })
})

export default router