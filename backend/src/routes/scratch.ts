import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db'
import { authenticate } from '../auth'

export async function scratchRoutes(app: FastifyInstance) {
  // GET /scratch
  app.get('/', { preHandler: authenticate }, async (req, reply) => {
    const pad = await prisma.scratchPad.findUnique({ where: { id: 1 } })
    return pad
  })

  // PATCH /scratch
  app.patch('/', { preHandler: authenticate }, async (req, reply) => {
    const { content } = req.body as { content: string }
    const pad = await prisma.scratchPad.upsert({
      where: { id: 1 },
      create: { id: 1, content: content ?? '' },
      update: { content: content ?? '' },
    })
    return pad
  })
}
