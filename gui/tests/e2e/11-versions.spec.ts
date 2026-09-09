/**
 * La verification des versions, et surtout son silence.
 *
 * La promesse affichée dans les réglages est que rien ne part de ce poste. Une
 * verification de version la nuance : c'est pourquoi elle est desactivee par
 * defaut, et pourquoi ce fichier verifie le silence avant de verifier la
 * fonction. Un reglage d'opt-in qui fuit quand meme serait pire que pas de
 * reglage du tout.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from '../helpers/app.ts'

const readSettings = (userData: string) =>
  JSON.parse(readFileSync(join(userData, 'settings.json'), 'utf8'))

test('rien ne part tant que la verification n’est pas activee', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { app, page, userData } = ctx

    await test.step('le reglage est a faux au depart', async () => {
      expect(readSettings(userData).checkUpdates).toBe(false)
    })

    await test.step('le canal reste muet meme appele directement', async () => {
      // On appelle le canal sans passer par l'interface : c'est le processus
      // principal qui doit refuser, pas le bouton qui doit s'abstenir.
      const answer = await page.evaluate(() => window.certtk.update.check())
      expect(answer).toEqual({ ok: true, data: null })
    })

    await test.step('aucune requete n’a ete emise', async () => {
      // La preuve la plus directe : on demande a Electron ce qu'il a demande.
      // Une requete vers github apparaitrait ici.
      const seen = await app.evaluate(async ({ session }) => {
        const urls: string[] = []
        session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
          urls.push(details.url)
          cb({})
        })
        return urls
      })
      expect(seen.filter((u) => u.startsWith('http'))).toEqual([])
    })

    await test.step('aucun bandeau de mise a jour n’est affiche', async () => {
      await expect(page.getByText(/Version .* disponible/)).toHaveCount(0)
    })
  } finally {
    await ctx?.close()
  }
})

test('le reglage s’active et s’enregistre', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page, userData } = ctx

    await page.locator('aside').getByRole('button', { name: 'Réglages' }).click()

    const box = page.getByRole('checkbox', {
      name: /Vérifier au démarrage s’il existe une version plus récente/,
    })
    await expect(box).toBeVisible()
    await expect(box).not.toBeChecked()

    await test.step("le texte dit ce qui part, et qu'il ne part rien par defaut", async () => {
      await expect(page.getByText(/Désactivé par défaut/)).toBeVisible()
      // La promesse de confidentialite est nuancee, pas laissee fausse.
      await expect(page.getByText(/sauf si vous activez la vérification/)).toBeVisible()
    })

    await test.step('cocher puis enregistrer conserve le choix', async () => {
      await box.check()
      await page.getByRole('button', { name: 'Enregistrer' }).click()
      await expect(page.getByText('Réglages enregistrés')).toBeVisible()
      await expect.poll(() => readSettings(userData).checkUpdates, { timeout: 10_000 }).toBe(true)
    })
  } finally {
    await ctx?.close()
  }
})

test('une adresse etrangere au projet est refusee', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page } = ctx

    // Le bandeau ouvre une adresse venue d'une reponse reseau : elle n'est pas
    // de confiance, et le processus principal ne doit pas la suivre aveuglement.
    const refuse = await page.evaluate(() =>
      window.certtk.system.openExternal('https://exemple.invalide/piege'),
    )
    expect(refuse.ok).toBe(false)

    const accepte = await page.evaluate(() =>
      window.certtk.system.openExternal('https://github.com/Mehdi-Zar/certificate-toolkit/x'),
    )
    // Elle est acceptee : le navigateur s'ouvre, ce dont le test ne juge pas.
    expect(accepte.ok).toBe(true)
  } finally {
    await ctx?.close()
  }
})
