import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db'
import { authenticate } from '../auth'

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  return [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n')
}

export async function exportRoutes(app: FastifyInstance) {
  // GET /export/tasks?boardId=<id>
  app.get('/tasks', { preHandler: authenticate }, async (req, reply) => {
    const { boardId } = req.query as { boardId?: string }
    const weekMeta = await prisma.weekMeta.findUnique({ where: { id: 1 } })
    const weekNumber = weekMeta?.weekNumber ?? 1

    const tasks = await prisma.task.findMany({
      where: boardId ? { boardId } : undefined,
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    })

    const csv = toCSV(
      ['id', 'title', 'notes', 'status', 'priority', 'tag', 'project', 'estimatedHours', 'createdAt', 'updatedAt'],
      tasks.map((t) => [
        t.id,
        t.title,
        t.notes ?? '',
        t.status,
        t.priority,
        t.tag,
        t.project?.name ?? '',
        String(t.estimatedHours ?? ''),
        t.createdAt.toISOString(),
        t.updatedAt.toISOString(),
      ])
    )

    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="tasks-hafta-${weekNumber}.csv"`)
    return reply.send(csv)
  })

  // GET /export/archive?boardId=<id>
  app.get('/archive', { preHandler: authenticate }, async (req, reply) => {
    const weekMeta = await prisma.weekMeta.findUnique({ where: { id: 1 } })
    const weekNumber = weekMeta?.weekNumber ?? 1

    const tasks = await prisma.archivedTask.findMany({
      orderBy: { archivedAt: 'desc' },
    })

    const csv = toCSV(
      ['id', 'title', 'priority', 'tag', 'weekNumber', 'archiveReason', 'archivedAt'],
      tasks.map((t) => [
        t.id,
        t.title,
        t.priority,
        t.tag,
        String(t.weekNumber),
        t.archiveReason,
        t.archivedAt.toISOString(),
      ])
    )

    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="archive-hafta-${weekNumber}.csv"`)
    return reply.send(csv)
  })
}
