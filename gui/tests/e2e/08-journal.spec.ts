/**
 * Le journal.
 *
 * Deux promesses a tenir, et elles se contredisent si on n'y prend pas garde :
 * il doit contenir assez pour comprendre une panne, et jamais rien de secret.
 * Le test verifie les deux sur un echec provoque pour de vrai.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from '../helpers/app.ts'
import { createRequest, openEntry } from '../helpers/flow.ts'

const journal = (userData: string): string => {
  const p = join(userData, 'journal.log')
  return existsSync(p) ? readFileSync(p, 'utf8') : ''
}

test('le journal consigne un echec sans reveler de secret', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page, userData, workspace } = ctx
    const fqdn = 'journal.interne.local'
    const password = 'MotDePasseDeTest!42'

    await test.step("rien n'est ecrit tant que rien n'echoue", async () => {
      await createRequest(page, { cn: fqdn })
      expect(journal(userData)).toBe('')
    })

    await test.step('un assemblage impossible laisse une trace', async () => {
      // Un fichier qui n'est pas un certificat : openssl echouera dessus.
      const signed = join(workspace, fqdn, 'Signed')
      mkdirSync(signed, { recursive: true })
      writeFileSync(join(signed, 'reponse.crt'), 'ceci n est pas un certificat\n', 'utf8')

      await openEntry(page, fqdn)
      await page.locator('#pfxpass').fill(password)
      await page.locator('#pfxpass2').fill(password)
      await page.getByRole('button', { name: 'Assembler le PFX' }).click()

      // Peu importe le message exact : ce qui compte est qu'il arrive et que
      // l'echec soit consigne.
      await expect(page.locator('[role="alert"], .text-danger').first()).toBeVisible({
        timeout: 30_000,
      })
      await expect.poll(() => journal(userData).length, { timeout: 10_000 }).toBeGreaterThan(0)
    })

    await test.step('la trace dit quoi et pourquoi', async () => {
      const text = journal(userData)
      expect(text).toMatch(/openssl echoue|appel refuse/)
      // Une date en tete de ligne, sans quoi deux pannes ne se distinguent pas.
      expect(text).toMatch(/^\d{4}-\d{2}-\d{2}T/m)
    })

    await test.step('et ne contient ni mot de passe ni cle privee', async () => {
      const text = journal(userData)
      expect(text).not.toContain(password)
      expect(text).not.toContain('PRIVATE KEY')
      expect(text).not.toContain('BEGIN')
    })

    await test.step('le journal est atteignable depuis les reglages', async () => {
      await page.locator('aside').getByRole('button', { name: 'Réglages' }).click()
      await expect(page.getByRole('button', { name: 'Ouvrir le journal' })).toBeVisible()
      await expect(page.getByText(join(userData, 'journal.log'))).toBeVisible()
    })
  } finally {
    await ctx?.close()
  }
})
