/**
 * Le mode avance et les garde-fous.
 *
 * Ce fichier verifie deux choses que le parcours nominal ne montre pas : que
 * les modeles portent bien les extensions qu'ils annoncent, et que les regles
 * qui protegent l'utilisateur d'une demande inexploitable se declenchent
 * vraiment. Une regle de validation qui ne se declenche jamais est pire
 * qu'absente : elle donne l'illusion d'un controle.
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { launchApp, type Launched } from '../helpers/app.ts'

const openssl = (args: string[]) =>
  execFileSync(process.env.OPENSSL_BIN || 'openssl', args, {
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

/** Le texte du fichier de configuration montre en aperçu. */
const preview = (page: Page) => page.locator('aside pre')

const pickTemplate = async (page: Page, label: string) => {
  await page.locator('nav').getByRole('button', { name: /Créer une demande/ }).click()
  // Le menu conserve le brouillon en cours plutot que de le jeter : quand un
  // modele est deja choisi, c'est "Changer de modele" qui ramene au choix.
  const change = page.getByRole('button', { name: 'Changer de modèle' })
  if (await change.isVisible().catch(() => false)) await change.click()

  await page.getByRole('button', { name: label, exact: true }).click()
  await expect(page.getByRole('heading', { name: label })).toBeVisible()
}

test('les modeles portent les extensions qu’ils annoncent', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page } = ctx

    await test.step('un certificat public ne demande que serverAuth', async () => {
      await pickTemplate(page, 'Site web public (HTTPS)')
      await page.locator('#cn').fill('www.exemple.fr')
      // Regle CA/Browser applicable en juin 2026 : plus de clientAuth a cote
      // de serverAuth sur un certificat TLS public. Le modele doit donc partir
      // sans, sans quoi l'autorite rejettera la demande.
      await expect(preview(page)).toContainText('extendedKeyUsage = serverAuth')
      await expect(preview(page)).not.toContainText('clientAuth')
    })

    await test.step('un certificat de messagerie demande emailProtection', async () => {
      await pickTemplate(page, 'Messagerie S/MIME')
      await page.locator('#mail').fill('prenom.nom@exemple.fr')
      await expect(preview(page)).toContainText('emailProtection')
    })

    await test.step('une autorite intermediaire demande CA:TRUE et keyCertSign', async () => {
      await pickTemplate(page, 'Autorité de certification intermédiaire')
      await page.locator('#cn').fill('Autorite Intermediaire Test')
      await expect(preview(page)).toContainText('CA:TRUE')
      await expect(preview(page)).toContainText('keyCertSign')
    })
  } finally {
    await ctx?.close()
  }
})

test('les garde-fous se declenchent sur une demande douteuse', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page } = ctx

    await test.step("un nom interne dans un certificat public est signale", async () => {
      await pickTemplate(page, 'Site web public (HTTPS)')
      await page.locator('#cn').fill('serveur.local')
      // Aucune autorite publique ne signe un nom non resoluble.
      await expect(page.getByText(/autorité publique|nom interne|ne peut pas être/i).first()).toBeVisible()
    })

    await test.step('un joker mal place est refuse', async () => {
      await page.locator('#cn').fill('*.*.exemple.fr')
      await expect(page.getByText(/joker|wildcard/i).first()).toBeVisible()
    })

    await test.step('un pays qui n’est pas un code a deux lettres est signale', async () => {
      await page.locator('#cn').fill('www.exemple.fr')
      await page.getByRole('button', { name: 'Avancé' }).click()
      // Le champ borne la saisie a deux caracteres : la seule facon d'entrer
      // un pays invalide est d'en saisir un seul.
      await page.locator('#c').fill('F')
      await expect(
        page.getByText('Le pays doit être un code à deux lettres (FR, BE, CH, etc.).').first(),
      ).toBeVisible()
      await page.locator('#c').fill('FR')
    })

    await test.step('une cle RSA trop courte n’est pas proposee', async () => {
      const bits = await page.locator('#bits').locator('option').allTextContents()
      expect(bits).not.toContain('1024 bits')
      expect(bits).toContain('2048 bits')
    })
  } finally {
    await ctx?.close()
  }
})

test('le mode avance produit une cle EC et une empreinte SHA-384', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp({ advancedByDefault: true })
    const { page, workspace } = ctx

    await pickTemplate(page, 'Serveur interne (PKI d’entreprise)')
    await page.locator('#cn').fill('ec.interne.local')
    await page.locator('#alg').selectOption('ec')
    await page.locator('#curve').selectOption('secp384r1')
    await page.locator('#dg').selectOption('sha384')

    // La courbe est un argument de genpkey, elle n'apparait pas dans le
    // fichier de configuration : c'est l'empreinte qui s'y lit.
    await expect(preview(page)).toContainText('default_md = sha384')

    await page.getByRole('button', { name: 'Générer la clé et la CSR' }).click()
    await expect(page.getByText('Votre demande est prête')).toBeVisible({ timeout: 30_000 })

    const dir = join(workspace, 'ec.interne.local')
    const key = openssl(['pkey', '-in', join(dir, 'ec.interne.local.key.pem'), '-noout', '-text'])
    expect(key).toContain('secp384r1')

    const csr = openssl(['req', '-in', join(dir, 'ec.interne.local.csr'), '-noout', '-text'])
    expect(csr).toContain('ecdsa-with-SHA384')
  } finally {
    await ctx?.close()
  }
})

test('une cle protegee par mot de passe est reellement chiffree', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp({ advancedByDefault: true })
    const { page, workspace } = ctx

    await pickTemplate(page, 'Serveur interne (PKI d’entreprise)')
    await page.locator('#cn').fill('protege.interne.local')
    await page.getByRole('checkbox', { name: /Chiffrer la clé privée/ }).check()
    await page.locator('#pp').fill('PhraseSecreteDeTest!7')

    await page.getByRole('button', { name: 'Générer la clé et la CSR' }).click()
    await expect(page.getByText('Votre demande est prête')).toBeVisible({ timeout: 30_000 })

    const key = join(workspace, 'protege.interne.local', 'protege.interne.local.key.pem')

    await test.step('le fichier est bien un conteneur chiffre', async () => {
      const pem = openssl(['pkey', '-in', key, '-passin', 'pass:PhraseSecreteDeTest!7', '-noout', '-text'])
      expect(pem).toContain('Private-Key')
    })

    await test.step('il ne s’ouvre pas sans le mot de passe', async () => {
      expect(() => openssl(['pkey', '-in', key, '-passin', 'pass:', '-noout'])).toThrow()
    })
  } finally {
    await ctx?.close()
  }
})
