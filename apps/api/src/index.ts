import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { healthRoute } from './routes/health.js'

const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
})

await app.register(cors, { origin: true })
await app.register(healthRoute)

const port = Number(process.env.PORT) || 3001

await app.listen({ port, host: '0.0.0.0' })
