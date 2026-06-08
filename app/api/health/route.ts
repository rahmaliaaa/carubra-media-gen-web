import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await getSupabaseAdmin()
    const { error } = await supabase.from('users').select('id').limit(1)
    if (error) {
      return NextResponse.json({ status: 'error', message: 'Supabase health check failed', detail: error.message }, { status: 500 })
    }
    return NextResponse.json({ status: 'ok', message: 'API and Supabase are reachable' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message ?? 'Health check failed' }, { status: 500 })
  }
}
