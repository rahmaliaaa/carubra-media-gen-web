import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, isAdminUser } from '@/lib/admin'
import { deleteOne } from '@/lib/supabase'

export async function DELETE(req: NextRequest, context: any) {
  const { params } = context
  const admin = await getAdminUser(req)
  if (!isAdminUser(admin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await deleteOne('generated_contents', { id: params.id })
  return NextResponse.json({ success: true })
}
