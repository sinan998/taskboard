import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db'
import { authenticate } from '../auth'

export async function archiveRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (req, reply) => {
    const { week } = req.query as { week?: string }

    const tasks = await prisma.archivedTask.findMany({
      where: week ? { weekNumber: Number(week) } : undefined,
      orderBy: { archivedAt: 'desc' },
    })
    return tasks
  })
}
