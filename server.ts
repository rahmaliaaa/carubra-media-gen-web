import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import next from 'next'
import authRoutes from './api/routes/auth.js'
import userRoutes from './api/routes/users.js'
import memberRoutes from './api/routes/members.js'
import videoRoutes from './api/routes/video-ai.js'
import imageRoutes from './api/routes/image-ai.js'
import uploadRoutes from './api/routes/auto-upload.js'
import socialConnectRouter from './api/routes/social-connect.js'
import generatedContentsRouter from './api/routes/generated-contents.js'
import contentAnalysisRouter from './api/routes/content-analysis.js'
import paymentRoutes from './api/routes/payments.js'
import { startContentAnalysisWorker } from './workers/contentAnalysisWorker.js'
import { startScheduledPostsWorker } from './workers/scheduledPostsWorker.js'

const dev = process.env.NODE_ENV !== 'production'
const nextApp = next({ dev })
const handle = nextApp.getRequestHandler()
const port = Number(process.env.PORT || 3000)

function createApiApp() {
  const app = express()

  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ extended: true, limit: '50mb' }))

  // JSON parsing error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      console.error('JSON parsing error:', err.message)
      return res.status(400).json({ error: 'Invalid JSON in request body' })
    }
    next(err)
  })

  app.use('/auth', authRoutes)
  app.use('/users', userRoutes)
  app.use('/members', memberRoutes)
  app.use('/payments', paymentRoutes)
  app.use('/video-ai', videoRoutes)
  app.use('/image-ai', imageRoutes)
  app.use('/auto-upload', uploadRoutes)
  app.use('/social-connect', socialConnectRouter)
  app.use('/generated-contents', generatedContentsRouter)
  app.use('/content-analysis', contentAnalysisRouter)

  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Carubra Backend is running' })
  })

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found' })
  })

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[Global Error Handler] Error:', err)
    console.error('[Global Error Handler] Stack:', err.stack)
    res.status(500).json({ error: err.message || 'Internal server error' })
  })

  return app
}

async function main() {
  await nextApp.prepare()

  const server = express()
  server.use('/api', createApiApp())
  server.all(/^(?!\/api).*$/, (req, res) => handle(req, res))

  startContentAnalysisWorker()
  startScheduledPostsWorker()

  server.listen(port, () => {
    console.log(`🚀 Carubra Media Generator running on http://localhost:${port}`)
  })
}

main().catch((error) => {
  console.error('Fatal error starting server:', error)
  process.exit(1)
})
