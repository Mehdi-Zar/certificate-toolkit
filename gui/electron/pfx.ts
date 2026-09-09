/**
 * Etape 3 : assemblage du PKCS#12.
 *
 * Portage de make-pfx.sh. Le certificat feuille n'est pas devine d'apres un nom
 * de fichier mais identifie par comparaison de cle publique avec la cle privee :
 * c'est la seule methode qui garantit que le PFX produit est utilisable.
 *
 * Les mots de passe transitent par l'environnement du processus openssl, pas
 * par argv comme le fait la CLI : ils n'apparaissent donc dans aucune liste de
 * processus.
 */
import { mkdtemp, readFile, readdir, rm, writeFile, chmod, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import type { Translate } from '../shared/i18n/index.ts'
import type { Check, PfxRequest, PfxResult, Settings } from '../shared/types.ts'
import {
  buildChain,
  dedupe,
  inspectCert,
  isEncryptedKey,
  normalizeToPem,
  publicKeyOfCert,
  publicKeyOfCsr,
  publicKeyOfPrivateKey,
  splitPem,
  type Held,
} from './certs.ts'
import { parseMeta, pathsFor } from './csr.ts'
import type { Openssl } from './openssl.ts'

const PASS_ENV_OUT = 'CERTTK_PFX_PASS'
const PASS_ENV_IN = 'CERTTK_KEY_PASS'

/** Inventaire des fichiers deposes par la PKI, pour affichage avant assemblage. */
export async function listSignedFiles(
  rootDir: string,
  fqdn: string,
  t: Translate,
): Promise<string[]> {
  const p = pathsFor(rootDir, fqdn, t)
  try {
    const names = await readdir(p.signed)
    const files: string[] = []
    for (const name of names) {
      const full = join(p.signed, name)
      if ((await stat(full)).isFile()) files.push(full)
    }
    return files.sort()
  } catch {
    return []
  }
}

export async function makePfx(
  ssl: Openssl,
  settings: Settings,
  req: PfxRequest,
  t: Translate,
): Promise<PfxResult> {
  const p = pathsFor(settings.rootDir, req.fqdn, t)
  const checks: Check[] = []

  // -------------------------------------------------------------------------
  // Cle privee
  // -------------------------------------------------------------------------
  let keyPem: string
  try {
    keyPem = await readFile(p.key, 'utf8')
  } catch {
    throw new Error(t('err.keyNotFound', { path: p.key }))
  }

  const encrypted = isEncryptedKey(keyPem)
  if (encrypted && !req.keyPassword) throw new Error(t('err.keyEncrypted'))

  let keyPub: string
  try {
    keyPub = publicKeyOfPrivateKey(keyPem, encrypted ? req.keyPassword : undefined)
  } catch {
    throw new Error(
      encrypted ? t('err.keyBadPassword') : t('err.keyUnreadable', { path: p.key }),
    )
  }

  // -------------------------------------------------------------------------
  // 1. Lecture des retours PKI
  // -------------------------------------------------------------------------
  const sources =
    req.inputs.length > 0 ? req.inputs : await listSignedFiles(settings.rootDir, req.fqdn, t)
  if (sources.length === 0) throw new Error(t('err.noSignedFiles', { dir: p.signed }))

  const held: Held[] = []
  const rejected: string[] = []

  for (const file of [...sources, ...req.chainFiles]) {
    const pem = await normalizeToPem(ssl, file)
    if (!pem) {
      rejected.push(basename(file))
      continue
    }
    for (const one of splitPem(pem)) {
      held.push({ pem: one, info: await inspectCert(ssl, one) })
    }
  }

  if (rejected.length > 0) {
    checks.push({
      level: 'info',
      label: t('check.ignored', { n: rejected.length }),
      detail: t('check.ignoredDetail', { names: rejected.join(', ') }),
    })
  }
  if (held.length === 0) throw new Error(t('err.noReadableCert'))

  const total = held.length
  const certs = dedupe(held)
  checks.push({ level: 'ok', label: t('check.distinct', { n: certs.length, total }) })

  // -------------------------------------------------------------------------
  // 2. Appariement cle privee / certificat
  // -------------------------------------------------------------------------
  const leaf = certs.find((c) => {
    try {
      return publicKeyOfCert(c.pem) === keyPub
    } catch {
      return false
    }
  })

  if (!leaf) {
    throw new Error(
      'Aucun certificat fourni ne correspond a la cle privee.\n' +
        "La PKI a peut-etre signe une autre CSR, ou la cle a ete regeneree depuis l'envoi.",
    )
  }
  checks.push({ level: 'ok', label: t('check.keyMatch') })

  // -------------------------------------------------------------------------
  // 3. Chaine
  // -------------------------------------------------------------------------
  const pool = certs.filter((c) => c !== leaf)
  const { chain, unused, missingIssuer } = buildChain(leaf, pool, req.noRoot)

  if (missingIssuer) {
    checks.push({
      level: 'warn',
      label: t('check.incompleteChain'),
      detail: t('check.incompleteChainDetail', { issuer: missingIssuer }),
    })
  }

  // -------------------------------------------------------------------------
  // 4. Controles
  // -------------------------------------------------------------------------
  // Les libelles d'openssl sont deja ramenes a notre notation a la lecture du
  // certificat (voir normalizeSan) : ici on compare des chaines comparables.
  const sanText = leaf.info.sans.join(',')

  if (sanText.includes('DNS:' + req.fqdn) || sanText.includes('IP:' + req.fqdn)) {
    checks.push({ level: 'ok', label: t('check.sanCovers', { name: req.fqdn }) })
  } else {
    checks.push({
      level: 'warn',
      label: t('check.sanMissing', { name: req.fqdn }),
      detail: t('check.sanMissingDetail'),
    })
  }

  // Les SAN demandes dans la CSR ont-ils tous ete delivres ?
  try {
    const meta = parseMeta(await readFile(p.meta, 'utf8'))
    const wanted = (meta.SANS ?? '').split(/\s+/).filter(Boolean)
    const missing = wanted.filter((w) => !sanText.includes(w))
    if (missing.length > 0) {
      checks.push({
        level: 'warn',
        label: t('check.sansAbsent', { n: missing.length }),
        detail: missing.join(', '),
      })
    }
  } catch {
    /* pas de .meta : demande faite ailleurs, on ne compare rien */
  }

  if (leaf.info.daysRemaining < 0) {
    checks.push({
      level: 'warn',
      label: t('check.expired'),
      detail: t('check.expiredDetail', { date: leaf.info.notAfter }),
    })
  } else {
    checks.push({
      level: 'ok',
      label: t('check.valid', { n: leaf.info.daysRemaining }),
      detail: leaf.info.notAfter,
    })
  }

  const tmp = await mkdtemp(join(tmpdir(), 'certtk-'))
  try {
    const leafFile = join(tmp, 'leaf.pem')
    await writeFile(leafFile, leaf.pem, 'utf8')

    const chainPem = chain.map((c) => c.pem).join('')
    const chainFile = join(tmp, 'chain.pem')
    if (chainPem) {
      await writeFile(chainFile, chainPem, 'utf8')
      const verified = await ssl.run(['verify', '-partial_chain', '-CAfile', chainFile, leafFile])
      if (verified.code === 0) {
        checks.push({ level: 'ok', label: t('check.chainVerified') })
      } else {
        checks.push({
          level: 'warn',
          label: t('check.verifyFailed'),
          detail: (verified.stderr || verified.out).split('\n').slice(0, 3).join(' / '),
        })
      }
    }

    const csrPub = await publicKeyOfCsr(ssl, p.csr)
    if (csrPub && csrPub === keyPub) {
      checks.push({ level: 'ok', label: t('check.samePublicKey') })
    }

    // -----------------------------------------------------------------------
    // 5. Export
    // -----------------------------------------------------------------------
    const outPfx = p.pfx
    const args = [
      'pkcs12', '-export',
      '-inkey', p.key,
      '-in', leafFile,
      '-name', req.friendlyName || req.fqdn,
      '-out', outPfx,
      '-passout', req.noPass ? 'pass:' : 'env:' + PASS_ENV_OUT,
    ]
    if (chainPem) args.push('-certfile', chainFile)
    if (encrypted) args.push('-passin', 'env:' + PASS_ENV_IN)
    if (req.compat) {
      args.push('-legacy', '-certpbe', 'PBE-SHA1-3DES', '-keypbe', 'PBE-SHA1-3DES', '-macalg', 'sha1')
    } else {
      args.push('-certpbe', 'AES-256-CBC', '-keypbe', 'AES-256-CBC', '-macalg', 'sha256')
    }

    if (!req.noPass && !req.password) throw new Error(t('err.emptyPassword'))

    const env: Record<string, string> = {}
    if (!req.noPass) env[PASS_ENV_OUT] = req.password
    if (encrypted) env[PASS_ENV_IN] = req.keyPassword

    await ssl.must(args, { env })
    await chmod(outPfx, 0o600).catch(() => {})

    // Sous-produits pour nginx / Apache / HAProxy / F5
    const base = join(dirname(outPfx), req.fqdn)
    const crtPath = base + '.crt.pem'
    await writeFile(crtPath, leaf.pem, 'utf8')

    let chainPath: string | null = null
    let fullchainPath: string | null = null
    if (chainPem) {
      chainPath = base + '.chain.pem'
      fullchainPath = base + '.fullchain.pem'
      await writeFile(chainPath, chainPem, 'utf8')
      await writeFile(fullchainPath, leaf.pem + chainPem, 'utf8')
    }

    // -----------------------------------------------------------------------
    // 6. Relecture du conteneur produit
    // -----------------------------------------------------------------------
    const readArgs = ['pkcs12', '-in', outPfx, '-passin', req.noPass ? 'pass:' : 'env:' + PASS_ENV_OUT, '-nokeys']
    if (req.compat) readArgs.push('-legacy')
    const readback = await ssl.run(readArgs, { env })
    const certCount = readback.code === 0 ? splitPem(readback.out).length : 0
    if (certCount > 0) {
      checks.push({
        level: 'ok',
        label: t('check.pfxRead', { n: certCount }),
      })
    } else {
      checks.push({ level: 'warn', label: t('check.pfxUnreadable') })
    }

    return {
      pfxPath: outPfx,
      crtPath,
      chainPath,
      fullchainPath,
      leaf: leaf.info,
      chain: chain.map((c) => c.info),
      unused: unused.map((c) => c.info),
      checks,
      certCount,
    }
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}
