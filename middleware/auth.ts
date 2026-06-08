import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'carubra-secret-key'

export interface JwtUser {
  id: string
  email: string
  name: string
}

export function generateToken(user: JwtUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JwtUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtUser
  } catch {
    return null
  }
}

export function getUserFromRequest(req: NextRequest): JwtUser | null {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.split(' ')[1]
  if (!token) return null
  return verifyToken(token)
}
