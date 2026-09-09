/**
 * Lancement de l'application pour un test.
 *
 * Chaque test recoit son propre dossier applicatif et son propre espace de
 * travail : les tests ne se voient pas entre eux, et aucun ne touche aux
 * reglages reels. Le verrou d'instance unique impose par ailleurs de ne lancer
 * qu'une application a la fois, d'ou les tests en serie.
 */
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const GUI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

export interface Launched {
  app: ElectronApplication
  page: Page
  /** Espace de travail du test : c'est la que les demandes sont ecrites. */
  workspace: string
  userData: string
  close: () => Promise<void>
}

export interface LaunchOptions {
  language?: 'fr' | 'en'
  /** Faux pour voir l'assistant de demarrage. */
  onboarded?: boolean
  advancedByDefault?: boolean
  /** Valeurs par defaut du sujet, vides sauf indication contraire. */
  defaults?: Partial<Record<'country' | 'state' | 'locality' | 'org' | 'ou' | 'email', string>>
}

export async function launchApp(opts: LaunchOptions = {}): Promise<Launched> {
  const base = mkdtempSync(join(tmpdir(), 'certtk-e2e-'))
  const userData = join(base, 'userData')
  const workspace = join(base, 'workspace')
  mkdirSync(userData, { recursive: true })
  mkdirSync(workspace, { recursive: true })

  // Les reglages sont ecrits avant le lancement : la langue et l'espace de
  // travail sont ainsi deterministes, sans passer par l'interface.
  writeFileSync(
    join(userData, 'settings.json'),
    JSON.stringify(
      {
        rootDir: workspace,
        opensslPath: 'openssl',
        language: opts.language ?? 'fr',
        advancedByDefault: opts.advancedByDefault ?? false,
        onboarded: opts.onboarded ?? true,
        defaults: {
          country: '', state: '', locality: '', org: '', ou: '', email: '',
          ...opts.defaults,
        },
      },
      null,
      2,
    ),
    'utf8',
  )

  const app = await electron.launch({
    args: [GUI_ROOT, `--user-data-dir=${userData}`],
    cwd: GUI_ROOT,
    env: { ...process.env, NODE_ENV: 'test' },
  })

  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')

  return {
    app,
    page,
    workspace,
    userData,
    close: async () => {
      await app.close().catch(() => {
        /* l'application peut deja etre fermee */
      })
    },
  }
}
