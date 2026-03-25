import { useState, useRef, useEffect } from 'react'
import { Task, Board, BoardWorkload, Project } from '../types'

interface Props {
  weekNumber: number
  archiveCount: number
  todayTasks: Task[]
  boards: Board[]
  currentBoardId: string
  boardWorkload: BoardWorkload | null
  projectsOpen: boolean
  projects: Project[]
  selectedProjectId: string
  onProjectFilterChange: (projectId: string) => void
  onNewTask: () => void
  onCloseWeek: () => void
  onToggleArchive: () => void
  onToggleScratch: () => void
  onToggleReports: () => void
  onOpenSearch: () => void
  onRemoveTodayTask: (task: Task) => void
  onBoardChange: (boardId: string) => void
  onCreateBoard: (name: string) => void
  onToggleProjects: () => void
  onDownloadCSV: (type: 'tasks' | 'archive') => void
  archiveOpen: boolean
  scratchOpen: boolean
  reportsOpen: boolean
  openBoardDropdown?: boolean
  onBoardDropdownOpened?: () => void
}

export function TopBar({
  weekNumber,
  archiveCount,
  todayTasks,
  boards,
  currentBoardId,
  boardWorkload,
  projectsOpen,
  projects,
  selectedProjectId,
  onProjectFilterChange,
  onNewTask,
  onCloseWeek,
  onToggleArchive,
  onToggleScratch,
  onToggleReports,
  onOpenSearch,
  onRemoveTodayTask,
  onBoardChange,
  onCreateBoard,
  onToggleProjects,
  onDownloadCSV,
  archiveOpen,
  scratchOpen,
  reportsOpen,
  openBoardDropdown,
  onBoardDropdownOpened,
}: Props) {
  const [boardDropdownOpen, setBoardDropdownOpen] = useState(false)
  const [csvDropdownOpen, setCsvDropdownOpen] = useState(false)
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [addingBoard, setAddingBoard] = useState(false)
  const boardDropdownRef = useRef<HTMLDivElement>(null)
  const csvDropdownRef = useRef<HTMLDivElement>(null)
  const projectDropdownRef = useRef<HTMLDivElement>(null)

  // Programmatic board dropdown open (from B shortcut)
  useEffect(() => {
    if (openBoardDropdown) {
      setBoardDropdownOpen(true)
      setAddingBoard(false)
      setNewBoardName('')
      onBoardDropdownOpened?.()
    }
  }, [openBoardDropdown, onBoardDropdownOpened])

  const currentBoard = boards.find((b) => b.id === currentBoardId)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (boardDropdownRef.current && !boardDropdownRef.current.contains(e.target as Node)) {
        setBoardDropdownOpen(false)
        setAddingBoard(false)
        setNewBoardName('')
      }
      if (csvDropdownRef.current && !csvDropdownRef.current.contains(e.target as Node)) {
        setCsvDropdownOpen(false)
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const workloadText = boardWorkload
    ? `${boardWorkload.totalEstimatedHours > 0 ? boardWorkload.totalEstimatedHours.toFixed(1) + 's tahmini · ' : ''}${boardWorkload.taskCount.todo + boardWorkload.taskCount.inProgress} aktif`
    : null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 20px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      flexWrap: 'wrap',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'var(--accent)',
        }} />
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '15px',
          fontWeight: 500,
          color: 'var(--text-primary)',
        }}>taskboard</span>
      </div>

      {/* Board selector */}
      <div ref={boardDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => { setBoardDropdownOpen((v) => !v); setAddingBoard(false); setNewBoardName('') }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '5px 10px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <span>{currentBoard?.name ?? 'Board'}</span>
          <span style={{ color: 'var(--text-faint)', fontSize: '10px' }}>▾</span>
        </button>

        {boardDropdownOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            minWidth: '200px',
            zIndex: 100,
            overflow: 'hidden',
          }}>
            {boards.map((b) => (
              <button
                key={b.id}
                onClick={() => { onBoardChange(b.id); setBoardDropdownOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: b.id === currentBoardId ? 'var(--accent)' : 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ width: '14px', color: 'var(--accent)' }}>
                  {b.id === currentBoardId ? '✓' : ''}
                </span>
                {b.name}
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            {addingBoard ? (
              <div style={{ padding: '8px 12px', display: 'flex', gap: '6px' }}>
                <input
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  autoFocus
                  placeholder="Board adı..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newBoardName.trim()) {
                      onCreateBoard(newBoardName.trim())
                      setNewBoardName('')
                      setAddingBoard(false)
                      setBoardDropdownOpen(false)
                    }
                    if (e.key === 'Escape') { setAddingBoard(false); setNewBoardName('') }
                  }}
                  style={{
                    flex: 1,
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingBoard(true)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-faint)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                + Yeni board
              </button>
            )}
          </div>
        )}
      </div>

      {/* Workload pill */}
      {workloadText && (
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
          color: 'var(--text-faint)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '3px 8px',
          flexShrink: 0,
        }}>
          {workloadText}
        </span>
      )}

      {/* Project filter */}
      {projects.length > 0 && (
        <div ref={projectDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setProjectDropdownOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: selectedProjectId ? 'var(--bg-card)' : 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '5px 10px',
              color: selectedProjectId ? 'var(--text-primary)' : 'var(--text-faint)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {selectedProjectId ? (
              <>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: projects.find((p) => p.id === selectedProjectId)?.color ?? 'var(--accent)',
                  display: 'inline-block',
                  flexShrink: 0,
                }} />
                <span>{projects.find((p) => p.id === selectedProjectId)?.name ?? 'Proje'}</span>
              </>
            ) : (
              <span>Proje filtresi</span>
            )}
            <span style={{ color: 'var(--text-faint)', fontSize: '10px' }}>▾</span>
          </button>

          {projectDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              minWidth: '190px',
              zIndex: 100,
              overflow: 'hidden',
            }}>
              <button
                onClick={() => { onProjectFilterChange(''); setProjectDropdownOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: !selectedProjectId ? 'var(--accent)' : 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ width: '14px', color: 'var(--accent)' }}>
                  {!selectedProjectId ? '✓' : ''}
                </span>
                Tüm projeler
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onProjectFilterChange(p.id); setProjectDropdownOpen(false) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: p.id === selectedProjectId ? 'var(--accent)' : 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: '14px', color: 'var(--accent)' }}>
                    {p.id === selectedProjectId ? '✓' : ''}
                  </span>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: p.color,
                    flexShrink: 0,
                    display: 'inline-block',
                  }} />
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Today tasks pills */}
      {todayTasks.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {todayTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onRemoveTodayTask(task)}
              title="Günün görevinden çıkar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '3px 10px 3px 8px',
                color: 'var(--text-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                maxWidth: '180px',
              }}
            >
              <span style={{ fontSize: '10px' }}>📌</span>
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {task.title}
              </span>
              <span style={{ color: 'var(--text-faint)', fontSize: '14px', marginLeft: '2px' }}>×</span>
            </button>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Week */}
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '13px',
        color: 'var(--text-faint)',
        flexShrink: 0,
      }}>
        Hafta {weekNumber}
      </span>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* Search */}
        <button
          onClick={onOpenSearch}
          title="Ara (/)"
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 10px',
            color: 'var(--text-faint)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          🔍
        </button>

        {/* Projects */}
        <button
          onClick={onToggleProjects}
          title="Projeler"
          style={{
            background: projectsOpen ? 'var(--bg-card)' : 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 10px',
            color: 'var(--text-faint)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ⊞
        </button>

        {/* CSV Export */}
        <div ref={csvDropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setCsvDropdownOpen((v) => !v)}
            title="Dışa aktar"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '6px 10px',
              color: 'var(--text-faint)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ⬇
          </button>
          {csvDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              minWidth: '190px',
              zIndex: 100,
              overflow: 'hidden',
            }}>
              <button
                onClick={() => { onDownloadCSV('tasks'); setCsvDropdownOpen(false) }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '9px 14px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                Görevleri İndir (.csv)
              </button>
              <button
                onClick={() => { onDownloadCSV('archive'); setCsvDropdownOpen(false) }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '9px 14px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                Arşivi İndir (.csv)
              </button>
            </div>
          )}
        </div>

        {/* Scratch pad */}
        <button
          onClick={onToggleScratch}
          title="Scratch Pad (P)"
          style={{
            background: scratchOpen ? 'var(--bg-card)' : 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 10px',
            color: 'var(--text-faint)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          📝
        </button>

        {/* Reports */}
        <button
          onClick={onToggleReports}
          title="Raporlar (R)"
          style={{
            background: reportsOpen ? 'var(--bg-card)' : 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 10px',
            color: 'var(--text-faint)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          📊
        </button>

        {/* Archive */}
        <button
          onClick={onToggleArchive}
          style={{
            background: archiveOpen ? 'var(--bg-card)' : 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 12px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <span>Arşiv</span>
          {archiveCount > 0 && (
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              background: 'var(--bg-app)',
              borderRadius: '4px',
              padding: '1px 5px',
              fontSize: '11px',
              color: 'var(--text-faint)',
            }}>{archiveCount}</span>
          )}
        </button>

        {/* Close Week */}
        <button
          onClick={onCloseWeek}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 12px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Hafta Kapat
        </button>

        {/* New Task */}
        <button
          onClick={onNewTask}
          style={{
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 14px',
            color: '#0f0f11',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Yeni Görev
        </button>
      </div>
    </div>
  )
}
