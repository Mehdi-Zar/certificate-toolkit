/**
 * Etape 1 : cle privee + CSR.
 *
 * Le fichier de configuration est construit ici de bout en bout, a partir de
 * la demande. Meme arborescence et memes noms de fichiers que generate-csr.sh,
 * pour que la CLI et la GUI restent interchangeables sur un dossier donne.
 *
 * Les messages destines a l'utilisateur passent tous par le traducteur recu
 * en parametre : un avertissement arrive au renderer deja dans sa langue.
 */
import { createPrivateKey, createPublicKey } from 'node:crypto'
import { mkdir, readFile, writeFile, chmod, access } from 'node:fs/promises'
import { join } from 'node:path'
import type { Translate } from '../shared/i18n/index.ts'
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

const PATH_SEPARATOR = /[/\\]/
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHAR = /[\x00-\x1f<>:"|?*]/
const ALLOWED_NAME = /^[A-Za-z0-9._*-]+$/

/**
 * Le nom de la demande devient un nom de dossier : il ne doit pouvoir designer
 * que lui-meme. Tout separateur, tout ".." et tout caractere de controle est
 * refuse. Le CN, lui, reste libre : il peut contenir des espaces.
 */
export function assertSafeName(name: string, t: Translate): void {
  if (!name) throw new Error(t('err.nameRequired'))
  if (name.length > 200) throw new Error(t('err.nameTooLong'))
  if (PATH_SEPARATOR.test(name)) throw new Error(t('err.nameSeparator'))
  if (name === '.' || name === '..' || name.includes('..')) throw new Error(t('err.nameInvalid'))
  if (FORBIDDEN_CHAR.test(name)) throw new Error(t('err.nameControlChar'))
  if (!ALLOWED_NAME.test(name)) throw new Error(t('err.nameCharset'))
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
function safe(t: Translate, label: string, value: string): string {
  if (/[\r\n]/.test(value)) throw new Error(t('warn.newline', { field: label }))
  return value.trim()
}

/** Emet un attribut de DN, avec prefixe numerote s'il est repete. */
function dnLines(t: Translate, key: string, values: string[], label: string): string[] {
  const kept = values.map((v) => safe(t, label, v)).filter(Boolean)
  if (kept.length === 0) return []
  if (kept.length === 1) return [key + ' = ' + kept[0]]
  return kept.map((v, i) => i + 1 + '.' + key + ' = ' + v)
}

function renderSubject(s: Subject, t: Translate): string[] {
  const lines: string[] = []
  lines.push(...dnLines(t, 'countryName', [s.country], t('field.country')))
  lines.push(...dnLines(t, 'stateOrProvinceName', [s.state], t('field.state')))
  lines.push(...dnLines(t, 'localityName', [s.locality], t('field.locality')))
  lines.push(...dnLines(t, 'streetAddress', [s.street], t('field.street')))
  lines.push(...dnLines(t, 'postalCode', [s.postalCode], t('field.postalCode')))
  lines.push(...dnLines(t, 'organizationName', [s.org], t('field.org')))
  lines.push(...dnLines(t, 'organizationalUnitName', s.ous, t('field.ous')))
  lines.push(...dnLines(t, 'title', [s.title], t('field.title')))
  lines.push(...dnLines(t, 'givenName', [s.givenName], t('field.givenName')))
  lines.push(...dnLines(t, 'surname', [s.surname], t('field.surname')))
  // Le CN est le seul champ obligatoire.
  lines.push('commonName = ' + safe(t, t('tpl.custom.cn'), s.commonName))
  lines.push(...dnLines(t, 'emailAddress', [s.email], t('field.email')))
  lines.push(...dnLines(t, 'serialNumber', [s.serialNumber], t('field.serialNumber')))
  lines.push(...dnLines(t, 'businessCategory', [s.businessCategory], t('field.businessCategory')))
  lines.push(...dnLines(t, 'domainComponent', s.domainComponents, t('field.dc')))
  lines.push(...dnLines(t, 'UID', [s.uid], t('field.uid')))
  return lines
}

function renderExtensions(ext: Extensions, hasSans: boolean, t: Translate): string[] {
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
    const purposes = ext.extendedKeyUsage.purposes.map((p) => safe(t, t('new.ekuTitle'), p))
    lines.push(
      'extendedKeyUsage = ' +
        (ext.extendedKeyUsage.critical ? 'critical, ' : '') +
        purposes.join(', '),
    )
  }

  if (ext.subjectKeyIdentifier) lines.push('subjectKeyIdentifier = hash')
  if (ext.mustStaple) lines.push('tlsfeature = status_request')

  if (ext.certificatePolicies.length > 0) {
    lines.push(
      'certificatePolicies = ' +
        ext.certificatePolicies
          .map((p) => safe(t, t('field.policies'), p))
          .filter(Boolean)
          .join(', '),
    )
  }

  if (ext.crlDistributionPoints.length > 0) {
    lines.push(
      'crlDistributionPoints = ' +
        ext.crlDistributionPoints
          .map((u) => 'URI:' + safe(t, t('field.crl'), u))
          .filter((v) => v !== 'URI:')
          .join(', '),
    )
  }

  const aia = [
    ...ext.authorityInfoAccess.ocsp.map((u) => 'OCSP;URI:' + safe(t, t('field.ocsp'), u)),
    ...ext.authorityInfoAccess.caIssuers.map(
      (u) => 'caIssuers;URI:' + safe(t, t('field.caIssuers'), u),
    ),
  ].filter((v) => !v.endsWith(':'))
  if (aia.length > 0) lines.push('authorityInfoAccess = ' + aia.join(', '))

  for (const c of ext.custom) {
    const name = safe(t, t('new.customExtTitle'), c.name)
    const value = safe(t, t('new.customExtTitle'), c.value)
    if (!name || !value) continue
    lines.push(name + ' = ' + (c.critical ? 'critical, ' : '') + value)
  }

  return lines
}

/** Les algorithmes a signature implicite refusent qu'on leur impose une empreinte. */
const IMPLICIT_DIGEST = new Set(['ed25519', 'ed448', 'ml-dsa'])

export function renderConfig(req: CsrRequest, sans: San[], t: Translate): string {
  const out: string[] = ['[ req ]']
  if (!IMPLICIT_DIGEST.has(req.key.algorithm)) out.push('default_md = ' + req.digest)
  out.push('prompt = no')
  out.push('string_mask = ' + req.stringMask)
  out.push('distinguished_name = req_distinguished_name')
  out.push('req_extensions = req_ext')

  const attrs: string[] = []
  if (req.attributes.challengePassword.trim()) {
    attrs.push(
      'challengePassword = ' +
        safe(t, t('field.challengePassword'), req.attributes.challengePassword),
    )
  }
  if (req.attributes.unstructuredName.trim()) {
    attrs.push(
      'unstructuredName = ' + safe(t, t('field.unstructuredName'), req.attributes.unstructuredName),
    )
  }
  if (attrs.length > 0) out.push('attributes = req_attributes')

  out.push('', '[ req_distinguished_name ]', ...renderSubject(req.subject, t))

  if (attrs.length > 0) out.push('', '[ req_attributes ]', ...attrs)

  out.push('', '[ req_ext ]', ...renderExtensions(req.extensions, sans.length > 0, t))

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

export function pathsFor(rootDir: string, name: string, t: Translate): Paths {
  assertSafeName(name, t)
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

export function validate(req: CsrRequest, t: Translate): Warning[] {
  const w: Warning[] = []
  const template = getTemplate(req.templateId)
  const sans = buildSanList(req)
  const eku = req.extensions.extendedKeyUsage
  const ku = req.extensions.keyUsage

  // --- bloquants ---------------------------------------------------------
  if (!req.subject.commonName.trim()) {
    w.push({
      level: 'error',
      field: 'commonName',
      message: t('warn.cnRequired', { field: t(template.cnKey).toLowerCase() }),
    })
  }
  try {
    assertSafeName(req.name, t)
  } catch (err) {
    w.push({
      level: 'error',
      field: 'name',
      message: err instanceof Error ? err.message : String(err),
    })
  }
  if (template.sanRequired && sans.length === 0) {
    w.push({
      level: 'error',
      field: 'sans',
      message: t('warn.sanRequired', { hint: t(template.sanHintKey) }),
    })
  }
  if ((req.key.algorithm === 'rsa' || req.key.algorithm === 'rsa-pss') && req.key.bits < 2048) {
    w.push({ level: 'error', field: 'key', message: t('warn.rsaTooSmall') })
  }
  if (req.key.encrypt && !req.key.passphrase) {
    w.push({ level: 'error', field: 'passphrase', message: t('warn.passphraseEmpty') })
  }
  if (req.subject.country.trim() && req.subject.country.trim().length !== 2) {
    w.push({ level: 'error', field: 'country', message: t('warn.countryFormat') })
  }

  // --- avertissements ----------------------------------------------------
  if (template.id === 'tls-public') {
    if (eku.purposes.includes('clientAuth')) {
      w.push({ level: 'warn', field: 'eku', message: t('warn.dualEku') })
    }
    if (sans.some((s) => s.type === 'IP')) {
      w.push({ level: 'warn', field: 'sans', message: t('warn.publicIp') })
    }
    const internal = sans.filter(
      (s) =>
        s.type === 'DNS' &&
        (!s.value.includes('.') || /\.(local|internal|lan|home|corp|intranet)$/i.test(s.value)),
    )
    if (internal.length > 0) {
      w.push({
        level: 'warn',
        field: 'sans',
        message: t('warn.internalName', { names: internal.map((s) => s.value).join(', ') }),
      })
    }
  }

  for (const wc of sans.filter((s) => s.type === 'DNS' && s.value.includes('*'))) {
    if (!wc.value.startsWith('*.') || wc.value.slice(2).includes('*')) {
      w.push({ level: 'warn', field: 'sans', message: t('warn.badWildcard', { name: wc.value }) })
    }
  }

  if (ku.include && ku.bits.length === 0) {
    w.push({ level: 'warn', field: 'keyUsage', message: t('warn.noKeyUsage') })
  }
  if (req.key.algorithm === 'ec' && ku.bits.includes('keyEncipherment')) {
    w.push({ level: 'warn', field: 'keyUsage', message: t('warn.ecKeyEncipherment') })
  }
  if (req.extensions.basicConstraints.ca && !ku.bits.includes('keyCertSign')) {
    w.push({ level: 'warn', field: 'keyUsage', message: t('warn.caNoKeyCertSign') })
  }
  if (!req.extensions.basicConstraints.ca && ku.bits.includes('keyCertSign')) {
    w.push({ level: 'warn', field: 'keyUsage', message: t('warn.keyCertSignNoCa') })
  }
  if (eku.purposes.includes('anyExtendedKeyUsage') && eku.purposes.length > 1) {
    w.push({ level: 'warn', field: 'eku', message: t('warn.anyEku') })
  }
  if (template.id === 'code-signing' && req.key.algorithm === 'rsa' && req.key.bits < 3072) {
    w.push({ level: 'warn', field: 'key', message: t('warn.codeSigningBits') })
  }
  if (req.extensions.mustStaple) {
    w.push({ level: 'info', message: t('warn.mustStaple') })
  }
  if (req.key.algorithm === 'ml-dsa') {
    w.push({ level: 'info', field: 'key', message: t('warn.mldsa') })
  }
  if (req.key.algorithm === 'ed25519' || req.key.algorithm === 'ed448') {
    w.push({ level: 'info', field: 'key', message: t('warn.eddsa') })
  }
  if (!req.key.encrypt && req.extensions.basicConstraints.ca) {
    w.push({ level: 'warn', field: 'passphrase', message: t('warn.caUnencrypted') })
  }

  return w
}

// ---------------------------------------------------------------------------
// Apercu : la meme configuration, sans rien ecrire
// ---------------------------------------------------------------------------

export function preview(req: CsrRequest, t: Translate): CsrPreview {
  const sans = buildSanList(req)
  const warnings = validate(req, t)
  let config: string
  try {
    config = renderConfig(req, sans, t)
  } catch (err) {
    config = ''
    warnings.unshift({
      level: 'error',
      message: err instanceof Error ? err.message : String(err),
    })
  }

  const name = req.name || 'demande'
  const cmd = [
    'openssl req -new',
    '-key ' + name + '.key.pem',
    '-out ' + name + '.csr',
    '-config ' + name + '-req.cnf',
    '-extensions req_ext',
  ].join(' ')

  const keygen = 'openssl ' + keygenArgs(req, name + '.key.pem').join(' ')
  return { config, command: keygen + '\n' + cmd, warnings }
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
  t: Translate,
): Promise<CsrResult> {
  const blocking = validate(req, t).filter((v) => v.level === 'error')
  if (blocking.length > 0) throw new Error(blocking.map((b) => b.message).join('\n'))

  const p = pathsFor(rootDir, req.name, t)

  if (!req.force && (await exists(p.key))) {
    throw new Error(t('err.keyExists', { name: req.name }))
  }
  if (req.key.algorithm === 'rsa' && ![2048, 3072, 4096, 8192].includes(req.key.bits)) {
    throw new Error(t('err.rsaBits', { bits: req.key.bits }))
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
  await writeFile(p.cnf, renderConfig(req, sans, t), 'utf8')

  // 3. CSR
  const reqArgs = [
    'req', '-new', '-key', p.key, '-out', p.csr, '-config', p.cnf, '-extensions', 'req_ext',
  ]
  if (req.key.encrypt) reqArgs.push('-passin', 'env:' + KEY_PASS_ENV)
  await ssl.must(reqArgs, env ? { env } : {})

  if (!(await ssl.ok(['req', '-in', p.csr, '-noout', '-verify']))) {
    throw new Error(t('err.csrVerify'))
  }

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

const META_KEYS = [
  'FQDN', 'KEY', 'CSR', 'CNF', 'SIGNED_DIR', 'KEYDESC', 'SANS', 'TEMPLATE', 'CN', 'ENCRYPTED',
] as const
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
