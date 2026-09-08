/**
 * Contrat partage entre le processus principal (Node/OpenSSL) et le renderer.
 * Aucune logique ici : uniquement les formes de donnees qui traversent l'IPC.
 */

// ---------------------------------------------------------------------------
// Reglages
// ---------------------------------------------------------------------------

import type { Lang } from './i18n/index.ts'

export interface Settings {
  /** Langue de l'interface et des messages produits par le processus principal. */
  language: Lang
  /** Racine ou vit un dossier par demande. Equivalent de $CERT_HOME dans la CLI. */
  rootDir: string
  /** Binaire openssl : "openssl" si dans le PATH, sinon chemin absolu. */
  opensslPath: string
  defaults: SubjectDefaults
  /** Affiche d'emblee les options avancees dans le formulaire. */
  advancedByDefault: boolean
}

export interface SubjectDefaults {
  country: string
  state: string
  locality: string
  org: string
  ou: string
  email: string
}

// ---------------------------------------------------------------------------
// Sujet du certificat (DN)
//
// Tous les champs sont facultatifs sauf le CN. Les listes permettent les
// attributs repetables, que la plupart des PKI d'entreprise utilisent.
// ---------------------------------------------------------------------------

export interface Subject {
  commonName: string
  country: string
  state: string
  locality: string
  org: string
  /** OU repetables : "Direction", "Equipe Reseau"... */
  ous: string[]
  email: string
  serialNumber: string
  businessCategory: string
  /** domainComponent repetables : "exemple", "fr" -> DC=exemple,DC=fr */
  domainComponents: string[]
  uid: string
  street: string
  postalCode: string
  title: string
  givenName: string
  surname: string
}

// ---------------------------------------------------------------------------
// Noms alternatifs
// ---------------------------------------------------------------------------

export type SanType = 'DNS' | 'IP' | 'email' | 'URI' | 'RID' | 'UPN' | 'otherName'

export interface San {
  type: SanType
  value: string
  /** Pour otherName uniquement : l'OID du type. UPN a le sien, pre-rempli. */
  oid?: string
}

// ---------------------------------------------------------------------------
// Cle privee
// ---------------------------------------------------------------------------

export type KeyAlgorithm = 'rsa' | 'rsa-pss' | 'ec' | 'ed25519' | 'ed448' | 'ml-dsa'

export interface KeySpec {
  algorithm: KeyAlgorithm
  /** RSA / RSA-PSS. */
  bits: number
  /** EC : nom de courbe openssl (prime256v1, secp384r1, brainpoolP256r1...). */
  curve: string
  /** ML-DSA : niveau de securite. */
  mldsaLevel: '44' | '65' | '87'
  /** Chiffre la cle privee sur le disque (AES-256). */
  encrypt: boolean
  passphrase: string
}

export type Digest = 'sha256' | 'sha384' | 'sha512' | 'sha3-256' | 'sha3-384' | 'sha3-512'

// ---------------------------------------------------------------------------
// Extensions demandees
// ---------------------------------------------------------------------------

/** Les 9 bits de keyUsage, dans l'ordre de la RFC 5280. */
export type KeyUsageBit =
  | 'digitalSignature'
  | 'nonRepudiation'
  | 'keyEncipherment'
  | 'dataEncipherment'
  | 'keyAgreement'
  | 'keyCertSign'
  | 'cRLSign'
  | 'encipherOnly'
  | 'decipherOnly'

export interface Extensions {
  basicConstraints: {
    include: boolean
    ca: boolean
    /** Profondeur de chaine autorisee sous cette CA. null = non contraint. */
    pathLen: number | null
    critical: boolean
  }
  keyUsage: {
    include: boolean
    critical: boolean
    bits: KeyUsageBit[]
  }
  extendedKeyUsage: {
    include: boolean
    critical: boolean
    /** Noms openssl (serverAuth...) ou OID bruts (1.3.6.1.4.1.311.20.2.2). */
    purposes: string[]
  }
  /** subjectKeyIdentifier = hash */
  subjectKeyIdentifier: boolean
  /** tlsfeature = status_request : le serveur DOIT agrafer une reponse OCSP. */
  mustStaple: boolean
  /** OID de politiques de certification. */
  certificatePolicies: string[]
  /** URI des listes de revocation. */
  crlDistributionPoints: string[]
  authorityInfoAccess: {
    ocsp: string[]
    caIssuers: string[]
  }
  /** Echappatoire : lignes ajoutees telles quelles dans la section req_ext. */
  custom: Array<{ name: string; value: string; critical: boolean }>
}

// ---------------------------------------------------------------------------
// Demande complete
// ---------------------------------------------------------------------------

export interface CsrRequest {
  /**
   * Identifiant de la demande : c'est le nom du dossier de travail.
   * Distinct du CN, qui peut contenir des espaces ("Jean Dupont").
   */
  name: string
  templateId: string
  subject: Subject
  sans: San[]
  key: KeySpec
  digest: Digest
  extensions: Extensions
  attributes: {
    /** Exige par certaines PKI pour autoriser la revocation par le demandeur. */
    challengePassword: string
    unstructuredName: string
  }
  /** Encodage des chaines du DN. utf8only convient partout aujourd'hui. */
  stringMask: 'utf8only' | 'nombstr' | 'pkix' | 'default'
  /** Ecrase une cle privee existante. Rend inutilisable une CSR deja chez la PKI. */
  force: boolean
}

export interface CsrResult {
  name: string
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
  /** Relecture de la CSR produite, telle qu'openssl la voit. */
  text: string
}

/** Rendu d'une demande sans rien ecrire : sert a l'apercu dans le formulaire. */
export interface CsrPreview {
  config: string
  command: string
  warnings: Warning[]
}

export interface Warning {
  level: 'error' | 'warn' | 'info'
  field?: string
  message: string
}

// ---------------------------------------------------------------------------
// Assemblage du PFX
// ---------------------------------------------------------------------------

export interface PfxRequest {
  fqdn: string
  /** Fichiers signes explicites. Vide => auto-detection dans <nom>/Signed/. */
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
  /** PFX present et expiration proche. */
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
  /** Identifiant du modele utilise, si la demande vient de la GUI. */
  templateId: string | null
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
  /** Ce que ce binaire sait faire : conditionne les choix offerts. */
  capabilities: Capabilities
}

export interface Capabilities {
  curves: string[]
  ed25519: boolean
  ed448: boolean
  rsaPss: boolean
  mldsa: boolean
  sha3: boolean
}
