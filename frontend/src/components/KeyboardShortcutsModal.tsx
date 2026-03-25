interface Props {
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'N', description: 'Yeni görev modalı aç' },
  { key: '/', description: 'Arama aç' },
  { key: 'P', description: 'Scratch pad aç/kapat' },
  { key: 'R', description: 'Raporlar paneli aç/kapat' },
  { key: 'F', description: 'Odak modu aç' },
  { key: 'B', description: 'Board seçici aç' },
  { key: '← →', description: 'Odak modunda kart geçişi' },
  { key: 'ESC', description: 'Açık modal/panel kapat' },
  { key: '?', description: 'Kısayol listesi göster' },
]

export function KeyboardShortcutsModal({ onClose }: Props) {
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
          borderRadius: '10px',
          padding: '24px 28px',
          minWidth: '320px',
        }}
      >
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          color: 'var(--text-faint)',
          marginBottom: '16px',
        }}>
          // klavye kısayolları
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {SHORTCUTS.map(({ key, description }) => (
              <tr key={key}>
                <td style={{ padding: '6px 0' }}>
                  <kbd style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    color: 'var(--accent)',
                    whiteSpace: 'nowrap',
                  }}>
                    {key}
                  </kbd>
                </td>
                <td style={{
                  padding: '6px 0 6px 14px',
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                }}>
                  {description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
