import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

async function run() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / ANON key in .env')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  try {
    console.log('Checking connection and reading one user...')
    const { data: users, error: selErr } = await supabase.from('users').select('*').limit(1)
    if (selErr) console.warn('Select users error (table may not exist):', selErr.message || selErr)
    else console.log('Users found:', users?.length || 0)

    console.log('Attempting to insert a test generated_contents row...')
    const testRow = {
      id: crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      user_id: 'test-runner',
      title: 'integration-test',
      content: 'test content',
      created_at: new Date().toISOString()
    }

    const { data: insData, error: insErr } = await supabase.from('generated_contents').insert([testRow]).select().single()
    if (insErr) {
      console.error('Insert error (table may not exist or permissions):', insErr.message || insErr)
    } else {
      console.log('Insert success, id:', insData.id)

      const { data: fetched, error: fErr } = await supabase.from('generated_contents').select('*').eq('user_id', testRow.user_id).limit(5)
      if (fErr) console.error('Fetch after insert error:', fErr.message || fErr)
      else console.log('Fetched rows for user_id=test-runner:', fetched?.length || 0)
    }
  } catch (e) {
    console.error('Exception during Supabase test:', e)
  }
}

run()
