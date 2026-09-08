/**
 * Assistant de demarrage.
 *
 * Il repond a la question que se pose quelqu'un qui n'a jamais demande de
 * certificat : qu'est-ce que je fais, qu'est-ce qui part, qu'est-ce que
 * j'attends, et qu'est-ce que j'obtiens a la fin. La deuxieme etape lui fait
 * aussi choisir son dossier de travail, parce que c'est la premiere decision
 * a prendre et qu'elle n'a rien a faire enterree dans les reglages.
 *
 * Il s'ouvre au premier lancement, et se rouvre depuis la barre laterale.
 */
import {
  ArrowRight,
  Check,
  FolderOpen,
  KeyRound,
  Package,
  Send,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Translate } from '../../shared/i18n/index.ts'
import { api, unwrap } from '../lib/api.ts'
import { useApp, useT } from '../lib/store.tsx'
import { FormatTable } from './FormatTable.tsx'
import { Button, Card, cx } from './ui.tsx'

export function Onboarding({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: () => void
}) {
  const { settings, updateSettings } = useApp()
  const t = useT()
  const [step, setStep] = useState(0)
  const [root, setRoot] = useState(settings?.rootDir ?? '')

  useEffect(() => {
    if (settings && !root) setRoot(settings.rootDir)
  }, [settings, root])

  const steps: Array<{ title: string; body: ReactNode }> = [
    { title: t('wizard.welcome.title'), body: <Welcome t={t} /> },
    {
      title: t('wizard.folder.title'),
      body: <FolderStep t={t} root={root} onPick={setRoot} />,
    },
    { title: t('wizard.flow.title'), body: <FlowStep t={t} /> },
    { title: t('wizard.create.title'), body: <CreateStep t={t} /> },
    { title: t('wizard.assemble.title'), body: <AssembleStep t={t} /> },
    { title: t('wizard.formats.title'), body: <FormatsStep t={t} /> },
  ]
  const last = step === steps.length - 1

  /** Sortir de l'assistant enregistre le dossier choisi et ne le repropose plus. */
  async function finish(then?: () => void) {
    if (settings) {
      await updateSettings({ ...settings, rootDir: root || settings.rootDir, onboarded: true })
    }
    onClose()
    then?.()
  }

  // Echap ferme, comme partout ailleurs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={steps[step]!.title}
    >
      <Card className="animate-in flex max-h-full w-full max-w-3xl flex-col overflow-hidden shadow-[var(--shadow-panel)]">
        <header className="flex items-start gap-4 border-b border-line px-7 py-5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-subtle">
              {t('wizard.step', { n: step + 1, total: steps.length })}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">{steps[step]!.title}</h2>
          </div>
          <button
            onClick={() => void finish()}
            aria-label={t('wizard.close')}
            className="shrink-0 rounded-md p-1.5 text-subtle transition-colors hover:bg-inset hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">{steps[step]!.body}</div>

        <footer className="flex items-center gap-3 border-t border-line px-7 py-4">
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                className={cx(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-5 bg-accent' : 'w-1.5 bg-line-strong',
                )}
              />
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                {t('wizard.back')}
              </Button>
            )}
            {!last && (
              <Button variant="ghost" onClick={() => void finish()}>
                {t('wizard.skip')}
              </Button>
            )}
            {last ? (
              <Button
                variant="primary"
                icon={<ArrowRight className="size-4" />}
                onClick={() => void finish(onCreate)}
              >
                {t('wizard.done.action')}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
                {t('wizard.next')}
              </Button>
            )}
          </div>
        </footer>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Welcome({ t }: { t: Translate }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-muted">{t('wizard.welcome.body')}</p>
      <div className="flex items-start gap-2.5 rounded-lg border border-ok/30 bg-ok-soft px-3.5 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" />
        <p className="text-[12px] leading-relaxed text-ok">{t('wizard.welcome.note')}</p>
      </div>
    </div>
  )
}

function FolderStep({
  t,
  root,
  onPick,
}: {
  t: Translate
  root: string
  onPick: (dir: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-muted">{t('wizard.folder.body')}</p>

      <div className="rounded-lg border border-line bg-sunken p-4">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-subtle">
          {t('wizard.folder.current')}
        </p>
        <p className="mb-3 break-all font-mono text-[12px] text-ink selectable">{root || '…'}</p>
        <Button
          icon={<FolderOpen className="size-4" />}
          onClick={async () => {
            const dir = await unwrap(api.system.pickDir())
            if (dir) onPick(dir)
          }}
        >
          {t('wizard.folder.choose')}
        </Button>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn-soft px-3.5 py-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
        <p className="text-[12px] leading-relaxed text-warn">{t('wizard.folder.warn')}</p>
      </div>
    </div>
  )
}

function FlowStep({ t }: { t: Translate }) {
  const steps: Array<{ icon: ReactNode; title: string; body: string; tone: string }> = [
    { icon: <KeyRound className="size-4" />, title: t('wizard.flow.s1'), body: t('wizard.flow.s1d'), tone: 'text-accent bg-accent-soft' },
    { icon: <Send className="size-4" />, title: t('wizard.flow.s2'), body: t('wizard.flow.s2d'), tone: 'text-info bg-info-soft' },
    { icon: <Package className="size-4" />, title: t('wizard.flow.s3'), body: t('wizard.flow.s3d'), tone: 'text-ok bg-ok-soft' },
  ]
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-muted">{t('wizard.flow.body')}</p>
      <ol className="flex flex-col gap-2.5">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3.5 rounded-lg border border-line p-4">
            <span className={cx('grid size-9 shrink-0 place-items-center rounded-lg', s.tone)}>
              {s.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium">
                {i + 1}. {s.title}
              </span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-subtle">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function CreateStep({ t }: { t: Translate }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-muted">{t('wizard.create.body')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-4">
          <p className="flex items-center gap-2 text-[13px] font-medium text-danger">
            <KeyRound className="size-4" />
            {t('wizard.create.keep')}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-danger/90">
            {t('wizard.create.keepDesc')}
          </p>
        </div>
        <div className="rounded-lg border border-info/30 bg-info-soft p-4">
          <p className="flex items-center gap-2 text-[13px] font-medium text-info">
            <Send className="size-4" />
            {t('wizard.create.send')}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-info/90">
            {t('wizard.create.sendDesc')}
          </p>
        </div>
      </div>
    </div>
  )
}

function AssembleStep({ t }: { t: Translate }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-muted">{t('wizard.assemble.body')}</p>

      {/* La recombinaison, dite en une image plutot qu'en un paragraphe. */}
      <div className="flex items-center gap-3 rounded-lg border border-line bg-sunken p-4">
        <Piece icon={<Package className="size-4" />} label={t('label.csr')} tone="text-info bg-info-soft" caption="+" />
        <Piece icon={<KeyRound className="size-4" />} label={t('label.privateKey')} tone="text-danger bg-danger-soft" caption="=" />
        <Piece icon={<ShieldCheck className="size-4" />} label="PFX" tone="text-ok bg-ok-soft" />
      </div>

      <p className="text-[13px] leading-relaxed text-muted">{t('wizard.assemble.how')}</p>
      <p className="flex items-start gap-2 text-[12px] leading-relaxed text-subtle">
        <Check className="mt-0.5 size-3.5 shrink-0 text-ok" />
        {t('wizard.assemble.formats')}
      </p>
    </div>
  )
}

function Piece({
  icon,
  label,
  tone,
  caption,
}: {
  icon: ReactNode
  label: string
  tone: string
  caption?: string
}) {
  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
        <span className={cx('grid size-10 place-items-center rounded-lg', tone)}>{icon}</span>
        <span className="truncate text-[11.5px] text-muted">{label}</span>
      </div>
      {caption && <span className="shrink-0 text-lg font-light text-subtle">{caption}</span>}
    </>
  )
}

function FormatsStep({ t }: { t: Translate }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-muted">{t('wizard.formats.body')}</p>
      <FormatTable t={t} />
    </div>
  )
}
