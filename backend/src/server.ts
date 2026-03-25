import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth'
import { taskRoutes } from './routes/tasks'
import { archiveRoutes } from './routes/archive'
import { weekRoutes } from './routes/week'
import { activityRoutes } from './routes/activity'
import { scratchRoutes } from './routes/scratch'
import { reportRoutes } from './routes/reports'
import { projectRoutes } from './routes/projects'
import { boardRoutes } from './routes/boards'
import { relationRoutes } from './routes/relations'
import { exportRoutes } from './routes/export'
import { webhookRoutes } from './routes/webhook'
import { prisma } from './lib/db'

// Re-export so existing route files that import from '../server' still work
export { prisma }

const app = Fastify({ logger: true })

app.register(cors, { origin: true })
app.register(jwt, { secret: process.env.JWT_SECRET || 'dev_secret' })

app.register(authRoutes, { prefix: '/auth' })
app.register(taskRoutes, { prefix: '/tasks' })
app.register(archiveRoutes, { prefix: '/archive' })
app.register(weekRoutes, { prefix: '/week' })
app.register(activityRoutes, { prefix: '/activity' })
app.register(scratchRoutes, { prefix: '/scratch' })
app.register(reportRoutes, { prefix: '/reports' })
app.register(projectRoutes, { prefix: '/projects' })
app.register(boardRoutes, { prefix: '/boards' })
app.register(relationRoutes, { prefix: '/tasks' })
app.register(exportRoutes, { prefix: '/export' })
app.register(webhookRoutes, { prefix: '/webhook' })

const start = async () => {
  await prisma.$connect()
  await prisma.weekMeta.upsert({
    where: { id: 1 },
    create: { id: 1, weekNumber: 1 },
    update: {},
  })
  await prisma.scratchPad.upsert({
    where: { id: 1 },
    create: { id: 1, content: '' },
    update: {},
  })
  // Seed default board
  await prisma.board.upsert({
    where: { id: 'default' },
    create: { id: 'default', name: 'Ana Board', isDefault: true },
    update: {},
  })
  // Migrate boardless tasks to default board
  await prisma.task.updateMany({
    where: { boardId: null },
    data: { boardId: 'default' },
  })
  await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })
}

start()
