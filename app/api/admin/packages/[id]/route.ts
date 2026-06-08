import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, isAdminUser } from '@/lib/admin'
import { updateOne, deleteOne } from '@/lib/supabase'

export async function PATCH(req: NextRequest, context: any) {
  const { params } = context
  const admin = await getAdminUser(req)
  if (!isAdminUser(admin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, coins, price, description, tag } = body
  const update: any = {}
  if (typeof name === 'string') update.name = name
  if (typeof coins === 'number') update.coins = coins
  if (typeof price === 'string') update.price = price
  if (description === null || typeof description === 'string') update.description = description
  if (tag === null || typeof tag === 'string') update.tag = tag

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    const pkg = await updateOne('membership_packages', { id: params.id }, update)
    return NextResponse.json({ package: pkg })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Unable to update package' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: any) {
  const { params } = context
  const admin = await getAdminUser(req)
  if (!isAdminUser(admin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await deleteOne('membership_packages', { id: params.id })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Unable to delete package' }, { status: 500 })
  }
}
