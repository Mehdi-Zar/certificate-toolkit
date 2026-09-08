/**
 * Contrat partage entre le processus principal (Node/OpenSSL) et le renderer.
 * Aucune logique ici : uniquement les formes de donnees qui traversent l'IPC.
 */

// ---------------------------------------------------------------------------
// Reglages
// ---------------------------------------------------------------------------

export interface Settings {
  /** Racine ou vit un dossier par FQDN. Equivalent de $CERT_HOME dans la CLI. */
  rootDir: string
  /** Binaire openssl : "openssl" si dans le PATH, sinon chemin absolu. */
  opensslPath: string
  defaults: SubjectDefaults
}

export interface SubjectDefaults {
  country: string
  org: string
  ou: string
  email: string
}

// ---------------------------------------------------------------------------
// Demande de CSR
// ---------------------------------------------------------------------------

export type KeyType = 'rsa' | 'ec'
export type Curve = 'P-256' | 'P-384' | 'P-521'
export type Digest = 'sha256' | 'sha384' | 'sha512'
export type SanType = 'DNS' | 'IP' | 'email' | 'URI'

export interface San {
  type: SanType
  value: string
}

export interface CsrRequest {
  fqdn: string
  sans: San[]
  country: string
  org: string
  ou: string
  email: string
  keyType: KeyType
  bits: number
  curve: Curve
  digest: Digest
  /** Ecrase une cle privee existante. Rend inutilisable une CSR deja chez la PKI. */
  force: boolean
}

export interface CsrResult {
  fqdn: string
  dir: string
  keyPath: string
  csrPath: string
  cnfPath: string
  metaPath: string
  signedDir: string
  /** Le PEM de la CSR, pret a etre copie vers le portail de la PKI. */
  csrPem: string
  keyDesc: string
  subject: string
  sans: string[]
}

// ---------------------------------------------------------------------------
// Assemblage du PFX
// ---------------------------------------------------------------------------

export interface PfxRequest {
  fqdn: string
  /** Fichiers signes explicites. Vide => auto-detection dans <fqdn>/Signed/. */
  inputs: string[]
  /** Certificats de CA supplementaires (-C dans la CLI). */
  chainFiles: string[]
  friendlyName: string
  password: string
  noPass: boolean
  /** Chiffrement legacy 3DES/SHA1 : Windows < 2016, Java 8, vieux F5. */
  compat: boolean
  /** Ne pas embarquer la CA racine dans le conteneur. */
  noRoot: boolean
  /** Mot de passe de la cle privee, si elle est chiffree. */
  keyPassword: string
}

export interface PfxResult {
  pfxPath: string
  crtPath: string
  chainPath: string | null
  fullchainPath: string | null
  leaf: CertInfo
  chain: CertInfo[]
  unused: CertInfo[]
  checks: Check[]
  certCount: number
}

export type CheckLevel = 'ok' | 'warn' | 'info'

export interface Check {
  level: CheckLevel
  label: string
  detail?: string
}

// ---------------------------------------------------------------------------
// Lecture d'un certificat
// ---------------------------------------------------------------------------

export interface CertInfo {
  subject: string
  issuer: string
  serial: string
  notBefore: string
  notAfter: string
  sans: string[]
  eku: string[]
  fingerprint: string
  keyDesc: string
  /** true si sujet == emetteur. */
  selfSigned: boolean
  /** Negatif si deja expire. */
  daysRemaining: number
}

// ---------------------------------------------------------------------------
// Vue d'ensemble
// ---------------------------------------------------------------------------

export type EntryStatus =
  /** CSR generee, rien recu de la PKI. */
  | 'awaiting-pki'
  /** Des fichiers sont dans Signed/, le PFX n'est pas encore assemble. */
  | 'ready-to-assemble'
  /** PFX present. */
  | 'issued'
  /** PFX present mais le certificat est expire. */
  | 'expired'
  /** PFX present et expiration a moins de 30 jours. */
  | 'expiring'
  /** Dossier incomplet ou illisible. */
  | 'broken'

export interface CertEntry {
  fqdn: string
  dir: string
  status: EntryStatus
  hasKey: boolean
  hasCsr: boolean
  hasPfx: boolean
  signedFiles: string[]
  createdAt: string | null
  keyDesc: string | null
  sans: string[]
  /** Renseigne uniquement quand un certificat emis est lisible. */
  cert: CertInfo | null
}

// ---------------------------------------------------------------------------
// Enveloppe IPC : jamais d'exception qui traverse le pont, toujours un resultat.
// ---------------------------------------------------------------------------

export type Reply<T> = { ok: true; data: T } | { ok: false; error: string }

export interface OpensslProbe {
  available: boolean
  version: string
  path: string
}
