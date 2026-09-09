/**
 * L'application empaquetee, celle qu'on telecharge.
 *
 * Les autres tests lancent le code source. Ils n'auraient pas attrape le
 * defaut le plus grave rencontre sur ce projet : OpenSSL fonctionnait depuis
 * l'arborescence de developpement et echouait une fois copie dans le paquet,
 * parce qu'il cherchait sa configuration a un chemin fige a sa compilation.
 * Ce qui marche depuis les sources ne prouve rien sur ce qui est livre.
 *
 * Le test est ignore tant qu'aucun paquet n'a ete construit :
 *   npm run pack     (dossier seul, suffisant ici)
 *   npm run dist     (avec l'installeur et le portable)
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { _electron as electron } from 'playwright-core'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const ROOT = resolve(import.meta.dirname, '..', '..')
const APP = join(ROOT, 'release', 'win-unpacked', 'Certificate Toolkit.exe')

test.skip(
  () => process.platform !== 'win32' || !existsSync(APP),
  'aucun paquet construit : lancez npm run pack',
)

test('le paquet livre sait produire une demande verifiable', async () => {
  const base = mkdtempSync(join(tmpdir(), 'certtk-pkg-'))
  const userData = join(base, 'userData')
  const workspace = join(base, 'workspace')
  mkdirSync(userData, { recursive: true })
  mkdirSync(workspace, { recursive: true })
  writeFileSync(
    join(userData, 'settings.json'),
    JSON.stringify({
      rootDir: workspace,
      // Volontairement laisse au defaut : c'est la copie embarquee du paquet
      // qui doit servir, pas celle du poste. Tout l'interet du test.
      opensslPath: 'openssl',
      language: 'fr',
      advancedByDefault: false,
      onboarded: true,
      defaults: { country: '', state: '', locality: '', org: '', ou: '', email: '' },
    }),
    'utf8',
  )

  const app = await electron.launch({
    executablePath: APP,
    args: ['--user-data-dir=' + userData],
  })

  try {
    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    await test.step('la copie embarquee est celle qui repond', async () => {
      const sidebar = page.locator('aside')
      await expect(sidebar.getByText('OpenSSL', { exact: true })).toBeVisible()
      await expect(sidebar.getByText(/^3\.\d+\.\d+$/)).toBeVisible()
    })

    await test.step('une demande complete aboutit', async () => {
      await page.locator('nav').getByRole('button', { name: /Créer une demande/ }).click()
      await page
        .getByRole('button', { name: 'Serveur interne (PKI d’entreprise)', exact: true })
        .click()
      await page.locator('#cn').fill('paquet.interne.local')
      await page.getByRole('button', { name: 'Générer la clé et la CSR' }).click()
      // C'est ici que le paquet casse quand OpenSSL ne trouve pas sa
      // configuration : la CSR est ecrite, puis la verification echoue et
      // l'application annonce que la demande ne se verifie pas.
      await expect(page.getByText('Votre demande est prête')).toBeVisible({ timeout: 60_000 })
    })

    await test.step('et la demande produite se verifie hors de l’application', async () => {
      const csr = join(workspace, 'paquet.interne.local', 'paquet.interne.local.csr')
      expect(existsSync(csr)).toBe(true)
      execFileSync(process.env.OPENSSL_BIN || 'openssl', ['req', '-in', csr, '-noout', '-verify'], {
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    })
  } finally {
    await app.close().catch(() => {
      /* deja fermee */
    })
  }
})
