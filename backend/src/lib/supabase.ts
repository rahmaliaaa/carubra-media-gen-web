import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

export async function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required')
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey)
  }

  return supabaseClient
}

/**
 * Get Supabase client with service role key (bypass RLS)
 * Wajib dipakai untuk semua operasi backend yang menyentuh tabel ber-RLS
 */
export async function getSupabaseAdmin(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Helper: Insert — pakai service role agar bypass RLS
 */
export async function insert(
  table: string,
  data: any
): Promise<{ data: any; error: any }> {
  const supabase = await getSupabaseAdmin() // ← FIX: was getSupabase()
  return supabase.from(table).insert([data]).select()
}

/**
 * Helper: Find a single document — pakai service role agar bypass RLS
 */
export async function findOne(
  table: string,
  filter: Record<string, any>
): Promise<any> {
  const supabase = await getSupabaseAdmin() // ← FIX: was getSupabase()
  let query = supabase.from(table).select('*')

  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value)
  }

  const { data, error } = await query.single()
  if (error && error.code !== 'PGRST116') {
    console.error(`Error finding ${table}:`, error)
  }
  return data
}

/**
 * Helper: Find multiple documents — pakai service role agar bypass RLS
 */
export async function find(
  table: string,
  filter: Record<string, any> = {},
  options: { orderBy?: string; ascending?: boolean; limit?: number } = {}
): Promise<any[]> {
  const supabase = await getSupabaseAdmin() // ← FIX: was getSupabase()
  let query = supabase.from(table).select('*')

  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value)
  }

  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? true })
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) {
    console.error(`Error finding ${table}:`, error)
    return []
  }
  return data ?? []
}

/**
 * Helper: Update a document — pakai service role agar bypass RLS
 */
export async function updateOne(
  table: string,
  filter: Record<string, any>,
  data: any
): Promise<any> {
  const supabase = await getSupabaseAdmin() // ← FIX: was getSupabase()
  let query = supabase.from(table).update(data)

  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value)
  }

  const { data: result, error } = await query.select().single()
  if (error) {
    console.error(`Error updating ${table}:`, error)
  }
  return result
}

/**
 * Helper: Delete a document — pakai service role agar bypass RLS
 */
export async function deleteOne(
  table: string,
  filter: Record<string, any>
): Promise<boolean> {
  const supabase = await getSupabaseAdmin() // ← FIX: was getSupabase()
  let query = supabase.from(table).delete()

  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value)
  }

  const { error } = await query
  if (error) {
    console.error(`Error deleting from ${table}:`, error)
    return false
  }
  return true
}