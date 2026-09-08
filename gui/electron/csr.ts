/**
 * Etape 1 : cle privee + CSR.
 *
 * Le fichier de configuration est construit ici de bout en bout, a partir de
 * la demande. Meme arborescence et memes noms de fichiers que generate-csr.sh,
 * pour que la CLI et la GUI restent interchangeables sur un dossier donne.
 */
import { createPrivateKey, createPublicKey } from 'node:crypto'
import { mkdir, readFile, writeFile, chmod, access } from 'node:fs/promises'
import { join } from 'node:path'
import { getTemplate } from '../shared/templates.ts'
import type {
  CsrPreview,
  CsrRequest,
  CsrResult,
  Extensions,
  San,
  SanType,
  Subject,
  Warning,
} from '../shared/types.ts'
import { describeKey } from './certs.ts'
import type { Openssl } from './openssl.ts'

const KEY_PASS_ENV = 'CERTTK_NEW_KEY_PASS'

// ---------------------------------------------------------------------------
// Validation du nom de dossier
// ---------------------------------------------------------------------------

/**
 * Le nom de la demande devient un nom de dossier : il ne doit pouvoir designer
 * que lui-meme. Tout separateur, tout ".." et tout caractere de controle est
 * refuse. Le CN, lui, reste libre — il peut contenir des espaces.
 */
export function assertSafeName(name: string): void {
  if (!name) throw new Error('Le nom de la demande est obligatoire.')
  if (name.length > 200) throw new Error('Nom trop long (200 caracteres au maximum).')
  if (/[/\\]/.test(name)) throw new Error('Le nom ne peut pas contenir de separateur de chemin.')
  if (name === '.' || name === '..' || name.includes('..')) throw new Error('Nom invalide.')
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f<>:"|?*]/.test(name)) {
    throw new Error('Le nom contient un caractere interdit dans un nom de dossier.')
  }
  if (!/^[A-Za-z0-9._*-]+$/.test(name)) {
    throw new Error('Nom invalide : lettres, chiffres, point, tiret, souligne et * uniquement.')
  }
}

/** Derive un nom de dossier utilisable a partir d'un CN quelconque. */
export function slugify(cn: string): string {
  return (
    cn
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9._*-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200) || 'demande'
  )
}

// ---------------------------------------------------------------------------
// SAN
// ---------------------------------------------------------------------------

const UPN_OID = '1.3.6.1.4.1.311.20.2.3'

/** Devine le type d'un SAN saisi librement ("10.0.0.1" -> IP, "a@b.fr" -> email). */
export function guessSan(raw: string): San {
  const value = raw.trim()
  const colon = value.indexOf(':')
  if (colon > 0) {
    const prefix = value.slice(0, colon).toLowerCase()
    const known: Record<string, SanType> = {
      dns: 'DNS', ip: 'IP', email: 'email', uri: 'URI', rid: 'RID', upn: 'UPN',
    }
    const type = known[prefix]
    if (type) return { type, value: value.slice(colon + 1) }
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return { type: 'IP', value }
  if (/^[0-9A-Fa-f:]+$/.test(value) && value.includes(':')) return { type: 'IP', value }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return { type: 'URI', value }
  if (/^\d+(\.\d+)+$/.test(value)) return { type: 'RID', value }
  if (value.includes('@')) return { type: 'email', value }
  return { type: 'DNS', value }
}

/** Le CN d'abord si le modele le demande, puis les extras, dedoublonnes. */
export function buildSanList(req: CsrRequest): San[] {
  const template = getTemplate(req.templateId)
  const out: San[] = []
  const push = (san: San) => {
    const value = san.value.trim()
    if (!value) return
    if (out.some((e) => e.type === san.type && e.value === value)) return
    out.push({ ...san, value })
  }
  if (template.cnAsSan && req.subject.commonName.trim()) {
    push(guessSan(req.subject.commonName))
  }
  for (const san of req.sans) push(san)
  return out
}

/** Representation lisible : "DNS:exemple.fr", "UPN:jdupont@exemple.local". */
export const formatSan = (s: San): string => s.type + ':' + s.value

/** Le bloc [alt_names] du fichier de configuration. */
function renderAltNames(sans: San[]): string {
  const counters = new Map<string, number>()
  const lines: string[] = []
  for (const san of sans) {
    // UPN et otherName partagent la meme numerotation : ils produisent tous
    // deux des entrees "otherName.N".
    const key = san.type === 'UPN' ? 'otherName' : san.type
    const n = (counters.get(key) ?? 0) + 1
    counters.set(key, n)

    if (san.type === 'UPN') {
      lines.push('otherName.' + n + ' = msUPN;UTF8:' + san.value)
    } else if (san.type === 'otherName') {
      const oid = (san.oid ?? '').trim() || UPN_OID
      lines.push('otherName.' + n + ' = ' + oid + ';UTF8:' + san.value)
    } else {
      lines.push(san.type + '.' + n + ' = ' + san.value)
    }
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Fichier de configuration OpenSSL
// ---------------------------------------------------------------------------

/**
 * Les valeurs sont ecrites telles quelles dans un fichier lu par openssl :
 * un retour a la ligne y injecterait une directive. On les refuse partout.
 */
function safe(label: string, value: string): string {
  if (/[\r\n]/.test(value)) {
    throw new Error('Le champ « ' + label + ' » ne peut pas contenir de retour a la ligne.')
  }
  return value.trim()
}

/** Emet un attribut de DN, avec prefixe numerote s'il est repete. */
function dnLines(key: string, values: string[], label: string): string[] {
  const kept = values.map((v) => safe(label, v)).filter(Boolean)
  if (kept.length === 0) return []
  if (kept.length === 1) return [key + ' = ' + kept[0]]
  return kept.map((v, i) => i + 1 + '.' + key + ' = ' + v)
}

function renderSubject(s: Subject): string[] {
  const lines: string[] = []
  lines.push(...dnLines('countryName', [s.country], 'Pays'))
  lines.push(...dnLines('stateOrProvinceName', [s.state], 'Region'))
  lines.push(...dnLines('localityName', [s.locality], 'Ville'))
  lines.push(...dnLines('streetAddress', [s.street], 'Rue'))
  lines.push(...dnLines('postalCode', [s.postalCode], 'Code postal'))
  lines.push(...dnLines('organizationName', [s.org], 'Organisation'))
  lines.push(...dnLines('organizationalUnitName', s.ous, 'Unite'))
  lines.push(...dnLines('title', [s.title], 'Fonction'))
  lines.push(...dnLines('givenName', [s.givenName], 'Prenom'))
  lines.push(...dnLines('surname', [s.surname], 'Nom'))
  // Le CN est le seul champ obligatoire.
  lines.push('commonName = ' + safe('Common Name', s.commonName))
  lines.push(...dnLines('emailAddress', [s.email], 'Email'))
  lines.push(...dnLines('serialNumber', [s.serialNumber], 'Numero de serie'))
  lines.push(...dnLines('businessCategory', [s.businessCategory], 'Categorie'))
  lines.push(...dnLines('domainComponent', s.domainComponents, 'Composant de domaine'))
  lines.push(...dnLines('UID', [s.uid], 'UID'))
  return lines
}

function renderExtensions(ext: Extensions, hasSans: boolean): string[] {
  const lines: string[] = []
  if (hasSans) lines.push('subjectAltName = @alt_names')

  if (ext.basicConstraints.include) {
    const parts = ['CA:' + (ext.basicConstraints.ca ? 'TRUE' : 'FALSE')]
    if (ext.basicConstraints.ca && ext.basicConstraints.pathLen !== null) {
      parts.push('pathlen:' + ext.basicConstraints.pathLen)
    }
    lines.push(
      'basicConstraints = ' + (ext.basicConstraints.critical ? 'critical, ' : '') + parts.join(', '),
    )
  }

  if (ext.keyUsage.include && ext.keyUsage.bits.length > 0) {
    lines.push(
      'keyUsage = ' + (ext.keyUsage.critical ? 'critical, ' : '') + ext.keyUsage.bits.join(', '),
    )
  }

  if (ext.extendedKeyUsage.include && ext.extendedKeyUsage.purposes.length > 0) {
    const purposes = ext.extendedKeyUsage.purposes.map((p) => safe('Usage etendu', p))
    lines.push(
      'extendedKeyUsage = ' + (ext.extendedKeyUsage.critical ? 'critical, ' : '') + purposes.join(', '),
    )
  }

  if (ext.subjectKeyIdentifier) lines.push('subjectKeyIdentifier = hash')
  if (ext.mustStaple) lines.push('tlsfeature = status_request')

  if (ext.certificatePolicies.length > 0) {
    lines.push(
      'certificatePolicies = ' +
        ext.certificatePolicies.map((p) => safe('Politique', p)).filter(Boolean).join(', '),
    )
  }

  if (ext.crlDistributionPoints.length > 0) {
    lines.push(
      'crlDistributionPoints = ' +
        ext.crlDistributionPoints.map((u) => 'URI:' + safe('Point de distribution', u)).filter(Boolean).join(', '),
    )
  }

  const aia = [
    ...ext.authorityInfoAccess.ocsp.map((u) => 'OCSP;URI:' + safe('OCSP', u)),
    ...ext.authorityInfoAccess.caIssuers.map((u) => 'caIssuers;URI:' + safe('caIssuers', u)),
  ].filter((v) => !v.endsWith(':'))
  if (aia.length > 0) lines.push('authorityInfoAccess = ' + aia.join(', '))

  for (const c of ext.custom) {
    const name = safe('Nom d’extension', c.name)
    const value = safe('Valeur d’extension', c.value)
    if (!name || !value) continue
    lines.push(name + ' = ' + (c.critical ? 'critical, ' : '') + value)
  }

  return lines
}

/** Les algorithmes a signature implicite refusent qu'on leur impose une empreinte. */
const IMPLICIT_DIGEST = new Set(['ed25519', 'ed448', 'ml-dsa'])

export function renderConfig(req: CsrRequest, sans: San[]): string {
  const out: string[] = ['[ req ]']
  if (!IMPLICIT_DIGEST.has(req.key.algorithm)) out.push('default_md = ' + req.digest)
  out.push('prompt = no')
  out.push('string_mask = ' + req.stringMask)
  out.push('distinguished_name = req_distinguished_name')
  out.push('req_extensions = req_ext')

  const attrs: string[] = []
  if (req.attributes.challengePassword.trim()) {
    attrs.push('challengePassword = ' + safe('Challenge password', req.attributes.challengePassword))
  }
  if (req.attributes.unstructuredName.trim()) {
    attrs.push('unstructuredName = ' + safe('Nom non structure', req.attributes.unstructuredName))
  }
  if (attrs.length > 0) out.push('attributes = req_attributes')

  out.push('', '[ req_distinguished_name ]', ...renderSubject(req.subject))

  if (attrs.length > 0) out.push('', '[ req_attributes ]', ...attrs)

  out.push('', '[ req_ext ]', ...renderExtensions(req.extensions, sans.length > 0))

  if (sans.length > 0) out.push('', '[ alt_names ]', renderAltNames(sans))

  return out.join('\n') + '\n'
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

export function pathsFor(rootDir: string, name: string): Paths {
  assertSafeName(name)
  const dir = join(rootDir, name)
  return {
    dir,
    key: join(dir, name + '.key.pem'),
    cnf: join(dir, name + '-req.cnf'),
    csr: join(dir, name + '.csr'),
    meta: join(dir, name + '.meta'),
    signed: join(dir, 'Signed'),
    pfx: join(dir, name + '.pfx'),
  }
}

const exists = (p: string): Promise<boolean> =>
  access(p).then(
    () => true,
    () => false,
  )

// ---------------------------------------------------------------------------
// Controles de coherence
//
// Ce sont eux qui rendent l'outil utilisable sans connaitre X.509 : plutot que
// de laisser openssl produire une CSR que la PKI refusera, on explique le
// probleme dans les termes du modele choisi.
// ---------------------------------------------------------------------------

export function validate(req: CsrRequest): Warning[] {
  const w: Warning[] = []
  const t = getTemplate(req.templateId)
  const sans = buildSanList(req)
  const eku = req.extensions.extendedKeyUsage
  const ku = req.extensions.keyUsage

  // --- bloquants ---------------------------------------------------------
  if (!req.subject.commonName.trim()) {
    w.push({ level: 'error', field: 'commonName', message: 'Le ' + t.commonNameLabel.toLowerCase() + ' est obligatoire.' })
  }
  try {
    assertSafeName(req.name)
  } catch (err) {
    w.push({ level: 'error', field: 'name', message: err instanceof Error ? err.message : String(err) })
  }
  if (t.sanRequired && sans.length === 0) {
    w.push({ level: 'error', field: 'sans', message: 'Ce modele exige au moins un nom alternatif. ' + t.sanHint })
  }
  if (req.key.algorithm === 'rsa' || req.key.algorithm === 'rsa-pss') {
    if (req.key.bits < 2048) {
      w.push({ level: 'error', field: 'key', message: 'Une cle RSA de moins de 2048 bits est refusee partout depuis 2014.' })
    }
  }
  if (req.key.encrypt && !req.key.passphrase) {
    w.push({ level: 'error', field: 'passphrase', message: 'Le chiffrement de la cle est demande mais la phrase secrete est vide.' })
  }
  if (req.subject.country.trim() && req.subject.country.trim().length !== 2) {
    w.push({ level: 'error', field: 'country', message: 'Le pays doit etre un code a deux lettres (FR, BE, CH...).' })
  }

  // --- avertissements ----------------------------------------------------
  if (t.id === 'tls-public') {
    if (eku.purposes.includes('clientAuth')) {
      w.push({
        level: 'warn',
        field: 'eku',
        message:
          'Un certificat TLS public ne peut plus porter clientAuth en plus de serverAuth depuis juin 2026. Une autorite publique refusera cette demande.',
      })
    }
    if (sans.some((s) => s.type === 'IP')) {
      w.push({ level: 'warn', field: 'sans', message: 'Une adresse IP en SAN n’est delivree que par de rares autorites publiques.' })
    }
    const internal = sans.filter(
      (s) => s.type === 'DNS' && (!s.value.includes('.') || /\.(local|internal|lan|home|corp|intranet)$/i.test(s.value)),
    )
    if (internal.length > 0) {
      w.push({
        level: 'warn',
        field: 'sans',
        message: 'Nom non public : ' + internal.map((s) => s.value).join(', ') + '. Utilisez plutot le modele « Serveur interne ».',
      })
    }
  }

  const wildcards = sans.filter((s) => s.type === 'DNS' && s.value.includes('*'))
  for (const wc of wildcards) {
    if (!wc.value.startsWith('*.') || wc.value.slice(2).includes('*')) {
      w.push({ level: 'warn', field: 'sans', message: 'Joker mal forme : ' + wc.value + '. Seule la forme *.exemple.fr est acceptee.' })
    }
  }

  if (ku.include && ku.bits.length === 0) {
    w.push({ level: 'warn', field: 'keyUsage', message: 'L’extension keyUsage est activee mais aucun usage n’est coche.' })
  }
  if (req.key.algorithm === 'ec' && ku.bits.includes('keyEncipherment')) {
    w.push({
      level: 'warn',
      field: 'keyUsage',
      message: 'keyEncipherment n’a pas de sens avec une cle EC : ECDHE negocie la cle, il ne la chiffre pas.',
    })
  }
  if (req.extensions.basicConstraints.ca && !ku.bits.includes('keyCertSign')) {
    w.push({ level: 'warn', field: 'keyUsage', message: 'CA:TRUE sans keyCertSign : cette autorite ne pourrait signer aucun certificat.' })
  }
  if (!req.extensions.basicConstraints.ca && ku.bits.includes('keyCertSign')) {
    w.push({ level: 'warn', field: 'keyUsage', message: 'keyCertSign sur un certificat qui n’est pas une CA : incoherent, et refuse par la plupart des PKI.' })
  }
  if (eku.purposes.includes('anyExtendedKeyUsage') && eku.purposes.length > 1) {
    w.push({ level: 'warn', field: 'eku', message: '« Tous usages » rend les autres usages inutiles.' })
  }
  if (t.id === 'code-signing' && req.key.algorithm === 'rsa' && req.key.bits < 3072) {
    w.push({ level: 'warn', field: 'key', message: 'Les autorites exigent 3072 bits au minimum pour la signature de code.' })
  }
  if (req.extensions.mustStaple) {
    w.push({
      level: 'info',
      message: 'Agrafage OCSP obligatoire : le serveur deviendra injoignable s’il n’agrafe pas de reponse.',
    })
  }
  if (req.key.algorithm === 'ml-dsa') {
    w.push({
      level: 'info',
      field: 'key',
      message: 'ML-DSA est post-quantique et normalise (FIPS 204), mais tres peu de PKI le signent aujourd’hui. Verifiez avant d’envoyer.',
    })
  }
  if (req.key.algorithm === 'ed25519' || req.key.algorithm === 'ed448') {
    w.push({
      level: 'info',
      field: 'key',
      message: 'Ed25519 et Ed448 restent mal supportes par les PKI d’entreprise et les equipements reseau.',
    })
  }
  if (!req.key.encrypt && req.extensions.basicConstraints.ca) {
    w.push({ level: 'warn', field: 'passphrase', message: 'Une cle d’autorite non chiffree sur le disque est un risque majeur.' })
  }

  return w
}

// ---------------------------------------------------------------------------
// Apercu : la meme configuration, sans rien ecrire
// ---------------------------------------------------------------------------

export function preview(req: CsrRequest): CsrPreview {
  const sans = buildSanList(req)
  let config: string
  const warnings = validate(req)
  try {
    config = renderConfig(req, sans)
  } catch (err) {
    config = ''
    warnings.unshift({ level: 'error', message: err instanceof Error ? err.message : String(err) })
  }

  const name = req.name || 'demande'
  const cmd = [
    'openssl req -new',
    '-key ' + name + '.key.pem',
    '-out ' + name + '.csr',
    '-config ' + name + '-req.cnf',
    '-extensions req_ext',
  ].join(' ')

  return { config, command: keygenCommand(req, name) + '\n' + cmd, warnings }
}

/** La commande de generation de cle, telle qu'on la taperait a la main. */
function keygenCommand(req: CsrRequest, name: string): string {
  const args = keygenArgs(req, name + '.key.pem')
  return 'openssl ' + args.join(' ')
}

function keygenArgs(req: CsrRequest, out: string): string[] {
  const k = req.key
  const args = ['genpkey']
  switch (k.algorithm) {
    case 'rsa':
      args.push('-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:' + k.bits)
      break
    case 'rsa-pss':
      args.push('-algorithm', 'RSA-PSS', '-pkeyopt', 'rsa_keygen_bits:' + k.bits)
      break
    case 'ec':
      args.push('-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:' + k.curve)
      break
    case 'ed25519':
      args.push('-algorithm', 'ED25519')
      break
    case 'ed448':
      args.push('-algorithm', 'ED448')
      break
    case 'ml-dsa':
      args.push('-algorithm', 'ML-DSA-' + k.mldsaLevel)
      break
  }
  if (k.encrypt) args.push('-aes-256-cbc', '-pass', 'env:' + KEY_PASS_ENV)
  args.push('-out', out)
  return args
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export async function generateCsr(
  ssl: Openssl,
  rootDir: string,
  req: CsrRequest,
): Promise<CsrResult> {
  const blocking = validate(req).filter((v) => v.level === 'error')
  if (blocking.length > 0) throw new Error(blocking.map((b) => b.message).join('\n'))

  const p = pathsFor(rootDir, req.name)

  if (!req.force && (await exists(p.key))) {
    throw new Error(
      'Une cle privee existe deja pour « ' + req.name + ' ».\n' +
        'Si une CSR est en cours de signature chez la PKI, la regenerer rendrait le certificat a venir inutilisable. ' +
        'Cochez « Ecraser la cle existante » pour passer outre.',
    )
  }

  const sans = buildSanList(req)

  await mkdir(p.dir, { recursive: true })
  await mkdir(p.signed, { recursive: true })

  // 1. Cle privee. La phrase secrete passe par l'environnement, jamais par argv.
  const env = req.key.encrypt ? { [KEY_PASS_ENV]: req.key.passphrase } : undefined
  await ssl.must(keygenArgs(req, p.key), env ? { env } : {})
  await chmod(p.key, 0o600).catch(() => {
    /* systemes de fichiers sans permissions POSIX */
  })

  const keyPem = await readFile(p.key, 'utf8')
  let keyDesc: string
  try {
    // Une cle chiffree doit d'abord etre dechiffree : createPublicKey ne prend
    // pas de phrase secrete, seul createPrivateKey le fait.
    const priv = createPrivateKey(
      req.key.encrypt ? { key: keyPem, passphrase: req.key.passphrase } : keyPem,
    )
    keyDesc = describeKey(createPublicKey(priv))
  } catch {
    // node:crypto ne connait pas encore ML-DSA : on decrit la cle nous-memes.
    keyDesc = describeRequestedKey(req)
  }

  // 2. Configuration
  await writeFile(p.cnf, renderConfig(req, sans), 'utf8')

  // 3. CSR
  const reqArgs = ['req', '-new', '-key', p.key, '-out', p.csr, '-config', p.cnf, '-extensions', 'req_ext']
  if (req.key.encrypt) reqArgs.push('-passin', 'env:' + KEY_PASS_ENV)
  await ssl.must(reqArgs, env ? { env } : {})

  const verifyArgs = ['req', '-in', p.csr, '-noout', '-verify']
  if (!(await ssl.ok(verifyArgs))) throw new Error('La CSR generee ne se verifie pas.')

  const subject = (
    await ssl.must(['req', '-in', p.csr, '-noout', '-subject', '-nameopt', 'RFC2253'])
  ).out
    .replace(/^subject=/, '')
    .trim()

  const text = (await ssl.must(['req', '-in', p.csr, '-noout', '-text'])).out

  // 4. Metadonnees, au format lu par make-pfx.sh
  const meta = [
    '# genere par Certificate Toolkit (GUI) le ' + new Date().toISOString(),
    'FQDN="' + req.name + '"',
    'KEY="' + p.key + '"',
    'CSR="' + p.csr + '"',
    'CNF="' + p.cnf + '"',
    'SIGNED_DIR="' + p.signed + '"',
    'KEYDESC="' + keyDesc + '"',
    'SANS="' + sans.map(formatSan).join(' ') + '"',
    'TEMPLATE="' + req.templateId + '"',
    'CN="' + req.subject.commonName.replace(/"/g, '') + '"',
    'ENCRYPTED="' + (req.key.encrypt ? '1' : '0') + '"',
    '',
  ].join('\n')
  await writeFile(p.meta, meta, 'utf8')

  return {
    name: req.name,
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
    text,
  }
}

function describeRequestedKey(req: CsrRequest): string {
  switch (req.key.algorithm) {
    case 'rsa':
      return 'RSA ' + req.key.bits + ' bits'
    case 'rsa-pss':
      return 'RSA-PSS ' + req.key.bits + ' bits'
    case 'ec':
      return 'EC ' + req.key.curve
    case 'ed25519':
      return 'Ed25519'
    case 'ed448':
      return 'Ed448'
    case 'ml-dsa':
      return 'ML-DSA-' + req.key.mldsaLevel
  }
}

// ---------------------------------------------------------------------------
// Relecture des metadonnees (jamais evaluees comme du code, contrairement a un
// "source" shell : le fichier est lu ligne a ligne).
// ---------------------------------------------------------------------------

const META_KEYS = ['FQDN', 'KEY', 'CSR', 'CNF', 'SIGNED_DIR', 'KEYDESC', 'SANS', 'TEMPLATE', 'CN', 'ENCRYPTED'] as const
export type Meta = Partial<Record<(typeof META_KEYS)[number], string>>

export function parseMeta(text: string): Meta {
  const meta: Meta = {}
  const pattern = new RegExp('^(' + META_KEYS.join('|') + ')=(.*)$')
  for (const line of text.split(/\r?\n/)) {
    const m = pattern.exec(line.trim())
    if (!m) continue
    meta[m[1] as keyof Meta] = m[2]!.replace(/^"|"$/g, '')
  }
  return meta
}
