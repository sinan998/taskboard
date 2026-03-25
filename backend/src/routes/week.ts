import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db'
import { authenticate } from '../auth'
import { logActivity } from '../lib/activity'

export async function weekRoutes(app: FastifyInstance) {
  // GET /week
  app.get('/', { preHandler: authenticate }, async (req, reply) => {
    const weekMeta = await prisma.weekMeta.findUnique({ where: { id: 1 } })
    return weekMeta
  })

  // POST /week/close
  app.post('/close', { preHandler: authenticate }, async (req, reply) => {
    const { boardId } = req.query as { boardId?: string }

    const result = await prisma.$transaction(async (tx) => {
      const weekMeta = await tx.weekMeta.findUnique({ where: { id: 1 } })
      const weekNumber = weekMeta?.weekNumber ?? 1

      const doneWhere = boardId
        ? { status: 'DONE' as const, boardId }
        : { status: 'DONE' as const }

      const doneTasks = await tx.task.findMany({ where: doneWhere })
      const carriedCount = await tx.task.count({
        where: {
          status: { in: ['TODO', 'IN_PROGRESS'] },
          ...(boardId ? { boardId } : {}),
        },
      })

      if (doneTasks.length > 0) {
        await tx.archivedTask.createMany({
          data: doneTasks.map((t) => ({
            id: t.id,
            title: t.title,
            notes: t.notes,
            priority: t.priority,
            tag: t.tag,
            weekNumber,
            archiveReason: 'WEEK_CLOSE' as const,
          })),
        })

        for (const t of doneTasks) {
          await logActivity({
            taskId: t.id,
            taskTitle: t.title,
            action: 'ARCHIVED_WEEK_CLOSE',
            tx,
          })
        }

        // Clean up relations for archived tasks
        const doneIds = doneTasks.map((t) => t.id)
        await tx.taskRelation.deleteMany({
          where: { OR: [{ fromTaskId: { in: doneIds } }, { toTaskId: { in: doneIds } }] },
        })

        await tx.task.deleteMany({ where: doneWhere })
      }

      // Build week report
      const tagBreakdown: Record<string, number> = {}
      doneTasks.forEach((t) => {
        tagBreakdown[t.tag] = (tagBreakdown[t.tag] || 0) + 1
      })

      const durations = doneTasks.map(
        (t) => (t.updatedAt.getTime() - t.createdAt.getTime()) / 3600000
      )
      const avgCompletionHours =
        durations.length
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : null

      const totalEstimatedHours = doneTasks.reduce((acc, t) => acc + (t.estimatedHours ?? 0), 0)

      await tx.weekReport.upsert({
        where: { weekNumber },
        create: {
          weekNumber,
          totalCompleted: doneTasks.length,
          totalCarried: carriedCount,
          tagBreakdown,
          avgCompletionHours,
          boardId: boardId ?? null,
          totalEstimatedHours: totalEstimatedHours || null,
        },
        update: {
          totalCompleted: doneTasks.length,
          totalCarried: carriedCount,
          tagBreakdown,
          avgCompletionHours,
          boardId: boardId ?? null,
          totalEstimatedHours: totalEstimatedHours || null,
        },
      })

      const updated = await tx.weekMeta.update({
        where: { id: 1 },
        data: {
          weekNumber: weekNumber + 1,
          startedAt: new Date(),
        },
      })

      return { weekNumber: updated.weekNumber, archivedCount: doneTasks.length }
    })

    return result
  })
}
