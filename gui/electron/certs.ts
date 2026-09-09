/**
 * Lecture et manipulation de certificats X.509.
 *
 * Ce module porte la logique que make-pfx.sh implemente en shell : normaliser
 * n'importe quel format de retour PKI vers du PEM, deduplication, appariement
 * cle privee / certificat, puis reconstruction ordonnee de la chaine.
 *
 * L'extraction et la comparaison de cles publiques passent par node:crypto
 * plutot que par openssl : c'est exact, et cela evite d'ouvrir un processus
 * par certificat.
 */
import { createPrivateKey, createPublicKey, type KeyObject } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { CertInfo } from '../shared/types.ts'
import type { Openssl } from './openssl.ts'

const BEGIN_CERT = '-----BEGIN CERTIFICATE-----'
const END_CERT = '-----END CERTIFICATE-----'

// ---------------------------------------------------------------------------
// Normalisation des formats
// ---------------------------------------------------------------------------

/**
 * Ramene un fichier de retour PKI a une suite de certificats PEM.
 * Accepte PEM, PKCS#7 PEM, DER x509 et PKCS#7 DER. Renvoie null si le fichier
 * n'est aucun des quatre.
 */
export async function normalizeToPem(ssl: Openssl, file: string): Promise<string | null> {
  const raw = await readFile(file)
  const text = raw.toString('binary')

  if (text.includes(BEGIN_CERT)) {
    return extractPemBlocks(raw.toString('utf8'))
  }

  if (text.includes('-----BEGIN PKCS7-----')) {
    const r = await ssl.run(['pkcs7', '-in', file, '-print_certs'])
    if (r.code === 0) return extractPemBlocks(r.out)
  }

  // DER : un certificat seul
  const asX509 = await ssl.run(['x509', '-inform', 'DER', '-in', file])
  if (asX509.code === 0) return extractPemBlocks(asX509.out)

  // DER : un bundle PKCS#7
  const asP7 = await ssl.run(['pkcs7', '-inform', 'DER', '-in', file, '-print_certs'])
  if (asP7.code === 0) return extractPemBlocks(asP7.out)

  return null
}

/** Ne garde que les blocs CERTIFICATE : openssl intercale sujet/emetteur en clair. */
export function extractPemBlocks(text: string): string {
  const out: string[] = []
  let buf: string[] | null = null
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (t === BEGIN_CERT) buf = [t]
    else if (buf) {
      buf.push(t)
      if (t === END_CERT) {
        out.push(buf.join('\n'))
        buf = null
      }
    }
  }
  return out.join('\n')
}

/** Eclate un flux PEM en certificats individuels, chacun complet et autonome. */
export function splitPem(pem: string): string[] {
  const blocks = extractPemBlocks(pem)
  if (!blocks) return []
  return blocks
    .split(END_CERT)
    .map((b) => b.trim())
    .filter((b) => b.includes(BEGIN_CERT))
    .map((b) => b + '\n' + END_CERT + '\n')
}

// ---------------------------------------------------------------------------
// Cles publiques : identite et comparaison
// ---------------------------------------------------------------------------

/** Forme canonique SPKI/PEM d'une cle publique, comparable caractere a caractere. */
function canonical(key: KeyObject): string {
  return key.export({ type: 'spki', format: 'pem' }).toString().trim()
}

export function publicKeyOfCert(certPem: string): string {
  return canonical(createPublicKey(certPem))
}

export function publicKeyOfPrivateKey(pem: string, passphrase?: string): string {
  const priv = createPrivateKey(passphrase ? { key: pem, passphrase } : pem)
  return canonical(createPublicKey(priv))
}

export async function publicKeyOfCsr(ssl: Openssl, csrPath: string): Promise<string | null> {
  const r = await ssl.run(['req', '-in', csrPath, '-noout', '-pubkey'])
  if (r.code !== 0 || !r.out) return null
  try {
    return canonical(createPublicKey(r.out))
  } catch {
    return null
  }
}

/** true si le PEM est une cle privee chiffree (mot de passe requis pour la lire). */
export function isEncryptedKey(pem: string): boolean {
  return pem.includes('ENCRYPTED') || pem.includes('Proc-Type: 4,ENCRYPTED')
}

/** "RSA 2048 bits" / "EC prime256v1" - lu depuis la cle, pas depuis nos metadonnees. */
export function describeKey(key: KeyObject): string {
  const d = key.asymmetricKeyDetails
  if (key.asymmetricKeyType === 'rsa') return 'RSA ' + (d?.modulusLength ?? '?') + ' bits'
  if (key.asymmetricKeyType === 'ec') return 'EC ' + (d?.namedCurve ?? '?')
  return (key.asymmetricKeyType ?? 'inconnu').toUpperCase()
}

// ---------------------------------------------------------------------------
// Inspection
// ---------------------------------------------------------------------------

/** Champs simples : une seule invocation d'openssl pour tout le bloc. */
export async function inspectCert(ssl: Openssl, certPem: string): Promise<CertInfo> {
  const base = await ssl.must(
    [
      'x509', '-noout', '-nameopt', 'RFC2253',
      '-subject', '-issuer', '-serial', '-startdate', '-enddate',
      '-fingerprint', '-sha256',
    ],
    { input: certPem },
  )

  const lines = base.out.split(/\r?\n/)
  const field = (name: string): string => {
    const lower = name.toLowerCase() + '='
    const line = lines.find((l) => l.trim().toLowerCase().startsWith(lower))
    return line ? line.slice(line.indexOf('=') + 1).trim() : ''
  }

  const subject = field('subject')
  const issuer = field('issuer')
  const notAfter = field('notAfter')

  const sans = await readExtension(ssl, certPem, 'subjectAltName')
  const eku = await readExtension(ssl, certPem, 'extendedKeyUsage')

  let keyDesc = 'inconnu'
  try {
    keyDesc = describeKey(createPublicKey(certPem))
  } catch {
    /* certificat exotique : on n'echoue pas pour si peu */
  }

  const end = parseOpensslDate(notAfter)
  const daysRemaining = end ? Math.floor((end.getTime() - Date.now()) / 86_400_000) : 0

  return {
    subject,
    issuer,
    serial: field('serial'),
    notBefore: field('notBefore'),
    notAfter,
    sans,
    eku,
    fingerprint: field('sha256 Fingerprint'),
    keyDesc,
    selfSigned: subject !== '' && subject === issuer,
    daysRemaining,
  }
}

/**
 * openssl imprime les types de SAN avec ses propres libelles, qui ne sont pas
 * ceux qu'on ecrit dans une demande : "IP Address:" la ou une CSR dit "IP:",
 * "Registered ID:" la ou elle dit "RID:". Sans cette table, comparer les SAN
 * demandes a ceux delivres declare manquant tout ce qui n'est pas un nom DNS.
 */
const SAN_LABELS: Array<[RegExp, string]> = [
  [/^IP ?Address:/i, 'IP:'],
  [/^Registered ?ID:/i, 'RID:'],
  [/^othername:/i, 'otherName:'],
  [/^email(?:Address)?:/i, 'email:'],
  [/^URI:/i, 'URI:'],
  [/^DNS:/i, 'DNS:'],
]

/** "IP Address:10.0.0.1" -> "IP:10.0.0.1". Type inconnu : rendu tel quel. */
export function normalizeSan(entry: string): string {
  for (const [pattern, prefix] of SAN_LABELS) {
    if (pattern.test(entry)) return entry.replace(pattern, prefix)
  }
  return entry
}

/** Une extension, eclatee en valeurs. Absente => tableau vide, jamais d'erreur. */
async function readExtension(ssl: Openssl, certPem: string, ext: string): Promise<string[]> {
  const r = await ssl.run(['x509', '-noout', '-ext', ext], { input: certPem })
  if (r.code !== 0) return []
  const values = r.out
    .split(/\r?\n/)
    .slice(1) // la 1re ligne repete le nom de l'extension
    .join(',')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return ext === 'subjectAltName' ? values.map(normalizeSan) : values
}

/** "Sep  7 10:18:00 2026 GMT" -> Date. Null si illisible. */
export function parseOpensslDate(s: string): Date | null {
  if (!s) return null
  const d = new Date(s.replace(/\s+/g, ' '))
  return Number.isNaN(d.getTime()) ? null : d
}

// ---------------------------------------------------------------------------
// Chaine de confiance
// ---------------------------------------------------------------------------

export interface Held {
  pem: string
  info: CertInfo
}

/** Deduplique par empreinte SHA-256 : les retours PKI se recouvrent largement. */
export function dedupe(certs: Held[]): Held[] {
  const seen = new Set<string>()
  const out: Held[] = []
  for (const c of certs) {
    const fp = c.info.fingerprint
    if (fp && seen.has(fp)) continue
    if (fp) seen.add(fp)
    out.push(c)
  }
  return out
}

export interface ChainResult {
  chain: Held[]
  unused: Held[]
  /** Emetteur manquant au sommet de la chaine, s'il en manque un. */
  missingIssuer: string | null
}

/**
 * Remonte de la feuille vers la racine en appariant emetteur -> sujet.
 * S'arrete sur un certificat auto-signe, ou des qu'aucun emetteur ne repond.
 */
export function buildChain(leaf: Held, pool: Held[], noRoot: boolean): ChainResult {
  const chain: Held[] = []
  const used = new Set<Held>([leaf])
  let current = leaf

  for (;;) {
    if (current.info.selfSigned) break
    const next = pool.find((c) => !used.has(c) && c.info.subject === current.info.issuer)
    if (!next) break
    if (noRoot && next.info.selfSigned) break
    chain.push(next)
    used.add(next)
    current = next
  }

  const top = chain.length > 0 ? chain[chain.length - 1]! : leaf
  const missingIssuer = !noRoot && !top.info.selfSigned ? top.info.issuer : null

  return { chain, unused: pool.filter((c) => !used.has(c)), missingIssuer }
}
