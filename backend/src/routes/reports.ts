import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db'
import { authenticate } from '../auth'

export async function reportRoutes(app: FastifyInstance) {
  // GET /reports
  app.get('/', { preHandler: authenticate }, async (req, reply) => {
    const reports = await prisma.weekReport.findMany({
      orderBy: { weekNumber: 'desc' },
    })
    return reports
  })

  // GET /reports/:week
  app.get('/:week', { preHandler: authenticate }, async (req, reply) => {
    const { week } = req.params as { week: string }
    const report = await prisma.weekReport.findUnique({
      where: { weekNumber: parseInt(week, 10) },
    })
    if (!report) return reply.status(404).send({ error: 'Report not found' })
    return report
  })
}
