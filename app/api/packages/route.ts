import { NextResponse } from 'next/server'
import { find } from '@/lib/supabase'

export async function GET() {
  try {
    const packages = await find(
      'membership_packages',
      { is_active: true },
      { orderBy: 'price', ascending: true }
    )
    return NextResponse.json({ packages: packages ?? [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Failed to load packages' }, { status: 500 })
  }
}