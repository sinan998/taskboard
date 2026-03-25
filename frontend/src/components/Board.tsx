import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { Task, ArchivedTask, Status, Priority, Tag, WeekMeta, WeekReport, Board, Project, BoardWorkload } from '../types'
import {
  getTasks, createTask, deleteTask, moveTask, updateTask,
  getArchive, getWeek, closeWeek, UnauthorizedError,
  getBoards, createBoard, getProjects, getBoardWorkload, downloadCSV,
} from '../api'
import { Column } from './Column'
import { TopBar } from './TopBar'
import { NewTaskModal } from './NewTaskModal'
import { CloseWeekModal } from './CloseWeekModal'
import { ArchivePanel } from './ArchivePanel'
import { Toast } from './Toast'
import { TaskDetailPanel } from './TaskDetailPanel'
import { ScratchPadPanel } from './ScratchPadPanel'
import { ReportsPanel } from './ReportsPanel'
import { WeekReportModal } from './WeekReportModal'
import { SearchBar } from './SearchBar'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'
import { ProjectPanel } from './ProjectPanel'
import { FocusMode } from './FocusMode'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

interface Props {
  onLogout: () => void
}

export function Board({ onLogout }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [archive, setArchive] = useState<ArchivedTask[]>([])
  const [weekMeta, setWeekMeta] = useState<WeekMeta | null>(null)
  const [boards, setBoards] = useState<Board[]>([])
  const [currentBoardId, setCurrentBoardId] = useState<string>('default')
  const [projects, setProjects] = useState<Project[]>([])
  const [boardWorkload, setBoardWorkload] = useState<BoardWorkload | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [scratchOpen, setScratchOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskStatus, setNewTaskStatus] = useState<Status>('TODO')
  const [showCloseWeek, setShowCloseWeek] = useState(false)
  const [weekReport, setWeekReport] = useState<WeekReport | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [focusTask, setFocusTask] = useState<Task | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [openBoardDropdown, setOpenBoardDropdown] = useState(false)
  const activeOriginalStatusRef = useRef<Status | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const loadWorkload = useCallback(async (boardId: string) => {
    try {
      const wl = await getBoardWorkload(boardId)
      setBoardWorkload(wl)
    } catch {}
  }, [])

  const loadDataForBoard = useCallback(async (boardId: string) => {
    try {
      const [fetchedTasks, fetchedWeek] = await Promise.all([
        getTasks({ boardId }),
        getWeek(),
      ])
      setTasks(fetchedTasks)
      setWeekMeta(fetchedWeek)
      await loadWorkload(boardId)
    } catch (err) {
      if (err instanceof UnauthorizedError) { onLogout(); return }
      console.error('Load error', err)
    } finally {
      setLoading(false)
    }
  }, [onLogout, loadWorkload])

  const loadArchive = useCallback(async () => {
    try {
      const data = await getArchive()
      setArchive(data)
    } catch (err) {
      console.error('Archive load error', err)
    }
  }, [])

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const [fetchedBoards, fetchedProjects] = await Promise.all([
          getBoards(),
          getProjects(),
        ])
        setBoards(fetchedBoards)
        setProjects(fetchedProjects)
        const defaultBoard = fetchedBoards.find((b) => b.isDefault) ?? fetchedBoards[0]
        const boardId = defaultBoard?.id ?? 'default'
        setCurrentBoardId(boardId)
        await loadDataForBoard(boardId)
        await loadArchive()
      } catch (err) {
        if (err instanceof UnauthorizedError) { onLogout(); return }
        console.error('Init error', err)
        setLoading(false)
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLogout])

  async function handleBoardChange(boardId: string) {
    setCurrentBoardId(boardId)
    setSelectedProjectId('')
    setLoading(true)
    await loadDataForBoard(boardId)
  }

  async function handleCreateBoard(name: string) {
    try {
      const board = await createBoard({ name })
      setBoards((prev) => [...prev, board])
    } catch {
      setToast('Board oluşturulamadı')
    }
  }

  async function handleMove(id: string, direction: 'forward' | 'back') {
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    const order: Status[] = ['TODO', 'IN_PROGRESS', 'DONE']
    const idx = order.indexOf(task.status)
    const nextStatus = direction === 'forward' ? order[idx + 1] : order[idx - 1]
    if (!nextStatus) return

    try {
      const result = await moveTask(id, nextStatus)
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...result, autoArchived: undefined } as Task : t)))
      if (selectedTask?.id === id) setSelectedTask({ ...result, autoArchived: undefined } as Task)
      if (focusTask?.id === id) setFocusTask({ ...result, autoArchived: undefined } as Task)

      if (result.autoArchived) {
        setToast(`↓ Otomatik arşivlendi: ${result.autoArchived.title}`)
        await loadArchive()
      }
      await loadWorkload(currentBoardId)
    } catch (err) {
      if (err instanceof UnauthorizedError) { onLogout(); return }
      setToast('Görev taşınamadı, lütfen tekrar deneyin')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
      if (selectedTask?.id === id) setSelectedTask(null)
      if (focusTask?.id === id) setFocusTask(null)
      await loadWorkload(currentBoardId)
    } catch (err) {
      if (err instanceof UnauthorizedError) { onLogout(); return }
      setToast('Görev silinemedi, lütfen tekrar deneyin')
    }
  }

  async function handleCreateTask(data: {
    title: string
    notes?: string
    status: Status
    priority: Priority
    tag: Tag
    projectId?: string
    boardId?: string
    estimatedHours?: number
  }) {
    try {
      const task = await createTask({ ...data, boardId: data.boardId ?? currentBoardId })
      setTasks((prev) => [...prev, task])
      setShowNewTask(false)
      await loadWorkload(currentBoardId)
    } catch (err) {
      if (err instanceof UnauthorizedError) { onLogout(); return }
      setToast('Görev oluşturulamadı, lütfen tekrar deneyin')
    }
  }

  async function handleCopyTask(task: Task) {
    try {
      const created = await createTask({
        title: task.title,
        notes: task.notes,
        status: 'TODO',
        priority: task.priority,
        tag: task.tag,
        boardId: currentBoardId,
      })
      setTasks((prev) => [...prev, created])
      setToast('Kart kopyalandı')
      await loadWorkload(currentBoardId)
    } catch (err) {
      if (err instanceof UnauthorizedError) { onLogout(); return }
      setToast('Kart kopyalanamadı')
    }
  }

  async function handleToggleToday(task: Task) {
    const todayTasks = tasks.filter((t) => t.isTodayTask)
    if (!task.isTodayTask && todayTasks.length >= 3) {
      setToast('Günlük max 3 görev')
      return
    }
    try {
      const updated = await updateTask(task.id, { isTodayTask: !task.isTodayTask })
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      if (selectedTask?.id === updated.id) setSelectedTask(updated)
    } catch (err) {
      if (err instanceof UnauthorizedError) { onLogout(); return }
      setToast('Güncelleme başarısız')
    }
  }

  function handleAddTaskFromColumn(status: Status) {
    setNewTaskStatus(status)
    setShowNewTask(true)
  }

  async function handleCloseWeek() {
    try {
      const result = await closeWeek(currentBoardId)
      setShowCloseWeek(false)
      setToast(`✓ Hafta kapatıldı — ${result.archivedCount} kart arşivlendi`)
      await Promise.all([loadDataForBoard(currentBoardId), loadArchive()])
      try {
        const { getReport } = await import('../api')
        const report = await getReport(result.weekNumber - 1)
        setWeekReport(report)
      } catch {}
    } catch (err) {
      if (err instanceof UnauthorizedError) { onLogout(); return }
      setToast('Hafta kapatılamadı, lütfen tekrar deneyin')
    }
  }

  async function handleToggleArchive() {
    if (!archiveOpen) await loadArchive()
    setArchiveOpen((v) => !v)
  }

  function handleTaskUpdate(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTask(updated)
    if (focusTask?.id === updated.id) setFocusTask(updated)
    loadWorkload(currentBoardId)
  }

  async function handleDownloadCSV(type: 'tasks' | 'archive') {
    try {
      const weekNum = weekMeta?.weekNumber ?? 1
      if (type === 'tasks') {
        await downloadCSV(`/api/export/tasks?boardId=${currentBoardId}`, `tasks-hafta-${weekNum}.csv`)
      } else {
        await downloadCSV(`/api/export/archive`, `archive-hafta-${weekNum}.csv`)
      }
    } catch {
      setToast('İndirme başarısız')
    }
  }

  function handleOpenFocus(task: Task) {
    setFocusTask(task)
    setSelectedTask(null)
  }

  // Drag and drop handlers
  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    const task = tasks.find((t) => t.id === id)
    activeOriginalStatusRef.current = task?.status ?? null
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeTask = tasks.find((t) => t.id === active.id)
    if (!activeTask) return

    const overId = over.id as string
    const overTask = tasks.find((t) => t.id === overId)
    const overStatus = (over.data.current?.status as Status) || overTask?.status

    if (!overStatus || overStatus === activeTask.status) return

    setTasks((prev) =>
      prev.map((t) => (t.id === activeTask.id ? { ...t, status: overStatus } : t))
    )
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const originalStatus = activeOriginalStatusRef.current
    activeOriginalStatusRef.current = null

    if (!over) {
      await loadDataForBoard(currentBoardId)
      return
    }

    const activeTask = tasks.find((t) => t.id === active.id)
    if (!activeTask) return

    const currentStatus = activeTask.status
    const overId = over.id as string
    const overTask = tasks.find((t) => t.id === overId)

    if (originalStatus && currentStatus !== originalStatus) {
      try {
        const result = await moveTask(activeTask.id, currentStatus)
        setTasks((prev) =>
          prev.map((t) => (t.id === activeTask.id ? { ...result, autoArchived: undefined } as Task : t))
        )
        if (result.autoArchived) {
          setToast(`↓ Otomatik arşivlendi: ${result.autoArchived.title}`)
          await loadArchive()
        }
        await loadWorkload(currentBoardId)
      } catch (err) {
        if (err instanceof UnauthorizedError) { onLogout(); return }
        setToast('Görev taşınamadı')
        await loadDataForBoard(currentBoardId)
      }
      return
    }

    if (active.id !== over.id && overTask && overTask.status === activeTask.status) {
      const sameTasks = tasks.filter((t) => t.status === activeTask.status)
      const oldIndex = sameTasks.findIndex((t) => t.id === active.id)
      const newIndex = sameTasks.findIndex((t) => t.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(sameTasks, oldIndex, newIndex)
        const otherTasks = tasks.filter((t) => t.status !== activeTask.status)
        setTasks([...otherTasks, ...reordered])
        reordered.forEach((t, idx) => {
          updateTask(t.id, { position: idx }).catch(() => {})
        })
      }
    }
  }

  // Keyboard shortcuts
  const focusModeOpen = !!focusTask
  const anyModalOpen = showNewTask || showCloseWeek || showShortcuts || searchOpen || !!selectedTask || focusModeOpen

  useKeyboardShortcuts({
    n: () => { if (!anyModalOpen) { setNewTaskStatus('TODO'); setShowNewTask(true) } },
    '/': () => { if (!anyModalOpen) setSearchOpen(true) },
    p: () => { if (!anyModalOpen) setScratchOpen((v) => !v) },
    r: () => { if (!anyModalOpen) setReportsOpen((v) => !v) },
    b: () => { if (!anyModalOpen) setOpenBoardDropdown(true) },
    f: () => {
      if (!anyModalOpen) {
        const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS')
        if (inProgress.length > 0) setFocusTask(inProgress[0])
      }
    },
    '?': () => { if (!anyModalOpen) setShowShortcuts(true) },
    escape: () => {
      if (focusModeOpen) { setFocusTask(null); return }
      if (showShortcuts) { setShowShortcuts(false); return }
      if (searchOpen) { setSearchOpen(false); return }
      if (selectedTask) { setSelectedTask(null); return }
      if (showNewTask) { setShowNewTask(false); return }
      if (showCloseWeek) { setShowCloseWeek(false); return }
      if (weekReport) { setWeekReport(null); return }
      if (scratchOpen) { setScratchOpen(false); return }
      if (reportsOpen) { setReportsOpen(false); return }
      if (archiveOpen) { setArchiveOpen(false); return }
      if (projectsOpen) { setProjectsOpen(false); return }
    },
  })

  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : tasks
  const todoTasks = filteredTasks.filter((t) => t.status === 'TODO')
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'IN_PROGRESS')
  const doneTasks = filteredTasks.filter((t) => t.status === 'DONE')
  const activeCount = todoTasks.length + inProgressTasks.length
  const todayTasks = tasks.filter((t) => t.isTodayTask)
  const currentBoard = boards.find((b) => b.id === currentBoardId)
  const focusColumnTasks = focusTask
    ? tasks.filter((t) => t.status === focusTask.status)
    : []

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'var(--text-faint)',
        fontSize: '14px',
      }}>
        Yükleniyor...
      </div>
    )
  }

  // Focus mode — full screen overlay
  if (focusTask) {
    return (
      <FocusMode
        task={focusTask}
        columnTasks={focusColumnTasks}
        boardName={currentBoard?.name ?? 'Board'}
        onClose={() => setFocusTask(null)}
        onUpdate={(updated) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
          setFocusTask(updated)
        }}
        onNavigate={(t) => setFocusTask(t)}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        weekNumber={weekMeta?.weekNumber ?? 1}
        archiveCount={archive.length}
        todayTasks={todayTasks}
        boards={boards}
        currentBoardId={currentBoardId}
        boardWorkload={boardWorkload}
        projectsOpen={projectsOpen}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectFilterChange={(pid) => setSelectedProjectId(pid)}
        onNewTask={() => { setNewTaskStatus('TODO'); setShowNewTask(true) }}
        onCloseWeek={() => setShowCloseWeek(true)}
        onToggleArchive={handleToggleArchive}
        onToggleScratch={() => setScratchOpen((v) => !v)}
        onToggleReports={() => setReportsOpen((v) => !v)}
        onOpenSearch={() => setSearchOpen(true)}
        onRemoveTodayTask={handleToggleToday}
        onBoardChange={handleBoardChange}
        onCreateBoard={handleCreateBoard}
        onToggleProjects={() => setProjectsOpen((v) => !v)}
        onDownloadCSV={handleDownloadCSV}
        archiveOpen={archiveOpen}
        scratchOpen={scratchOpen}
        reportsOpen={reportsOpen}
        openBoardDropdown={openBoardDropdown}
        onBoardDropdownOpened={() => setOpenBoardDropdown(false)}
      />

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div style={{
          flex: 1,
          padding: '14px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          alignItems: 'start',
        }}>
          <Column
            status="TODO"
            tasks={todoTasks}
            onMove={handleMove}
            onDelete={handleDelete}
            onAddTask={handleAddTaskFromColumn}
            onCopy={handleCopyTask}
            onToggleToday={handleToggleToday}
            onTaskClick={setSelectedTask}
            onTaskFocus={handleOpenFocus}
          />
          <Column
            status="IN_PROGRESS"
            tasks={inProgressTasks}
            onMove={handleMove}
            onDelete={handleDelete}
            onAddTask={handleAddTaskFromColumn}
            onCopy={handleCopyTask}
            onToggleToday={handleToggleToday}
            onTaskClick={setSelectedTask}
            onTaskFocus={handleOpenFocus}
          />
          <Column
            status="DONE"
            tasks={doneTasks}
            onMove={handleMove}
            onDelete={handleDelete}
            onAddTask={handleAddTaskFromColumn}
            onCopy={handleCopyTask}
            onToggleToday={handleToggleToday}
            onTaskClick={setSelectedTask}
            onTaskFocus={handleOpenFocus}
          />
        </div>
      </DndContext>

      {/* Panels */}
      <ArchivePanel tasks={archive} open={archiveOpen} />
      <ScratchPadPanel open={scratchOpen} onClose={() => setScratchOpen(false)} />
      <ReportsPanel open={reportsOpen} onClose={() => setReportsOpen(false)} />
      <ProjectPanel
        open={projectsOpen}
        projects={projects}
        onProjectsChange={setProjects}
      />

      {/* Modals */}
      {showNewTask && (
        <NewTaskModal
          defaultStatus={newTaskStatus}
          projects={projects}
          currentBoardId={currentBoardId}
          onSubmit={handleCreateTask}
          onClose={() => setShowNewTask(false)}
        />
      )}

      {showCloseWeek && weekMeta && (
        <CloseWeekModal
          doneCount={doneTasks.length}
          activeCount={activeCount}
          weekNumber={weekMeta.weekNumber}
          onConfirm={handleCloseWeek}
          onClose={() => setShowCloseWeek(false)}
        />
      )}

      {weekReport && (
        <WeekReportModal
          report={weekReport}
          onClose={() => setWeekReport(null)}
        />
      )}

      {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}

      {/* Task Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}

      {/* Search */}
      <SearchBar
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onTaskClick={(task) => {
          setSelectedTask(task)
          setSearchOpen(false)
        }}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
