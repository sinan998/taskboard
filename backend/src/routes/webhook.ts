import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db'
import { logActivity } from '../lib/activity'
import { Priority, Tag } from '@prisma/client'

// Simple in-memory rate limiter: 30 req/min per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 30) return false
  entry.count++
  return true
}

export async function webhookRoutes(app: FastifyInstance) {
  // POST /webhook/tasks — no JWT, uses X-Webhook-Secret
  app.post('/tasks', async (req, reply) => {
    const ip = req.ip || 'unknown'
    if (!checkRateLimit(ip)) {
      return reply.status(429).send({ error: 'Rate limit exceeded' })
    }

    const secret = req.headers['x-webhook-secret']
    if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
      return reply.status(401).send({ error: 'Invalid webhook secret' })
    }

    const { title, notes, priority, tag, boardId, projectId } = req.body as {
      title: string
      notes?: string
      priority?: Priority
      tag?: Tag
      boardId?: string
      projectId?: string
    }

    if (!title) return reply.status(400).send({ error: 'Title is required' })

    // Resolve boardId — use provided or fallback to default
    let resolvedBoardId = boardId
    if (!resolvedBoardId) {
      const defaultBoard = await prisma.board.findFirst({ where: { isDefault: true } })
      resolvedBoardId = defaultBoard?.id
    }

    const task = await prisma.task.create({
      data: {
        title,
        notes,
        priority: priority || 'MEDIUM',
        tag: tag || 'DEV',
        boardId: resolvedBoardId,
        projectId,
      },
    })

    await logActivity({ taskId: task.id, taskTitle: task.title, action: 'CREATED' })

    return reply.status(201).send(task)
  })
}
