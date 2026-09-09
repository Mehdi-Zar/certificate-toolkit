/**
 * Creer une demande depuis l'interface, et verifier que ce qui atterrit sur le
 * disque correspond a ce qui a ete saisi.
 *
 * Un parcours se teste d'un bloc. Decoupe en tests independants, chaque etape
 * dependrait de la precedente : Playwright relance le worker apres un echec,
 * rejoue beforeAll sur un espace de travail neuf, et les etapes suivantes
 * echouent en cascade sur des erreurs qui n'ont plus rien a voir avec le defaut
 * d'origine. Les test.step ci-dessous apparaissent separement dans le rapport
 * sans faire cette promesse d'independance.
 *
 * Le test ne se contente pas de l'ecran de confirmation : il relit la CSR avec
 * openssl. C'est la seule facon de savoir si l'application a produit ce qu'elle
 * pretend avoir produit.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from '../helpers/app.ts'

const openssl = (args: string[]) =>
  execFileSync(process.env.OPENSSL_BIN || 'openssl', args, {
    encoding: 'utf8',
    windowsHide: true,
    // Le bruit d'openssl sur stderr n'a rien a faire dans le rapport.
    stdio: ['pipe', 'pipe', 'pipe'],
  })

/**
 * La verification passe volontairement par l'openssl du poste, pas par celui
 * qu'embarque l'application : un oracle qui partage le binaire teste ne prouve
 * pas grand-chose. Les deux versions n'impriment pas pareil, 3.1 donnant
 * "CN=x" la ou 3.5 donne "CN = x". On compare donc sur un texte normalise.
 */
const describeCsr = (csr: string) =>
  openssl(['req', '-in', csr, '-noout', '-text']).replace(/ *= */g, '=')

test('creer une demande, de la saisie au fichier sur le disque', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp({ defaults: { country: 'FR', org: 'Ma Societe' } })
    const { page, workspace } = ctx

    await test.step('le formulaire ne pre-remplit que ce qui vient des reglages', async () => {
      await page.locator('nav').getByRole('button', { name: /Créer une demande/ }).click()
      await expect(page.getByRole('heading', { name: /À quoi servira ce certificat/ })).toBeVisible()

      // exact: true, sinon le bouton d'aide de la meme carte correspond aussi.
      await page
        .getByRole('button', { name: 'Serveur interne (PKI d’entreprise)', exact: true })
        .click()
      await expect(
        page.getByRole('heading', { name: 'Serveur interne (PKI d’entreprise)' }),
      ).toBeVisible()

      await expect(page.locator('#c')).toHaveValue('FR')
      await expect(page.locator('#o')).toHaveValue('Ma Societe')
      await expect(page.locator('#mail')).toHaveValue('')
      // Un champ vide montre un exemple, sans le prendre pour une valeur.
      await expect(page.locator('#mail')).toHaveAttribute('placeholder', /@/)
    })

    await test.step("le nom accessible d'un champ est son libelle, rien de plus", async () => {
      // Le bouton d'aide est accole au libelle, pas dedans : imbrique, il
      // entrait dans le nom du champ, annonce alors "Nom du serveur Aide :
      // Nom du serveur". Le test le fige, l'erreur etant invisible a l'ecran.
      await expect(page.locator('#cn')).toHaveAccessibleName('Nom du serveur')
      await expect(page.getByRole('button', { name: /^Aide : / }).first()).toBeVisible()
    })

    await test.step('rien ne peut etre genere tant que le nom manque', async () => {
      await expect(page.getByRole('button', { name: 'Générer la clé et la CSR' })).toBeDisabled()
    })

    await test.step('le nom du dossier se derive du nom saisi', async () => {
      await page.locator('#cn').fill('app.interne.local')
      // Le mode avance revele le champ derive.
      await page.getByRole('button', { name: 'Avancé' }).click()
      await expect(page.locator('#name')).toHaveValue('app.interne.local')
      await page.getByRole('button', { name: 'Simple' }).click()
    })

    await test.step("l'apercu montre ce qui sera passe a openssl", async () => {
      const preview = page.locator('aside pre')
      await expect(preview).toContainText('[ req_distinguished_name ]')
      await expect(preview).toContainText('commonName = app.interne.local')
      await expect(preview).toContainText('extendedKeyUsage = serverAuth, clientAuth')
    })

    await test.step('une adresse IP saisie est reconnue comme telle', async () => {
      await page.locator('#san').fill('10.0.0.5')
      await page.locator('#san').press('Enter')
      // Le type est devine : une IP ne doit pas devenir un nom DNS.
      await expect(page.locator('aside pre')).toContainText('IP.1 = 10.0.0.5')
    })

    await test.step('la generation ecrit les fichiers attendus', async () => {
      await page.getByRole('button', { name: 'Générer la clé et la CSR' }).click()
      await expect(page.getByText('Votre demande est prête')).toBeVisible({ timeout: 30_000 })

      const dir = join(workspace, 'app.interne.local')
      for (const f of [
        'app.interne.local.key.pem',
        'app.interne.local.csr',
        'app.interne.local-req.cnf',
        'app.interne.local.meta',
      ]) {
        expect(existsSync(join(dir, f)), f + ' devrait exister').toBe(true)
      }
      expect(existsSync(join(dir, 'Signed')), 'le dossier Signed devrait exister').toBe(true)
    })

    await test.step('la CSR est valide et contient ce qui a ete demande', async () => {
      const csr = join(workspace, 'app.interne.local', 'app.interne.local.csr')

      // Elle se verifie elle-meme : la signature correspond bien a la cle.
      openssl(['req', '-in', csr, '-noout', '-verify'])

      const text = describeCsr(csr)
      expect(text).toContain('CN=app.interne.local')
      expect(text).toContain('O=Ma Societe')
      expect(text).toContain('DNS:app.interne.local')
      expect(text).toContain('IP Address:10.0.0.5')
      expect(text).toContain('TLS Web Server Authentication')
      expect(text).toContain('TLS Web Client Authentication')
    })

    await test.step('la cle privee est bien une RSA 2048', async () => {
      const key = join(workspace, 'app.interne.local', 'app.interne.local.key.pem')
      expect(openssl(['pkey', '-in', key, '-noout', '-text'])).toMatch(/Private-Key: \(2048 bit/)
    })

    await test.step('le PEM affiche est celui du fichier', async () => {
      const csr = join(workspace, 'app.interne.local', 'app.interne.local.csr')
      const onDisk = readFileSync(csr, 'utf8').trim()
      const shown = (await page.locator('pre').first().textContent())?.trim() ?? ''
      expect(shown).toBe(onDisk)
    })

    await test.step("le fichier est atteignable depuis l'ecran de confirmation", async () => {
      const csr = join(workspace, 'app.interne.local', 'app.interne.local.csr')
      const card = page.getByTestId('csr-file-card')

      // Le chemin complet est ecrit, pas seulement le nom du fichier :
      // personne ne doit avoir a deviner ou l'application a ecrit.
      await expect(card.getByText(csr, { exact: true })).toBeVisible()

      // Les trois sorties possibles depuis cette carte.
      await expect(card.getByRole('button', { name: 'Copier la CSR' })).toBeVisible()
      await expect(card.getByRole('button', { name: 'Montrer le fichier' })).toBeVisible()
      await expect(card.getByRole('button', { name: 'Ouvrir le dossier' })).toBeVisible()
    })

    await test.step('la demande apparait sans avoir a rafraichir', async () => {
      await page.locator('nav').getByRole('button', { name: /Tableau de bord/ }).click()
      // Sans clic sur "Actualiser" : la liste doit se remettre a jour seule.
      await expect(
        page.getByRole('button', { name: /^app\.interne\.local/ }),
      ).toBeVisible()
      await expect(page.getByText('En attente PKI')).toBeVisible()
    })

    await test.step('elle est comptee a la bonne etape du parcours', async () => {
      const step = page.locator('nav').getByRole('button', { name: /En attente de l/ })
      await expect(step.getByTestId('step-count')).toHaveText('1')
    })
  } finally {
    await ctx?.close()
  }
})
