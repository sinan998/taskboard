import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db'
import { authenticate } from '../auth'

export async function boardRoutes(app: FastifyInstance) {
  // GET /boards
  app.get('/', { preHandler: authenticate }, async (req, reply) => {
    return prisma.board.findMany({ orderBy: { createdAt: 'asc' } })
  })

  // POST /boards
  app.post('/', { preHandler: authenticate }, async (req, reply) => {
    const { name } = req.body as { name: string }
    if (!name) return reply.status(400).send({ error: 'Name is required' })
    const board = await prisma.board.create({ data: { name } })
    return reply.status(201).send(board)
  })

  // PATCH /boards/:id
  app.patch('/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { name } = req.body as { name?: string }
    const existing = await prisma.board.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Board not found' })
    return prisma.board.update({ where: { id }, data: { name } })
  })

  // DELETE /boards/:id
  app.delete('/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.board.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Board not found' })
    if (existing.isDefault) return reply.status(400).send({ error: 'Cannot delete the default board' })

    // Move tasks to default board
    const defaultBoard = await prisma.board.findFirst({ where: { isDefault: true } })
    if (defaultBoard) {
      await prisma.task.updateMany({ where: { boardId: id }, data: { boardId: defaultBoard.id } })
    }
    await prisma.board.delete({ where: { id } })
    return reply.status(204).send()
  })

  // GET /boards/:id/workload
  app.get('/:id/workload', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const tasks = await prisma.task.findMany({
      where: { boardId: id, status: { in: ['TODO', 'IN_PROGRESS'] } },
      select: { status: true, estimatedHours: true },
    })

    const todoTasks = tasks.filter((t) => t.status === 'TODO')
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS')
    const doneTasks = await prisma.task.count({ where: { boardId: id, status: 'DONE' } })

    const sum = (arr: typeof tasks) =>
      arr.reduce((acc, t) => acc + (t.estimatedHours ?? 0), 0)

    return {
      totalEstimatedHours: sum(tasks),
      todoHours: sum(todoTasks),
      inProgressHours: sum(inProgressTasks),
      taskCount: {
        todo: todoTasks.length,
        inProgress: inProgressTasks.length,
        done: doneTasks,
      },
    }
  })
}
