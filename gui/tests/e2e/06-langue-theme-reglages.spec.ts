/**
 * Langue, theme, reglages et espace de travail.
 *
 * L'interet du test n'est pas de verifier que du texte change : c'est de
 * verifier que les deux moities de l'application parlent la meme langue. Les
 * libelles de controle produits a l'assemblage viennent du processus principal,
 * pas de l'interface ; s'ils restaient en francais dans une session anglaise,
 * rien dans le code de rendu ne le signalerait.
 */
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from '../helpers/app.ts'
import { createCa } from '../helpers/ca.ts'
import { createRequest, openEntry } from '../helpers/flow.ts'

const readSettings = (userData: string) =>
  JSON.parse(readFileSync(join(userData, 'settings.json'), 'utf8'))

test('l’application bascule en anglais, interface et processus principal', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page, userData, workspace } = ctx

    await test.step("le selecteur de langue est dans la barre laterale", async () => {
      const picker = page.locator('aside').getByRole('group', { name: /Langue|Language/ })
      await expect(picker).toBeVisible()
      // Chaque langue se nomme dans sa langue, cedille comprise.
      await expect(picker.getByRole('button', { name: 'Français' })).toBeVisible()
      await picker.getByRole('button', { name: 'English' }).click()
    })

    await test.step("l'interface passe en anglais", async () => {
      await expect(page.locator('nav').getByRole('button', { name: /Dashboard/ })).toBeVisible()
      await expect(page.locator('nav').getByText('The journey')).toBeVisible()
      await expect(page.locator('nav').getByRole('button', { name: /Create a request/ })).toBeVisible()
      await expect(page.getByText('No certificates')).toBeVisible()
    })

    await test.step('le choix est retenu dans les reglages', async () => {
      await expect.poll(() => readSettings(userData).language, { timeout: 10_000 }).toBe('en')
    })

    await test.step('les messages du processus principal suivent la langue', async () => {
      // L'assemblage produit ses libelles de controle cote principal : c'est
      // le seul endroit ou une traduction manquante ne se verrait pas.
      const fqdn = 'en.internal.test'
      await createRequest(page, {
        cn: fqdn,
        template: 'Internal server (enterprise CA)',
      })

      const ca = createCa(join(workspace, '.ca'))
      const signed = join(workspace, fqdn, 'Signed')
      mkdirSync(signed, { recursive: true })
      ca.sign(join(workspace, fqdn, fqdn + '.csr'), join(signed, fqdn + '.crt'), ['DNS:' + fqdn])
      copyFileSync(ca.intermediateCert, join(signed, 'issuing-ca.crt'))
      copyFileSync(ca.rootCert, join(signed, 'root-ca.crt'))

      await openEntry(page, fqdn)
      await page.locator('#pfxpass').fill('MotDePasseDeTest!42')
      await page.locator('#pfxpass2').fill('MotDePasseDeTest!42')
      await page.getByRole('button', { name: 'Assemble the PFX' }).click()

      await expect(
        page.getByRole('heading', { name: 'Chain of trust', exact: true }),
      ).toBeVisible({ timeout: 30_000 })
      // Ces trois libelles sont ecrits par le processus principal.
      await expect(page.getByText('Chain of trust verified')).toBeVisible()
      await expect(page.getByText(/The SAN does cover/)).toBeVisible()
      await expect(page.getByText(/Certificate valid, expires in/)).toBeVisible()
    })

    await test.step('et le retour au francais est immediat', async () => {
      await page.locator('aside').getByRole('button', { name: 'Français' }).click()
      await expect(page.locator('nav').getByText('Le parcours')).toBeVisible()
    })
  } finally {
    await ctx?.close()
  }
})

test('le theme se change et se retient', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page } = ctx
    const root = page.locator('html')

    await page.locator('aside').getByRole('button', { name: 'Thème sombre' }).click()
    await expect(root).toHaveAttribute('data-theme', 'dark')

    await page.locator('aside').getByRole('button', { name: 'Thème clair' }).click()
    await expect(root).toHaveAttribute('data-theme', 'light')

    // Le theme est un confort d'affichage, propre au poste : il vit dans le
    // stockage local et non dans settings.json, qui decrit le travail.
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('certtk.theme')), { timeout: 10_000 })
      .toBe('light')

    // Le theme systeme retire l'attribut plutot que d'en poser un troisieme.
    await page.locator('aside').getByRole('button', { name: 'Thème du système' }).click()
    await expect(root).not.toHaveAttribute('data-theme', /.*/)
  } finally {
    await ctx?.close()
  }
})

test('les reglages montrent l’espace de travail et les valeurs par defaut', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp({ defaults: { country: 'FR', org: 'Ma Societe' } })
    const { page, workspace, userData } = ctx

    await test.step('les reglages sont sous le parcours, pas dedans', async () => {
      const nav = page.locator('nav')
      // Le bouton existe, mais hors de la liste des etapes : le classer parmi
      // elles laissait croire qu'il y avait une etape "Reglages".
      await expect(nav.getByRole('button', { name: 'Réglages' })).toHaveCount(0)
      await expect(page.locator('aside').getByRole('button', { name: 'Réglages' })).toBeVisible()
    })

    await test.step("l'espace de travail retenu est affiche tel quel", async () => {
      await page.locator('aside').getByRole('button', { name: 'Réglages' }).click()
      await expect(page.locator('#rootdir')).toHaveValue(workspace)
    })

    await test.step('les valeurs par defaut sont celles des reglages', async () => {
      await expect(page.locator('#dc')).toHaveValue('FR')
      await expect(page.locator('#do')).toHaveValue('Ma Societe')
    })

    await test.step('une modification doit etre enregistree pour prendre effet', async () => {
      const save = page.getByRole('button', { name: 'Enregistrer' })
      // Rien n'est ecrit tant que rien n'a change : le bouton reste inactif.
      await expect(save).toBeDisabled()

      await page.locator('#dl').fill('Paris')
      await expect(save).toBeEnabled()
      await save.click()

      await expect(page.getByText('Réglages enregistrés')).toBeVisible()
      await expect
        .poll(() => readSettings(userData).defaults.locality, { timeout: 10_000 })
        .toBe('Paris')
    })

    await test.step('et se retrouve dans une nouvelle demande', async () => {
      await page.locator('nav').getByRole('button', { name: /Créer une demande/ }).click()
      await page
        .getByRole('button', { name: 'Serveur interne (PKI d’entreprise)', exact: true })
        .click()
      await page.getByRole('button', { name: 'Avancé' }).click()
      await expect(page.locator('#l')).toHaveValue('Paris')
    })
  } finally {
    await ctx?.close()
  }
})
