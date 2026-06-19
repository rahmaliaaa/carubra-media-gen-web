import { publishDueScheduledPosts } from '../lib/socialPublish.js'

export function startScheduledPostsWorker(intervalMs = 60000) {
  console.log('[worker] Starting scheduled posts worker')

  setInterval(async () => {
    try {
      const result = await publishDueScheduledPosts()
      if (result.published || result.failed) {
        console.log(`[worker] Scheduled posts processed: published=${result.published} failed=${result.failed}`)
      }
      if (result.errors && result.errors.length > 0) {
        console.error('[worker] Scheduled post errors:', result.errors)
      }
    } catch (error) {
      console.error('[worker] Failed to process scheduled posts:', error)
    }
  }, intervalMs)
}
