import {
  AlertTriangle,
  FilePlus2,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Send,
  Monitor,
  Moon,
  ShieldCheck,
  Settings as SettingsIcon,
  Sun,
} from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Onboarding } from './components/Onboarding.tsx'
import { cx } from './components/ui.tsx'
import { LANGUAGES, type Lang } from '../shared/i18n/index.ts'
import type { EntryStatus } from '../shared/types.ts'
import { useApp, useT, useTheme, type Theme } from './lib/store.tsx'
import { CertificatesPage } from './pages/CertificatesPage.tsx'
import { DetailPage } from './pages/DetailPage.tsx'
import { NewRequestPage } from './pages/NewRequestPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'

export type Route =
  | { name: 'list'; filter?: ListFilter }
  /**
   * fresh distingue deux clics successifs sur "Creer une demande". Sans lui,
   * la cle de rendu ne change pas, le composant garde son etat, et quelqu'un
   * arrive sur l'ecran de confirmation d'une demande terminee ne peut plus en
   * commencer une autre : le menu semble ne rien faire.
   */
  | { name: 'new'; fresh?: number }
  | { name: 'detail'; fqdn: string }
  | { name: 'settings' }

/** Ce que la liste affiche : tout, ou un seul etat du parcours. */
export type ListFilter = 'all' | EntryStatus

export default function App() {
  const [route, navigate] = useState<Route>({ name: 'list' })
  const { probe, loading, settings } = useApp()
  const [wizard, setWizard] = useState(false)

  // Au premier lancement, l'assistant s'ouvre avant tout le reste : c'est la
  // qu'on choisit son dossier de travail.
  const firstRun = settings !== null && !settings.onboarded

  return (
    <div className="flex h-full bg-canvas text-ink">
      {(wizard || firstRun) && (
        <Onboarding onClose={() => setWizard(false)} onCreate={() => navigate({ name: 'new' })} />
      )}

      <Sidebar route={route} navigate={navigate} onWizard={() => setWizard(true)} />

      <main className="min-w-0 flex-1 overflow-y-auto">
        {probe && !probe.available && !loading && <OpensslWarning onFix={() => navigate({ name: 'settings' })} />}

        <div key={routeKey(route)} className="animate-in">
          {route.name === 'list' && (
            <CertificatesPage navigate={navigate} filter={route.filter ?? 'all'} />
          )}
          {route.name === 'new' && <NewRequestPage navigate={navigate} />}
          {route.name === 'detail' && <DetailPage fqdn={route.fqdn} navigate={navigate} />}
          {route.name === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  )
}

const routeKey = (r: Route): string => {
  if (r.name === 'detail') return 'detail:' + r.fqdn
  if (r.name === 'new') return 'new:' + (r.fresh ?? 0)
  return r.name
}

// ---------------------------------------------------------------------------

function Sidebar({
  route,
  navigate,
  onWizard,
}: {
  route: Route
  navigate: (r: Route) => void
  onWizard: () => void
}) {
  const { entries } = useApp()
  const t = useT()
  const count = (s: EntryStatus) => entries.filter((e) => e.status === s).length
  const onList = route.name === 'list' || route.name === 'detail'
  const filter = route.name === 'list' ? (route.filter ?? 'all') : 'all'

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-sunken">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-6">
        <div className="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg">
          <ShieldCheck className="size-4.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight">Certificate Toolkit</p>
          <p className="truncate text-[11px] text-subtle leading-tight">{t('app.subtitle')}</p>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {/* Le tableau de bord est l'accueil : il passe devant le parcours. */}
        <NavItem
          icon={<LayoutDashboard className="size-4" />}
          active={onList && filter === 'all'}
          onClick={() => navigate({ name: 'list' })}
          badge={entries.length > 0 ? entries.length : undefined}
        >
          {t('nav.dashboard')}
        </NavItem>

        <p className="mb-1.5 mt-3 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-subtle">
          {t('nav.journey')}
        </p>

        <Step
          n={1}
          icon={<FilePlus2 className="size-4" />}
          active={route.name === 'new'}
          onClick={() => navigate({ name: 'new', fresh: Date.now() })}
        >
          {t('nav.step1')}
        </Step>
        <Step
          n={2}
          icon={<Send className="size-4" />}
          active={onList && filter === 'awaiting-pki'}
          onClick={() => navigate({ name: 'list', filter: 'awaiting-pki' })}
          count={count('awaiting-pki')}
        >
          {t('nav.step2')}
        </Step>
        <Step
          n={3}
          icon={<Package className="size-4" />}
          active={onList && filter === 'ready-to-assemble'}
          onClick={() => navigate({ name: 'list', filter: 'ready-to-assemble' })}
          count={count('ready-to-assemble')}
          urgent
        >
          {t('nav.step3')}
        </Step>
        <Step
          icon={<ShieldCheck className="size-4" />}
          active={onList && filter === 'issued'}
          onClick={() => navigate({ name: 'list', filter: 'issued' })}
          count={count('issued') + count('expiring') + count('expired')}
        >
          {t('nav.step4')}
        </Step>
      </nav>

      {/* Le parcours occupe le haut ; ce qui suit ne fait pas partie des
          etapes et vit donc plus bas, detache. */}
      <div className="mt-auto p-3">
        <div className="mb-2 border-t border-line pt-2">
          <NavItem
            icon={<SettingsIcon className="size-4" />}
            active={route.name === 'settings'}
            onClick={() => navigate({ name: 'settings' })}
          >
            {t('nav.settings')}
          </NavItem>
          <button
            onClick={onWizard}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-inset hover:text-ink"
          >
            <LifeBuoy className="size-4" />
            <span className="flex-1 text-left">{t('wizard.reopen')}</span>
          </button>
        </div>
        <ThemeToggle />
        <LanguageToggle />
        <OpensslStatus />
      </div>
    </aside>
  )
}

function Step({
  n,
  icon,
  children,
  active,
  onClick,
  count = 0,
  urgent,
}: {
  n?: number
  icon: ReactNode
  children: ReactNode
  active: boolean
  onClick: () => void
  count?: number
  urgent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex h-9 items-center gap-2 rounded-lg pl-1.5 pr-2.5 text-[13px] font-medium transition-colors',
        active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-inset hover:text-ink',
      )}
    >
      <span
        className={cx(
          'grid size-5 shrink-0 place-items-center rounded text-[10px] font-semibold',
          n ? (active ? 'bg-accent text-accent-fg' : 'bg-inset text-subtle') : 'text-subtle',
        )}
      >
        {n ?? icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-left">{children}</span>
      {count > 0 && (
        <span
          data-testid="step-count"
          className={cx(
            'grid min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-semibold',
            urgent ? 'bg-accent text-accent-fg' : 'bg-inset text-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function NavItem({
  icon,
  children,
  active,
  onClick,
  badge,
}: {
  icon: ReactNode
  children: ReactNode
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
        active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-inset hover:text-ink',
      )}
    >
      {icon}
      <span className="flex-1 text-left">{children}</span>
      {badge !== undefined && (
        <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-fg">
          {badge}
        </span>
      )}
    </button>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  const t = useT()
  const options: Array<{ value: Theme; icon: ReactNode; label: string }> = [
    { value: 'system', icon: <Monitor className="size-3.5" />, label: t('theme.system') },
    { value: 'light', icon: <Sun className="size-3.5" />, label: t('theme.light') },
    { value: 'dark', icon: <Moon className="size-3.5" />, label: t('theme.dark') },
  ]

  return (
    <div className="mb-2 flex gap-0.5 rounded-lg bg-inset p-0.5" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setTheme(o.value)}
          title={o.label}
          aria-label={o.label}
          aria-pressed={theme === o.value}
          className={cx(
            'flex h-7 flex-1 items-center justify-center rounded-md transition-colors',
            theme === o.value
              ? 'bg-surface text-ink shadow-sm'
              : 'text-subtle hover:text-muted',
          )}
        >
          {o.icon}
        </button>
      ))}
    </div>
  )
}

/**
 * La langue se change aussi ici, sous le theme : ce sont deux reglages
 * d'affichage, et on ne va pas dans les reglages pour basculer FR/EN.
 */
function LanguageToggle() {
  const { settings, updateSettings } = useApp()
  const t = useT()
  if (!settings) return null

  const pick = (language: Lang) => {
    if (language === settings.language) return
    void updateSettings({ ...settings, language })
  }

  return (
    <div className="mb-2 flex gap-0.5 rounded-lg bg-inset p-0.5" role="group" aria-label={t('settings.language')}>
      {LANGUAGES.map((l) => (
        <button
          key={l.value}
          onClick={() => pick(l.value)}
          title={l.label}
          aria-label={l.label}
          aria-pressed={settings.language === l.value}
          className={cx(
            'h-7 flex-1 rounded-md text-[11px] font-semibold tracking-wide transition-colors',
            settings.language === l.value
              ? 'bg-surface text-ink shadow-sm'
              : 'text-subtle hover:text-muted',
          )}
        >
          {l.short}
        </button>
      ))}
    </div>
  )
}

function OpensslStatus() {
  const { probe } = useApp()
  const t = useT()
  if (!probe) return null

  return (
    <div className="rounded-lg border border-line bg-surface px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <span
          className={cx('size-1.5 rounded-full', probe.available ? 'bg-ok' : 'bg-danger')}
          aria-hidden
        />
        <span className="text-[11px] font-medium text-muted">
          {probe.available ? t('openssl.label') : t('openssl.notFound')}
        </span>
      </div>
      {probe.available && (
        <p className="mt-0.5 truncate text-[11px] text-subtle" title={probe.version}>
          {/* "OpenSSL 3.5.5 27 Jan 2026" -> "3.5.5" */}
          {probe.version.split(/\s+/)[1] ?? probe.version}
        </p>
      )}
    </div>
  )
}

function OpensslWarning({ onFix }: { onFix: () => void }) {
  const { probe } = useApp()
  const t = useT()
  return (
    <div className="flex items-start gap-3 border-b border-danger/25 bg-danger-soft px-8 py-3.5">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-danger">
          {t('openssl.blocked')}
        </p>
        <p className="mt-0.5 text-[12px] text-danger/85 selectable">{probe?.version}</p>
      </div>
      <button
        onClick={onFix}
        className="shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium text-danger underline underline-offset-2 hover:bg-danger/10"
      >
        {t('openssl.setPath')}
      </button>
    </div>
  )
}
