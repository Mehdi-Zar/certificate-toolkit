/**
 * L'assistant de demarrage.
 *
 * Il porte a lui seul la promesse faite a quelqu'un qui n'a jamais fait de
 * demande de certificat : expliquer les trois temps, dire ou est le dossier de
 * travail, et prevenir que la cle privee ne part pas. Ce qui est teste ici est
 * donc moins un mecanisme qu'un contrat : si l'un de ces ecrans disparait,
 * l'application redevient obscure pour son public.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from '../helpers/app.ts'

const readSettings = (userData: string) =>
  JSON.parse(readFileSync(join(userData, 'settings.json'), 'utf8'))

test('l’assistant explique le parcours au premier lancement', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp({ onboarded: false })
    const { page, userData, workspace } = ctx
    const dialog = page.getByRole('dialog')

    await test.step("il s'ouvre sans qu'on le demande", async () => {
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText('Étape 1 sur 6')).toBeVisible()
      await expect(
        dialog.getByRole('heading', { name: 'Obtenir un certificat, de bout en bout' }),
      ).toBeVisible()
    })

    await test.step("le deuxieme ecran est le choix du dossier, avant tout le reste", async () => {
      await dialog.getByRole('button', { name: 'Suivant' }).click()
      await expect(
        dialog.getByRole('heading', { name: 'Où voulez-vous travailler ?' }),
      ).toBeVisible()
      // Le dossier deja retenu est montre : personne ne doit avoir a deviner
      // ou l'application ecrira.
      await expect(dialog.getByText(workspace)).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Choisir un dossier' })).toBeVisible()
    })

    await test.step('les trois temps du parcours sont nommes', async () => {
      await dialog.getByRole('button', { name: 'Suivant' }).click()
      await expect(dialog.getByText('Vous créez la demande')).toBeVisible()
      await expect(dialog.getByText('L’autorité signe')).toBeVisible()
      await expect(dialog.getByText('Vous assemblez')).toBeVisible()
    })

    await test.step('la separation entre ce qui reste et ce qui part est dite', async () => {
      await dialog.getByRole('button', { name: 'Suivant' }).click()
      await expect(dialog.getByText('Reste sur ce poste')).toBeVisible()
      await expect(dialog.getByText('Part chez l’autorité')).toBeVisible()
    })

    await test.step("l'assemblage, celui qu'on ne voyait pas, a son ecran", async () => {
      await dialog.getByRole('button', { name: 'Suivant' }).click()
      await expect(
        dialog.getByRole('heading', { name: 'Le moment où tout se recolle' }),
      ).toBeVisible()
    })

    await test.step('les formats de sortie sont annonces', async () => {
      await dialog.getByRole('button', { name: 'Suivant' }).click()
      await expect(
        dialog.getByRole('heading', { name: 'Ce que vous obtenez à la fin' }),
      ).toBeVisible()
      await expect(dialog.getByText('Étape 6 sur 6')).toBeVisible()
    })

    await test.step('on peut revenir en arriere sans rien perdre', async () => {
      await dialog.getByRole('button', { name: 'Précédent' }).click()
      await expect(dialog.getByText('Étape 5 sur 6')).toBeVisible()
      await dialog.getByRole('button', { name: 'Suivant' }).click()
      await expect(dialog.getByText('Étape 6 sur 6')).toBeVisible()
    })

    await test.step('le dernier bouton mene directement a la creation', async () => {
      await dialog.getByRole('button', { name: 'Créer une demande' }).click()
      await expect(dialog).toHaveCount(0)
      await expect(
        page.getByRole('heading', { name: /À quoi servira ce certificat/ }),
      ).toBeVisible()
    })

    await test.step('il ne se rouvrira pas au prochain lancement', async () => {
      await expect
        .poll(() => readSettings(userData).onboarded, { timeout: 10_000 })
        .toBe(true)
    })

    await test.step('mais il reste accessible depuis le menu', async () => {
      await page.locator('nav, aside').getByRole('button', { name: 'Comment ça marche ?' }).click()
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText('Étape 1 sur 6')).toBeVisible()
    })

    await test.step('la touche Echap le referme', async () => {
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
    })
  } finally {
    await ctx?.close()
  }
})

test('l’assistant se passe, et ne revient plus', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp({ onboarded: false })
    const { page, userData } = ctx

    await page.getByRole('dialog').getByRole('button', { name: 'Passer' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect.poll(() => readSettings(userData).onboarded, { timeout: 10_000 }).toBe(true)
  } finally {
    await ctx?.close()
  }
})
