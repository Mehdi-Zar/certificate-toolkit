/**
 * Pont entre l'interface et la logique OpenSSL.
 *
 * Toute la surface exposee au renderer passe par ici. Chaque reponse est
 * enveloppee dans un Reply<T> : une exception ne traverse jamais le pont, le
 * renderer recoit un message d'erreur affichable.
 */
import { BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron'
import { copyFile, mkdir, readFile, rename } from 'node:fs/promises'
import { basename, join, normalize } from 'node:path'
import type {
  CertEntry,
  CsrPreview,
  CsrRequest,
  CsrResult,
  OpensslProbe,
  PfxRequest,
  PfxResult,
  Reply,
  Settings,
} from '../shared/types.ts'
import { translator, type Translate } from '../shared/i18n/index.ts'
import { generateCsr, pathsFor, preview } from './csr.ts'
import { buildMenu } from './menu.ts'
import { probeCapabilities } from './capabilities.ts'
import { resolveOpenssl } from './openssl-path.ts'
import { describeEntry, scanRoot } from './inventory.ts'
import { Openssl } from './openssl.ts'
import { listSignedFiles, makePfx } from './pfx.ts'
import { log, logPath } from './log.ts'
import { watchRoot } from './watcher.ts'
import { loadSettings, saveSettings } from './store.ts'

/** Enveloppe uniforme : le renderer n'a jamais a gerer un rejet de promesse. */
function handle<T>(channel: string, fn: (...args: never[]) => Promise<T>): void {
  ipcMain.handle(channel, async (_event, ...args): Promise<Reply<T>> => {
    try {
      return { ok: true, data: await fn(...(args as never[])) }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[' + channel + ']', message)
      log('appel refuse', { canal: channel, err: message })
      return { ok: false, error: message }
    }
  })
}

/** Le traducteur de la langue courante : les messages du backend en dependent. */
const lang = async (): Promise<Translate> => translator((await loadSettings()).language)

const ssl = async (): Promise<Openssl> => {
  const settings = await loadSettings()
  const chosen = resolveOpenssl(settings)
  return new Openssl(chosen.path, translator(settings.language), chosen.env)
}

const focused = (): BrowserWindow | null =>
  BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null

export function registerIpc(): void {
  // -------------------------------------------------------------------------
  // Reglages et diagnostic
  // -------------------------------------------------------------------------
  handle<Settings>('settings:get', () => loadSettings())
  handle<Settings>('settings:save', async (next: Settings) => {
    const saved = await saveSettings(next)
    // Le menu natif ne se retraduit pas tout seul.
    buildMenu(translator(saved.language))
    // Changer d'espace de travail deplace aussi ce qu'on surveille.
    watchRoot(saved.rootDir)
    return saved
  })

  handle<OpensslProbe>('openssl:probe', async () => {
    const settings = await loadSettings()
    const chosen = resolveOpenssl(settings)
    const bin = new Openssl(chosen.path, translator(settings.language), chosen.env)
    const unavailable = {
      curves: [] as string[],
      ed25519: false, ed448: false, rsaPss: false, mldsa: false, sha3: false,
    }
    try {
      const version = await bin.version()
      return {
        available: true,
        version,
        path: chosen.path,
        bundled: chosen.bundled,
        capabilities: await probeCapabilities(bin),
      }
    } catch (err) {
      return {
        available: false,
        version: err instanceof Error ? err.message : String(err),
        path: chosen.path,
        bundled: chosen.bundled,
        capabilities: unavailable,
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
    generateCsr(await ssl(), (await loadSettings()).rootDir, req, await lang()),
  )

  /** Apercu de la configuration et des controles, sans rien ecrire sur le disque. */
  handle<CsrPreview>('csr:preview', async (req: CsrRequest) => preview(req, await lang()))

  handle<string>('csr:read', async (fqdn: string) => {
    const p = pathsFor((await loadSettings()).rootDir, fqdn, await lang())
    return readFile(p.csr, 'utf8')
  })

  // -------------------------------------------------------------------------
  // Etape 2 : retours PKI
  // -------------------------------------------------------------------------
  handle<string[]>('signed:list', async (fqdn: string) =>
    listSignedFiles((await loadSettings()).rootDir, fqdn, await lang()),
  )

  /** Copie les fichiers de la PKI dans <fqdn>/Signed/ (glisser-deposer ou selection). */
  handle<string[]>('signed:import', async (fqdn: string, files: string[]) => {
    const settings = await loadSettings()
    const t = translator(settings.language)
    const p = pathsFor(settings.rootDir, fqdn, t)
    await mkdir(p.signed, { recursive: true })
    for (const file of files) {
      const target = join(p.signed, basename(file))
      if (target === file) continue // deja au bon endroit
      await copyFile(file, target)
    }
    return listSignedFiles(settings.rootDir, fqdn, t)
  })

  // -------------------------------------------------------------------------
  // Etape 3 : PFX
  // -------------------------------------------------------------------------
  handle<PfxResult>('pfx:make', async (req: PfxRequest) =>
    makePfx(await ssl(), await loadSettings(), req, await lang()),
  )

  // -------------------------------------------------------------------------
  // Interactions systeme
  // -------------------------------------------------------------------------
  handle<string | null>('dialog:pickDir', async () => {
    const win = focused()
    if (!win) return null
    const t = await lang()
    const r = await dialog.showOpenDialog(win, {
      title: t('dialog.pickRoot'),
      properties: ['openDirectory', 'createDirectory'],
    })
    return r.canceled ? null : (r.filePaths[0] ?? null)
  })

  handle<string[]>('dialog:pickFiles', async (title: string) => {
    const win = focused()
    if (!win) return []
    const t = await lang()
    const r = await dialog.showOpenDialog(win, {
      title: title || t('dialog.pickSigned'),
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: t('dialog.certificates'), extensions: ['pem', 'crt', 'cer', 'p7b', 'p7c', 'der', 'txt'] },
        { name: t('dialog.allFiles'), extensions: ['*'] },
      ],
    })
    return r.canceled ? [] : r.filePaths
  })

  /**
   * Confirmation modale, rendue par le systeme.
   *
   * Une boite native plutot qu'un panneau dessine : elle bloque reellement la
   * fenetre, elle est annoncee comme un dialogue par les outils
   * d'accessibilite, et Echap l'annule sans qu'on ait a le programmer.
   */
  handle<boolean>('dialog:confirm', async (title: string, body: string, ok: string) => {
    const win = focused()
    const t = await lang()
    const buttons = [ok, t('common.cancel')]
    const r = win
      ? await dialog.showMessageBox(win, {
          type: 'question',
          title,
          message: title,
          detail: body,
          buttons,
          defaultId: 0,
          // Echap et la croix reviennent sur Annuler, jamais sur l'action.
          cancelId: 1,
          noLink: true,
        })
      : { response: 1 }
    return r.response === 0
  })

  handle<boolean>('shell:reveal', async (path: string) => {
    shell.showItemInFolder(path)
    return true
  })

  handle<boolean>('shell:openDir', async (path: string) => {
    // La racine de travail n'existe pas tant qu'aucune demande n'a ete creee.
    // L'ouvrir revient a la creer : c'est ce que l'utilisateur veut voir.
    const dir = normalize(path)
    await mkdir(dir, { recursive: true })
    const err = await shell.openPath(dir)
    if (err) throw new Error(err)
    return true
  })

  handle<boolean>('clipboard:write', async (text: string) => {
    clipboard.writeText(text)
    return true
  })

  /**
   * Ouvre le journal dans l'editeur de texte du systeme. Le fichier peut ne
   * pas exister encore : rien ne s'y ecrit tant que rien n'a echoue, et c'est
   * une bonne nouvelle qu'il faut dire plutot que de laisser un clic sans
   * effet.
   */
  handle<string>('log:open', async () => {
    const path = logPath()
    const err = await shell.openPath(path)
    if (err) throw new Error(err)
    return path
  })

  handle<string>('log:path', async () => logPath())

  /**
   * Range un dossier hors de la liste, sans rien detruire.
   *
   * Il n'y a volontairement pas de suppression. Effacer une cle privee est
   * irreversible, et peut rendre inutilisable un certificat deja deploye
   * ailleurs : le dossier est deplace sous .archive/, que le scan ignore
   * puisqu'il saute tout ce qui commence par un point. On recupere donc a la
   * main ce qu'on a range par erreur, avec l'explorateur et sans nous.
   *
   * L'horodatage evite d'ecraser une archive precedente portant le meme nom,
   * ce qui arrive des qu'on refait une demande sous le meme FQDN.
   */
  handle<string>('entry:archive', async (fqdn: string) => {
    const settings = await loadSettings()
    const t = translator(settings.language)
    const p = pathsFor(settings.rootDir, fqdn, t)

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const attic = join(settings.rootDir, '.archive')
    await mkdir(attic, { recursive: true })
    const target = join(attic, fqdn + '-' + stamp)

    await rename(p.dir, target)
    log('dossier archive', { fqdn, vers: target })
    return target
  })

  handle<boolean>('entry:openArchive', async () => {
    const settings = await loadSettings()
    const attic = join(settings.rootDir, '.archive')
    await mkdir(attic, { recursive: true })
    const err = await shell.openPath(attic)
    if (err) throw new Error(err)
    return true
  })
}
