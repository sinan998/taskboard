import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Task, ActivityLog } from '../types'
import { getActivity, updateTask } from '../api'

interface Props {
  task: Task
  columnTasks: Task[]  // same-column tasks for navigation
  boardName: string
  onClose: () => void
  onUpdate: (task: Task) => void
  onNavigate: (task: Task) => void
}

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Oluşturuldu',
  STATUS_CHANGED: 'Durum değişti',
  UPDATED: 'Güncellendi',
  DELETED: 'Silindi',
  ARCHIVED_AUTO: 'Otomatik arşivlendi',
  ARCHIVED_WEEK_CLOSE: 'Hafta kapatılarak arşivlendi',
}

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Yapılacak',
  IN_PROGRESS: 'Devam Ediyor',
  DONE: 'Tamamlandı',
}

export function FocusMode({ task, columnTasks, boardName, onClose, onUpdate, onNavigate }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [editTitle, setEditTitle] = useState(task.title)
  const [editNotes, setEditNotes] = useState(task.notes ?? '')
  const [saving, setSaving] = useState(false)

  const currentIndex = columnTasks.findIndex((t) => t.id === task.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < columnTasks.length - 1

  useEffect(() => {
    setEditTitle(task.title)
    setEditNotes(task.notes ?? '')
    getActivity({ taskId: task.id }).then(setLogs).catch(() => {})
  }, [task.id, task.title, task.notes])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const active = document.activeElement
      const isInput =
        active?.tagName === 'INPUT' ||
        active?.tagName === 'TEXTAREA' ||
        (active as HTMLElement)?.isContentEditable
      if (isInput) return

      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key === 'ArrowLeft' && hasPrev) { e.preventDefault(); onNavigate(columnTasks[currentIndex - 1]) }
      if (e.key === 'ArrowRight' && hasNext) { e.preventDefault(); onNavigate(columnTasks[currentIndex + 1]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, hasPrev, hasNext, currentIndex, columnTasks, onNavigate])

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const updated = await updateTask(task.id, {
        title: editTitle,
        notes: editNotes || undefined,
      })
      onUpdate(updated)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--bg-app)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-surface)',
      }}>
        <span style={{ fontSize: '13px', color: 'var(--text-faint)' }}>
          ← {boardName} / {STATUS_LABELS[task.status] ?? task.status}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            title="Kapat (ESC)"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '5px 10px',
              color: 'var(--text-faint)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ⤡
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-faint)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: '700px' }}>
          {/* Title */}
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              padding: '8px 0',
              color: 'var(--text-primary)',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '24px',
              fontWeight: 500,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Meta */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            {task.project && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                color: 'var(--text-faint)',
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: task.project.color,
                  display: 'inline-block',
                }} />
                {task.project.name}
              </span>
            )}
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              color: 'var(--text-faint)',
            }}>
              {task.tag}
            </span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              color: task.priority === 'HIGH' ? 'var(--p-high)' : task.priority === 'MEDIUM' ? 'var(--p-med)' : 'var(--p-low)',
            }}>
              {task.priority === 'HIGH' ? 'Yüksek' : task.priority === 'MEDIUM' ? 'Orta' : 'Düşük'}
            </span>
            {task.estimatedHours != null && (
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color: 'var(--text-faint)',
              }}>
                ⏱ {task.estimatedHours}s
              </span>
            )}
          </div>

          {/* Notes */}
          <div style={{ marginTop: '28px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px',
            }}>
              Notlar
            </div>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              onBlur={handleSave}
              placeholder="Notlar..."
              rows={6}
              style={{
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '10px 12px',
                color: 'var(--text-muted)',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Activity log */}
          <div style={{ marginTop: '28px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px',
            }}>
              Aktivite
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {logs.map((log) => (
                <div key={log.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    flexShrink: 0,
                    marginTop: '4px',
                  }} />
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {ACTION_LABELS[log.action] ?? log.action}
                      {log.fromStatus && log.toStatus && (
                        <span style={{ color: 'var(--text-faint)' }}>
                          {' '}({STATUS_LABELS[log.fromStatus]} → {STATUS_LABELS[log.toStatus]})
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      color: 'var(--text-faint)',
                      marginTop: '2px',
                    }}>
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: tr })}
                    </div>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Henüz aktivite yok</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation footer */}
      <div style={{
        padding: '14px 24px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        background: 'var(--bg-surface)',
      }}>
        <button
          onClick={() => hasPrev && onNavigate(columnTasks[currentIndex - 1])}
          disabled={!hasPrev}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 16px',
            color: hasPrev ? 'var(--text-muted)' : 'var(--text-faint)',
            fontSize: '13px',
            cursor: hasPrev ? 'pointer' : 'default',
            opacity: hasPrev ? 1 : 0.4,
          }}
        >
          ← önceki
        </button>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
          color: 'var(--text-faint)',
          alignSelf: 'center',
        }}>
          {currentIndex + 1} / {columnTasks.length}
        </span>
        <button
          onClick={() => hasNext && onNavigate(columnTasks[currentIndex + 1])}
          disabled={!hasNext}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 16px',
            color: hasNext ? 'var(--text-muted)' : 'var(--text-faint)',
            fontSize: '13px',
            cursor: hasNext ? 'pointer' : 'default',
            opacity: hasNext ? 1 : 0.4,
          }}
        >
          sonraki →
        </button>
      </div>
    </div>
  )
}
