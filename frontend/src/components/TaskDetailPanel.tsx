import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Task, ActivityLog, RelationType } from '../types'
import { getActivity, updateTask, getTaskRelations, createTaskRelation, deleteTaskRelation, searchTasks } from '../api'

interface Props {
  task: Task
  onClose: () => void
  onUpdate: (task: Task) => void
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

export function TaskDetailPanel({ task, onClose, onUpdate }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [editTitle, setEditTitle] = useState(task.title)
  const [editNotes, setEditNotes] = useState(task.notes ?? '')
  const [editHours, setEditHours] = useState<string>(task.estimatedHours != null ? String(task.estimatedHours) : '')
  const [saving, setSaving] = useState(false)

  // Relations
  const [relationsData, setRelationsData] = useState<{
    blocks: Task[]; blockedBy: Task[]; relatesTo: Task[]
    relations: import('../types').TaskRelation[]
  } | null>(null)
  const [addingRelation, setAddingRelation] = useState(false)
  const [relationSearch, setRelationSearch] = useState('')
  const [relationSearchResults, setRelationSearchResults] = useState<Task[]>([])
  const [selectedRelationType, setSelectedRelationType] = useState<RelationType>('BLOCKS')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    setEditTitle(task.title)
    setEditNotes(task.notes ?? '')
    setEditHours(task.estimatedHours != null ? String(task.estimatedHours) : '')
    getActivity({ taskId: task.id }).then(setLogs).catch(() => {})
    getTaskRelations(task.id).then(setRelationsData).catch(() => {})
  }, [task.id, task.title, task.notes, task.estimatedHours])

  useEffect(() => {
    if (!relationSearch.trim()) { setRelationSearchResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const results = await searchTasks(relationSearch)
        setRelationSearchResults(results.filter((t) => t.id !== task.id))
      } catch {}
    }, 300)
    return () => clearTimeout(timer)
  }, [relationSearch, task.id])

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const hours = editHours !== '' ? parseFloat(editHours) : undefined
      const updated = await updateTask(task.id, {
        title: editTitle,
        notes: editNotes || undefined,
        estimatedHours: hours,
      })
      onUpdate(updated)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddRelation(toTaskId: string) {
    try {
      await createTaskRelation(task.id, { toTaskId, type: selectedRelationType })
      const updated = await getTaskRelations(task.id)
      setRelationsData(updated)
      setAddingRelation(false)
      setRelationSearch('')
      setRelationSearchResults([])
    } catch (err: any) {
      console.error('Relation error:', err.message)
    }
  }

  async function handleDeleteRelation(taskId: string, relationId: string) {
    try {
      await deleteTaskRelation(taskId, relationId)
      const updated = await getTaskRelations(task.id)
      setRelationsData(updated)
    } catch {}
  }

  function findRelationId(fromId: string, toId: string): string | undefined {
    return relationsData?.relations.find(
      (r) => (r.fromTaskId === fromId && r.toTaskId === toId) || (r.fromTaskId === toId && r.toTaskId === fromId)
    )?.id
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '380px',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Görev Detayı
        </span>
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

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Title */}
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave}
          style={{
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '8px 10px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: 500,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />

        {/* Notes */}
        <textarea
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          onBlur={handleSave}
          placeholder="Notlar..."
          rows={4}
          style={{
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '8px 10px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            marginTop: '10px',
            resize: 'vertical',
            boxSizing: 'border-box',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        {/* Estimated hours */}
        <div style={{ marginTop: '10px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-faint)', marginBottom: '5px' }}>
            Tahmini süre (saat)
          </label>
          <input
            type="number"
            min="0.5"
            max="99"
            step="0.5"
            value={editHours}
            onChange={(e) => setEditHours(e.target.value)}
            onBlur={handleSave}
            placeholder="örn: 2"
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '7px 10px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* Meta */}
        <div style={{
          marginTop: '14px',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '3px 8px',
            color: 'var(--text-muted)',
          }}>
            {STATUS_LABELS[task.status] ?? task.status}
          </span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '3px 8px',
            color: 'var(--text-muted)',
          }}>
            {task.tag}
          </span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '3px 8px',
            color: 'var(--text-muted)',
          }}>
            {task.priority}
          </span>
          {task.project && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '3px 8px',
              color: 'var(--text-muted)',
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: task.project.color,
                display: 'inline-block',
              }} />
              {task.project.name}
            </span>
          )}
        </div>

        {/* Relations */}
        <div style={{ marginTop: '20px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '10px',
          }}>
            İlişkiler
          </div>

          {relationsData?.blocks && relationsData.blocks.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '6px' }}>Bloklıyor:</div>
              {relationsData.blocks.map((t) => {
                const rid = findRelationId(task.id, t.id)
                return (
                  <div key={t.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>⬡</span>
                    <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)' }}>{t.title}</span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '10px',
                      color: 'var(--text-faint)',
                    }}>{t.status}</span>
                    {rid && (
                      <button
                        onClick={() => handleDeleteRelation(task.id, rid)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-faint)',
                          fontSize: '14px',
                          cursor: 'pointer',
                          padding: '0 4px',
                        }}
                      >×</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {relationsData?.blockedBy && relationsData.blockedBy.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '6px' }}>Bloke eden:</div>
              {relationsData.blockedBy.map((t) => {
                const rid = findRelationId(task.id, t.id)
                return (
                  <div key={t.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: '12px', color: '#f87171' }}>⊘</span>
                    <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)' }}>{t.title}</span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '10px',
                      color: 'var(--text-faint)',
                    }}>{t.status}</span>
                    {rid && (
                      <button
                        onClick={() => handleDeleteRelation(task.id, rid)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-faint)',
                          fontSize: '14px',
                          cursor: 'pointer',
                          padding: '0 4px',
                        }}
                      >×</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {relationsData?.relatesTo && relationsData.relatesTo.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '6px' }}>Bağlantılı:</div>
              {relationsData.relatesTo.map((t) => {
                const rid = findRelationId(task.id, t.id)
                return (
                  <div key={t.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>⬡</span>
                    <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)' }}>{t.title}</span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '10px',
                      color: 'var(--text-faint)',
                    }}>{t.status}</span>
                    {rid && (
                      <button
                        onClick={() => handleDeleteRelation(task.id, rid)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-faint)',
                          fontSize: '14px',
                          cursor: 'pointer',
                          padding: '0 4px',
                        }}
                      >×</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add relation */}
          {addingRelation ? (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <select
                  value={selectedRelationType}
                  onChange={(e) => setSelectedRelationType(e.target.value as RelationType)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '5px 8px',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                >
                  <option value="BLOCKS">Bloke eder</option>
                  <option value="RELATES_TO">Bağlantılı</option>
                </select>
                <button
                  onClick={() => { setAddingRelation(false); setRelationSearch(''); setRelationSearchResults([]) }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '5px 10px',
                    color: 'var(--text-faint)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  İptal
                </button>
              </div>
              <input
                value={relationSearch}
                onChange={(e) => setRelationSearch(e.target.value)}
                autoFocus
                placeholder="Görev ara..."
                style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              {relationSearchResults.length > 0 && (
                <div style={{
                  marginTop: '4px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  {relationSearchResults.slice(0, 6).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleAddRelation(t.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '7px 10px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </span>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '10px',
                        color: 'var(--text-faint)',
                        flexShrink: 0,
                      }}>{t.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAddingRelation(true)}
              style={{
                background: 'transparent',
                border: '1px dashed var(--border)',
                borderRadius: '4px',
                padding: '6px 12px',
                color: 'var(--text-faint)',
                fontSize: '12px',
                cursor: 'pointer',
                width: '100%',
                marginTop: '6px',
              }}
            >
              + İlişki ekle
            </button>
          )}
        </div>

        {/* Activity Timeline */}
        <div style={{ marginTop: '20px' }}>
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
                <div style={{ flex: 1 }}>
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
              <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                Henüz aktivite yok
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
