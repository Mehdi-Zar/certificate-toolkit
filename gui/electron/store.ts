/**
 * Persistance des reglages : un simple JSON dans le dossier utilisateur de
 * l'application. Aucun secret n'y est stocke - ni mot de passe de PFX, ni
 * mot de passe de cle privee : ils ne vivent que le temps d'une operation.
 */
import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { Settings } from '../shared/types.ts'

const FILE = () => join(app.getPath('userData'), 'settings.json')

/**
 * En developpement la racine par defaut est celle du depot, pour retrouver
 * les dossiers deja crees par la CLI. En production, un dossier dedie dans
 * les documents de l'utilisateur.
 */
function defaultRoot(): string {
  if (process.env.CERT_HOME) return process.env.CERT_HOME
  if (!app.isPackaged) return resolve(app.getAppPath(), '..')
  return join(app.getPath('documents'), 'CSR-Toolkit')
}

export function defaults(): Settings {
  return {
    rootDir: defaultRoot(),
    opensslPath: process.env.OPENSSL_BIN || 'openssl',
    defaults: {
      country: process.env.CERT_COUNTRY || 'FR',
      org: process.env.CERT_ORG || 'Ma Societe',
      ou: process.env.CERT_OU || 'SecOps',
      email: process.env.CERT_EMAIL || 'pki@exemple.fr',
    },
  }
}

let cache: Settings | null = null

export async function loadSettings(): Promise<Settings> {
  if (cache) return cache
  const base = defaults()
  try {
    const saved = JSON.parse(await readFile(FILE(), 'utf8')) as Partial<Settings>
    cache = {
      rootDir: saved.rootDir || base.rootDir,
      opensslPath: saved.opensslPath || base.opensslPath,
      defaults: { ...base.defaults, ...(saved.defaults ?? {}) },
    }
  } catch {
    cache = base // premier lancement, ou fichier corrompu
  }
  return cache
}

export async function saveSettings(next: Settings): Promise<Settings> {
  const merged: Settings = {
    rootDir: next.rootDir?.trim() || defaults().rootDir,
    opensslPath: next.opensslPath?.trim() || 'openssl',
    defaults: { ...defaults().defaults, ...next.defaults },
  }
  const file = FILE()
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(merged, null, 2), 'utf8')
  cache = merged
  return merged
}
