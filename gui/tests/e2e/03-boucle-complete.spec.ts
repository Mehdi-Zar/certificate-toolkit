/**
 * Le parcours entier : creer la demande, la faire signer, assembler le PFX.
 *
 * C'est le test qui compte le plus. Tout le reste peut passer alors que
 * l'application est inutilisable : c'est ici qu'on verifie qu'un certificat
 * signe et une cle privee produisent bien un conteneur exploitable, avec la
 * bonne chaine et le bon mot de passe.
 *
 * La signature vient d'une autorite jetable creee pour le test. Une vraie PKI
 * demanderait des donnees qu'on ne peut pas versionner, et rendrait la suite
 * dependante d'un service exterieur.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from '../helpers/app.ts'
import { createCa, readPfx } from '../helpers/ca.ts'
import { createRequest, openEntry } from '../helpers/flow.ts'

const OPENSSL = process.env.OPENSSL_BIN || 'openssl'
const ssl = (args: string[], env?: Record<string, string>) =>
  execFileSync(OPENSSL, args, {
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: env ? { ...process.env, ...env } : process.env,
  })

const FQDN = 'portail.interne.local'
const PASSWORD = 'MotDePasseDeTest!42'

test('de la demande au PFX exploitable', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp({ defaults: { country: 'FR', org: 'Ma Societe' } })
    const { page, workspace } = ctx
    const dir = join(workspace, FQDN)

    await test.step('creer la demande', async () => {
      const { csrPath } = await createRequest(page, { cn: FQDN, sans: ['10.20.30.40'] })
      expect(existsSync(csrPath)).toBe(true)
    })

    await test.step("l'autorite signe la demande et depose sa reponse", async () => {
      const ca = createCa(join(workspace, '.ca'))
      const signed = join(dir, 'Signed')

      ca.sign(join(dir, FQDN + '.csr'), join(signed, FQDN + '.crt'), [
        'DNS:' + FQDN,
        'IP:10.20.30.40',
      ])
      // Une PKI livre en general la chaine a cote du certificat.
      copyFileSync(ca.intermediateCert, join(signed, 'issuing-ca.crt'))
      copyFileSync(ca.rootCert, join(signed, 'root-ca.crt'))
    })

    await test.step('les fichiers deposes sont vus sans redemarrer', async () => {
      await openEntry(page, FQDN)
      await expect(page.getByText(FQDN + '.crt', { exact: true })).toBeVisible()
      await expect(page.getByText('issuing-ca.crt', { exact: true })).toBeVisible()
      await expect(page.getByText('root-ca.crt', { exact: true })).toBeVisible()
    })

    await test.step('assembler le PFX', async () => {
      await page.locator('#pfxpass').fill(PASSWORD)
      await page.locator('#pfxpass2').fill(PASSWORD)
      await page.getByRole('button', { name: 'Assembler le PFX' }).click()
      await expect(
        page.getByRole('heading', { name: 'Chaîne de confiance', exact: true }),
      ).toBeVisible({ timeout: 30_000 })
    })

    await test.step('la chaine reconstruite est complete et dans le bon ordre', async () => {
      const chain = page.locator('ol').filter({ hasText: 'Certificat serveur' })
      await expect(chain.getByText('Certificat serveur')).toBeVisible()
      await expect(chain.getByText('CA intermédiaire')).toBeVisible()
      await expect(chain.getByText('CA racine')).toBeVisible()
    })

    await test.step('aucun controle ne remonte en erreur', async () => {
      expect(
        await page.locator('li[data-level]').count(),
        'des controles devraient etre affiches',
      ).toBeGreaterThan(0)
      // Un assemblage nominal ne doit produire aucun avertissement. Comparer
      // les textes plutot que le nombre : en cas d'echec, le rapport dit
      // lequel a ete leve.
      expect(await page.locator('li[data-level="warn"]').allTextContents()).toEqual([])
    })

    await test.step('les quatre formats sont ecrits', async () => {
      for (const f of [
        FQDN + '.pfx',
        FQDN + '.crt.pem',
        FQDN + '.chain.pem',
        FQDN + '.fullchain.pem',
      ]) {
        expect(existsSync(join(dir, f)), f + ' devrait exister').toBe(true)
      }
    })

    await test.step('le PFX s’ouvre avec le mot de passe saisi', async () => {
      const pfx = join(dir, FQDN + '.pfx')
      const dump = readPfx(pfx, PASSWORD).replace(/ *= */g, '=')
      expect(dump).toContain('CN=' + FQDN)
      // La racine et l'intermediaire voyagent avec, sinon le conteneur ne
      // suffit pas a etablir la confiance sur un poste vierge.
      expect(dump).toContain('Test Toolkit Issuing CA')
      expect(dump).toContain('Test Toolkit Root CA')
    })

    await test.step('il refuse un autre mot de passe', async () => {
      expect(() => readPfx(join(dir, FQDN + '.pfx'), 'mauvais')).toThrow()
    })

    await test.step('la cle privee du PFX est bien celle du depart', async () => {
      const pfx = join(dir, FQDN + '.pfx')
      const fromPfx = ssl(['pkcs12', '-in', pfx, '-nocerts', '-nodes', '-passin', 'env:P'], {
        P: PASSWORD,
      })
      // Comparaison par cle publique : le conteneur doit porter exactement la
      // cle generee au depart, sinon le certificat qu'il contient ne lui
      // correspond pas.
      const pubFromPfx = execFileSync(OPENSSL, ['pkey', '-pubout'], {
        encoding: 'utf8',
        input: fromPfx,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      const pubFromDisk = ssl(['pkey', '-in', join(dir, FQDN + '.key.pem'), '-pubout'])
      expect(pubFromPfx.trim()).toBe(pubFromDisk.trim())
    })

    await test.step('fullchain contient la feuille puis la chaine', async () => {
      const full = readFileSync(join(dir, FQDN + '.fullchain.pem'), 'utf8')
      expect(full.match(/BEGIN CERTIFICATE/g) ?? []).toHaveLength(3)
      const leaf = readFileSync(join(dir, FQDN + '.crt.pem'), 'utf8').trim()
      expect(full.startsWith(leaf.slice(0, 200))).toBe(true)
    })

    await test.step('le certificat est desormais compte comme pret', async () => {
      await page.locator('nav').getByRole('button', { name: /Tableau de bord/ }).click()
      const ready = page.locator('nav').getByRole('button', { name: /Certificats prêts/ })
      await expect(ready.getByTestId('step-count')).toHaveText('1')
    })
  } finally {
    await ctx?.close()
  }
})
