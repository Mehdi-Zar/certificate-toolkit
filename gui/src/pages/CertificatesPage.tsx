/**
 * Vue d'ensemble : un dossier de FQDN par ligne, trie par urgence.
 */
import {
  ChevronRight,
  FilePlus2,
  FolderOpen,
  Inbox,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CertEntry, EntryStatus } from '../../shared/types.ts'
import { PageBody, PageHeader } from '../components/PageHeader.tsx'
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Spinner, cx } from '../components/ui.tsx'
import type { Route } from '../App.tsx'
import { api } from '../lib/api.ts'
import { getTemplate } from '../../shared/templates.ts'
import { STATUS, expiryLabel, isoDate, shortDate } from '../lib/format.ts'
import { useApp } from '../lib/store.tsx'

type Filter = 'all' | 'todo' | EntryStatus

export function CertificatesPage({ navigate }: { navigate: (r: Route) => void }) {
  const { entries, settings, loading, error, refresh } = useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

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
        title="Certificats"
        description={settings?.rootDir}
        actions={
          <>
            <Button
              size="sm"
              icon={<FolderOpen className="size-3.5" />}
              onClick={() => settings && void api.system.openDir(settings.rootDir)}
              disabled={!settings}
            >
              Ouvrir le dossier
            </Button>
            <Button
              size="sm"
              icon={<RefreshCw className={cx('size-3.5', loading && 'animate-spin')} />}
              onClick={() => void refresh()}
              disabled={loading}
            >
              Actualiser
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<FilePlus2 className="size-3.5" />}
              onClick={() => navigate({ name: 'new' })}
            >
              Nouvelle demande
            </Button>
          </>
        }
      />

      <PageBody>
        {error && <ErrorBanner>{error}</ErrorBanner>}

        {entries.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrer par nom ou SAN"
                className="pl-9"
                aria-label="Filtrer"
              />
            </div>
            <div className="flex gap-0.5 rounded-lg bg-inset p-0.5">
              <Tab active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all}>
                Tous
              </Tab>
              <Tab active={filter === 'todo'} onClick={() => setFilter('todo')} count={counts.todo}>
                A traiter
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
              title="Aucun certificat"
              description="La racine de travail ne contient encore aucun dossier de demande. Commencez par generer une CSR."
              action={
                <Button
                  variant="primary"
                  icon={<FilePlus2 className="size-4" />}
                  onClick={() => navigate({ name: 'new' })}
                >
                  Nouvelle demande
                </Button>
              }
            />
          </Card>
        ) : visible.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Search className="size-5" />}
              title="Aucun resultat"
              description="Aucun dossier ne correspond a ce filtre."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((entry) => (
              <EntryRow
                key={entry.fqdn}
                entry={entry}
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

function EntryRow({ entry, onClick }: { entry: CertEntry; onClick: () => void }) {
  const style = STATUS[entry.status]
  const cert = entry.cert

  return (
    <button
      onClick={onClick}
      title={style.hint}
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
          <Badge tone={style.tone}>{style.label}</Badge>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-subtle">
          {entry.templateId && getTemplate(entry.templateId).label + ' · '}
          {entry.keyDesc ?? cert?.keyDesc ?? 'cle inconnue'}
          {entry.sans.length > 1 && ' · ' + (entry.sans.length - 1) + ' SAN supplementaire(s)'}
          {entry.status === 'ready-to-assemble' &&
            ' · ' + entry.signedFiles.length + ' fichier(s) recu(s)'}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        {cert ? (
          <>
            <p className="text-[12px] text-muted">{shortDate(cert.notAfter)}</p>
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
              {expiryLabel(cert.daysRemaining)}
            </p>
          </>
        ) : (
          <p className="text-[12px] text-subtle">cree le {isoDate(entry.createdAt)}</p>
        )}
      </div>

      <ChevronRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
