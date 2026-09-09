/**
 * Quel binaire openssl utiliser.
 *
 * L'application embarque sa propre copie : sans elle, elle depend de ce que le
 * poste expose, ce qui n'est ni garanti ni stable. Sur la machine de
 * developpement, le PATH Windows donne une version 3.1 quand Git Bash en donne
 * une 3.5 ; sur un poste vierge, il n'y a rien du tout.
 *
 * Ordre de preference :
 *   1. un chemin explicite saisi dans les reglages, qui l'emporte toujours ;
 *   2. la copie embarquee ;
 *   3. le PATH du systeme, en dernier recours.
 */
import { app } from 'electron'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { Settings } from '../shared/types.ts'

/** Valeur par defaut du reglage : elle signifie "choisis pour moi". */
export const DEFAULT_OPENSSL = 'openssl'

const EXE = process.platform === 'win32' ? 'openssl.exe' : 'openssl'
const DIR = process.platform + '-' + process.arch

/** Chemin de la copie embarquee, ou null si elle n'a pas ete empaquetee. */
export function bundledOpenssl(): string | null {
  const roots = app.isPackaged
    ? [join(process.resourcesPath, 'openssl')]
    : [resolve(app.getAppPath(), 'vendor', 'openssl')]

  for (const root of roots) {
    const candidate = join(root, DIR, EXE)
    if (existsSync(candidate)) return candidate
  }
  return null
}

export interface Resolved {
  path: string
  /** Vrai quand c'est la copie livree avec l'application. */
  bundled: boolean
  /**
   * Environnement a ajouter aux appels. La copie embarquee cherche sa
   * configuration dans le OPENSSLDIR fige a sa compilation, chemin qui
   * n'existe plus une fois le binaire deplace : sans OPENSSL_CONF, toute
   * commande sans -config explicite echoue, dont la verification d'une CSR.
   */
  env: Record<string, string>
}

export function resolveOpenssl(settings: Settings): Resolved {
  const chosen = settings.opensslPath?.trim()
  if (chosen && chosen !== DEFAULT_OPENSSL) return { path: chosen, bundled: false, env: {} }

  const bundled = bundledOpenssl()
  if (bundled) {
    const conf = join(dirname(bundled), 'openssl.cnf')
    return {
      path: bundled,
      bundled: true,
      env: existsSync(conf) ? { OPENSSL_CONF: conf } : {},
    }
  }

  return { path: DEFAULT_OPENSSL, bundled: false, env: {} }
}
