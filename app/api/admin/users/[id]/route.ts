import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAdminUser, isAdminUser } from '@/lib/admin'
import { updateOne } from '@/lib/supabase'

export async function PATCH(req: NextRequest, context: any) {
  const params = await context.params
  const admin = await getAdminUser(req)
  if (!isAdminUser(admin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { role, coins, name, is_banned, password } = await req.json()
  const allowedUpdate: Record<string, any> = {}
  if (typeof role === 'string') allowedUpdate.role = role
  if (typeof coins === 'number') allowedUpdate.coins = coins
  if (typeof name === 'string') allowedUpdate.name = name
  if (typeof is_banned === 'boolean') allowedUpdate.is_banned = is_banned
  if (typeof password === 'string' && password.trim().length > 0) {
    allowedUpdate.password = await bcrypt.hash(password, 10)
  }

  if (Object.keys(allowedUpdate).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updatedUser = await updateOne('users', { id: params.id }, allowedUpdate)
  return NextResponse.json({ user: updatedUser })
}
