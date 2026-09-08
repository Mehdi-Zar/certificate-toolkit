/**
 * Seul point de contact entre la page et Node.
 *
 * Le renderer tourne avec contextIsolation et sans integration Node : il ne
 * peut appeler que les fonctions listees ici, jamais require() ni fs.
 */
import { contextBridge, ipcRenderer, webUtils } from 'electron'
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

const call = <T>(channel: string, ...args: unknown[]): Promise<Reply<T>> =>
  ipcRenderer.invoke(channel, ...args)

const api = {
  settings: {
    get: () => call<Settings>('settings:get'),
    save: (s: Settings) => call<Settings>('settings:save', s),
  },
  openssl: {
    probe: () => call<OpensslProbe>('openssl:probe'),
  },
  inventory: {
    list: () => call<CertEntry[]>('inventory:list'),
    entry: (fqdn: string) => call<CertEntry | null>('inventory:entry', fqdn),
  },
  csr: {
    generate: (req: CsrRequest) => call<CsrResult>('csr:generate', req),
    preview: (req: CsrRequest) => call<CsrPreview>('csr:preview', req),
    read: (fqdn: string) => call<string>('csr:read', fqdn),
  },
  signed: {
    list: (fqdn: string) => call<string[]>('signed:list', fqdn),
    importFiles: (fqdn: string, files: string[]) => call<string[]>('signed:import', fqdn, files),
  },
  pfx: {
    make: (req: PfxRequest) => call<PfxResult>('pfx:make', req),
  },
  system: {
    pickDir: () => call<string | null>('dialog:pickDir'),
    pickFiles: (title: string) => call<string[]>('dialog:pickFiles', title),
    reveal: (path: string) => call<boolean>('shell:reveal', path),
    openDir: (path: string) => call<boolean>('shell:openDir', path),
    copy: (text: string) => call<boolean>('clipboard:write', text),
    /**
     * Chemin reel d'un fichier glisse-depose. Depuis Electron 32, File.path
     * n'existe plus : webUtils est la seule voie.
     */
    pathForFile: (file: File): string => webUtils.getPathForFile(file),
  },
}

export type CsrToolkitApi = typeof api

contextBridge.exposeInMainWorld('csrtk', api)
