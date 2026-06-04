import dotenv from 'dotenv'
dotenv.config() 

import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import memberRoutes from './routes/members.js'
import videoRoutes from './routes/video-ai.js'
import imageRoutes from './routes/image-ai.js'
import uploadRoutes from './routes/auto-upload.js'
import socialConnectRouter from './routes/social-connect.js'
import generatedContentsRouter from './routes/generated-contents.js'
import contentAnalysisRouter from './routes/content-analysis.js'
import paymentRoutes from './routes/payments.js' 
import { startContentAnalysisWorker } from './workers/contentAnalysisWorker.js'


const app: express.Express = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/payments', paymentRoutes) 
app.use('/api/video-ai', videoRoutes)
app.use('/api/image-ai', imageRoutes)
app.use('/api/auto-upload', uploadRoutes)
app.use('/api/social-connect', socialConnectRouter)
app.use('/api/scheduled-posts', uploadRoutes)
app.use('/api/generated-contents', generatedContentsRouter)
app.use('/api/content-analysis', contentAnalysisRouter)


// Start background workers
startContentAnalysisWorker()

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Carubra Backend is running' })
})

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`🚀 Carubra Backend running on http://localhost:${PORT}`)
})

export default app
