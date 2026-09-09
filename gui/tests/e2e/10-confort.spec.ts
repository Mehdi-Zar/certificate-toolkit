/**
 * Trois ajouts qui n'existent que pour la personne devant l'ecran.
 *
 * Ils ne changent rien a ce que produit l'outil, et c'est justement pour cela
 * qu'ils ont besoin de tests : rien d'autre ne les surveille.
 */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from '../helpers/app.ts'
import { createRequest, openEntry } from '../helpers/flow.ts'

test('le mot de passe propose est solide, different a chaque fois, et rempli partout', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page, workspace } = ctx
    const fqdn = 'motdepasse.interne.local'

    await createRequest(page, { cn: fqdn })
    // Un fichier quelconque suffit a ouvrir l'etape 3.
    const { mkdirSync, writeFileSync } = await import('node:fs')
    mkdirSync(join(workspace, fqdn, 'Signed'), { recursive: true })
    writeFileSync(join(workspace, fqdn, 'Signed', 'reponse.crt'), 'x', 'utf8')

    await openEntry(page, fqdn)
    const suggest = page.getByRole('button', { name: 'Proposer', exact: true })
    await expect(suggest).toBeVisible()

    await test.step('il remplit la saisie et sa confirmation, et se laisse relire', async () => {
      await suggest.click()
      const value = await page.locator('#pfxpass').inputValue()
      expect(value.length).toBeGreaterThanOrEqual(20)
      await expect(page.locator('#pfxpass2')).toHaveValue(value)
      // Affiche : on ne propose pas un secret qu'on ne peut pas relever.
      await expect(page.locator('#pfxpass')).toHaveAttribute('type', 'text')
      // Et l'assemblage devient possible sans autre geste.
      await expect(page.getByRole('button', { name: 'Assembler le PFX' })).toBeEnabled()
    })

    await test.step('deux propositions ne se ressemblent pas', async () => {
      const first = await page.locator('#pfxpass').inputValue()
      await suggest.click()
      const second = await page.locator('#pfxpass').inputValue()
      expect(second).not.toBe(first)
    })

    await test.step("il n'emploie que des caracteres qui se retapent", async () => {
      const value = await page.locator('#pfxpass').inputValue()
      // Ni 0/O ni 1/l/I, aucune ponctuation qu'un shell interpreterait.
      expect(value).toMatch(/^[A-HJ-NP-Za-km-z2-9-]+$/)
    })
  } finally {
    await ctx?.close()
  }
})

test('la tabulation ne sort pas de l’assistant', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp({ onboarded: false })
    const { page } = ctx
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    /** Le focus est-il encore quelque part dans le dialogue ? */
    const insideDialog = () =>
      page.evaluate(() => {
        const box = document.querySelector('[role="dialog"]')
        return !!box && !!document.activeElement && box.contains(document.activeElement)
      })

    await test.step('le focus entre dans le dialogue tout seul', async () => {
      expect(await insideDialog()).toBe(true)
    })

    await test.step('vingt tabulations ne le font pas sortir', async () => {
      // Le dialogue compte moins de dix elements focalisables : vingt tours
      // font donc plusieurs fois le tour complet.
      for (let i = 0; i < 20; i++) await page.keyboard.press('Tab')
      expect(await insideDialog()).toBe(true)
    })

    await test.step('la tabulation arriere non plus', async () => {
      for (let i = 0; i < 20; i++) await page.keyboard.press('Shift+Tab')
      expect(await insideDialog()).toBe(true)
    })

    await test.step("ce qui est derriere est masque aux lecteurs d'ecran", async () => {
      // Sans cela, un lecteur d'ecran continue d'annoncer le menu sous le voile.
      const hidden = await page.evaluate(() => {
        const aside = document.querySelector('aside')
        return aside?.closest('[aria-hidden="true"]') !== null
      })
      expect(hidden).toBe(true)
    })
  } finally {
    await ctx?.close()
  }
})

test('ranger un dossier le sort de la liste sans rien detruire', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page, workspace } = ctx
    const fqdn = 'aranger.interne.local'

    await createRequest(page, { cn: fqdn })
    await openEntry(page, fqdn)

    await test.step('la confirmation est demandee, et refuser ne fait rien', async () => {
      // La boite native est pilotee par ce que fait Electron : on intercepte
      // le prochain dialogue pour repondre a la place de l'utilisateur.
      await ctx!.app.evaluate(({ dialog }) => {
        dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false })
      })
      await page.getByRole('button', { name: 'Ranger', exact: true }).click()
      await expect(page.getByRole('heading', { name: new RegExp('^' + fqdn) })).toBeVisible()
      expect(existsSync(join(workspace, fqdn))).toBe(true)
    })

    await test.step('accepter deplace le dossier et ramene a la liste', async () => {
      await ctx!.app.evaluate(({ dialog }) => {
        dialog.showMessageBox = async () => ({ response: 0, checkboxChecked: false })
      })
      await page.getByRole('button', { name: 'Ranger', exact: true }).click()

      await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
      await expect(page.getByText('Aucun certificat')).toBeVisible()
      expect(existsSync(join(workspace, fqdn))).toBe(false)
    })

    await test.step('rien n’a ete efface : tout est sous .archive', async () => {
      const attic = join(workspace, '.archive')
      const kept = readdirSync(attic)
      expect(kept).toHaveLength(1)
      expect(kept[0]).toContain(fqdn)
      // La cle privee est toujours la : c'est tout l'objet de ne pas supprimer.
      expect(existsSync(join(attic, kept[0]!, fqdn + '.key.pem'))).toBe(true)
      expect(existsSync(join(attic, kept[0]!, fqdn + '.csr'))).toBe(true)
    })
  } finally {
    await ctx?.close()
  }
})

test('la liste se trie par date sans perdre le tri par etape', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page } = ctx

    await createRequest(page, { cn: 'premier.interne.local' })
    await createRequest(page, { cn: 'second.interne.local' })

    await page.locator('nav').getByRole('button', { name: /Tableau de bord/ }).click()
    const sort = page.getByRole('combobox', { name: 'Trier' })
    await expect(sort).toBeVisible()

    await test.step('par etape, l’ordre reste alphabetique a etape egale', async () => {
      const names = await page.getByRole('button', { name: /interne\.local/ }).allInnerTexts()
      expect(names[0]).toContain('premier.interne.local')
    })

    await test.step('par date, le plus recent passe en tete', async () => {
      await sort.selectOption('recent')
      const names = await page.getByRole('button', { name: /interne\.local/ }).allInnerTexts()
      expect(names[0]).toContain('second.interne.local')
    })
  } finally {
    await ctx?.close()
  }
})
