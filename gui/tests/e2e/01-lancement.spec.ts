/**
 * L'application se lance, trouve son OpenSSL, et montre ce qu'il faut.
 * Si ce fichier echoue, rien d'autre ne merite d'etre teste.
 */
import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from '../helpers/app.ts'

let ctx: Launched

test.beforeAll(async () => {
  ctx = await launchApp()
})

test.afterAll(async () => {
  await ctx?.close()
})

test("s'ouvre sur le tableau de bord", async () => {
  await expect(ctx.page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
})

test('detecte OpenSSL, donc la copie embarquee', async () => {
  const sidebar = ctx.page.locator('aside')
  await expect(sidebar.getByText('OpenSSL', { exact: true })).toBeVisible()
  // La version, sans quoi le point vert ne prouverait rien.
  await expect(sidebar.getByText(/^3\.\d+\.\d+$/)).toBeVisible()
})

test("affiche l'espace de travail du test", async () => {
  await expect(ctx.page.getByText('ESPACE DE TRAVAIL')).toBeVisible()
  // Le chemin est affiche tel quel : on cherche le dernier segment.
  const leaf = ctx.workspace.split(/[\\/]/).pop()!
  await expect(ctx.page.getByText(new RegExp(leaf))).toBeVisible()
})

test('affiche le parcours dans le menu', async () => {
  const nav = ctx.page.locator('nav')
  await expect(nav.getByText('LE PARCOURS')).toBeVisible()
  await expect(nav.getByRole('button', { name: /Créer une demande/ })).toBeVisible()
  await expect(nav.getByRole('button', { name: /En attente de l/ })).toBeVisible()
  await expect(nav.getByRole('button', { name: /À assembler/ })).toBeVisible()
})

test("part d'un espace de travail vide", async () => {
  await expect(ctx.page.getByText('Aucun certificat')).toBeVisible()
})

test("n'ouvre pas l'assistant quand il a deja ete vu", async () => {
  await expect(ctx.page.getByRole('dialog')).toHaveCount(0)
})
