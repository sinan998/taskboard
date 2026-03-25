import { prisma } from './db'
import { ActivityAction, Status } from '@prisma/client'

export async function logActivity(params: {
  taskId: string
  taskTitle: string
  action: ActivityAction
  fromStatus?: Status
  toStatus?: Status
  tx?: any
}) {
  const client = params.tx || prisma
  return client.activityLog.create({
    data: {
      taskId: params.taskId,
      taskTitle: params.taskTitle,
      action: params.action,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
    },
  })
}
