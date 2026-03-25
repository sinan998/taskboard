import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db'
import { authenticate } from '../auth'

export async function projectRoutes(app: FastifyInstance) {
  // GET /projects
  app.get('/', { preHandler: authenticate }, async (req, reply) => {
    return prisma.project.findMany({ orderBy: { createdAt: 'asc' } })
  })

  // POST /projects
  app.post('/', { preHandler: authenticate }, async (req, reply) => {
    const { name, color } = req.body as { name: string; color?: string }
    if (!name) return reply.status(400).send({ error: 'Name is required' })
    const project = await prisma.project.create({
      data: { name, color: color || '#a78bfa' },
    })
    return reply.status(201).send(project)
  })

  // PATCH /projects/:id
  app.patch('/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { name, color } = req.body as { name?: string; color?: string }
    const existing = await prisma.project.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Project not found' })
    return prisma.project.update({ where: { id }, data: { name, color } })
  })

  // DELETE /projects/:id
  app.delete('/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.project.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Project not found' })
    // Nullify tasks referencing this project
    await prisma.task.updateMany({ where: { projectId: id }, data: { projectId: null } })
    await prisma.project.delete({ where: { id } })
    return reply.status(204).send()
  })
}
