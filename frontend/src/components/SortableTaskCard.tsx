import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from '../types'
import { TaskCard } from './TaskCard'

interface Props {
  task: Task
  onMove: (id: string, direction: 'forward' | 'back') => void
  onDelete: (id: string) => void
  onCopy: (task: Task) => void
  onToggleToday: (task: Task) => void
  onClick: (task: Task) => void
  onFocus?: (task: Task) => void
}

export function SortableTaskCard({ task, onMove, onDelete, onCopy, onToggleToday, onClick, onFocus }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { task, status: task.status },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        onMove={onMove}
        onDelete={onDelete}
        onCopy={onCopy}
        onToggleToday={onToggleToday}
        onClick={onClick}
        onFocus={onFocus}
        isDragging={isDragging}
      />
    </div>
  )
}
