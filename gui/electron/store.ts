/**
 * Persistance des reglages : un simple JSON dans le dossier utilisateur de
 * l'application. Aucun secret n'y est stocke - ni mot de passe de PFX, ni
 * mot de passe de cle privee : ils ne vivent que le temps d'une operation.
 */
import { app } from 'electron'
import { detectLang, isLang } from '../shared/i18n/index.ts'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { Settings } from '../shared/types.ts'

const FILE = () => join(app.getPath('userData'), 'settings.json')

/**
 * En developpement la racine par defaut est celle du depot, pour retrouver
 * les dossiers deja crees par la CLI.
 *
 * En production, un dossier a la racine du profil utilisateur, et surtout pas
 * « Mes documents » : il est frequemment redirige vers OneDrive ou vers un
 * partage reseau, ce qui enverrait les cles privees dans le cloud a leur
 * creation. La racine reste modifiable dans les reglages.
 */
function defaultRoot(): string {
  if (process.env.CERT_HOME) return process.env.CERT_HOME
  if (!app.isPackaged) return resolve(app.getAppPath(), '..')
  return join(app.getPath('home'), 'Certificate-Toolkit')
}

export function defaults(): Settings {
  return {
    rootDir: defaultRoot(),
    opensslPath: process.env.OPENSSL_BIN || 'openssl',
    // Au premier lancement seulement : ensuite, le choix enregistre l'emporte.
    language: detectLang(app.getLocale() || 'en'),
    advancedByDefault: false,
    defaults: {
      country: process.env.CERT_COUNTRY || 'FR',
      state: process.env.CERT_STATE || '',
      locality: process.env.CERT_LOCALITY || '',
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
      language: isLang(saved.language) ? saved.language : base.language,
      advancedByDefault: saved.advancedByDefault ?? base.advancedByDefault,
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
    language: isLang(next.language) ? next.language : defaults().language,
    advancedByDefault: next.advancedByDefault ?? false,
    defaults: { ...defaults().defaults, ...next.defaults },
  }
  const file = FILE()
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(merged, null, 2), 'utf8')
  cache = merged
  return merged
}
