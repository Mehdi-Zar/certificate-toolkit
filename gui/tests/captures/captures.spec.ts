/**
 * Les captures d'ecran de la documentation.
 *
 * Elles ne sont pas prises a la main. Une capture prise a la main vieillit sans
 * que personne ne le remarque, et surtout elle montre l'ecran de celui qui l'a
 * prise : son nom d'utilisateur, ses chemins, ses certificats. Ce depot ne peut
 * pas se le permettre.
 *
 * Ce parcours rejoue donc la boucle complete avec des donnees inventees, dans
 * un dossier aux chemins lisibles, et ecrit les images dans docs/images. La
 * seule autorite employee est celle, jetable, des tests.
 *
 * Usage : npm run captures
 *
 * Il ne tourne pas avec npm test : il ecrit hors de son dossier, et une suite
 * de tests ne doit pas modifier le depot.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { launchApp, type Launched } from '../helpers/app.ts'
import { createCa } from '../helpers/ca.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const IMAGES = resolve(HERE, '..', '..', '..', 'docs', 'images')

/**
 * Tout ce qui apparaitra a l'ecran. Rien ici n'existe : le domaine vient des
 * noms reserves a la documentation, l'organisation est inventee, et le mot de
 * passe est celui d'une demonstration.
 */
const FQDN = 'www.exemple.fr'
const SAN = 'exemple.fr'
const TEMPLATE = 'Site web public (HTTPS)'
const PASSWORD = 'MotDePasseDeDemo!2026'
const DEFAULTS = {
  country: 'FR',
  state: '',
  locality: 'Paris',
  org: 'Exemple SA',
  ou: 'Infrastructures',
  email: '',
}

/**
 * Le dossier de travail est impose, et non temporaire : son chemin se lit sur
 * les captures. Un dossier temporaire y ferait apparaitre le nom du compte
 * Windows de celui qui lance le script.
 */
const BASE =
  process.env.CAPTURES_DIR ?? (process.platform === 'win32' ? 'C:\\Demo' : join(tmpdir(), 'Demo'))
const WORKSPACE = join(BASE, 'Certificats')

const rx = (s: string) => new RegExp('^' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

/** Refuse d'ecraser un dossier qui contient deja quelque chose. */
function prepareBase(): void {
  if (existsSync(BASE) && readdirSync(BASE).length > 0) {
    throw new Error(
      BASE +
        " existe et n'est pas vide. Ce script le supprime en fin de parcours :" +
        ' videz-le, ou donnez un autre chemin avec CAPTURES_DIR.',
    )
  }
  mkdirSync(WORKSPACE, { recursive: true })
  mkdirSync(IMAGES, { recursive: true })
}

/**
 * Amene une section en haut de la fenetre.
 *
 * scrollIntoViewIfNeeded s'arrete des que l'element touche le bas de l'ecran,
 * ce qui donne une capture ou le titre est visible et son contenu non.
 */
async function scrollTo(page: Page, locator: Locator): Promise<void> {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(300)
}

/**
 * Ce qui precede toute capture.
 *
 * Les notifications passageres et le curseur clignotant rendraient deux
 * executions differentes pour rien : on ferme ce qui traine, on retire le
 * focus, et on laisse le rendu se poser.
 */
async function settle(page: Page): Promise<void> {
  const closeToast = page.getByRole('status').getByRole('button', { name: 'Fermer' })
  for (let i = await closeToast.count(); i > 0; i--) {
    await closeToast.first().click()
  }
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  await page.waitForTimeout(400)
}

/** Une capture de la fenetre, nommee comme l'image que la documentation appelle. */
async function shot(page: Page, name: string): Promise<void> {
  await settle(page)
  await page.screenshot({ path: join(IMAGES, name + '.png') })
}

/**
 * Une capture limitee a une bande verticale, de `from` jusqu'a `to`.
 *
 * La page d'un certificat assemble porte la meme table deux fois : une fois
 * comme resultat de l'assemblage, une fois comme rappel permanent. Prise en
 * entier, la capture donnerait a lire un doublon qui n'en est pas un.
 */
async function shotBetween(page: Page, from: Locator, to: Locator, name: string): Promise<void> {
  await settle(page)
  const top = await from.boundingBox()
  const bottom = await to.boundingBox()
  const width = await page.evaluate(() => window.innerWidth)
  if (!top || !bottom) throw new Error('reperes introuvables pour la capture ' + name)
  await page.screenshot({
    path: join(IMAGES, name + '.png'),
    clip: { x: 0, y: Math.max(0, top.y - 28), width, height: bottom.y - top.y },
  })
}

test('les captures de la documentation', async () => {
  prepareBase()
  let ctx: Launched | undefined
  try {
    ctx = await launchApp({ onboarded: false, base: BASE, workspace: WORKSPACE, defaults: DEFAULTS })
    const { page } = ctx

    // Le theme clair, toujours : une documentation se lit et s'imprime sur
    // fond blanc, et le theme systeme rendrait la capture dependante du poste.
    await page.evaluate(() => localStorage.setItem('certtk.theme', 'light'))
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    const dialog = page.getByRole('dialog')

    await test.step('assistant : le choix du dossier de travail', async () => {
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: 'Suivant' }).click()
      await expect(
        dialog.getByRole('heading', { name: 'Où voulez-vous travailler ?' }),
      ).toBeVisible()
      await expect(dialog.getByText(WORKSPACE)).toBeVisible()
      await shot(page, 'assistant-dossier')
    })

    await test.step('le choix du modele', async () => {
      await dialog.getByRole('button', { name: 'Passer' }).click()
      await expect(dialog).toHaveCount(0)
      await page.locator('nav').getByRole('button', { name: 'Créer une demande' }).click()
      await expect(page.getByRole('heading', { name: /À quoi servira ce certificat/ })).toBeVisible()
      await shot(page, 'modeles')
    })

    await test.step('le formulaire rempli, et son panneau de controle', async () => {
      await page.getByRole('button', { name: TEMPLATE, exact: true }).click()
      await expect(page.getByRole('heading', { name: TEMPLATE })).toBeVisible()
      await page.locator('#cn').fill(FQDN)
      await page.locator('#san').fill(SAN)
      await page.locator('#san').press('Enter')
      await shot(page, 'formulaire')
    })

    await test.step('la demande est prete', async () => {
      await page.getByRole('button', { name: 'Générer la clé et la CSR' }).click()
      const ready = page.getByText('Votre demande est prête')
      await expect(ready).toBeVisible({ timeout: 30_000 })
      await scrollTo(page, ready)
      await shot(page, 'demande-prete')
    })

    await test.step('le tableau de bord, la demande en attente', async () => {
      await page.locator('nav').getByRole('button', { name: 'Tableau de bord' }).click()
      await expect(page.getByRole('button', { name: rx(FQDN) })).toBeVisible()
      await shot(page, 'tableau-de-bord')
    })

    await test.step('ou deposer la reponse de l’autorite', async () => {
      await page.getByRole('button', { name: rx(FQDN) }).click()
      await expect(page.getByRole('heading', { name: rx(FQDN) })).toBeVisible()
      await scrollTo(page, page.getByText('2 · Retours de la PKI'))
      await shot(page, 'depot')
    })

    await test.step("l'autorite signe, et le mot de passe est saisi", async () => {
      const ca = createCa(join(BASE, 'ca-de-demonstration'))
      const dir = join(WORKSPACE, FQDN)
      const signed = join(dir, 'Signed')
      mkdirSync(signed, { recursive: true })
      ca.sign(join(dir, FQDN + '.csr'), join(signed, FQDN + '.crt'), ['DNS:' + FQDN, 'DNS:' + SAN])
      copyFileSync(ca.intermediateCert, join(signed, 'ca-emettrice.crt'))
      copyFileSync(ca.rootCert, join(signed, 'ca-racine.crt'))

      // Le dossier est surveille : les fichiers apparaissent sans rien cliquer.
      await expect(page.getByText(FQDN + '.crt', { exact: true })).toBeVisible()
      await page.locator('#pfxpass').fill(PASSWORD)
      await page.locator('#pfxpass2').fill(PASSWORD)
      await scrollTo(page, page.getByText('3 · Assemblage du PFX'))
      await shot(page, 'assemblage')
    })

    await test.step('la chaine reconstruite et les controles', async () => {
      await page.getByRole('button', { name: 'Assembler le PFX' }).click()
      const chain = page.getByRole('heading', { name: 'Chaîne de confiance', exact: true })
      await expect(chain).toBeVisible({ timeout: 30_000 })
      await scrollTo(page, chain)
      await shot(page, 'controles')
    })

    await test.step('quel fichier pour quel serveur', async () => {
      // Le titre du resultat et celui du rappel portent le meme libelle.
      const titles = page.getByRole('heading', { name: /Quel fichier pour quel serveur/ })
      await expect(titles.first()).toBeVisible()
      await scrollTo(page, titles.first())
      await shotBetween(page, titles.first(), titles.nth(1), 'formats')
    })

    await test.step('les reglages', async () => {
      await page.locator('nav, aside').getByRole('button', { name: 'Réglages' }).click()
      await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible()
      await shot(page, 'reglages')
    })
  } finally {
    await ctx?.close()
    // Le dossier de demonstration contient une cle privee et un PFX : il ne
    // survit pas au parcours, meme en cas d'echec.
    rmSync(BASE, { recursive: true, force: true })
  }
})
