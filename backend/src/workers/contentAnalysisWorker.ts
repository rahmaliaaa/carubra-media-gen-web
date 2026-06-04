import { find, updateOne } from '../lib/supabase.js'

export function startContentAnalysisWorker(intervalMs = 10000) {
  console.log('[worker] Starting content analysis worker')
  setInterval(async () => {
    try {
      // claim one pending job
      const jobs = await find('content_analysis', { status: 'pending' }, { limit: 1 })
      const doc = jobs?.[0]
      
      if (!doc) return

      // Mark as processing
      await updateOne('content_analysis', { id: doc.id }, { status: 'processing', updated_at: new Date() })

      if (!doc.url) {
        console.warn('[worker] Skipping job with missing url', doc.id)
        await updateOne('content_analysis', { id: doc.id }, { 
          status: 'failed', 
          result: { error: 'Missing url' }, 
          updated_at: new Date() 
        })
        return
      }

      console.log(`[worker] Processing job ${doc.id} url=${doc.url}`)

      try {
        const resp = await fetch(doc.url, { method: 'GET' })
        const text = await resp.text()

        // basic html parsing via regex for og:title and og:description
        const ogTitle = (text.match(/<meta[^>]*property=(['\"])og:title\1[^>]*content=(['\"])(.*?)\2[^>]*>/i) || [])[3] || ''
        const ogDesc = (text.match(/<meta[^>]*property=(['\"])og:description\1[^>]*content=(['\"])(.*?)\2[^>]*>/i) || [])[3] || ''
        const titleMatch = text.match(/<title>([^<]*)<\/title>/i)
        const title = titleMatch ? titleMatch[1].trim() : (ogTitle || '')
        const description = ogDesc || ''
        const imgCount = (text.match(/<img\b[^>]*>/gi) || []).length
        const words = (text.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean)).length

        const result = {
          title,
          description,
          imgCount,
          words,
          httpStatus: resp.status,
          fetchedAt: new Date(),
        }

        await updateOne('content_analysis', { id: doc.id }, {
          status: 'completed',
          result,
          updated_at: new Date()
        })

        console.log(`[worker] Completed job ${doc.id}`)
      } catch (err) {
        console.error('[worker] Job failed', err)
        await updateOne('content_analysis', { id: doc.id }, {
          status: 'failed',
          result: { error: String(err) },
          updated_at: new Date()
        })
      }
    } catch (err) {
      console.error('[worker] Error', err)
    }
  }, intervalMs)
}
