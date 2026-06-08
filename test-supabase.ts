import 'dotenv/config'
import { supabase } from './api/lib/supabase.js'

async function test() {
  try {
    console.log('Testing Supabase connection...')
    console.log('URL:', process.env.SUPABASE_URL)
    console.log('Anon Key exists:', !!process.env.SUPABASE_ANON_KEY)
    console.log('Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Supabase error:', error)
    } else {
      console.log('Success! Found', data?.length || 0, 'users')
    }
  } catch (err) {
    console.error('Exception:', err)
  }
}

test()
