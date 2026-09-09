/**
 * L'application suit son espace de travail.
 *
 * Tout le parcours repose sur un aller-retour hors de l'application : on
 * envoie la demande a l'autorite, on attend, et on depose sa reponse dans
 * Signed/ depuis l'explorateur. Si l'ecran ne montre ce depot qu'apres avoir
 * ete quitte et rouvert, l'attente devient une devinette.
 *
 * Les tests ecrivent directement sur le disque, sans passer par l'interface :
 * c'est exactement ce que fait quelqu'un qui glisse un fichier depuis
 * l'explorateur.
 */
import { copyFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from '../helpers/app.ts'
import { createCa } from '../helpers/ca.ts'
import { createRequest, openEntry } from '../helpers/flow.ts'

const FQDN = 'veille.interne.local'

test('la fiche voit arriver la reponse de l’autorite sans etre quittee', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page, workspace } = ctx

    await createRequest(page, { cn: FQDN })
    await openEntry(page, FQDN)

    await test.step('au depart, la fiche annonce qu’elle n’a rien recu', async () => {
      await expect(page.getByText('Aucun fichier reçu')).toBeVisible()
    })

    await test.step('un fichier depose hors de l’application apparait seul', async () => {
      const ca = createCa(join(workspace, '.ca'))
      const signed = join(workspace, FQDN, 'Signed')
      mkdirSync(signed, { recursive: true })
      ca.sign(join(workspace, FQDN, FQDN + '.csr'), join(signed, FQDN + '.crt'), ['DNS:' + FQDN])
      copyFileSync(ca.intermediateCert, join(signed, 'issuing-ca.crt'))

      // Aucun clic entre le depot et cette attente : c'est tout l'objet du test.
      await expect(page.getByText(FQDN + '.crt', { exact: true })).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText('issuing-ca.crt', { exact: true })).toBeVisible()
      // Et l'etape 3 s'ouvre, puisqu'il y a desormais de quoi assembler.
      await expect(page.getByRole('button', { name: 'Assembler le PFX' })).toBeVisible()
    })

    await test.step('un fichier retire disparait de la meme facon', async () => {
      rmSync(join(workspace, FQDN, 'Signed', 'issuing-ca.crt'))
      await expect(page.getByText('issuing-ca.crt', { exact: true })).toHaveCount(0, {
        timeout: 20_000,
      })
    })
  } finally {
    await ctx?.close()
  }
})

test('le tableau de bord voit un dossier restaure hors de l’application', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page, workspace } = ctx

    // Une demande d'abord, pour disposer d'une cle et d'une CSR a copier.
    await createRequest(page, { cn: 'source.interne.local' })
    await page.locator('nav').getByRole('button', { name: /Tableau de bord/ }).click()

    await test.step('une copie deposee a la main apparait seule', async () => {
      // Ce que donne une restauration de sauvegarde, ou une reprise du dossier
      // d'un collegue. Les fichiers portent le nom du dossier : c'est de la
      // que l'application deduit tout le reste.
      const src = join(workspace, 'source.interne.local')
      const dst = join(workspace, 'restaure.interne.local')
      mkdirSync(join(dst, 'Signed'), { recursive: true })
      copyFileSync(
        join(src, 'source.interne.local.key.pem'),
        join(dst, 'restaure.interne.local.key.pem'),
      )
      copyFileSync(
        join(src, 'source.interne.local.csr'),
        join(dst, 'restaure.interne.local.csr'),
      )

      await expect(
        page.getByRole('button', { name: /^restaure\.interne\.local/ }),
      ).toBeVisible({ timeout: 20_000 })
    })

    await test.step('un dossier sans rien de reconnaissable reste ignore', async () => {
      // Volontaire : l'espace de travail est un dossier ordinaire, ou l'on
      // range aussi autre chose. Seul ce qui porte une cle, une demande ou un
      // PFX est une entree.
      const ca = createCa(join(workspace, '.ca'))
      const bruit = join(workspace, 'notes.diverses')
      mkdirSync(join(bruit, 'Signed'), { recursive: true })
      copyFileSync(ca.rootCert, join(bruit, 'Signed', 'root-ca.crt'))

      await expect(page.getByRole('button', { name: /^notes\.diverses/ })).toHaveCount(0)
    })
  } finally {
    await ctx?.close()
  }
})
