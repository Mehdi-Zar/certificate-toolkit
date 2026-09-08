/**
 * Menu applicatif.
 *
 * Il ne sert pas a naviguer — l'interface s'en charge — mais sans lui les
 * accelerateurs natifs (Ctrl+C, Ctrl+V, Ctrl+A) ne fonctionnent pas dans les
 * champs sous Windows et Linux, ce qui rendrait la copie d'une CSR penible.
 * Sur ces plateformes la barre reste masquee et n'apparait qu'avec Alt.
 */
import { Menu, shell, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'

const isMac = process.platform === 'darwin'

export function installMenu(win: BrowserWindow): void {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([{ role: 'appMenu' }] satisfies MenuItemConstructorOptions[])
      : ([
          {
            label: 'Fichier',
            submenu: [{ role: 'quit', label: 'Quitter' }],
          },
        ] satisfies MenuItemConstructorOptions[])),
    {
      label: 'Edition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Retablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout selectionner' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Recharger' },
        { role: 'toggleDevTools', label: 'Outils de developpement' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Taille normale' },
        { role: 'zoomIn', label: 'Agrandir' },
        { role: 'zoomOut', label: 'Reduire' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein ecran' },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'Depot du projet',
          click: () => void shell.openExternal('https://github.com/Mehdi-Zar/certificate-toolkit'),
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  if (!isMac) {
    win.setAutoHideMenuBar(true)
    win.setMenuBarVisibility(false)
  }
}
