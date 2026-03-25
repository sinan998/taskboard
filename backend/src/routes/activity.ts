import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db'
import { authenticate } from '../auth'

export async function activityRoutes(app: FastifyInstance) {
  // GET /activity?limit=50&taskId=<id>
  app.get('/', { preHandler: authenticate }, async (req, reply) => {
    const { limit, taskId } = req.query as { limit?: string; taskId?: string }

    const logs = await prisma.activityLog.findMany({
      where: taskId ? { taskId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
    })
    return logs
  })
}
