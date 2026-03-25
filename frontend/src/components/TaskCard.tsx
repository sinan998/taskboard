import { useState } from 'react'
import { Task } from '../types'

interface Props {
  task: Task
  onMove: (id: string, direction: 'forward' | 'back') => void
  onDelete: (id: string) => void
  onCopy: (task: Task) => void
  onToggleToday: (task: Task) => void
  onClick: (task: Task) => void
  onFocus?: (task: Task) => void
  isDragging?: boolean
}

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'var(--p-high)',
  MEDIUM: 'var(--p-med)',
  LOW: 'var(--p-low)',
}

const PRIORITY_LABELS: Record<string, string> = {
  HIGH: 'Yüksek',
  MEDIUM: 'Orta',
  LOW: 'Düşük',
}

const TAG_STYLES: Record<string, { bg: string; fg: string }> = {
  DEV:    { bg: 'var(--tag-dev-bg)',    fg: 'var(--tag-dev-fg)' },
  BUG:    { bg: 'var(--tag-bug-bg)',    fg: 'var(--tag-bug-fg)' },
  TEST:   { bg: 'var(--tag-test-bg)',   fg: 'var(--tag-test-fg)' },
  DOC:    { bg: 'var(--tag-doc-bg)',    fg: 'var(--tag-doc-fg)' },
  DESIGN: { bg: 'var(--tag-design-bg)', fg: 'var(--tag-design-fg)' },
  OPS:    { bg: 'var(--tag-ops-bg)',    fg: 'var(--tag-ops-fg)' },
}

function getTaskAge(createdAt: string): number {
  return Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
}

export function TaskCard({ task, onMove, onDelete, onCopy, onToggleToday, onClick, onFocus, isDragging }: Props) {
  const [hovered, setHovered] = useState(false)
  const isDone = task.status === 'DONE'
  const tagStyle = TAG_STYLES[task.tag] || TAG_STYLES.DEV
  const age = !isDone ? getTaskAge(task.createdAt) : 0
  const ageColor = age >= 7 ? '#f87171' : '#fbbf24'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(task)}
      style={{
        display: 'flex',
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--border-hover)' : 'var(--border)'}`,
        borderRadius: '8px',
        overflow: 'hidden',
        transform: hovered && !isDragging ? 'translateY(-1px)' : 'none',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
        position: 'relative',
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {/* Priority bar */}
      <div style={{
        width: '3px',
        flexShrink: 0,
        background: PRIORITY_COLORS[task.priority],
      }} />

      <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
        {/* Title row */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '4px',
          marginBottom: '8px',
        }}>
          {task.isBlocked && (
            <span
              title="Bloke edilmiş — ilişkiyi görmek için aç"
              style={{ fontSize: '12px', flexShrink: 0, marginTop: '1px', color: '#f87171' }}
            >
              ⊘
            </span>
          )}
          {task.isTodayTask && (
            <span style={{ fontSize: '11px', flexShrink: 0, marginTop: '1px' }}>📌</span>
          )}
          <div style={{
            fontSize: '13px',
            fontWeight: 500,
            color: isDone ? 'var(--text-faint)' : 'var(--text-primary)',
            textDecoration: isDone ? 'line-through' : 'none',
            lineHeight: 1.4,
            flex: 1,
            minWidth: 0,
          }}>
            {task.title}
          </div>
          {/* Age indicator */}
          {!isDone && age >= 3 && (
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: ageColor,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}>
              <span style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: ageColor,
                display: 'inline-block',
              }} />
              {age}g
            </span>
          )}
        </div>

        {/* Notes preview */}
        {task.notes && (
          <div style={{
            fontSize: '12px',
            color: 'var(--text-faint)',
            marginBottom: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {task.notes}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              background: tagStyle.bg,
              color: tagStyle.fg,
              borderRadius: '4px',
              padding: '2px 6px',
            }}>
              {task.tag}
            </span>
            {task.project && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: 'var(--text-faint)',
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: task.project.color,
                  flexShrink: 0,
                  display: 'inline-block',
                }} />
                {task.project.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {task.estimatedHours != null && (
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '10px',
                color: 'var(--text-faint)',
              }}>
                ⏱ {task.estimatedHours}s
              </span>
            )}
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              color: PRIORITY_COLORS[task.priority],
            }}>
              {PRIORITY_LABELS[task.priority]}
            </span>
          </div>
        </div>
      </div>

      {/* Hover actions */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            display: 'flex',
            gap: '4px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Focus button */}
          {onFocus && (
            <button
              onClick={() => onFocus(task)}
              title="Odak modu (F)"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                width: '22px',
                height: '22px',
                color: 'var(--text-faint)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ⤢
            </button>
          )}
          {/* Today task toggle */}
          {!isDone && (
            <button
              onClick={() => onToggleToday(task)}
              title={task.isTodayTask ? 'Günün görevinden çıkar' : 'Günün görevi yap'}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                width: '22px',
                height: '22px',
                color: task.isTodayTask ? 'var(--accent)' : 'var(--text-faint)',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              📌
            </button>
          )}
          {/* Copy button */}
          <button
            onClick={() => onCopy(task)}
            title="Kopyala"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              width: '22px',
              height: '22px',
              color: 'var(--text-faint)',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ⧉
          </button>
          {task.status !== 'TODO' && (
            <button
              onClick={() => onMove(task.id, 'back')}
              title="Geri taşı"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                width: '22px',
                height: '22px',
                color: 'var(--text-muted)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ←
            </button>
          )}
          {task.status !== 'DONE' && (
            <button
              onClick={() => onMove(task.id, 'forward')}
              title="İleri taşı"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                width: '22px',
                height: '22px',
                color: 'var(--text-muted)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              →
            </button>
          )}
          <button
            onClick={() => onDelete(task.id)}
            title="Sil"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              width: '22px',
              height: '22px',
              color: 'var(--p-high)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
