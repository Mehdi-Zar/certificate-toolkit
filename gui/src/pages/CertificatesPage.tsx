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
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CertEntry } from '../../shared/types.ts'
import { PageBody, PageHeader } from '../components/PageHeader.tsx'
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Spinner, cx } from '../components/ui.tsx'
import type { ListFilter, Route } from '../App.tsx'
import { getTemplate } from '../../shared/templates.ts'
import type { Translate } from '../../shared/i18n/index.ts'
import { STATUS_TONE, expiryLabel, isoDate, shortDate, statusHintKey, statusLabelKey } from '../lib/format.ts'
import { WorkspaceBanner } from '../components/Workspace.tsx'
import { useApp, useT } from '../lib/store.tsx'

export function CertificatesPage({
  navigate,
  filter: initial,
}: {
  navigate: (r: Route) => void
  filter: ListFilter
}) {
  const { entries, settings, loading, error, refresh } = useApp()
  const t = useT()
  const [query, setQuery] = useState('')
  // Le filtre vient de la barre laterale, et suit ses changements.
  const [filter, setFilter] = useState<ListFilter>(initial)
  useEffect(() => setFilter(initial), [initial])

  // La liste se recharge chaque fois qu'on l'ouvre. Le dossier de travail est
  // un dossier ordinaire : il peut avoir change sans que l'application le
  // sache, et il ne faut pas avoir a cliquer sur Actualiser pour voir une
  // demande qu'on vient de creer.
  useEffect(() => {
    void refresh()
  }, [refresh])

  const counts = useMemo(
    () => ({
      all: entries.length,
      shown: entries.filter((e) => filter === 'all' || e.status === filter).length,
    }),
    [entries, filter],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((e) => {
      if (filter !== 'all' && e.status !== filter) return false
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
        // Le titre suit le menu : accueil, ou l'etape du parcours retenue.
        title={filter === 'all' ? t('nav.dashboard') : t(statusLabelKey(filter))}
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
            {filter !== 'all' && (
              <Button
                size="sm"
                onClick={() => navigate({ name: 'list' })}
                icon={<X className="size-3.5" />}
              >
                {t(statusLabelKey(filter))}
                <span className="text-subtle">{counts.shown}</span>
              </Button>
            )}
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
