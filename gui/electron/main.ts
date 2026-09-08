/**
 * Processus principal.
 *
 * Posture de securite, pour un outil qui manipule des cles privees :
 *  - le renderer n'a ni Node ni acces direct au systeme de fichiers ;
 *  - contextIsolation et sandbox actives, seul le preload expose une API ;
 *  - toute navigation ou ouverture de fenetre vers l'exterieur est refusee,
 *    les liens externes partent dans le navigateur du systeme ;
 *  - aucune requete reseau : tout est local.
 */
import { app, BrowserWindow, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { translator } from '../shared/i18n/index.ts'
import { registerIpc } from './ipc.ts'
import { installMenu } from './menu.ts'
import { loadSettings } from './store.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Renseignes par vite-plugin-electron.
const APP_ROOT = join(__dirname, '..')
process.env.APP_ROOT = APP_ROOT
const DEV_SERVER = process.env.VITE_DEV_SERVER_URL
const RENDERER_DIST = join(APP_ROOT, 'dist')

let win: BrowserWindow | null = null

async function createWindow(): Promise<void> {
  win = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 940,
    minHeight: 620,
    show: false,
    backgroundColor: '#0b0f19',
    // En production l'icone vient de l'executable ; en developpement il faut
    // la donner explicitement, sinon Electron affiche la sienne.
    ...(app.isPackaged ? {} : { icon: join(APP_ROOT, 'build', 'icon.png') }),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
    },
  })

  installMenu(win, translator((await loadSettings()).language))

  win.once('ready-to-show', () => win?.show())

  // Les liens externes ne s'ouvrent jamais dans l'application.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win?.webContents.getURL()) event.preventDefault()
  })

  if (DEV_SERVER) {
    void win.loadURL(DEV_SERVER)
  } else {
    void win.loadFile(join(RENDERER_DIST, 'index.html'))
  }
}

// Une seule instance : deux fenetres ecrivant dans la meme arborescence de
// certificats se marcheraient dessus.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  app.whenReady().then(() => {
    registerIpc()
    void createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
