/**
 * Modeles de demande.
 *
 * Chaque modele traduit un besoin exprime en clair ("un site en HTTPS") en un
 * jeu d'extensions X.509 correct. C'est ce qui permet d'utiliser l'outil sans
 * connaitre la RFC 5280 : on choisit l'usage, le reste est pre-rempli et reste
 * modifiable dans le mode avance.
 *
 * Les textes ne vivent pas ici mais dans les tables de traduction : ce fichier
 * ne porte que les cles et la substance technique.
 */
import type { MessageKey } from './i18n/index.ts'
import type { Digest, Extensions, KeySpec, KeyUsageBit, SanType } from './types.ts'

export type TemplateCategory = 'web' | 'identite' | 'signature' | 'infra' | 'autorite'

export interface Template {
  id: string
  category: TemplateCategory
  /** Nom d'icone lucide, resolu par l'interface. */
  icon: string

  labelKey: MessageKey
  /** Une phrase sans jargon, pour qui ne connait pas X.509. */
  pitchKey: MessageKey
  /** Le detail technique, pour qui veut savoir ce que le modele met dedans. */
  detailKey: MessageKey
  /** Libelle du champ CN : un FQDN et une personne ne se saisissent pas pareil. */
  cnKey: MessageKey
  cnPlaceholderKey: MessageKey
  sanHintKey: MessageKey
  /** Avertissements affiches quand ce modele est retenu. */
  noteKeys: MessageKey[]

  /** Types de SAN pertinents ; le premier est propose par defaut. */
  sanTypes: SanType[]
  /** Le CN est-il aussi ajoute comme SAN ? Vrai pour les serveurs, faux pour une personne. */
  cnAsSan: boolean
  sanRequired: boolean

  key: Pick<KeySpec, 'algorithm' | 'bits' | 'curve'>
  digest: Digest
  keyUsage: KeyUsageBit[]
  keyUsageCritical: boolean
  extendedKeyUsage: string[]
  ekuCritical: boolean
  ca: boolean
  pathLen: number | null
  mustStaple: boolean
}

export interface Choice {
  value: string
  labelKey: MessageKey
  hintKey: MessageKey
}

/** Usages etendus proposes. Les valeurs sans nom court sont donnees par OID. */
export const EKU_CATALOG: Choice[] = [
  { value: 'serverAuth', labelKey: 'eku.serverAuth', hintKey: 'eku.serverAuth.hint' },
  { value: 'clientAuth', labelKey: 'eku.clientAuth', hintKey: 'eku.clientAuth.hint' },
  { value: 'codeSigning', labelKey: 'eku.codeSigning', hintKey: 'eku.codeSigning.hint' },
  { value: 'emailProtection', labelKey: 'eku.emailProtection', hintKey: 'eku.emailProtection.hint' },
  { value: 'timeStamping', labelKey: 'eku.timeStamping', hintKey: 'eku.timeStamping.hint' },
  { value: 'OCSPSigning', labelKey: 'eku.OCSPSigning', hintKey: 'eku.OCSPSigning.hint' },
  { value: '1.3.6.1.5.5.7.3.17', labelKey: 'eku.ipsec', hintKey: 'eku.ipsec.hint' },
  { value: '1.3.6.1.4.1.311.20.2.2', labelKey: 'eku.smartcard', hintKey: 'eku.smartcard.hint' },
  { value: '1.3.6.1.5.2.3.5', labelKey: 'eku.kdc', hintKey: 'eku.kdc.hint' },
  { value: '1.3.6.1.4.1.311.10.3.4', labelKey: 'eku.efs', hintKey: 'eku.efs.hint' },
  { value: '1.3.6.1.4.1.311.10.3.12', labelKey: 'eku.docSigning', hintKey: 'eku.docSigning.hint' },
  { value: 'anyExtendedKeyUsage', labelKey: 'eku.any', hintKey: 'eku.any.hint' },
]

export const KEY_USAGE_CATALOG: Array<Choice & { value: KeyUsageBit }> = [
  { value: 'digitalSignature', labelKey: 'ku.digitalSignature', hintKey: 'ku.digitalSignature.hint' },
  { value: 'nonRepudiation', labelKey: 'ku.nonRepudiation', hintKey: 'ku.nonRepudiation.hint' },
  { value: 'keyEncipherment', labelKey: 'ku.keyEncipherment', hintKey: 'ku.keyEncipherment.hint' },
  { value: 'dataEncipherment', labelKey: 'ku.dataEncipherment', hintKey: 'ku.dataEncipherment.hint' },
  { value: 'keyAgreement', labelKey: 'ku.keyAgreement', hintKey: 'ku.keyAgreement.hint' },
  { value: 'keyCertSign', labelKey: 'ku.keyCertSign', hintKey: 'ku.keyCertSign.hint' },
  { value: 'cRLSign', labelKey: 'ku.cRLSign', hintKey: 'ku.cRLSign.hint' },
  { value: 'encipherOnly', labelKey: 'ku.encipherOnly', hintKey: 'ku.encipherOnly.hint' },
  { value: 'decipherOnly', labelKey: 'ku.decipherOnly', hintKey: 'ku.decipherOnly.hint' },
]

const base = {
  digest: 'sha256' as Digest,
  keyUsageCritical: true,
  ekuCritical: false,
  ca: false,
  pathLen: null,
  mustStaple: false,
  noteKeys: [] as MessageKey[],
}

export const TEMPLATES: Template[] = [
  // -------------------------------------------------------------------------
  // Web
  // -------------------------------------------------------------------------
  {
    ...base,
    id: 'tls-public',
    category: 'web',
    icon: 'Globe',
    labelKey: 'tpl.tls-public.label',
    pitchKey: 'tpl.tls-public.pitch',
    detailKey: 'tpl.tls-public.detail',
    cnKey: 'tpl.tls-public.cn',
    cnPlaceholderKey: 'tpl.tls-public.cnPlaceholder',
    sanHintKey: 'tpl.tls-public.sanHint',
    noteKeys: ['tpl.tls-public.note1', 'tpl.tls-public.note2'],
    sanTypes: ['DNS'],
    cnAsSan: true,
    sanRequired: true,
    key: { algorithm: 'rsa', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extendedKeyUsage: ['serverAuth'],
  },
  {
    ...base,
    id: 'tls-internal',
    category: 'web',
    icon: 'Server',
    labelKey: 'tpl.tls-internal.label',
    pitchKey: 'tpl.tls-internal.pitch',
    detailKey: 'tpl.tls-internal.detail',
    cnKey: 'tpl.tls-internal.cn',
    cnPlaceholderKey: 'tpl.tls-internal.cnPlaceholder',
    sanHintKey: 'tpl.tls-internal.sanHint',
    sanTypes: ['DNS', 'IP'],
    cnAsSan: true,
    sanRequired: true,
    key: { algorithm: 'rsa', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extendedKeyUsage: ['serverAuth', 'clientAuth'],
  },
  {
    ...base,
    id: 'tls-muststaple',
    category: 'web',
    icon: 'ShieldCheck',
    labelKey: 'tpl.tls-muststaple.label',
    pitchKey: 'tpl.tls-muststaple.pitch',
    detailKey: 'tpl.tls-muststaple.detail',
    cnKey: 'tpl.tls-muststaple.cn',
    cnPlaceholderKey: 'tpl.tls-muststaple.cnPlaceholder',
    sanHintKey: 'tpl.tls-muststaple.sanHint',
    noteKeys: ['tpl.tls-muststaple.note1'],
    sanTypes: ['DNS'],
    cnAsSan: true,
    sanRequired: true,
    key: { algorithm: 'rsa', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extendedKeyUsage: ['serverAuth'],
    mustStaple: true,
  },

  // -------------------------------------------------------------------------
  // Identite
  // -------------------------------------------------------------------------
  {
    ...base,
    id: 'client-mtls',
    category: 'identite',
    icon: 'KeyRound',
    labelKey: 'tpl.client-mtls.label',
    pitchKey: 'tpl.client-mtls.pitch',
    detailKey: 'tpl.client-mtls.detail',
    cnKey: 'tpl.client-mtls.cn',
    cnPlaceholderKey: 'tpl.client-mtls.cnPlaceholder',
    sanHintKey: 'tpl.client-mtls.sanHint',
    sanTypes: ['DNS', 'URI', 'email'],
    cnAsSan: false,
    sanRequired: false,
    key: { algorithm: 'ec', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature'],
    extendedKeyUsage: ['clientAuth'],
  },
  {
    ...base,
    id: 'smime',
    category: 'identite',
    icon: 'Mail',
    labelKey: 'tpl.smime.label',
    pitchKey: 'tpl.smime.pitch',
    detailKey: 'tpl.smime.detail',
    cnKey: 'tpl.smime.cn',
    cnPlaceholderKey: 'tpl.smime.cnPlaceholder',
    sanHintKey: 'tpl.smime.sanHint',
    sanTypes: ['email'],
    cnAsSan: false,
    sanRequired: true,
    key: { algorithm: 'rsa', bits: 3072, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'nonRepudiation', 'keyEncipherment'],
    extendedKeyUsage: ['emailProtection'],
  },
  {
    ...base,
    id: 'smartcard',
    category: 'identite',
    icon: 'CreditCard',
    labelKey: 'tpl.smartcard.label',
    pitchKey: 'tpl.smartcard.pitch',
    detailKey: 'tpl.smartcard.detail',
    cnKey: 'tpl.smartcard.cn',
    cnPlaceholderKey: 'tpl.smartcard.cnPlaceholder',
    sanHintKey: 'tpl.smartcard.sanHint',
    sanTypes: ['UPN', 'email'],
    cnAsSan: false,
    sanRequired: true,
    key: { algorithm: 'rsa', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extendedKeyUsage: ['clientAuth', '1.3.6.1.4.1.311.20.2.2'],
  },
  {
    ...base,
    id: 'domain-controller',
    category: 'identite',
    icon: 'Network',
    labelKey: 'tpl.domain-controller.label',
    pitchKey: 'tpl.domain-controller.pitch',
    detailKey: 'tpl.domain-controller.detail',
    cnKey: 'tpl.domain-controller.cn',
    cnPlaceholderKey: 'tpl.domain-controller.cnPlaceholder',
    sanHintKey: 'tpl.domain-controller.sanHint',
    sanTypes: ['DNS'],
    cnAsSan: true,
    sanRequired: true,
    key: { algorithm: 'rsa', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extendedKeyUsage: ['serverAuth', 'clientAuth', '1.3.6.1.5.2.3.5'],
  },

  // -------------------------------------------------------------------------
  // Signature
  // -------------------------------------------------------------------------
  {
    ...base,
    id: 'code-signing',
    category: 'signature',
    icon: 'FileSignature',
    labelKey: 'tpl.code-signing.label',
    pitchKey: 'tpl.code-signing.pitch',
    detailKey: 'tpl.code-signing.detail',
    cnKey: 'tpl.code-signing.cn',
    cnPlaceholderKey: 'tpl.code-signing.cnPlaceholder',
    sanHintKey: 'tpl.code-signing.sanHint',
    noteKeys: ['tpl.code-signing.note1'],
    sanTypes: ['email', 'URI'],
    cnAsSan: false,
    sanRequired: false,
    key: { algorithm: 'rsa', bits: 3072, curve: 'prime256v1' },
    keyUsage: ['digitalSignature'],
    extendedKeyUsage: ['codeSigning'],
  },
  {
    ...base,
    id: 'timestamping',
    category: 'signature',
    icon: 'Clock',
    labelKey: 'tpl.timestamping.label',
    pitchKey: 'tpl.timestamping.pitch',
    detailKey: 'tpl.timestamping.detail',
    cnKey: 'tpl.timestamping.cn',
    cnPlaceholderKey: 'tpl.timestamping.cnPlaceholder',
    sanHintKey: 'tpl.timestamping.sanHint',
    sanTypes: ['URI', 'DNS'],
    cnAsSan: false,
    sanRequired: false,
    key: { algorithm: 'rsa', bits: 3072, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'nonRepudiation'],
    extendedKeyUsage: ['timeStamping'],
    ekuCritical: true,
  },

  // -------------------------------------------------------------------------
  // Infrastructure
  // -------------------------------------------------------------------------
  {
    ...base,
    id: 'vpn-ipsec',
    category: 'infra',
    icon: 'Lock',
    labelKey: 'tpl.vpn-ipsec.label',
    pitchKey: 'tpl.vpn-ipsec.pitch',
    detailKey: 'tpl.vpn-ipsec.detail',
    cnKey: 'tpl.vpn-ipsec.cn',
    cnPlaceholderKey: 'tpl.vpn-ipsec.cnPlaceholder',
    sanHintKey: 'tpl.vpn-ipsec.sanHint',
    sanTypes: ['DNS', 'IP', 'email'],
    cnAsSan: true,
    sanRequired: true,
    key: { algorithm: 'rsa', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'keyEncipherment', 'keyAgreement'],
    extendedKeyUsage: ['serverAuth', 'clientAuth', '1.3.6.1.5.5.7.3.17'],
  },

  // -------------------------------------------------------------------------
  // Autorite
  // -------------------------------------------------------------------------
  {
    ...base,
    id: 'intermediate-ca',
    category: 'autorite',
    icon: 'Landmark',
    labelKey: 'tpl.intermediate-ca.label',
    pitchKey: 'tpl.intermediate-ca.pitch',
    detailKey: 'tpl.intermediate-ca.detail',
    cnKey: 'tpl.intermediate-ca.cn',
    cnPlaceholderKey: 'tpl.intermediate-ca.cnPlaceholder',
    sanHintKey: 'tpl.intermediate-ca.sanHint',
    noteKeys: ['tpl.intermediate-ca.note1'],
    sanTypes: ['DNS', 'URI'],
    cnAsSan: false,
    sanRequired: false,
    key: { algorithm: 'rsa', bits: 4096, curve: 'secp384r1' },
    digest: 'sha384',
    keyUsage: ['keyCertSign', 'cRLSign', 'digitalSignature'],
    extendedKeyUsage: [],
    ca: true,
    pathLen: 0,
  },
  {
    ...base,
    id: 'custom',
    category: 'autorite',
    icon: 'SlidersHorizontal',
    labelKey: 'tpl.custom.label',
    pitchKey: 'tpl.custom.pitch',
    detailKey: 'tpl.custom.detail',
    cnKey: 'tpl.custom.cn',
    cnPlaceholderKey: 'tpl.custom.cnPlaceholder',
    sanHintKey: 'tpl.custom.sanHint',
    sanTypes: ['DNS', 'IP', 'email', 'URI', 'UPN', 'RID', 'otherName'],
    cnAsSan: true,
    sanRequired: false,
    key: { algorithm: 'rsa', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extendedKeyUsage: [],
  },
]

export const CATEGORY_KEY: Record<TemplateCategory, MessageKey> = {
  web: 'category.web',
  identite: 'category.identite',
  signature: 'category.signature',
  infra: 'category.infra',
  autorite: 'category.autorite',
}

export const getTemplate = (id: string): Template =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[TEMPLATES.length - 1]!

/** Les extensions telles que le modele les prevoit, avant retouche manuelle. */
export function extensionsFromTemplate(t: Template): Extensions {
  return {
    basicConstraints: { include: true, ca: t.ca, pathLen: t.pathLen, critical: t.ca },
    keyUsage: { include: t.keyUsage.length > 0, critical: t.keyUsageCritical, bits: [...t.keyUsage] },
    extendedKeyUsage: {
      include: t.extendedKeyUsage.length > 0,
      critical: t.ekuCritical,
      purposes: [...t.extendedKeyUsage],
    },
    subjectKeyIdentifier: true,
    mustStaple: t.mustStaple,
    certificatePolicies: [],
    crlDistributionPoints: [],
    authorityInfoAccess: { ocsp: [], caIssuers: [] },
    custom: [],
  }
}
