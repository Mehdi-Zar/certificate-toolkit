/**
 * Pont entre l'interface et la logique OpenSSL.
 *
 * Toute la surface exposee au renderer passe par ici. Chaque reponse est
 * enveloppee dans un Reply<T> : une exception ne traverse jamais le pont, le
 * renderer recoit un message d'erreur affichable.
 */
import { BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type {
  CertEntry,
  CsrRequest,
  CsrResult,
  OpensslProbe,
  PfxRequest,
  PfxResult,
  Reply,
  Settings,
} from '../shared/types.ts'
import { generateCsr, pathsFor } from './csr.ts'
import { describeEntry, scanRoot } from './inventory.ts'
import { Openssl } from './openssl.ts'
import { listSignedFiles, makePfx } from './pfx.ts'
import { loadSettings, saveSettings } from './store.ts'

/** Enveloppe uniforme : le renderer n'a jamais a gerer un rejet de promesse. */
function handle<T>(channel: string, fn: (...args: never[]) => Promise<T>): void {
  ipcMain.handle(channel, async (_event, ...args): Promise<Reply<T>> => {
    try {
      return { ok: true, data: await fn(...(args as never[])) }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[' + channel + ']', message)
      return { ok: false, error: message }
    }
  })
}

const ssl = async (): Promise<Openssl> => new Openssl((await loadSettings()).opensslPath)

const focused = (): BrowserWindow | null =>
  BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null

export function registerIpc(): void {
  // -------------------------------------------------------------------------
  // Reglages et diagnostic
  // -------------------------------------------------------------------------
  handle<Settings>('settings:get', () => loadSettings())
  handle<Settings>('settings:save', (next: Settings) => saveSettings(next))

  handle<OpensslProbe>('openssl:probe', async () => {
    const settings = await loadSettings()
    try {
      const version = await new Openssl(settings.opensslPath).version()
      return { available: true, version, path: settings.opensslPath }
    } catch (err) {
      return {
        available: false,
        version: err instanceof Error ? err.message : String(err),
        path: settings.opensslPath,
      }
    }
  })

  // -------------------------------------------------------------------------
  // Inventaire
  // -------------------------------------------------------------------------
  handle<CertEntry[]>('inventory:list', async () => scanRoot(await ssl(), await loadSettings()))

  handle<CertEntry | null>('inventory:entry', async (fqdn: string) =>
    describeEntry(await ssl(), await loadSettings(), fqdn),
  )

  // -------------------------------------------------------------------------
  // Etape 1 : CSR
  // -------------------------------------------------------------------------
  handle<CsrResult>('csr:generate', async (req: CsrRequest) =>
    generateCsr(await ssl(), (await loadSettings()).rootDir, req),
  )

  handle<string>('csr:read', async (fqdn: string) => {
    const p = pathsFor((await loadSettings()).rootDir, fqdn)
    return readFile(p.csr, 'utf8')
  })

  // -------------------------------------------------------------------------
  // Etape 2 : retours PKI
  // -------------------------------------------------------------------------
  handle<string[]>('signed:list', async (fqdn: string) =>
    listSignedFiles((await loadSettings()).rootDir, fqdn),
  )

  /** Copie les fichiers de la PKI dans <fqdn>/Signed/ (glisser-deposer ou selection). */
  handle<string[]>('signed:import', async (fqdn: string, files: string[]) => {
    const settings = await loadSettings()
    const p = pathsFor(settings.rootDir, fqdn)
    await mkdir(p.signed, { recursive: true })
    for (const file of files) {
      const target = join(p.signed, basename(file))
      if (target === file) continue // deja au bon endroit
      await copyFile(file, target)
    }
    return listSignedFiles(settings.rootDir, fqdn)
  })

  // -------------------------------------------------------------------------
  // Etape 3 : PFX
  // -------------------------------------------------------------------------
  handle<PfxResult>('pfx:make', async (req: PfxRequest) =>
    makePfx(await ssl(), await loadSettings(), req),
  )

  // -------------------------------------------------------------------------
  // Interactions systeme
  // -------------------------------------------------------------------------
  handle<string | null>('dialog:pickDir', async () => {
    const win = focused()
    if (!win) return null
    const r = await dialog.showOpenDialog(win, {
      title: 'Racine de travail',
      properties: ['openDirectory', 'createDirectory'],
    })
    return r.canceled ? null : (r.filePaths[0] ?? null)
  })

  handle<string[]>('dialog:pickFiles', async (title: string) => {
    const win = focused()
    if (!win) return []
    const r = await dialog.showOpenDialog(win, {
      title: title || 'Fichiers renvoyes par la PKI',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Certificats', extensions: ['pem', 'crt', 'cer', 'p7b', 'p7c', 'der', 'txt'] },
        { name: 'Tous les fichiers', extensions: ['*'] },
      ],
    })
    return r.canceled ? [] : r.filePaths
  })

  handle<boolean>('shell:reveal', async (path: string) => {
    shell.showItemInFolder(path)
    return true
  })

  handle<boolean>('shell:openDir', async (path: string) => {
    const err = await shell.openPath(path)
    if (err) throw new Error(err)
    return true
  })

  handle<boolean>('clipboard:write', async (text: string) => {
    clipboard.writeText(text)
    return true
  })
}
