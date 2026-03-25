import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Task, Status } from '../types'
import { SortableTaskCard } from './SortableTaskCard'

interface Props {
  status: Status
  tasks: Task[]
  onMove: (id: string, direction: 'forward' | 'back') => void
  onDelete: (id: string) => void
  onAddTask: (status: Status) => void
  onCopy: (task: Task) => void
  onToggleToday: (task: Task) => void
  onTaskClick: (task: Task) => void
  onTaskFocus?: (task: Task) => void
}

const COLUMN_LABELS: Record<Status, string> = {
  TODO: 'Yapılacak',
  IN_PROGRESS: 'Devam Ediyor',
  DONE: 'Tamamlandı',
}

const COLUMN_COLORS: Record<Status, string> = {
  TODO: 'var(--col-todo)',
  IN_PROGRESS: 'var(--col-prog)',
  DONE: 'var(--col-done)',
}

export function Column({ status, tasks, onMove, onDelete, onAddTask, onCopy, onToggleToday, onTaskClick, onTaskFocus }: Props) {
  const isDone = status === 'DONE'
  const doneCount = tasks.length
  const doneWarning = isDone && doneCount >= 8

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status },
  })

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${isOver ? 'var(--border-hover)' : 'var(--border)'}`,
      borderRadius: '10px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: COLUMN_COLORS[status],
        }} />
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          flex: 1,
        }}>
          {COLUMN_LABELS[status]}
        </span>
        {isDone ? (
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12px',
            color: doneWarning ? 'var(--p-med)' : 'var(--text-faint)',
          }}>
            {doneCount}/10
          </span>
        ) : (
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12px',
            color: 'var(--text-faint)',
          }}>
            {tasks.length}
          </span>
        )}
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto',
          minHeight: '200px',
          background: isOver ? 'rgba(167,139,250,0.04)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onMove={onMove}
              onDelete={onDelete}
              onCopy={onCopy}
              onToggleToday={onToggleToday}
              onClick={onTaskClick}
              onFocus={onTaskFocus}
            />
          ))}
        </SortableContext>
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => onAddTask(status)}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px dashed var(--border)',
            borderRadius: '6px',
            padding: '7px',
            color: 'var(--text-faint)',
            fontSize: '12px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = 'var(--border-hover)'
            ;(e.target as HTMLButtonElement).style.color = 'var(--text-muted)'
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = 'var(--border)'
            ;(e.target as HTMLButtonElement).style.color = 'var(--text-faint)'
          }}
        >
          + görev ekle
        </button>
      </div>
    </div>
  )
}
