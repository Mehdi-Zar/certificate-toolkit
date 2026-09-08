/**
 * Notifications ephemeres. Le contexte n'expose qu'une fonction : toast().
 */
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from './ui.tsx'

type Tone = 'success' | 'error' | 'info'

interface Toast {
  id: number
  tone: Tone
  text: string
}

const ToastContext = createContext<(tone: Tone, text: string) => void>(() => {})

export const useToast = () => useContext(ToastContext)

const TONES: Record<Tone, { icon: ReactNode; cls: string }> = {
  success: { icon: <CheckCircle2 className="size-4" />, cls: 'border-ok/35 bg-ok-soft text-ok' },
  error: { icon: <AlertTriangle className="size-4" />, cls: 'border-danger/35 bg-danger-soft text-danger' },
  info: { icon: <Info className="size-4" />, cls: 'border-info/35 bg-info-soft text-info' },
}

/** Une erreur reste plus longtemps : elle porte souvent un message a lire. */
const DURATION: Record<Tone, number> = { success: 3200, info: 3600, error: 7000 }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (tone: Tone, text: string) => {
      const id = nextId.current++
      setItems((list) => [...list.slice(-3), { id, tone, text }])
      setTimeout(() => dismiss(id), DURATION[tone])
    },
    [dismiss],
  )

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[26rem] max-w-[calc(100vw-2.5rem)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cx(
              'animate-toast pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-3',
              'shadow-[var(--shadow-panel)] backdrop-blur-sm',
              TONES[t.tone].cls,
            )}
          >
            <span className="mt-px shrink-0">{TONES[t.tone].icon}</span>
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed whitespace-pre-line selectable">
              {t.text}
            </p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Fermer"
              className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
