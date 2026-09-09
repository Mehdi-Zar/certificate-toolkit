/**
 * Les gestes que plusieurs tests refont a l'identique.
 *
 * Ils sont ici plutot que recopies : un test qui doit d'abord creer une demande
 * pour tester l'assemblage n'a pas a redecrire l'ecran de creation, et le jour
 * ou cet ecran change, un seul endroit bouge.
 *
 * Les reperes de navigation acceptent les deux langues. Ce sont des gestes,
 * pas le sujet du test : un test d'assemblage n'a pas a echouer parce que la
 * session est en anglais. Les tests qui portent sur la traduction, eux,
 * verifient les libelles explicitement.
 */
import { expect, type Page } from '@playwright/test'

/** Entree du menu, quelle que soit la langue de la session. */
const NAV = {
  dashboard: /Tableau de bord|Dashboard/,
  newRequest: /Créer une demande|Create a request/,
}

const GENERATE = /Générer la clé et la CSR|Generate the key and the CSR/
const READY = /Votre demande est prête|Your request is ready/

export interface RequestOptions {
  /** Nom du certificat, qui donne aussi le nom du dossier. */
  cn: string
  /** Libelle du modele. Par defaut le serveur interne, en francais. */
  template?: string
  /** Noms alternatifs a ajouter, un par validation du champ. */
  sans?: string[]
}

/**
 * Cree une demande depuis l'interface et attend l'ecran de confirmation.
 * Renvoie le chemin que l'application affiche, pas celui qu'on aurait devine.
 */
export async function createRequest(
  page: Page,
  opts: RequestOptions,
): Promise<{ csrPath: string }> {
  const template = opts.template ?? 'Serveur interne (PKI d’entreprise)'

  await page.locator('nav').getByRole('button', { name: NAV.newRequest }).click()
  // exact: true, sinon le bouton d'aide de la meme carte correspond aussi.
  await page.getByRole('button', { name: template, exact: true }).click()
  await expect(page.getByRole('heading', { name: template })).toBeVisible()

  await page.locator('#cn').fill(opts.cn)
  for (const san of opts.sans ?? []) {
    await page.locator('#san').fill(san)
    await page.locator('#san').press('Enter')
  }

  await page.getByRole('button', { name: GENERATE }).click()
  await expect(page.getByText(READY)).toBeVisible({ timeout: 30_000 })

  const csrPath =
    (await page.getByTestId('csr-file-card').locator('.font-mono').first().textContent())?.trim() ??
    ''
  expect(csrPath, 'le chemin de la CSR devrait etre affiche').toContain(opts.cn)
  return { csrPath }
}

/** Ouvre le dossier d'un certificat depuis le tableau de bord. */
export async function openEntry(page: Page, fqdn: string): Promise<void> {
  await page.locator('nav').getByRole('button', { name: NAV.dashboard }).click()
  await page.getByRole('button', { name: new RegExp('^' + escapeRe(fqdn)) }).click()
  // Le titre porte le nom suivi de l'etape courante, d'ou l'absence d'exact.
  await expect(page.getByRole('heading', { name: new RegExp('^' + escapeRe(fqdn)) })).toBeVisible()
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
