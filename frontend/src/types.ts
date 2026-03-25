export type Status = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'
export type Tag = 'DEV' | 'TEST' | 'DESIGN' | 'DOC' | 'BUG' | 'OPS'
export type ArchiveReason = 'AUTO' | 'WEEK_CLOSE'
export type ActivityAction =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'UPDATED'
  | 'DELETED'
  | 'ARCHIVED_AUTO'
  | 'ARCHIVED_WEEK_CLOSE'
export type RelationType = 'BLOCKS' | 'RELATES_TO'

export interface Project {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface Board {
  id: string
  name: string
  isDefault: boolean
  createdAt: string
}

export interface BoardWorkload {
  totalEstimatedHours: number
  todoHours: number
  inProgressHours: number
  taskCount: { todo: number; inProgress: number; done: number }
}

export interface TaskRelation {
  id: string
  fromTaskId: string
  toTaskId: string
  type: RelationType
  createdAt: string
}

export interface Task {
  id: string
  title: string
  notes?: string
  status: Status
  priority: Priority
  tag: Tag
  position: number
  isTodayTask: boolean
  todayMarkedAt?: string
  estimatedHours?: number
  projectId?: string
  project?: Pick<Project, 'id' | 'name' | 'color'>
  boardId?: string
  isBlocked?: boolean
  createdAt: string
  updatedAt: string
}

export interface ArchivedTask {
  id: string
  title: string
  notes?: string
  priority: Priority
  tag: Tag
  weekNumber: number
  archivedAt: string
  archiveReason: ArchiveReason
}

export interface WeekMeta {
  weekNumber: number
  startedAt: string
}

export interface ActivityLog {
  id: string
  taskId: string
  taskTitle: string
  action: ActivityAction
  fromStatus?: Status
  toStatus?: Status
  createdAt: string
}

export interface ScratchPad {
  content: string
  updatedAt: string
}

export interface WeekReport {
  id: string
  weekNumber: number
  totalCompleted: number
  totalCarried: number
  tagBreakdown: Record<string, number>
  avgCompletionHours: number | null
  createdAt: string
}
