/**
 * Vue d'ensemble : parcourt la racine de travail et decrit chaque dossier de
 * FQDN par son etat d'avancement dans le flux (demande -> PKI -> PFX).
 *
 * Le scan est tolerant : un dossier illisible ou incomplet ressort en "broken"
 * plutot que de faire echouer toute la liste.
 */
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { CertEntry, CertInfo, EntryStatus, Settings } from '../shared/types.ts'
import { inspectCert, splitPem } from './certs.ts'
import { parseMeta, pathsFor } from './csr.ts'
import type { Openssl } from './openssl.ts'
import { listSignedFiles } from './pfx.ts'

/** Seuil a partir duquel un certificat est signale comme a renouveler. */
export const EXPIRY_WARN_DAYS = 30

const isFile = (p: string): Promise<boolean> =>
  stat(p).then(
    (s) => s.isFile(),
    () => false,
  )

export async function scanRoot(ssl: Openssl, settings: Settings): Promise<CertEntry[]> {
  let names: string[]
  try {
    names = await readdir(settings.rootDir)
  } catch {
    return []
  }

  const entries: CertEntry[] = []
  for (const name of names) {
    if (name.startsWith('.') || name === 'node_modules') continue
    try {
      if (!(await stat(join(settings.rootDir, name))).isDirectory()) continue
    } catch {
      continue
    }
    const entry = await describeEntry(ssl, settings, name)
    if (entry) entries.push(entry)
  }

  // Ce qui demande une action en premier, puis par ordre alphabetique.
  const rank: Record<EntryStatus, number> = {
    'ready-to-assemble': 0,
    expired: 1,
    expiring: 2,
    'awaiting-pki': 3,
    issued: 4,
    broken: 5,
  }
  return entries.sort((a, b) => rank[a.status] - rank[b.status] || a.fqdn.localeCompare(b.fqdn))
}

export async function describeEntry(
  ssl: Openssl,
  settings: Settings,
  fqdn: string,
): Promise<CertEntry | null> {
  let p: ReturnType<typeof pathsFor>
  try {
    p = pathsFor(settings.rootDir, fqdn)
  } catch {
    return null // nom de dossier qui ne peut pas etre un FQDN
  }

  const [hasKey, hasCsr, hasPfx] = await Promise.all([
    isFile(p.key),
    isFile(p.csr),
    isFile(p.pfx),
  ])

  // Un dossier sans aucune trace de notre flux n'est pas une entree.
  if (!hasKey && !hasCsr && !hasPfx) return null

  const signedFiles = await listSignedFiles(settings.rootDir, fqdn)

  let keyDesc: string | null = null
  let sans: string[] = []
  let createdAt: string | null = null
  try {
    const meta = parseMeta(await readFile(p.meta, 'utf8'))
    keyDesc = meta.KEYDESC ?? null
    sans = (meta.SANS ?? '').split(/\s+/).filter(Boolean)
  } catch {
    /* pas de .meta : dossier cree a la main ou par une ancienne version */
  }
  try {
    createdAt = (await stat(hasCsr ? p.csr : p.key)).birthtime.toISOString()
  } catch {
    /* systeme de fichiers sans date de creation */
  }

  const cert = await readIssuedCert(ssl, settings, fqdn)

  return {
    fqdn,
    dir: p.dir,
    status: statusOf({ hasKey, hasCsr, hasPfx, signedCount: signedFiles.length, cert }),
    hasKey,
    hasCsr,
    hasPfx,
    signedFiles,
    createdAt,
    keyDesc,
    sans: cert && cert.sans.length > 0 ? cert.sans : sans,
    cert,
  }
}

/**
 * Le certificat emis, lu depuis <fqdn>.crt.pem s'il existe, sinon depuis le
 * premier fichier PEM depose par la PKI.
 */
async function readIssuedCert(
  ssl: Openssl,
  settings: Settings,
  fqdn: string,
): Promise<CertInfo | null> {
  const crt = join(settings.rootDir, fqdn, fqdn + '.crt.pem')
  if (await isFile(crt)) {
    try {
      const [first] = splitPem(await readFile(crt, 'utf8'))
      if (first) return await inspectCert(ssl, first)
    } catch {
      /* fichier tronque : on redescend sur Signed/ */
    }
  }
  return null
}

function statusOf(o: {
  hasKey: boolean
  hasCsr: boolean
  hasPfx: boolean
  signedCount: number
  cert: CertInfo | null
}): EntryStatus {
  if (!o.hasKey) return 'broken'
  if (o.hasPfx) {
    if (!o.cert) return 'issued'
    if (o.cert.daysRemaining < 0) return 'expired'
    if (o.cert.daysRemaining <= EXPIRY_WARN_DAYS) return 'expiring'
    return 'issued'
  }
  if (o.signedCount > 0) return 'ready-to-assemble'
  if (o.hasCsr) return 'awaiting-pki'
  return 'broken'
}
