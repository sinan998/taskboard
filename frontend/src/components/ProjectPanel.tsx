import { useState } from 'react'
import { Project } from '../types'
import { createProject, updateProject, deleteProject } from '../api'

interface Props {
  open: boolean
  projects: Project[]
  onProjectsChange: (projects: Project[]) => void
}

const PROJECT_COLORS = [
  '#a78bfa', '#60a5fa', '#34d399', '#fbbf24',
  '#f87171', '#fb923c', '#f472b6', '#94a3b8',
]

export function ProjectPanel({ open, projects, onProjectsChange }: Props) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0])
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  async function handleCreate() {
    if (!newName.trim() || saving) return
    setSaving(true)
    try {
      const p = await createProject({ name: newName.trim(), color: newColor })
      onProjectsChange([...projects, p])
      setNewName('')
      setNewColor(PROJECT_COLORS[0])
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim() || saving) return
    setSaving(true)
    try {
      const p = await updateProject(id, { name: editName.trim(), color: editColor })
      onProjectsChange(projects.map((pr) => (pr.id === id ? p : pr)))
      setEditId(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProject(id)
      onProjectsChange(projects.filter((pr) => pr.id !== id))
    } catch {}
  }

  return (
    <div style={{
      padding: '16px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-surface)',
    }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '11px',
        color: 'var(--text-faint)',
        marginBottom: '12px',
      }}>
        // projeler
      </div>

      {/* Existing projects */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
        {projects.map((p) =>
          editId === p.id ? (
            <div key={p.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  minWidth: '100px',
                }}
              />
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditColor(c)}
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: c,
                      border: editColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => handleUpdate(p.id)}
                style={{
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  color: '#0f0f11',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Kaydet
              </button>
              <button
                onClick={() => setEditId(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                İptal
              </button>
            </div>
          ) : (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: p.color,
                flexShrink: 0,
              }} />
              <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>{p.name}</span>
              <button
                onClick={() => { setEditId(p.id); setEditName(p.name); setEditColor(p.color) }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-faint)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                düzenle
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--p-high)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                sil
              </button>
            </div>
          )
        )}
        {projects.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Henüz proje yok</div>
        )}
      </div>

      {/* New project form */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
          placeholder="Yeni proje adı..."
          style={{
            flex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '5px 8px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            minWidth: '120px',
          }}
        />
        <div style={{ display: 'flex', gap: '4px' }}>
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: c,
                border: newColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>
        <button
          onClick={handleCreate}
          disabled={!newName.trim()}
          style={{
            background: newName.trim() ? 'var(--accent)' : 'var(--bg-card)',
            border: 'none',
            borderRadius: '4px',
            padding: '5px 12px',
            color: newName.trim() ? '#0f0f11' : 'var(--text-faint)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: newName.trim() ? 'pointer' : 'default',
          }}
        >
          + Ekle
        </button>
      </div>
    </div>
  )
}
