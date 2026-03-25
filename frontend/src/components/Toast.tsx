import { useEffect } from 'react'

interface Props {
  message: string
  onDismiss: () => void
}

export function Toast({ message, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-hover)',
        borderRadius: '8px',
        padding: '10px 20px',
        fontSize: '13px',
        color: 'var(--text-primary)',
        zIndex: 200,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      {message}
    </div>
  )
}
