import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/middleware/auth'
import { updateOne } from '@/lib/supabase'

export async function PUT(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, phone } = await req.json()

    const updated = await updateOne('users', { id: user.id }, {
      name,
      phone,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ user: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}