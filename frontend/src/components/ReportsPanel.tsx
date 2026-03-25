import { useState, useEffect } from 'react'
import { WeekReport } from '../types'
import { getReports } from '../api'

interface Props {
  open: boolean
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

function ReportCard({ report }: { report: WeekReport }) {
  const tags = Object.entries(report.tagBreakdown).sort((a, b) => b[1] - a[1])
  const maxCount = Math.max(...Object.values(report.tagBreakdown), 1)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '16px 20px',
    }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '12px',
        color: 'var(--text-faint)',
        marginBottom: '14px',
      }}>
        // hafta {report.weekNumber}
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '14px' }}>
        <div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '22px',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}>
            {report.totalCompleted}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>tamamlandı</div>
        </div>
        <div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '22px',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}>
            {report.totalCarried}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>devam etti</div>
        </div>
        {report.avgCompletionHours !== null && (
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '22px',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}>
              ⌀ {report.avgCompletionHours.toFixed(1)}h
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>ort. süre</div>
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {tags.map(([tag, count]) => (
            <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '10px',
                color: 'var(--text-faint)',
                width: '48px',
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {tag}
              </span>
              <div style={{
                flex: 1,
                height: '5px',
                background: 'var(--bg-surface)',
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
                fontSize: '10px',
                color: 'var(--text-muted)',
                width: '14px',
                flexShrink: 0,
              }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReportsPanel({ open, onClose }: Props) {
  const [reports, setReports] = useState<WeekReport[]>([])

  useEffect(() => {
    if (open) {
      getReports().then(setReports).catch(() => {})
    }
  }, [open])

  if (!open) return null

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      padding: '14px 20px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
      }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          color: 'var(--text-faint)',
        }}>
          // haftalık raporlar
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-faint)',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      {reports.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--text-faint)', padding: '20px 0' }}>
          Henüz hafta raporu yok.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '12px',
        }}>
          {reports.map((r) => <ReportCard key={r.id} report={r} />)}
        </div>
      )}
    </div>
  )
}
