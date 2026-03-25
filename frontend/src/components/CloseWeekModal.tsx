import { useEffect } from 'react'

interface Props {
  doneCount: number
  activeCount: number
  weekNumber: number
  onConfirm: () => void
  onClose: () => void
}

export function CloseWeekModal({ doneCount, activeCount, weekNumber, onConfirm, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
          width: '380px',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
          Hafta {weekNumber} Kapatılıyor
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Bu işlem geri alınamaz.
        </p>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Arşivlenecek (DONE)</span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              color: 'var(--col-done)',
            }}>{doneCount} kart</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Devam eden (TODO + IN_PROGRESS)</span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              color: 'var(--text-muted)',
            }}>{activeCount} kart</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '8px 18px',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: 'var(--col-done)',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 18px',
              color: '#0f0f11',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Haftayı Kapat ↩
          </button>
        </div>
      </div>
    </div>
  )
}
