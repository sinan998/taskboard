import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db'
import { authenticate } from '../auth'
import { RelationType } from '@prisma/client'

export async function relationRoutes(app: FastifyInstance) {
  // GET /tasks/:id/relations
  app.get('/:id/relations', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const [fromRelations, toRelations] = await Promise.all([
      prisma.taskRelation.findMany({ where: { fromTaskId: id } }),
      prisma.taskRelation.findMany({ where: { toTaskId: id } }),
    ])

    const blocksIds = fromRelations.filter((r) => r.type === 'BLOCKS').map((r) => r.toTaskId)
    const blockedByIds = toRelations.filter((r) => r.type === 'BLOCKS').map((r) => r.fromTaskId)
    const relatesToIds = [
      ...fromRelations.filter((r) => r.type === 'RELATES_TO').map((r) => r.toTaskId),
      ...toRelations.filter((r) => r.type === 'RELATES_TO').map((r) => r.fromTaskId),
    ]

    const allIds = [...new Set([...blocksIds, ...blockedByIds, ...relatesToIds])]
    const taskMap = allIds.length
      ? await prisma.task.findMany({ where: { id: { in: allIds } } }).then((ts) =>
          Object.fromEntries(ts.map((t) => [t.id, t]))
        )
      : {}

    return {
      blocks: blocksIds.map((tid) => taskMap[tid]).filter(Boolean),
      blockedBy: blockedByIds.map((tid) => taskMap[tid]).filter(Boolean),
      relatesTo: relatesToIds.map((tid) => taskMap[tid]).filter(Boolean),
      relations: [...fromRelations, ...toRelations],
    }
  })

  // POST /tasks/:id/relations
  app.post('/:id/relations', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { toTaskId, type } = req.body as { toTaskId: string; type: RelationType }

    if (!toTaskId || !type) {
      return reply.status(400).send({ error: 'toTaskId and type are required' })
    }
    if (id === toTaskId) {
      return reply.status(400).send({ error: 'Cannot relate a task to itself' })
    }

    // Prevent circular BLOCKS: A→B→A
    if (type === 'BLOCKS') {
      const reverse = await prisma.taskRelation.findFirst({
        where: { fromTaskId: toTaskId, toTaskId: id, type: 'BLOCKS' },
      })
      if (reverse) {
        return reply.status(400).send({ error: 'Circular block relation not allowed' })
      }
    }

    try {
      const relation = await prisma.taskRelation.create({
        data: { fromTaskId: id, toTaskId, type },
      })
      return reply.status(201).send(relation)
    } catch {
      return reply.status(409).send({ error: 'Relation already exists' })
    }
  })

  // DELETE /tasks/:id/relations/:relationId
  app.delete('/:id/relations/:relationId', { preHandler: authenticate }, async (req, reply) => {
    const { relationId } = req.params as { id: string; relationId: string }
    const existing = await prisma.taskRelation.findUnique({ where: { id: relationId } })
    if (!existing) return reply.status(404).send({ error: 'Relation not found' })
    await prisma.taskRelation.delete({ where: { id: relationId } })
    return reply.status(204).send()
  })
}
