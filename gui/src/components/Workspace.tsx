/**
 * L'espace de travail, montre pour ce qu'il est.
 *
 * Le dossier de travail n'apparaissait qu'en sous-titre gris sous le titre de
 * la liste, et se changeait dans les reglages. C'est pourtant la premiere
 * decision a prendre, et celle qui determine ou atterrissent les cles privees :
 * il lui faut un bandeau a lui, avec le changement de dossier a portee de clic.
 */
import { FolderOpen, FolderTree, Pencil } from 'lucide-react'
import type { Translate } from '../../shared/i18n/index.ts'
import { api, unwrap } from '../lib/api.ts'
import { useApp, useT } from '../lib/store.tsx'
import { useSystem } from '../lib/system.ts'
import { useToast } from './Toast.tsx'
import { Button, Card, cx } from './ui.tsx'

export function WorkspaceBanner() {
  const { settings, updateSettings } = useApp()
  const t = useT()
  const toast = useToast()
  const system = useSystem()

  if (!settings) return null

  async function change() {
    const dir = await unwrap(api.system.pickDir())
    if (!dir || !settings) return
    await updateSettings({ ...settings, rootDir: dir })
    toast('success', t('workspace.changed', { path: dir }))
  }

  return (
    <Card className="flex items-center gap-4 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
        <FolderTree className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-subtle">
          {t('workspace.label')}
        </p>
        <p className="mt-0.5 truncate font-mono text-[13px] text-ink selectable" title={settings.rootDir}>
          {settings.rootDir}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" icon={<Pencil className="size-3.5" />} onClick={() => void change()}>
          {t('workspace.change')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<FolderOpen className="size-3.5" />}
          onClick={() => system.openDir(settings.rootDir)}
        >
          {t('workspace.open')}
        </Button>
      </div>
    </Card>
  )
}

/**
 * Ce que le dossier va contenir. Sert dans l'assistant, ou l'utilisateur n'a
 * encore rien vu et ou "dossier de travail" ne veut rien dire pour lui.
 */
export function WorkspaceContents({ t, className }: { t: Translate; className?: string }) {
  const items = [
    { ext: '.key.pem', key: 'workspace.fileKey' as const, tone: 'text-danger' },
    { ext: '.csr', key: 'workspace.fileCsr' as const, tone: 'text-info' },
    { ext: 'Signed/', key: 'workspace.fileSigned' as const, tone: 'text-muted' },
    { ext: '.pfx', key: 'workspace.filePfx' as const, tone: 'text-ok' },
  ]
  return (
    <div className={cx('rounded-lg border border-line p-4', className)}>
      <p className="mb-2.5 text-[12px] text-muted">{t('workspace.willContain')}</p>
      <ul className="flex flex-col gap-1.5">
        {items.map((i) => (
          <li key={i.ext} className="flex items-baseline gap-2.5 text-[12px]">
            <code className={cx('shrink-0 font-mono text-[11px]', i.tone)}>{i.ext}</code>
            <span className="text-subtle">{t(i.key)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
