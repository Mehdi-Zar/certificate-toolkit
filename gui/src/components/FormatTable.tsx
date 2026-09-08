/**
 * Quel fichier pour quel serveur.
 *
 * Le meme certificat sort sous quatre formes, et la question qui revient est
 * toujours la meme : laquelle prendre. La table repond par le serveur plutot
 * que par l'extension.
 *
 * Sert dans l'assistant de demarrage, ou les chemins n'existent pas encore, et
 * apres un assemblage, ou ils existent : d'ou les chemins facultatifs.
 */
import { FolderOpen } from 'lucide-react'
import type { Translate } from '../../shared/i18n/index.ts'
import type { MessageKey } from '../../shared/i18n/index.ts'
import { api } from '../lib/api.ts'
import { basename } from '../lib/format.ts'
import { cx } from './ui.tsx'

export interface FormatPaths {
  pfx?: string
  fullchain?: string | null
  crt?: string
  chain?: string | null
  key?: string
}

interface Row {
  id: keyof FormatPaths
  ext: string
  whoKey: MessageKey
  whatKey: MessageKey
  primary?: boolean
}

const ROWS: Row[] = [
  { id: 'pfx', ext: '.pfx', whoKey: 'formats.pfx.who', whatKey: 'formats.pfx.what', primary: true },
  { id: 'fullchain', ext: '.fullchain.pem', whoKey: 'formats.fullchain.who', whatKey: 'formats.fullchain.what' },
  { id: 'crt', ext: '.crt.pem', whoKey: 'formats.crt.who', whatKey: 'formats.crt.what' },
  { id: 'chain', ext: '.chain.pem', whoKey: 'formats.chain.who', whatKey: 'formats.chain.what' },
  { id: 'key', ext: '.key.pem', whoKey: 'formats.key.who', whatKey: 'formats.key.what' },
]

export function FormatTable({ t, paths }: { t: Translate; paths?: FormatPaths }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {ROWS.map((row) => {
        const path = paths?.[row.id] ?? null
        // Sans chemin fourni, la ligne reste informative : on decrit le format
        // sans pretendre que le fichier existe.
        const missing = paths !== undefined && !path
        if (missing) return null

        return (
          <li
            key={row.id}
            className={cx(
              'flex items-start gap-3 rounded-lg border px-3.5 py-3',
              row.primary ? 'border-accent/35 bg-accent-soft' : 'border-line',
            )}
          >
            <code
              className={cx(
                'mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]',
                row.primary ? 'bg-accent text-accent-fg' : 'bg-inset text-muted',
              )}
            >
              {row.ext}
            </code>
            <div className="min-w-0 flex-1">
              <p className={cx('text-[13px] font-medium', row.primary && 'text-accent')}>
                {t(row.whoKey)}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-subtle">{t(row.whatKey)}</p>
              {path && (
                <p className="mt-1 truncate font-mono text-[11px] text-subtle selectable">
                  {basename(path)}
                </p>
              )}
            </div>
            {path && (
              <button
                onClick={() => void api.system.reveal(path)}
                title={t('common.reveal')}
                aria-label={t('common.reveal')}
                className="mt-0.5 shrink-0 rounded p-1 text-subtle transition-colors hover:text-ink"
              >
                <FolderOpen className="size-3.5" />
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
