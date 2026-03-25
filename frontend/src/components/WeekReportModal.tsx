import { WeekReport } from '../types'

interface Props {
  report: WeekReport
  onClose: () => void
}

const TAG_COLORS: Record<string, string> = {
  DEV:    'var(--tag-dev-fg)',
  BUG:    'var(--tag-bug-fg)',
  TEST:   'var(--tag-test-fg)',
  DOC:    'var(--tag-doc-fg)',
  DESIGN: 'var(--tag-design-fg)',
  OPS:    'var(--tag-ops-fg)',
}

export function WeekReportModal({ report, onClose }: Props) {
  const maxCount = Math.max(...Object.values(report.tagBreakdown), 1)
  const tags = Object.entries(report.tagBreakdown).sort((a, b) => b[1] - a[1])

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
          padding: '28px 32px',
          minWidth: '400px',
          maxWidth: '520px',
        }}
      >
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          color: 'var(--text-faint)',
          marginBottom: '24px',
        }}>
          // hafta {report.weekNumber} raporu
        </div>

        <div style={{ display: 'flex', gap: '32px', marginBottom: '24px' }}>
          {/* Completed */}
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '28px',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}>
              {report.totalCompleted}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' }}>
              tamamlandı
            </div>
          </div>

          {/* Carried */}
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '28px',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}>
              {report.totalCarried}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' }}>
              devam eder
            </div>
          </div>

          {/* Avg time */}
          {report.avgCompletionHours !== null && (
            <div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '28px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}>
                ⌀ {report.avgCompletionHours.toFixed(1)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' }}>
                tamamlanma süresi (saat)
              </div>
            </div>
          )}
        </div>

        {/* Tag breakdown */}
        {tags.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tags.map(([tag, count]) => (
                <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    color: 'var(--text-faint)',
                    width: '52px',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}>
                    {tag}
                  </span>
                  <div style={{
                    flex: 1,
                    height: '6px',
                    background: 'var(--bg-card)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(count / maxCount) * 100}%`,
                      background: TAG_COLORS[tag] ?? 'var(--accent)',
                      borderRadius: '3px',
                    }} />
                  </div>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    width: '16px',
                    flexShrink: 0,
                  }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 20px',
            color: '#0f0f11',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Kapat
        </button>
      </div>
    </div>
  )
}
