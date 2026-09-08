/**
 * Ou en est une demande, et ce qu'il reste a faire.
 *
 * Le detail d'un dossier montrait trois sections sans dire laquelle attendait
 * une action. Ce bandeau situe la demande dans le parcours et enonce la seule
 * chose a faire maintenant, en une phrase.
 */
import { Check, KeyRound, Package, Send, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MessageKey, Translate } from '../../shared/i18n/index.ts'
import type { EntryStatus } from '../../shared/types.ts'
import { Card, cx } from './ui.tsx'

/**
 * Position dans le parcours : index de l'etape en cours (0 a 3), et la
 * consigne associee. Une demande emise n'a plus d'etape en cours.
 */
function positionOf(status: EntryStatus): { current: number; todo: MessageKey; blocked: boolean } {
  switch (status) {
    case 'awaiting-pki':
      return { current: 1, todo: 'flow.todo.send', blocked: false }
    case 'ready-to-assemble':
      return { current: 3, todo: 'flow.todo.assemble', blocked: false }
    case 'issued':
    case 'expiring':
    case 'expired':
      return { current: 4, todo: 'flow.todo.done', blocked: false }
    case 'broken':
      return { current: 0, todo: 'flow.todo.broken', blocked: true }
  }
}

const STEPS: Array<{ key: MessageKey; icon: ReactNode }> = [
  { key: 'flow.s1', icon: <KeyRound className="size-3.5" /> },
  { key: 'flow.s2', icon: <Send className="size-3.5" /> },
  { key: 'flow.s3', icon: <Package className="size-3.5" /> },
  { key: 'flow.s4', icon: <ShieldCheck className="size-3.5" /> },
]

export function FlowStepper({ status, t }: { status: EntryStatus; t: Translate }) {
  const { current, todo, blocked } = positionOf(status)

  return (
    <Card className="overflow-hidden">
      <ol className="flex items-stretch">
        {STEPS.map((step, i) => {
          const done = i < current
          const active = i === current
          return (
            <li
              key={step.key}
              className={cx(
                'flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3.5',
                i > 0 && 'border-l border-line',
                active && !blocked && 'bg-accent-soft',
              )}
            >
              <span
                className={cx(
                  'grid size-6 shrink-0 place-items-center rounded-full',
                  done
                    ? 'bg-ok text-white'
                    : active && !blocked
                      ? 'bg-accent text-accent-fg'
                      : 'bg-inset text-subtle',
                )}
              >
                {done ? <Check className="size-3.5" /> : step.icon}
              </span>
              <span
                className={cx(
                  'truncate text-[12px]',
                  done ? 'text-muted' : active && !blocked ? 'font-medium text-accent' : 'text-subtle',
                )}
              >
                {t(step.key)}
              </span>
            </li>
          )
        })}
      </ol>

      <div
        className={cx(
          'flex items-start gap-2.5 border-t px-4 py-3',
          blocked ? 'border-danger/25 bg-danger-soft' : 'border-line bg-sunken',
        )}
      >
        {blocked ? (
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
        ) : (
          <span className="mt-0.5 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-subtle">
            {t('flow.todo')}
          </span>
        )}
        <p className={cx('text-[13px] leading-relaxed', blocked ? 'text-danger' : 'text-ink')}>
          {t(todo)}
        </p>
      </div>
    </Card>
  )
}
