/**
 * Etape 1 : cle privee + CSR.
 *
 * Portage de generate-csr.sh. Meme arborescence, memes noms de fichiers et
 * meme fichier .meta, pour que la CLI et la GUI restent interchangeables sur
 * un meme dossier de travail.
 */
import { createPublicKey } from 'node:crypto'
import { mkdir, readFile, writeFile, chmod, access } from 'node:fs/promises'
import { join } from 'node:path'
import type { CsrRequest, CsrResult, San, SanType } from '../shared/types.ts'
import { describeKey } from './certs.ts'
import type { Openssl } from './openssl.ts'

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Le FQDN devient un nom de dossier : il ne doit pouvoir designer que lui-meme.
 * Tout separateur, tout ".." et tout caractere de controle est refuse.
 */
export function assertSafeFqdn(fqdn: string): void {
  if (!fqdn) throw new Error('Le FQDN est obligatoire.')
  if (fqdn.length > 253) throw new Error('FQDN trop long (253 caracteres au maximum).')
  if (/[/\\]/.test(fqdn)) throw new Error('Le FQDN ne peut pas contenir de separateur de chemin.')
  if (fqdn === '.' || fqdn === '..' || fqdn.includes('..')) {
    throw new Error('FQDN invalide.')
  }
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f<>:"|?*]/.test(fqdn)) {
    throw new Error('Le FQDN contient un caractere interdit dans un nom de dossier.')
  }
  if (!/^[A-Za-z0-9._*-]+$/.test(fqdn)) {
    throw new Error('FQDN invalide : lettres, chiffres, point, tiret et * uniquement.')
  }
}

const SAN_PREFIXES: SanType[] = ['DNS', 'IP', 'email', 'URI']

/** Devine le type d'un SAN saisi librement ("10.0.0.1" -> IP, "a@b.fr" -> email). */
export function guessSan(raw: string): San {
  const value = raw.trim()
  const colon = value.indexOf(':')
  if (colon > 0) {
    const prefix = value.slice(0, colon)
    const match = SAN_PREFIXES.find((p) => p.toLowerCase() === prefix.toLowerCase())
    if (match) return { type: match, value: value.slice(colon + 1) }
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return { type: 'IP', value }
  if (/^[0-9A-Fa-f:]+$/.test(value) && value.includes(':')) return { type: 'IP', value }
  if (value.includes('@')) return { type: 'email', value }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return { type: 'URI', value }
  return { type: 'DNS', value }
}

/** Le CN d'abord, puis les extras, dedoublonnes. */
export function buildSanList(fqdn: string, extras: San[]): San[] {
  const out: San[] = [guessSan(fqdn)]
  for (const san of extras) {
    const value = san.value.trim()
    if (!value) continue
    if (out.some((e) => e.type === san.type && e.value === value)) continue
    out.push({ type: san.type, value })
  }
  return out
}

export const formatSan = (s: San): string => s.type + ':' + s.value

// ---------------------------------------------------------------------------
// Fichier de configuration OpenSSL
// ---------------------------------------------------------------------------

/**
 * Les valeurs du DN sont ecrites telles quelles dans un fichier .cnf lu par
 * openssl : un retour a la ligne y injecterait une directive. On les refuse.
 */
function cnfValue(label: string, value: string): string {
  if (/[\r\n]/.test(value)) {
    throw new Error('Le champ "' + label + '" ne peut pas contenir de retour a la ligne.')
  }
  return value.trim()
}

export function renderConfig(req: CsrRequest, sans: San[]): string {
  const lines: string[] = [
    '[ req ]',
    'default_md = ' + req.digest,
    'prompt = no',
    'distinguished_name = req_distinguished_name',
    'req_extensions = req_ext',
    '',
    '[ req_distinguished_name ]',
  ]

  if (req.country.trim()) lines.push('countryName = ' + cnfValue('Pays', req.country))
  if (req.org.trim()) lines.push('organizationName = ' + cnfValue('Organisation', req.org))
  if (req.ou.trim()) lines.push('organizationalUnitName = ' + cnfValue('Unite', req.ou))
  lines.push('commonName = ' + req.fqdn)
  if (req.email.trim()) lines.push('emailAddress = ' + cnfValue('Email', req.email))

  lines.push(
    '',
    '[ req_ext ]',
    'subjectAltName = @alt_names',
    'basicConstraints = CA:FALSE',
    'keyUsage = critical, digitalSignature, keyEncipherment',
    'extendedKeyUsage = serverAuth, clientAuth',
    '',
    '[ alt_names ]',
  )

  // Numerotation par type : DNS.1, DNS.2, IP.1, ...
  const counters = new Map<SanType, number>()
  for (const san of sans) {
    const n = (counters.get(san.type) ?? 0) + 1
    counters.set(san.type, n)
    lines.push(san.type + '.' + n + ' = ' + cnfValue('SAN', san.value))
  }

  return lines.join('\n') + '\n'
}

// ---------------------------------------------------------------------------
// Chemins
// ---------------------------------------------------------------------------

export interface Paths {
  dir: string
  key: string
  cnf: string
  csr: string
  meta: string
  signed: string
  pfx: string
}

export function pathsFor(rootDir: string, fqdn: string): Paths {
  assertSafeFqdn(fqdn)
  const dir = join(rootDir, fqdn)
  return {
    dir,
    key: join(dir, fqdn + '.key.pem'),
    cnf: join(dir, fqdn + '-req.cnf'),
    csr: join(dir, fqdn + '.csr'),
    meta: join(dir, fqdn + '.meta'),
    signed: join(dir, 'Signed'),
    pfx: join(dir, fqdn + '.pfx'),
  }
}

const exists = (p: string): Promise<boolean> =>
  access(p).then(
    () => true,
    () => false,
  )

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export async function generateCsr(
  ssl: Openssl,
  rootDir: string,
  req: CsrRequest,
): Promise<CsrResult> {
  const p = pathsFor(rootDir, req.fqdn)

  if (!req.force && (await exists(p.key))) {
    throw new Error(
      'Une cle privee existe deja pour ' + req.fqdn + '.\n' +
        "Si une CSR est en cours de signature chez la PKI, la regenerer rendrait le certificat a venir inutilisable. " +
        'Cochez "Ecraser la cle existante" pour passer outre.',
    )
  }

  if (req.keyType === 'rsa' && ![2048, 3072, 4096].includes(req.bits)) {
    throw new Error('Taille de cle RSA invalide : ' + req.bits + ' (2048, 3072 ou 4096).')
  }

  const sans = buildSanList(req.fqdn, req.sans)

  await mkdir(p.dir, { recursive: true })
  await mkdir(p.signed, { recursive: true })

  // 1. Cle privee
  const keyArgs =
    req.keyType === 'ec'
      ? ['genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:' + req.curve, '-out', p.key]
      : ['genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:' + req.bits, '-out', p.key]
  await ssl.must(keyArgs)
  await chmod(p.key, 0o600).catch(() => {
    /* systemes de fichiers sans permissions POSIX */
  })

  const keyDesc = describeKey(createPublicKey(await readFile(p.key, 'utf8')))

  // 2. Configuration
  await writeFile(p.cnf, renderConfig(req, sans), 'utf8')

  // 3. CSR
  await ssl.must(['req', '-new', '-key', p.key, '-out', p.csr, '-config', p.cnf, '-extensions', 'req_ext'])
  if (!(await ssl.ok(['req', '-in', p.csr, '-noout', '-verify']))) {
    throw new Error('La CSR generee ne se verifie pas.')
  }

  const subjectOut = await ssl.must(['req', '-in', p.csr, '-noout', '-subject', '-nameopt', 'RFC2253'])
  const subject = subjectOut.out.replace(/^subject=/, '').trim()

  // 4. Metadonnees, au format lu par make-pfx.sh
  const meta = [
    '# genere par CSR Toolkit (GUI) le ' + new Date().toISOString(),
    'FQDN="' + req.fqdn + '"',
    'KEY="' + p.key + '"',
    'CSR="' + p.csr + '"',
    'CNF="' + p.cnf + '"',
    'SIGNED_DIR="' + p.signed + '"',
    'KEYDESC="' + keyDesc + '"',
    'SANS="' + sans.map(formatSan).join(' ') + '"',
    '',
  ].join('\n')
  await writeFile(p.meta, meta, 'utf8')

  return {
    fqdn: req.fqdn,
    dir: p.dir,
    keyPath: p.key,
    csrPath: p.csr,
    cnfPath: p.cnf,
    metaPath: p.meta,
    signedDir: p.signed,
    csrPem: await readFile(p.csr, 'utf8'),
    keyDesc,
    subject,
    sans: sans.map(formatSan),
  }
}

// ---------------------------------------------------------------------------
// Relecture des metadonnees (jamais evaluees comme du code, contrairement a un
// "source" shell : le fichier est lu ligne a ligne).
// ---------------------------------------------------------------------------

export type Meta = Partial<Record<'FQDN' | 'KEY' | 'CSR' | 'CNF' | 'SIGNED_DIR' | 'KEYDESC' | 'SANS', string>>

export function parseMeta(text: string): Meta {
  const meta: Meta = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^(FQDN|KEY|CSR|CNF|SIGNED_DIR|KEYDESC|SANS)=(.*)$/.exec(line.trim())
    if (!m) continue
    meta[m[1] as keyof Meta] = m[2]!.replace(/^"|"$/g, '')
  }
  return meta
}
