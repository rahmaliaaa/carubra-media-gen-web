import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'carubra-secret-key'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    name: string
  }
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }
    req.user = user as AuthRequest['user']
    next()
  })
}

export function generateToken(user: { id: string; email: string; name: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}
