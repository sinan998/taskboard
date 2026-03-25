import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db'
import { authenticate } from '../auth'
import { Status, Priority, Tag } from '@prisma/client'
import { logActivity } from '../lib/activity'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function taskRoutes(app: FastifyInstance) {
  // GET /tasks/search — must be registered before /:id routes
  app.get('/search', { preHandler: authenticate }, async (req, reply) => {
    const { q, boardId } = req.query as { q?: string; boardId?: string }
    if (!q || q.trim() === '') return []

    const tasks = await prisma.task.findMany({
      where: {
        ...(boardId ? { boardId } : {}),
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return tasks
  })

  // GET /tasks
  app.get('/', { preHandler: authenticate }, async (req, reply) => {
    const { status, boardId, projectId } = req.query as {
      status?: string
      boardId?: string
      projectId?: string
    }

    // Reset isTodayTask for tasks marked before today
    await prisma.task.updateMany({
      where: {
        isTodayTask: true,
        todayMarkedAt: { lt: startOfToday() },
      },
      data: { isTodayTask: false },
    })

    const where: any = {}
    if (status) where.status = status as Status
    if (boardId) where.boardId = boardId
    if (projectId) where.projectId = projectId

    const tasks = await prisma.task.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    })

    // Compute isBlocked
    if (tasks.length === 0) return tasks

    const relations = await prisma.taskRelation.findMany({
      where: { toTaskId: { in: tasks.map((t) => t.id) }, type: 'BLOCKS' },
    })

    const blockedIds = new Set(
      relations
        .filter((r) => {
          const fromTask = tasks.find((t) => t.id === r.fromTaskId)
          return fromTask && fromTask.status !== 'DONE'
        })
        .map((r) => r.toTaskId)
    )

    return tasks.map((t) => ({ ...t, isBlocked: blockedIds.has(t.id) }))
  })

  // POST /tasks
  app.post('/', { preHandler: authenticate }, async (req, reply) => {
    const { title, notes, status, priority, tag, position, boardId, projectId, estimatedHours } =
      req.body as {
        title: string
        notes?: string
        status?: Status
        priority?: Priority
        tag?: Tag
        position?: number
        boardId?: string
        projectId?: string
        estimatedHours?: number
      }

    if (!title) {
      return reply.status(400).send({ error: 'Title is required' })
    }

    // Use default board if not provided
    let resolvedBoardId = boardId
    if (!resolvedBoardId) {
      const defaultBoard = await prisma.board.findFirst({ where: { isDefault: true } })
      resolvedBoardId = defaultBoard?.id
    }

    const task = await prisma.task.create({
      data: {
        title,
        notes,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        tag: tag || 'DEV',
        position: position ?? 0,
        boardId: resolvedBoardId,
        projectId,
        estimatedHours,
      },
      include: { project: { select: { id: true, name: true, color: true } } },
    })

    await logActivity({
      taskId: task.id,
      taskTitle: task.title,
      action: 'CREATED',
    })

    return reply.status(201).send(task)
  })

  // PATCH /tasks/:id
  app.patch('/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { title, notes, status, priority, tag, position, isTodayTask, projectId, estimatedHours } =
      req.body as {
        title?: string
        notes?: string
        status?: Status
        priority?: Priority
        tag?: Tag
        position?: number
        isTodayTask?: boolean
        projectId?: string | null
        estimatedHours?: number | null
      }

    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Task not found' })

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (tag !== undefined) updateData.tag = tag
    if (position !== undefined) updateData.position = position
    if (isTodayTask !== undefined) {
      updateData.isTodayTask = isTodayTask
      if (isTodayTask) updateData.todayMarkedAt = new Date()
    }
    if (projectId !== undefined) updateData.projectId = projectId
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: { project: { select: { id: true, name: true, color: true } } },
    })

    await logActivity({
      taskId: task.id,
      taskTitle: task.title,
      action: 'UPDATED',
    })

    return task
  })

  // DELETE /tasks/:id
  app.delete('/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Task not found' })

    await logActivity({
      taskId: existing.id,
      taskTitle: existing.title,
      action: 'DELETED',
    })

    // Clean up relations
    await prisma.taskRelation.deleteMany({
      where: { OR: [{ fromTaskId: id }, { toTaskId: id }] },
    })

    await prisma.task.delete({ where: { id } })
    return reply.status(204).send()
  })

  // PATCH /tasks/:id/status
  app.patch('/:id/status', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: Status }

    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Task not found' })

    if (status !== 'DONE') {
      const task = await prisma.task.update({
        where: { id },
        data: { status },
        include: { project: { select: { id: true, name: true, color: true } } },
      })
      await logActivity({
        taskId: task.id,
        taskTitle: task.title,
        action: 'STATUS_CHANGED',
        fromStatus: existing.status,
        toStatus: status,
      })
      return task
    }

    // Moving to DONE: check count and auto-archive if needed
    const boardId = existing.boardId
    const weekMeta = await prisma.weekMeta.findUnique({ where: { id: 1 } })
    const weekNumber = weekMeta?.weekNumber ?? 1

    const result = await prisma.$transaction(async (tx) => {
      const doneCount = await tx.task.count({
        where: { status: 'DONE', ...(boardId ? { boardId } : {}) },
      })

      let autoArchived: { title: string } | null = null

      if (doneCount >= 10) {
        const oldest = await tx.task.findFirst({
          where: { status: 'DONE', ...(boardId ? { boardId } : {}) },
          orderBy: { createdAt: 'asc' },
        })

        if (oldest) {
          await tx.archivedTask.create({
            data: {
              id: oldest.id,
              title: oldest.title,
              notes: oldest.notes,
              priority: oldest.priority,
              tag: oldest.tag,
              weekNumber,
              archiveReason: 'AUTO',
            },
          })
          await logActivity({
            taskId: oldest.id,
            taskTitle: oldest.title,
            action: 'ARCHIVED_AUTO',
            tx,
          })
          await tx.taskRelation.deleteMany({
            where: { OR: [{ fromTaskId: oldest.id }, { toTaskId: oldest.id }] },
          })
          await tx.task.delete({ where: { id: oldest.id } })
          autoArchived = { title: oldest.title }
        }
      }

      const task = await tx.task.update({
        where: { id },
        data: { status: 'DONE' },
        include: { project: { select: { id: true, name: true, color: true } } },
      })
      await logActivity({
        taskId: task.id,
        taskTitle: task.title,
        action: 'STATUS_CHANGED',
        fromStatus: existing.status,
        toStatus: 'DONE',
        tx,
      })

      return { task, autoArchived }
    })

    return { ...result.task, autoArchived: result.autoArchived }
  })
}
