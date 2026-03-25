import {
  Task, ArchivedTask, WeekMeta, Status, ActivityLog, ScratchPad, WeekReport,
  Project, Board, BoardWorkload, TaskRelation, RelationType,
} from './types'

const BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  }
}

export class UnauthorizedError extends Error {}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) throw new UnauthorizedError('Unauthorized')
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Auth
export async function login(username: string, password: string): Promise<{ token: string }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return handleResponse(res)
}

export function logout() {
  localStorage.removeItem('token')
}

// Tasks
export async function getTasks(params?: {
  status?: string
  boardId?: string
  projectId?: string
}): Promise<Task[]> {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.boardId) query.set('boardId', params.boardId)
  if (params?.projectId) query.set('projectId', params.projectId)
  const url = `${BASE}/tasks${query.toString() ? '?' + query.toString() : ''}`
  const res = await fetch(url, { headers: headers() })
  return handleResponse(res)
}

export async function searchTasks(q: string, boardId?: string): Promise<Task[]> {
  const query = new URLSearchParams()
  query.set('q', q)
  if (boardId) query.set('boardId', boardId)
  const res = await fetch(`${BASE}/tasks/search?${query.toString()}`, {
    headers: headers(),
  })
  return handleResponse(res)
}

export async function createTask(data: {
  title: string
  notes?: string
  status?: Status
  priority?: string
  tag?: string
  boardId?: string
  projectId?: string
  estimatedHours?: number
}): Promise<Task> {
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function updateTask(
  id: string,
  data: Partial<Task> & { isTodayTask?: boolean; estimatedHours?: number | null; projectId?: string | null }
): Promise<Task> {
  const res = await fetch(`${BASE}/tasks/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${BASE}/tasks/${id}`, {
    method: 'DELETE',
    headers: headers(),
  })
  return handleResponse(res)
}

export async function moveTask(
  id: string,
  status: Status
): Promise<Task & { autoArchived?: { title: string } | null }> {
  const res = await fetch(`${BASE}/tasks/${id}/status`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ status }),
  })
  return handleResponse(res)
}

// Archive
export async function getArchive(week?: number): Promise<ArchivedTask[]> {
  const url = week !== undefined ? `${BASE}/archive?week=${week}` : `${BASE}/archive`
  const res = await fetch(url, { headers: headers() })
  return handleResponse(res)
}

// Week
export async function getWeek(): Promise<WeekMeta> {
  const res = await fetch(`${BASE}/week`, { headers: headers() })
  return handleResponse(res)
}

export async function closeWeek(boardId?: string): Promise<{ weekNumber: number; archivedCount: number }> {
  const url = boardId ? `${BASE}/week/close?boardId=${boardId}` : `${BASE}/week/close`
  const res = await fetch(url, { method: 'POST', headers: headers() })
  return handleResponse(res)
}

// Activity
export async function getActivity(params?: { limit?: number; taskId?: string }): Promise<ActivityLog[]> {
  const query = new URLSearchParams()
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.taskId) query.set('taskId', params.taskId)
  const url = `${BASE}/activity${query.toString() ? '?' + query.toString() : ''}`
  const res = await fetch(url, { headers: headers() })
  return handleResponse(res)
}

// Scratch Pad
export async function getScratch(): Promise<ScratchPad> {
  const res = await fetch(`${BASE}/scratch`, { headers: headers() })
  return handleResponse(res)
}

export async function updateScratch(content: string): Promise<ScratchPad> {
  const res = await fetch(`${BASE}/scratch`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ content }),
  })
  return handleResponse(res)
}

// Reports
export async function getReports(): Promise<WeekReport[]> {
  const res = await fetch(`${BASE}/reports`, { headers: headers() })
  return handleResponse(res)
}

export async function getReport(week: number): Promise<WeekReport> {
  const res = await fetch(`${BASE}/reports/${week}`, { headers: headers() })
  return handleResponse(res)
}

// Projects
export async function getProjects(): Promise<Project[]> {
  const res = await fetch(`${BASE}/projects`, { headers: headers() })
  return handleResponse(res)
}

export async function createProject(data: { name: string; color: string }): Promise<Project> {
  const res = await fetch(`${BASE}/projects`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function updateProject(id: string, data: { name?: string; color?: string }): Promise<Project> {
  const res = await fetch(`${BASE}/projects/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${BASE}/projects/${id}`, {
    method: 'DELETE',
    headers: headers(),
  })
  return handleResponse(res)
}

// Boards
export async function getBoards(): Promise<Board[]> {
  const res = await fetch(`${BASE}/boards`, { headers: headers() })
  return handleResponse(res)
}

export async function createBoard(data: { name: string }): Promise<Board> {
  const res = await fetch(`${BASE}/boards`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function updateBoard(id: string, data: { name?: string }): Promise<Board> {
  const res = await fetch(`${BASE}/boards/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function deleteBoard(id: string): Promise<void> {
  const res = await fetch(`${BASE}/boards/${id}`, {
    method: 'DELETE',
    headers: headers(),
  })
  return handleResponse(res)
}

export async function getBoardWorkload(id: string): Promise<BoardWorkload> {
  const res = await fetch(`${BASE}/boards/${id}/workload`, { headers: headers() })
  return handleResponse(res)
}

// Task Relations
export async function getTaskRelations(taskId: string): Promise<{
  blocks: Task[]
  blockedBy: Task[]
  relatesTo: Task[]
  relations: TaskRelation[]
}> {
  const res = await fetch(`${BASE}/tasks/${taskId}/relations`, { headers: headers() })
  return handleResponse(res)
}

export async function createTaskRelation(
  taskId: string,
  data: { toTaskId: string; type: RelationType }
): Promise<TaskRelation> {
  const res = await fetch(`${BASE}/tasks/${taskId}/relations`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function deleteTaskRelation(taskId: string, relationId: string): Promise<void> {
  const res = await fetch(`${BASE}/tasks/${taskId}/relations/${relationId}`, {
    method: 'DELETE',
    headers: headers(),
  })
  return handleResponse(res)
}

// CSV Export
export async function downloadCSV(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { headers: headers() })
  if (!res.ok) throw new Error('CSV indirme başarısız')
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
