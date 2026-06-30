import 'express-async-errors'
import express from 'express'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import cors from 'cors'
import path from 'path'
import { defaultLimiter } from './middlewares/rateLimit.middleware'
import { errorHandler } from './middlewares/errorHandler.middleware'
import router from './routes'
import logger from './utils/logger'
import { startInadimplenciaJob } from './jobs/inadimplencia.job'

const app = express()
const PORT = process.env.PORT || 3333

app.set('trust proxy', 1)
app.use(helmet())
app.use(compression())
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) },
}))
app.use(defaultLimiter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), app: 'Pedro Baranda API' })
})

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

app.use('/', router)
app.use(errorHandler)

app.listen(PORT, () => {
  logger.info(`🏢 Pedro Baranda API rodando na porta ${PORT}`)
  logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`)
  startInadimplenciaJob()
})

export default app
