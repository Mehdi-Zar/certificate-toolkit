/**
 * Les gestes que plusieurs tests refont a l'identique.
 *
 * Ils sont ici plutot que recopies : un test qui doit d'abord creer une demande
 * pour tester l'assemblage n'a pas a redecrire l'ecran de creation, et le jour
 * ou cet ecran change, un seul endroit bouge.
 */
import { expect, type Page } from '@playwright/test'

export interface RequestOptions {
  /** Nom du certificat, qui donne aussi le nom du dossier. */
  cn: string
  /** Modele a choisir. Par defaut le serveur interne, sans exigence publique. */
  template?: string
  /** Noms alternatifs a ajouter, un par ligne du champ. */
  sans?: string[]
}

/**
 * Cree une demande depuis l'interface et attend l'ecran de confirmation.
 * Renvoie les chemins que l'application affiche, pas ceux qu'on aurait devines.
 */
export async function createRequest(
  page: Page,
  opts: RequestOptions,
): Promise<{ csrPath: string }> {
  const template = opts.template ?? 'Serveur interne (PKI d’entreprise)'

  await page.locator('nav').getByRole('button', { name: /Créer une demande/ }).click()
  // exact: true, sinon le bouton d'aide de la meme carte correspond aussi.
  await page.getByRole('button', { name: template, exact: true }).click()
  await expect(page.getByRole('heading', { name: template })).toBeVisible()

  await page.locator('#cn').fill(opts.cn)
  for (const san of opts.sans ?? []) {
    await page.locator('#san').fill(san)
    await page.locator('#san').press('Enter')
  }

  await page.getByRole('button', { name: 'Générer la clé et la CSR' }).click()
  await expect(page.getByText('Votre demande est prête')).toBeVisible({ timeout: 30_000 })

  const csrPath =
    (await page.getByTestId('csr-file-card').locator('.font-mono').first().textContent())?.trim() ??
    ''
  expect(csrPath, 'le chemin de la CSR devrait etre affiche').toContain(opts.cn)
  return { csrPath }
}

/** Ouvre le dossier d'un certificat depuis le tableau de bord. */
export async function openEntry(page: Page, fqdn: string): Promise<void> {
  await page.locator('nav').getByRole('button', { name: /Tableau de bord/ }).click()
  await page.getByRole('button', { name: new RegExp('^' + escapeRe(fqdn)) }).click()
  // Le titre porte le nom suivi de l'etape courante, d'ou l'absence d'exact.
  await expect(page.getByRole('heading', { name: new RegExp('^' + escapeRe(fqdn)) })).toBeVisible()
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
