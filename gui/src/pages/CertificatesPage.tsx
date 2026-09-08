/**
 * Vue d'ensemble : un dossier de FQDN par ligne, trie par urgence.
 */
import {
  ChevronRight,
  FilePlus2,
  Inbox,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CertEntry, EntryStatus } from '../../shared/types.ts'
import { PageBody, PageHeader } from '../components/PageHeader.tsx'
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Spinner, cx } from '../components/ui.tsx'
import type { Route } from '../App.tsx'
import { getTemplate } from '../../shared/templates.ts'
import type { Translate } from '../../shared/i18n/index.ts'
import { STATUS_TONE, expiryLabel, isoDate, shortDate, statusHintKey, statusLabelKey } from '../lib/format.ts'
import { WorkspaceBanner } from '../components/Workspace.tsx'
import { useApp, useT } from '../lib/store.tsx'

type Filter = 'all' | 'todo' | EntryStatus

export function CertificatesPage({ navigate }: { navigate: (r: Route) => void }) {
  const { entries, settings, loading, error, refresh } = useApp()
  const t = useT()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  // La liste se recharge chaque fois qu'on l'ouvre. Le dossier de travail est
  // un dossier ordinaire : il peut avoir change sans que l'application le
  // sache, et il ne faut pas avoir a cliquer sur Actualiser pour voir une
  // demande qu'on vient de creer.
  useEffect(() => {
    void refresh()
  }, [refresh])

  const counts = useMemo(() => {
    const todo = entries.filter(
      (e) => e.status === 'ready-to-assemble' || e.status === 'expiring' || e.status === 'expired',
    ).length
    return { all: entries.length, todo }
  }, [entries])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((e) => {
      if (filter === 'todo') {
        if (!['ready-to-assemble', 'expiring', 'expired'].includes(e.status)) return false
      } else if (filter !== 'all' && e.status !== filter) return false

      if (!q) return true
      return (
        e.fqdn.toLowerCase().includes(q) ||
        e.sans.some((s) => s.toLowerCase().includes(q))
      )
    })
  }, [entries, query, filter])

  return (
    <>
      <PageHeader
        title={t('list.title')}
        actions={
          <>
            <Button
              size="sm"
              icon={<RefreshCw className={cx('size-3.5', loading && 'animate-spin')} />}
              onClick={() => void refresh()}
              disabled={loading}
            >
              {t('common.refresh')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<FilePlus2 className="size-3.5" />}
              onClick={() => navigate({ name: 'new' })}
            >
              {t('nav.newRequest')}
            </Button>
          </>
        }
      />

      <PageBody>
        {error && <ErrorBanner>{error}</ErrorBanner>}

        <WorkspaceBanner />

        {entries.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('list.filter')}
                className="pl-9"
                aria-label={t('list.filterLabel')}
              />
            </div>
            <div className="flex gap-0.5 rounded-lg bg-inset p-0.5">
              <Tab active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all}>
                {t('list.tabAll')}
              </Tab>
              <Tab active={filter === 'todo'} onClick={() => setFilter('todo')} count={counts.todo}>
                {t('list.tabTodo')}
              </Tab>
            </div>
          </div>
        )}

        {loading && entries.length === 0 ? (
          <Card className="grid h-56 place-items-center">
            <Spinner className="size-5" />
          </Card>
        ) : entries.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Inbox className="size-5" />}
              title={t('list.emptyTitle')}
              description={t('list.emptyDesc')}
              action={
                <Button
                  variant="primary"
                  icon={<FilePlus2 className="size-4" />}
                  onClick={() => navigate({ name: 'new' })}
                >
                  {t('nav.newRequest')}
                </Button>
              }
            />
          </Card>
        ) : visible.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Search className="size-5" />}
              title={t('list.noResultTitle')}
              description={t('list.noResultDesc')}
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((entry) => (
              <EntryRow
                key={entry.fqdn}
                entry={entry}
                t={t}
                lang={settings?.language ?? 'fr'}
                onClick={() => navigate({ name: 'detail', fqdn: entry.fqdn })}
              />
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}

function Tab({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean
  onClick: () => void
  count: number
  children: string
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors',
        active ? 'bg-surface text-ink shadow-sm' : 'text-subtle hover:text-muted',
      )}
    >
      {children}
      <span className={cx('text-[11px]', active ? 'text-subtle' : 'text-subtle/70')}>{count}</span>
    </button>
  )
}

function EntryRow({
  entry,
  onClick,
  t,
  lang,
}: {
  entry: CertEntry
  onClick: () => void
  t: Translate
  lang: 'fr' | 'en'
}) {
  const cert = entry.cert

  return (
    <button
      onClick={onClick}
      title={t(statusHintKey(entry.status))}
      className={cx(
        'group flex items-center gap-4 rounded-[var(--radius-panel)] border border-line bg-surface',
        'px-4 py-3.5 text-left transition-colors hover:border-line-strong hover:bg-inset/40',
      )}
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-inset text-subtle">
        <ShieldCheck className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{entry.fqdn}</span>
          <Badge tone={STATUS_TONE[entry.status]}>{t(statusLabelKey(entry.status))}</Badge>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-subtle">
          {entry.templateId && t(getTemplate(entry.templateId).labelKey) + ' · '}
          {entry.keyDesc ?? cert?.keyDesc ?? t('list.keyUnknown')}
          {entry.sans.length > 1 && ' · ' + t('list.extraSans', { n: entry.sans.length - 1 })}
          {entry.status === 'ready-to-assemble' &&
            ' · ' + t('list.filesReceived', { n: entry.signedFiles.length })}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        {cert ? (
          <>
            <p className="text-[12px] text-muted">{shortDate(cert.notAfter, lang)}</p>
            <p
              className={cx(
                'text-[11px]',
                cert.daysRemaining < 0
                  ? 'text-danger'
                  : cert.daysRemaining <= 30
                    ? 'text-warn'
                    : 'text-subtle',
              )}
            >
              {expiryLabel(cert.daysRemaining, t)}
            </p>
          </>
        ) : (
          <p className="text-[12px] text-subtle">{t('list.createdOn', { date: isoDate(entry.createdAt, lang) })}</p>
        )}
      </div>

      <ChevronRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
