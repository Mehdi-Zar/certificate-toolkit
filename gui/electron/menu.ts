/**
 * Menu applicatif.
 *
 * Il ne sert pas a naviguer, l'interface s'en charge, mais sans lui les
 * accelerateurs natifs (Ctrl+C, Ctrl+V, Ctrl+A) ne fonctionnent pas dans les
 * champs sous Windows et Linux, ce qui rendrait la copie d'une CSR penible.
 * Sur ces plateformes la barre reste masquee et n'apparait qu'avec Alt.
 */
import { Menu, shell, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import type { Translate } from '../shared/i18n/index.ts'

const isMac = process.platform === 'darwin'

const REPO = 'https://github.com/Mehdi-Zar/certificate-toolkit'

/** (Re)construit le menu. Rappele quand la langue change. */
export function buildMenu(t: Translate): void {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([{ role: 'appMenu' }] satisfies MenuItemConstructorOptions[])
      : ([
          { label: t('menu.file'), submenu: [{ role: 'quit', label: t('menu.quit') }] },
        ] satisfies MenuItemConstructorOptions[])),
    {
      label: t('menu.edit'),
      submenu: [
        { role: 'undo', label: t('menu.undo') },
        { role: 'redo', label: t('menu.redo') },
        { type: 'separator' },
        { role: 'cut', label: t('menu.cut') },
        { role: 'copy', label: t('menu.copy') },
        { role: 'paste', label: t('menu.paste') },
        { role: 'selectAll', label: t('menu.selectAll') },
      ],
    },
    {
      label: t('menu.view'),
      submenu: [
        { role: 'reload', label: t('menu.reload') },
        { role: 'toggleDevTools', label: t('menu.devTools') },
        { type: 'separator' },
        { role: 'resetZoom', label: t('menu.resetZoom') },
        { role: 'zoomIn', label: t('menu.zoomIn') },
        { role: 'zoomOut', label: t('menu.zoomOut') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t('menu.fullscreen') },
      ],
    },
    {
      label: t('menu.help'),
      submenu: [{ label: t('menu.repo'), click: () => void shell.openExternal(REPO) }],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

export function installMenu(win: BrowserWindow, t: Translate): void {
  buildMenu(t)
  if (!isMac) {
    win.setAutoHideMenuBar(true)
    win.setMenuBarVisibility(false)
  }
}
