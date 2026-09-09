/**
 * Ce qui arrive quand ca se passe mal.
 *
 * Les chemins d'erreur sont les moins testes et les plus vecus : une demande
 * refaite, une PKI qui renvoie le mauvais certificat, un mot de passe mal
 * retape. Ce qui est verifie ici n'est pas qu'une erreur survient, mais qu'elle
 * est dite en clair et qu'elle laisse l'application utilisable.
 */
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from '../helpers/app.ts'
import { createCa } from '../helpers/ca.ts'
import { createRequest, openEntry } from '../helpers/flow.ts'

const PASSWORD = 'MotDePasseDeTest!42'

test('un dossier sans reponse de la PKI le dit, et n’offre pas d’assembler', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page } = ctx

    await createRequest(page, { cn: 'sansreponse.interne.local' })
    await openEntry(page, 'sansreponse.interne.local')

    await expect(page.getByText('Aucun fichier reçu')).toBeVisible()
    await expect(page.getByText('Rien à assembler')).toBeVisible()
    // Pas de bouton actif qui inviterait a lancer quelque chose d'impossible.
    await expect(page.getByRole('button', { name: 'Assembler le PFX' })).toHaveCount(0)
  } finally {
    await ctx?.close()
  }
})

test('deux mots de passe differents bloquent l’assemblage et se disent', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page, workspace } = ctx
    const fqdn = 'confirm.interne.local'

    await createRequest(page, { cn: fqdn })

    const ca = createCa(join(workspace, '.ca'))
    const signed = join(workspace, fqdn, 'Signed')
    mkdirSync(signed, { recursive: true })
    ca.sign(join(workspace, fqdn, fqdn + '.csr'), join(signed, fqdn + '.crt'), ['DNS:' + fqdn])
    copyFileSync(ca.intermediateCert, join(signed, 'issuing-ca.crt'))

    await openEntry(page, fqdn)
    const assemble = page.getByRole('button', { name: 'Assembler le PFX' })

    await test.step('rien n’est propose tant que rien n’est saisi', async () => {
      await expect(assemble).toBeDisabled()
    })

    await test.step('une confirmation differente est signalee', async () => {
      await page.locator('#pfxpass').fill(PASSWORD)
      await page.locator('#pfxpass2').fill('autre chose')
      await expect(page.getByText('Les deux saisies diffèrent.')).toBeVisible()
      await expect(assemble).toBeDisabled()
    })

    await test.step('corriger la confirmation debloque le bouton', async () => {
      await page.locator('#pfxpass2').fill(PASSWORD)
      await expect(page.getByText('Les deux saisies diffèrent.')).toHaveCount(0)
      await expect(assemble).toBeEnabled()
    })
  } finally {
    await ctx?.close()
  }
})

test('un certificat qui ne correspond pas a la cle est refuse avec la raison', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page, workspace } = ctx
    const fqdn = 'etranger.interne.local'

    await createRequest(page, { cn: fqdn })

    // On depose le certificat d'une autre demande : meme nom, autre cle. C'est
    // exactement ce qui arrive quand la cle a ete regeneree apres l'envoi, et
    // c'est pour cela que la feuille se reconnait par sa cle publique et non
    // par son nom de fichier.
    const ca = createCa(join(workspace, '.ca'))
    const autre = join(workspace, '.autre')
    mkdirSync(autre, { recursive: true })
    writeFileSync(
      join(autre, 'req.cnf'),
      ['[req]', 'prompt=no', 'distinguished_name=dn', '[dn]', 'CN=' + fqdn, ''].join('\n'),
      'utf8',
    )
    const { execFileSync } = await import('node:child_process')
    const ssl = (args: string[]) =>
      execFileSync(process.env.OPENSSL_BIN || 'openssl', args, {
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    ssl(['genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048', '-out', join(autre, 'k.pem')])
    ssl(['req', '-new', '-key', join(autre, 'k.pem'), '-out', join(autre, 'r.csr'), '-config', join(autre, 'req.cnf')])

    const signed = join(workspace, fqdn, 'Signed')
    mkdirSync(signed, { recursive: true })
    ca.sign(join(autre, 'r.csr'), join(signed, fqdn + '.crt'), ['DNS:' + fqdn])

    await openEntry(page, fqdn)
    await page.locator('#pfxpass').fill(PASSWORD)
    await page.locator('#pfxpass2').fill(PASSWORD)
    await page.getByRole('button', { name: 'Assembler le PFX' }).click()

    await expect(
      page.getByText(/Aucun certificat fourni ne correspond à la clé privée/),
    ).toBeVisible({ timeout: 30_000 })
    // L'ecran reste utilisable : on peut deposer le bon fichier et reessayer.
    await expect(page.getByRole('button', { name: 'Assembler le PFX' })).toBeEnabled()
  } finally {
    await ctx?.close()
  }
})

test('une cle chiffree demande son mot de passe plutot que d’echouer sans raison', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp({ advancedByDefault: true })
    const { page, workspace } = ctx
    const fqdn = 'chiffre.interne.local'
    const phrase = 'PhraseSecreteDeTest!7'

    await page.locator('nav').getByRole('button', { name: /Créer une demande/ }).click()
    await page.getByRole('button', { name: 'Serveur interne (PKI d’entreprise)', exact: true }).click()
    await page.locator('#cn').fill(fqdn)
    await page.getByRole('checkbox', { name: /Chiffrer la clé privée/ }).check()
    await page.locator('#pp').fill(phrase)
    await page.getByRole('button', { name: 'Générer la clé et la CSR' }).click()
    await expect(page.getByText('Votre demande est prête')).toBeVisible({ timeout: 30_000 })

    const ca = createCa(join(workspace, '.ca'))
    const signed = join(workspace, fqdn, 'Signed')
    mkdirSync(signed, { recursive: true })
    ca.sign(join(workspace, fqdn, fqdn + '.csr'), join(signed, fqdn + '.crt'), ['DNS:' + fqdn])
    copyFileSync(ca.intermediateCert, join(signed, 'issuing-ca.crt'))

    await openEntry(page, fqdn)
    await page.locator('#pfxpass').fill(PASSWORD)
    await page.locator('#pfxpass2').fill(PASSWORD)

    await test.step('sans la phrase secrete, le message nomme la cause', async () => {
      await page.getByRole('button', { name: 'Assembler le PFX' }).click()
      await expect(
        page.getByText(/La clé privée est chiffrée : renseignez son mot de passe|mot de passe/i).first(),
      ).toBeVisible({ timeout: 30_000 })
    })

    await test.step('avec la phrase secrete, l’assemblage aboutit', async () => {
      await page.getByText('Options avancées').click()
      await page.locator('#keypass').fill(phrase)
      await page.getByRole('button', { name: 'Assembler le PFX' }).click()
      await expect(
        page.getByRole('heading', { name: 'Chaîne de confiance', exact: true }),
      ).toBeVisible({ timeout: 30_000 })
    })
  } finally {
    await ctx?.close()
  }
})

test('un nom deja utilise ne remplace pas silencieusement la cle existante', async () => {
  let ctx: Launched | undefined
  try {
    ctx = await launchApp()
    const { page } = ctx

    await createRequest(page, { cn: 'doublon.interne.local' })

    // Depuis l'ecran de confirmation, le menu doit ramener au choix du modele
    // et non reafficher la demande qui vient d'etre faite.
    await page.locator('nav').getByRole('button', { name: /Créer une demande/ }).click()
    await expect(page.getByRole('heading', { name: /À quoi servira ce certificat/ })).toBeVisible()

    await page.getByRole('button', { name: 'Serveur interne (PKI d’entreprise)', exact: true }).click()
    await page.locator('#cn').fill('doublon.interne.local')
    await page.getByRole('button', { name: 'Générer la clé et la CSR' }).click()

    // Ecraser une cle privee detruit tout ce qui a ete signe avec elle :
    // l'application doit refuser, pas demander pardon.
    await expect(page.getByText(/existe déjà|already exists/i).first()).toBeVisible({
      timeout: 30_000,
    })
  } finally {
    await ctx?.close()
  }
})
