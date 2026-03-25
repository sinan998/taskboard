import { useState, useEffect, FormEvent } from 'react'
import { Status, Priority, Tag, Project } from '../types'

interface Props {
  defaultStatus?: Status
  projects?: Project[]
  currentBoardId?: string
  onSubmit: (data: {
    title: string
    notes?: string
    status: Status
    priority: Priority
    tag: Tag
    projectId?: string
    boardId?: string
    estimatedHours?: number
  }) => void
  onClose: () => void
}

export function NewTaskModal({ defaultStatus = 'TODO', projects = [], currentBoardId, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Status>(defaultStatus)
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [tag, setTag] = useState<Tag>('DEV')
  const [projectId, setProjectId] = useState<string>('')
  const [estimatedHours, setEstimatedHours] = useState<string>('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const hours = estimatedHours !== '' ? parseFloat(estimatedHours) : undefined
    onSubmit({
      title: title.trim(),
      notes: notes.trim() || undefined,
      status,
      priority,
      tag,
      projectId: projectId || undefined,
      boardId: currentBoardId,
      estimatedHours: hours,
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-app)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '28px',
          width: '480px',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px', color: 'var(--text-primary)' }}>
          Yeni Görev
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Başlık *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="Görev başlığı..."
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Notlar
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opsiyonel notlar..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Durum
              </label>
              <select value={status} onChange={(e) => setStatus(e.target.value as Status)} style={selectStyle}>
                <option value="TODO">Yapılacak</option>
                <option value="IN_PROGRESS">Devam Ediyor</option>
                <option value="DONE">Tamamlandı</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Öncelik
              </label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} style={selectStyle}>
                <option value="HIGH">Yüksek</option>
                <option value="MEDIUM">Orta</option>
                <option value="LOW">Düşük</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Etiket
              </label>
              <select value={tag} onChange={(e) => setTag(e.target.value as Tag)} style={selectStyle}>
                <option value="DEV">DEV</option>
                <option value="TEST">TEST</option>
                <option value="DESIGN">DESIGN</option>
                <option value="DOC">DOC</option>
                <option value="BUG">BUG</option>
                <option value="OPS">OPS</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Proje
              </label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={selectStyle}>
                <option value="">Proje yok</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Tahmini süre (saat)
              </label>
              <input
                type="number"
                min="0.5"
                max="99"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="örn: 2"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px 18px',
                color: 'var(--text-muted)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              style={{
                background: 'var(--accent)',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 18px',
                color: '#0f0f11',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Oluştur
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
