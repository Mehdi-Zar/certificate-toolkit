/**
 * Modeles de demande.
 *
 * Chaque modele traduit un besoin exprime en clair ("un site en HTTPS") en un
 * jeu d'extensions X.509 correct. C'est ce qui permet d'utiliser l'outil sans
 * connaitre la RFC 5280 : on choisit l'usage, le reste est pre-rempli et reste
 * modifiable dans le mode avance.
 */
import type { Digest, Extensions, KeySpec, KeyUsageBit, SanType } from './types.ts'

export type TemplateCategory = 'web' | 'identite' | 'signature' | 'infra' | 'autorite'

export interface Template {
  id: string
  label: string
  /** Une phrase, sans jargon : c'est ce que lit quelqu'un qui ne connait pas X.509. */
  pitch: string
  /** Le detail technique, pour qui veut savoir ce que le modele met dedans. */
  detail: string
  category: TemplateCategory
  /** Nom d'icone lucide, resolu par l'interface. */
  icon: string

  /** Libelle du champ CN pour ce modele : un FQDN et une personne ne se saisissent pas pareil. */
  commonNameLabel: string
  commonNamePlaceholder: string
  /** Types de SAN pertinents ; le premier est propose par defaut. */
  sanTypes: SanType[]
  /** Le CN est-il aussi ajoute comme SAN ? Vrai pour les serveurs, faux pour une personne. */
  cnAsSan: boolean
  sanRequired: boolean
  sanHint: string

  key: Pick<KeySpec, 'algorithm' | 'bits' | 'curve'>
  digest: Digest
  keyUsage: KeyUsageBit[]
  keyUsageCritical: boolean
  extendedKeyUsage: string[]
  ekuCritical: boolean
  ca: boolean
  pathLen: number | null
  mustStaple: boolean

  /** Avertissements affiches quand ce modele est retenu. */
  notes: string[]
}

/** OID des usages qui n'ont pas de nom court dans openssl. */
export const EKU_CATALOG: Array<{ value: string; label: string; hint: string }> = [
  { value: 'serverAuth', label: 'Authentification serveur TLS', hint: 'Un serveur prouve son identite (HTTPS).' },
  { value: 'clientAuth', label: 'Authentification client TLS', hint: 'Un client prouve son identite (mTLS).' },
  { value: 'codeSigning', label: 'Signature de code', hint: 'Signer un binaire ou un script.' },
  { value: 'emailProtection', label: 'Messagerie S/MIME', hint: 'Signer et chiffrer des courriels.' },
  { value: 'timeStamping', label: 'Horodatage', hint: 'Autorite d’horodatage RFC 3161.' },
  { value: 'OCSPSigning', label: 'Signature de reponses OCSP', hint: 'Repondeur de revocation.' },
  { value: '1.3.6.1.5.5.7.3.17', label: 'IPsec IKE', hint: 'Tunnel VPN IPsec.' },
  { value: '1.3.6.1.4.1.311.20.2.2', label: 'Ouverture de session par carte a puce', hint: 'Microsoft Smartcard Logon.' },
  { value: '1.3.6.1.5.2.3.5', label: 'Authentification KDC', hint: 'Controleur de domaine Kerberos.' },
  { value: '1.3.6.1.4.1.311.10.3.4', label: 'Chiffrement de fichiers EFS', hint: 'Windows Encrypting File System.' },
  { value: '1.3.6.1.4.1.311.10.3.12', label: 'Signature de document', hint: 'Microsoft Document Signing.' },
  { value: 'anyExtendedKeyUsage', label: 'Tous usages', hint: 'A eviter : annule l’interet de l’extension.' },
]

export const KEY_USAGE_CATALOG: Array<{ value: KeyUsageBit; label: string; hint: string }> = [
  { value: 'digitalSignature', label: 'Signature numerique', hint: 'Signer un echange. Necessaire a presque tout.' },
  { value: 'nonRepudiation', label: 'Non-repudiation', hint: 'Le signataire ne peut pas nier son geste.' },
  { value: 'keyEncipherment', label: 'Chiffrement de cle', hint: 'Echange de cle RSA. Inutile en ECDHE seul.' },
  { value: 'dataEncipherment', label: 'Chiffrement de donnees', hint: 'Rare : chiffrer directement des donnees.' },
  { value: 'keyAgreement', label: 'Accord de cle', hint: 'Negociation Diffie-Hellman (cles EC).' },
  { value: 'keyCertSign', label: 'Signature de certificats', hint: 'Reserve aux autorites de certification.' },
  { value: 'cRLSign', label: 'Signature de CRL', hint: 'Reserve aux autorites de certification.' },
  { value: 'encipherOnly', label: 'Chiffrement seul', hint: 'Restreint keyAgreement au chiffrement.' },
  { value: 'decipherOnly', label: 'Dechiffrement seul', hint: 'Restreint keyAgreement au dechiffrement.' },
]

const base = {
  digest: 'sha256' as Digest,
  keyUsageCritical: true,
  ekuCritical: false,
  ca: false,
  pathLen: null,
  mustStaple: false,
  notes: [] as string[],
}

export const TEMPLATES: Template[] = [
  // -------------------------------------------------------------------------
  // Web
  // -------------------------------------------------------------------------
  {
    ...base,
    id: 'tls-public',
    label: 'Site web public (HTTPS)',
    pitch: 'Un site accessible depuis Internet, dont le certificat sera signe par une autorite publique.',
    detail:
      'Usage limite a l’authentification serveur, comme l’exige le CA/Browser Forum. Les noms doivent etre des noms DNS publics : une adresse IP ou un nom interne serait refuse.',
    category: 'web',
    icon: 'Globe',
    commonNameLabel: 'Nom de domaine',
    commonNamePlaceholder: 'www.exemple.fr',
    sanTypes: ['DNS'],
    cnAsSan: true,
    sanRequired: true,
    sanHint: 'Ajoutez tous les noms que le site doit servir : exemple.fr, www.exemple.fr...',
    key: { algorithm: 'rsa', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extendedKeyUsage: ['serverAuth'],
    notes: [
      'Depuis juin 2026 un certificat TLS public ne peut plus porter clientAuth en plus de serverAuth. Pour du mTLS, prenez le modele « Serveur interne » ou demandez deux certificats.',
      'Les validites publiques passent a 200 jours en 2026, puis 100 en 2027 : prevoyez un renouvellement automatise.',
    ],
  },
  {
    ...base,
    id: 'tls-internal',
    label: 'Serveur interne (PKI d’entreprise)',
    pitch: 'Un service sur le reseau interne, signe par l’autorite de votre organisation.',
    detail:
      'Serveur et client, ce qui permet aussi le mTLS. Les adresses IP et les noms non publics sont acceptes : les regles du CA/Browser Forum ne s’appliquent pas a une PKI privee.',
    category: 'web',
    icon: 'Server',
    commonNameLabel: 'Nom du serveur',
    commonNamePlaceholder: 'app.interne.local',
    sanTypes: ['DNS', 'IP'],
    cnAsSan: true,
    sanRequired: true,
    sanHint: 'Noms DNS et adresses IP par lesquels le service est joint.',
    key: { algorithm: 'rsa', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extendedKeyUsage: ['serverAuth', 'clientAuth'],
  },
  {
    ...base,
    id: 'tls-muststaple',
    label: 'Site web avec agrafage OCSP obligatoire',
    pitch: 'Comme un site public, mais le serveur doit prouver a chaque connexion que le certificat n’est pas revoque.',
    detail:
      'Ajoute l’extension tlsfeature=status_request. Le navigateur refusera la connexion si le serveur n’agrafe pas de reponse OCSP : a n’activer que si votre serveur est configure pour le faire.',
    category: 'web',
    icon: 'ShieldCheck',
    commonNameLabel: 'Nom de domaine',
    commonNamePlaceholder: 'www.exemple.fr',
    sanTypes: ['DNS'],
    cnAsSan: true,
    sanRequired: true,
    sanHint: 'Tous les noms que le site doit servir.',
    key: { algorithm: 'rsa', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extendedKeyUsage: ['serverAuth'],
    mustStaple: true,
    notes: [
      'Un serveur qui n’agrafe pas de reponse OCSP deviendra injoignable. Verifiez la configuration avant de deployer.',
    ],
  },

  // -------------------------------------------------------------------------
  // Identite
  // -------------------------------------------------------------------------
  {
    ...base,
    id: 'client-mtls',
    label: 'Client mTLS (machine ou service)',
    pitch: 'Une application qui doit prouver son identite pour appeler une API protegee.',
    detail: 'Authentification client uniquement. Le nom peut etre un identifiant de service plutot qu’un nom DNS.',
    category: 'identite',
    icon: 'KeyRound',
    commonNameLabel: 'Identifiant du client',
    commonNamePlaceholder: 'service-paiement',
    sanTypes: ['DNS', 'URI', 'email'],
    cnAsSan: false,
    sanRequired: false,
    sanHint: 'Facultatif. Certaines passerelles exigent un SAN URI ou DNS.',
    key: { algorithm: 'ec', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature'],
    extendedKeyUsage: ['clientAuth'],
  },
  {
    ...base,
    id: 'smime',
    label: 'Messagerie S/MIME',
    pitch: 'Signer et chiffrer les courriels d’une personne.',
    detail:
      'Le nom est celui de la personne et l’adresse email doit figurer en SAN : c’est elle que les clients de messagerie verifient, pas le CN.',
    category: 'identite',
    icon: 'Mail',
    commonNameLabel: 'Nom de la personne',
    commonNamePlaceholder: 'Jean Dupont',
    sanTypes: ['email'],
    cnAsSan: false,
    sanRequired: true,
    sanHint: 'L’adresse email du titulaire. Obligatoire.',
    key: { algorithm: 'rsa', bits: 3072, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'nonRepudiation', 'keyEncipherment'],
    extendedKeyUsage: ['emailProtection'],
  },
  {
    ...base,
    id: 'smartcard',
    label: 'Ouverture de session par carte a puce',
    pitch: 'Se connecter a un poste Windows avec une carte a puce au lieu d’un mot de passe.',
    detail:
      'Authentification client plus l’usage Microsoft Smartcard Logon. Le SAN doit contenir l’UPN du compte Active Directory (otherName), sans quoi le controleur de domaine refusera l’ouverture de session.',
    category: 'identite',
    icon: 'CreditCard',
    commonNameLabel: 'Nom du titulaire',
    commonNamePlaceholder: 'Jean Dupont',
    sanTypes: ['UPN', 'email'],
    cnAsSan: false,
    sanRequired: true,
    sanHint: 'L’UPN du compte, sous la forme jdupont@exemple.local. Obligatoire.',
    key: { algorithm: 'rsa', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extendedKeyUsage: ['clientAuth', '1.3.6.1.4.1.311.20.2.2'],
  },
  {
    ...base,
    id: 'domain-controller',
    label: 'Controleur de domaine Active Directory',
    pitch: 'Le certificat que presente un controleur de domaine Windows.',
    detail:
      'Serveur, client et authentification KDC. Le SAN doit porter le nom DNS complet du domaine, faute de quoi l’ouverture de session par carte a puce echoue avec l’evenement KDC 29.',
    category: 'identite',
    icon: 'Network',
    commonNameLabel: 'Nom du controleur',
    commonNamePlaceholder: 'dc01.exemple.local',
    sanTypes: ['DNS'],
    cnAsSan: true,
    sanRequired: true,
    sanHint: 'Le nom du controleur et le nom DNS du domaine (exemple.local).',
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
    label: 'Signature de code',
    pitch: 'Signer un logiciel pour que le systeme d’exploitation l’accepte sans avertissement.',
    detail:
      'Signature numerique seule, cle RSA 3072 bits au minimum. Les autorites publiques imposent aujourd’hui que la cle vive dans un module materiel (HSM ou token) : verifiez leurs conditions avant de generer une cle logicielle.',
    category: 'signature',
    icon: 'FileSignature',
    commonNameLabel: 'Nom de l’editeur',
    commonNamePlaceholder: 'Ma Societe SAS',
    sanTypes: ['email', 'URI'],
    cnAsSan: false,
    sanRequired: false,
    sanHint: 'Facultatif pour la signature de code.',
    key: { algorithm: 'rsa', bits: 3072, curve: 'prime256v1' },
    keyUsage: ['digitalSignature'],
    extendedKeyUsage: ['codeSigning'],
    notes: [
      'Une cle de signature de code generee sur un poste ne sera pas acceptee par une autorite publique : elles exigent un HSM certifie.',
    ],
  },
  {
    ...base,
    id: 'timestamping',
    label: 'Autorite d’horodatage',
    pitch: 'Delivrer des preuves de date pour des signatures (RFC 3161).',
    detail:
      'L’usage etendu doit etre critique et unique : c’est une exigence de la RFC 3161, sans quoi les verificateurs rejettent les jetons.',
    category: 'signature',
    icon: 'Clock',
    commonNameLabel: 'Nom du service',
    commonNamePlaceholder: 'Horodatage Ma Societe',
    sanTypes: ['URI', 'DNS'],
    cnAsSan: false,
    sanRequired: false,
    sanHint: 'Facultatif.',
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
    label: 'Passerelle VPN IPsec',
    pitch: 'Un tunnel VPN entre deux sites, ou un acces distant.',
    detail: 'Ajoute l’usage IPsec IKE en plus de serveur et client, ce qu’attendent la plupart des passerelles.',
    category: 'infra',
    icon: 'Lock',
    commonNameLabel: 'Nom de la passerelle',
    commonNamePlaceholder: 'vpn.exemple.fr',
    sanTypes: ['DNS', 'IP', 'email'],
    cnAsSan: true,
    sanRequired: true,
    sanHint: 'Le nom public et l’adresse IP de la passerelle.',
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
    label: 'Autorite de certification intermediaire',
    pitch: 'Une autorite subordonnee, qui signera elle-meme des certificats.',
    detail:
      'basicConstraints CA:TRUE avec une profondeur de 0, et les usages de signature de certificats et de CRL. Une CA ne porte pas d’usage etendu.',
    category: 'autorite',
    icon: 'Landmark',
    commonNameLabel: 'Nom de l’autorite',
    commonNamePlaceholder: 'Ma Societe Issuing CA 1',
    sanTypes: ['DNS', 'URI'],
    cnAsSan: false,
    sanRequired: false,
    sanHint: 'Une CA n’a normalement pas de SAN.',
    key: { algorithm: 'rsa', bits: 4096, curve: 'secp384r1' },
    digest: 'sha384',
    keyUsage: ['keyCertSign', 'cRLSign', 'digitalSignature'],
    extendedKeyUsage: [],
    ca: true,
    pathLen: 0,
    notes: [
      'Une cle de CA compromise compromet tout ce qu’elle a signe. Chiffrez-la, ou generez-la dans un HSM.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    ...base,
    id: 'custom',
    label: 'Personnalise',
    pitch: 'Rien de pre-rempli : vous choisissez chaque extension.',
    detail: 'Pour une PKI qui impose un profil particulier, ou pour reproduire un certificat existant.',
    category: 'autorite',
    icon: 'SlidersHorizontal',
    commonNameLabel: 'Common Name (CN)',
    commonNamePlaceholder: 'exemple.fr',
    sanTypes: ['DNS', 'IP', 'email', 'URI', 'UPN', 'RID', 'otherName'],
    cnAsSan: true,
    sanRequired: false,
    sanHint: 'Tous les types de SAN sont disponibles.',
    key: { algorithm: 'rsa', bits: 2048, curve: 'prime256v1' },
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    extendedKeyUsage: [],
  },
]

export const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  web: 'Sites et services web',
  identite: 'Identite et authentification',
  signature: 'Signature',
  infra: 'Infrastructure',
  autorite: 'Autorites et cas particuliers',
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
