/**
 * English strings. Typed against the French table, so a missing key is a
 * compile error rather than a blank label at runtime.
 */
import type { MessageKey } from './fr.ts'

export const en: Record<MessageKey, string> = {
  // -------------------------------------------------------------------------
  // Application
  // -------------------------------------------------------------------------
  'app.subtitle': 'X.509 certificates',
  'nav.certificates': 'Certificates',
  'nav.newRequest': 'New request',
  'nav.settings': 'Settings',

  'theme.system': 'System theme',
  'theme.light': 'Light theme',
  'theme.dark': 'Dark theme',

  'openssl.label': 'OpenSSL',
  'openssl.notFound': 'OpenSSL not found',
  'openssl.blocked': 'OpenSSL cannot be found, so nothing can be done.',
  'openssl.setPath': 'Set the path',

  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.add': 'Add',
  'common.remove': 'Remove',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.show': 'Show',
  'common.hide': 'Hide',
  'common.openFolder': 'Open folder',
  'common.reveal': 'Show in file manager',
  'common.refresh': 'Refresh',
  'common.none': '(none)',
  'common.unknown': '(unknown)',
  'common.reading': 'Reading…',
  'common.help': 'Help',

  // -------------------------------------------------------------------------
  // Certificate list
  // -------------------------------------------------------------------------
  'list.title': 'Certificates',
  'list.filter': 'Filter by name or SAN',
  'list.filterLabel': 'Filter',
  'list.tabAll': 'All',
  'list.tabTodo': 'Needs action',
  'list.emptyTitle': 'No certificates',
  'list.emptyDesc':
    'The working folder holds no request yet. Start by generating a CSR.',
  'list.noResultTitle': 'No match',
  'list.noResultDesc': 'No request matches this filter.',
  'update.available': 'Version {latest} is available (you have {current}).',
  'update.open': 'See the release',
  'update.dismiss': 'Later',
  'list.sort': 'Sort',
  'list.sortStage': 'By stage',
  'list.sortRecent': 'Most recent',
  'list.keyUnknown': 'unknown key',
  'list.extraSans': '{n} more SAN(s)',
  'list.filesReceived': '{n} file(s) received',
  'list.createdOn': 'created {date}',
  'list.expiresIn': 'expires in {n} day(s)',
  'list.expiresToday': 'expires today',
  'list.expiredSince': 'expired {n} day(s) ago',

  'status.awaiting-pki': 'Awaiting CA',
  'status.awaiting-pki.hint': 'The CSR is ready. Send it to your CA.',
  'status.ready-to-assemble': 'Ready to assemble',
  'status.ready-to-assemble.hint': 'The CA has answered. Assemble the PFX.',
  'status.issued': 'Issued',
  'status.issued.hint': 'The PFX is available.',
  'status.expiring': 'Renew soon',
  'status.expiring.hint': 'The certificate expires shortly.',
  'status.expired': 'Expired',
  'status.expired.hint': 'The certificate is no longer valid.',
  'status.broken': 'Incomplete',
  'status.broken.hint': 'Incomplete folder: the private key is missing or unreadable.',

  // -------------------------------------------------------------------------
  // Categories and templates
  // -------------------------------------------------------------------------
  'category.web': 'Websites and web services',
  'category.identite': 'Identity and authentication',
  'category.signature': 'Signing',
  'category.infra': 'Infrastructure',
  'category.autorite': 'Authorities and special cases',

  'tpl.tls-public.label': 'Public website (HTTPS)',
  'tpl.tls-public.pitch':
    'A site reachable from the internet, with a certificate signed by a public authority.',
  'tpl.tls-public.detail':
    'Server authentication only, as the CA/Browser Forum requires. Names must be public DNS names: an IP address or an internal name would be rejected.',
  'tpl.tls-public.cn': 'Domain name',
  'tpl.tls-public.cnPlaceholder': 'www.example.com',
  'tpl.tls-public.sanHint':
    'Add every name the site must serve: example.com, www.example.com, and so on.',
  'tpl.tls-public.note1':
    'Since June 2026 a public TLS certificate can no longer carry clientAuth alongside serverAuth. For mTLS, use the "Internal server" template or request two certificates.',
  'tpl.tls-public.note2':
    'Public lifetimes drop to 200 days in 2026, then 100 in 2027. Plan for automated renewal.',

  'tpl.tls-internal.label': 'Internal server (enterprise CA)',
  'tpl.tls-internal.pitch':
    'A service on the internal network, signed by your organisation authority.',
  'tpl.tls-internal.detail':
    'Server and client, so mTLS works too. IP addresses and non-public names are accepted: CA/Browser Forum rules do not apply to a private authority.',
  'tpl.tls-internal.cn': 'Server name',
  'tpl.tls-internal.cnPlaceholder': 'app.internal.local',
  'tpl.tls-internal.sanHint': 'DNS names and IP addresses the service answers on.',

  'tpl.tls-muststaple.label': 'Website with OCSP must-staple',
  'tpl.tls-muststaple.pitch':
    'Like a public site, but the server must prove on every connection that the certificate is not revoked.',
  'tpl.tls-muststaple.detail':
    'Adds the tlsfeature=status_request extension. Browsers refuse the connection when the server staples no OCSP response, so enable it only once your server is configured for it.',
  'tpl.tls-muststaple.cn': 'Domain name',
  'tpl.tls-muststaple.cnPlaceholder': 'www.example.com',
  'tpl.tls-muststaple.sanHint': 'Every name the site must serve.',
  'tpl.tls-muststaple.note1':
    'A server that staples no OCSP response becomes unreachable. Check the configuration before deploying.',

  'tpl.client-mtls.label': 'mTLS client (machine or service)',
  'tpl.client-mtls.pitch':
    'An application that must prove its identity to call a protected API.',
  'tpl.client-mtls.detail':
    'Client authentication only. The name can be a service identifier rather than a DNS name.',
  'tpl.client-mtls.cn': 'Client identifier',
  'tpl.client-mtls.cnPlaceholder': 'payment-service',
  'tpl.client-mtls.sanHint': 'Optional. Some gateways require a URI or DNS SAN.',

  'tpl.smime.label': 'S/MIME email',
  'tpl.smime.pitch': 'Sign and encrypt one person email.',
  'tpl.smime.detail':
    'The name is the person, and the email address must appear as a SAN: mail clients check that, not the Common Name.',
  'tpl.smime.cn': 'Person name',
  'tpl.smime.cnPlaceholder': 'Jane Doe',
  'tpl.smime.sanHint': 'The holder email address. Required.',

  'tpl.smartcard.label': 'Smart card logon',
  'tpl.smartcard.pitch':
    'Sign in to a Windows machine with a smart card instead of a password.',
  'tpl.smartcard.detail':
    'Client authentication plus Microsoft Smartcard Logon. The SAN must carry the Active Directory account UPN as an otherName, otherwise the domain controller refuses the logon.',
  'tpl.smartcard.cn': 'Holder name',
  'tpl.smartcard.cnPlaceholder': 'Jane Doe',
  'tpl.smartcard.sanHint': 'The account UPN, such as jdoe@example.local. Required.',

  'tpl.domain-controller.label': 'Active Directory domain controller',
  'tpl.domain-controller.pitch':
    'The certificate a Windows domain controller presents.',
  'tpl.domain-controller.detail':
    'Server, client and KDC authentication. The SAN must carry the full DNS name of the domain, or smart card logon fails with KDC event 29.',
  'tpl.domain-controller.cn': 'Controller name',
  'tpl.domain-controller.cnPlaceholder': 'dc01.example.local',
  'tpl.domain-controller.sanHint':
    'The controller name and the DNS name of the domain (example.local).',

  'tpl.code-signing.label': 'Code signing',
  'tpl.code-signing.pitch':
    'Sign software so the operating system accepts it without a warning.',
  'tpl.code-signing.detail':
    'Digital signature only, RSA 3072 bits minimum. Public authorities now require the key to live in a hardware module (HSM or token), so check their terms before generating a software key.',
  'tpl.code-signing.cn': 'Publisher name',
  'tpl.code-signing.cnPlaceholder': 'Acme Ltd',
  'tpl.code-signing.sanHint': 'Optional for code signing.',
  'tpl.code-signing.note1':
    'A code signing key generated on a workstation will not be accepted by a public authority: they require a certified HSM.',

  'tpl.timestamping.label': 'Timestamping authority',
  'tpl.timestamping.pitch': 'Issue proof of date for signatures (RFC 3161).',
  'tpl.timestamping.detail':
    'The extended usage must be critical and unique: RFC 3161 requires it, and verifiers reject tokens otherwise.',
  'tpl.timestamping.cn': 'Service name',
  'tpl.timestamping.cnPlaceholder': 'Acme Timestamping',
  'tpl.timestamping.sanHint': 'Optional.',

  'tpl.vpn-ipsec.label': 'IPsec VPN gateway',
  'tpl.vpn-ipsec.pitch': 'A VPN tunnel between two sites, or remote access.',
  'tpl.vpn-ipsec.detail':
    'Adds IPsec IKE on top of server and client, which is what most gateways expect.',
  'tpl.vpn-ipsec.cn': 'Gateway name',
  'tpl.vpn-ipsec.cnPlaceholder': 'vpn.example.com',
  'tpl.vpn-ipsec.sanHint': 'The public name and IP address of the gateway.',

  'tpl.intermediate-ca.label': 'Intermediate certificate authority',
  'tpl.intermediate-ca.pitch':
    'A subordinate authority that will sign certificates itself.',
  'tpl.intermediate-ca.detail':
    'basicConstraints CA:TRUE with a path length of 0, plus certificate and CRL signing. An authority carries no extended usage.',
  'tpl.intermediate-ca.cn': 'Authority name',
  'tpl.intermediate-ca.cnPlaceholder': 'Acme Issuing CA 1',
  'tpl.intermediate-ca.sanHint': 'An authority normally has no SAN.',
  'tpl.intermediate-ca.note1':
    'A compromised authority key compromises everything it signed. Encrypt it, or generate it inside an HSM.',

  'tpl.custom.label': 'Custom',
  'tpl.custom.pitch': 'Nothing preset: you choose every extension.',
  'tpl.custom.detail':
    'For an authority that imposes its own profile, or to reproduce an existing certificate.',
  'tpl.custom.cn': 'Common Name (CN)',
  'tpl.custom.cnPlaceholder': 'example.com',
  'tpl.custom.sanHint': 'Every SAN type is available.',

  // -------------------------------------------------------------------------
  // Key usage
  // -------------------------------------------------------------------------
  'ku.digitalSignature': 'Digital signature',
  'ku.digitalSignature.hint': 'Sign an exchange. Needed by almost everything.',
  'ku.nonRepudiation': 'Non-repudiation',
  'ku.nonRepudiation.hint': 'The signer cannot deny having signed.',
  'ku.keyEncipherment': 'Key encipherment',
  'ku.keyEncipherment.hint': 'RSA key exchange. Pointless with ECDHE alone.',
  'ku.dataEncipherment': 'Data encipherment',
  'ku.dataEncipherment.hint': 'Rare: encrypt data directly.',
  'ku.keyAgreement': 'Key agreement',
  'ku.keyAgreement.hint': 'Diffie-Hellman negotiation (EC keys).',
  'ku.keyCertSign': 'Certificate signing',
  'ku.keyCertSign.hint': 'Reserved for certificate authorities.',
  'ku.cRLSign': 'CRL signing',
  'ku.cRLSign.hint': 'Reserved for certificate authorities.',
  'ku.encipherOnly': 'Encipher only',
  'ku.encipherOnly.hint': 'Restricts keyAgreement to encryption.',
  'ku.decipherOnly': 'Decipher only',
  'ku.decipherOnly.hint': 'Restricts keyAgreement to decryption.',

  // -------------------------------------------------------------------------
  // Extended key usage
  // -------------------------------------------------------------------------
  'eku.serverAuth': 'TLS server authentication',
  'eku.serverAuth.hint': 'A server proves its identity (HTTPS).',
  'eku.clientAuth': 'TLS client authentication',
  'eku.clientAuth.hint': 'A client proves its identity (mTLS).',
  'eku.codeSigning': 'Code signing',
  'eku.codeSigning.hint': 'Sign a binary or a script.',
  'eku.emailProtection': 'S/MIME email',
  'eku.emailProtection.hint': 'Sign and encrypt email.',
  'eku.timeStamping': 'Timestamping',
  'eku.timeStamping.hint': 'RFC 3161 timestamping authority.',
  'eku.OCSPSigning': 'OCSP response signing',
  'eku.OCSPSigning.hint': 'Revocation responder.',
  'eku.ipsec': 'IPsec IKE',
  'eku.ipsec.hint': 'IPsec VPN tunnel.',
  'eku.smartcard': 'Smart card logon',
  'eku.smartcard.hint': 'Microsoft Smartcard Logon.',
  'eku.kdc': 'KDC authentication',
  'eku.kdc.hint': 'Kerberos domain controller.',
  'eku.efs': 'EFS file encryption',
  'eku.efs.hint': 'Windows Encrypting File System.',
  'eku.docSigning': 'Document signing',
  'eku.docSigning.hint': 'Microsoft Document Signing.',
  'eku.any': 'Any usage',
  'eku.any.hint': 'Best avoided: it defeats the purpose of the extension.',

  // -------------------------------------------------------------------------
  // New request
  // -------------------------------------------------------------------------
  'new.pickerTitle': 'What will this certificate be used for?',
  'new.pickerDesc':
    'Pick the purpose and the matching X.509 extensions are filled in. Everything stays editable afterwards.',
  'new.backToList': 'Certificates',
  'new.backToPicker': 'Change template',
  'new.modeSimple': 'Simple',
  'new.modeAdvanced': 'Advanced',
  'new.modeHelp':
    'Simple mode shows only what changes from one request to the next. Advanced mode opens the full subject, every X.509 extension and the attributes some authorities require.',

  'new.sanLabel': 'Subject alternative names (SAN)',
  'new.sanHelp':
    'The names the certificate actually covers. Browsers and TLS clients check this list, not the Common Name, which is now only a display label. Type a name then press Enter. An explicit prefix such as IP:10.0.0.1 forces the type.',
  'new.cnHelpAsSan': 'It is added automatically as the first alternative name.',
  'new.cnHelpNotSan':
    'The holder name. This template does not add it to the alternative names.',
  'new.sanTypeLabel': 'Name type',

  'new.folderLabel': 'Working folder name',
  'new.folderHint': 'Used as the folder name and as the file prefix.',
  'new.folderHelp':
    'Derived from the name above, but independent: a Common Name may contain spaces and accents, a folder name may not. Change it to file the request under a different label.',

  'new.subjectTitle': 'Certificate subject',
  'new.subjectHint': 'Who is asking for this certificate (the DN).',
  'new.subjectHelp':
    'The Distinguished Name identifies the holder. Most enterprise authorities rewrite these fields to match their own template, so do not be surprised if the issued certificate differs.',

  'field.country': 'Country (C)',
  'field.country.help': 'Two-letter ISO code: FR, BE, CH, CA.',
  'field.org': 'Organisation (O)',
  'field.org.help':
    'The exact legal name. A public authority checks it against an official registry and will reject an approximation.',
  'field.ous': 'Organisational units (OU)',
  'field.ous.hint': 'Repeatable: one line per level.',
  'field.ous.help':
    'Department or team. The CA/Browser Forum has banned this field in public certificates since 2022; it remains common in private authorities.',
  'field.email': 'Email',
  'field.email.hint': 'In the DN. For S/MIME, the email SAN is what counts.',
  'field.email.help':
    'Address placed in the Distinguished Name. Mail clients ignore it: for S/MIME, add an email SAN instead.',
  'field.state': 'State or province (ST)',
  'field.state.help': 'Full name, not abbreviated: "California", not "CA".',
  'field.locality': 'City (L)',
  'field.locality.help': 'City where the organisation is registered.',
  'field.street': 'Street',
  'field.street.help': 'Postal address. Only useful for extended validation certificates.',
  'field.postalCode': 'Postal code',
  'field.postalCode.help': 'Like the street, reserved for extended validation certificates.',
  'field.givenName': 'First name',
  'field.givenName.help': 'For a personal certificate. Separate from the Common Name.',
  'field.surname': 'Surname',
  'field.surname.help': 'For a personal certificate. Separate from the Common Name.',
  'field.title': 'Job title',
  'field.title.help': 'The holder job title. Rarely required.',
  'field.uid': 'User ID (UID)',
  'field.uid.help': 'Login identifier in an LDAP or Active Directory tree.',
  'field.serialNumber': 'Serial number',
  'field.serialNumber.hint': 'Unique identifier required by some authorities.',
  'field.serialNumber.help':
    'A subject attribute, not to be confused with the certificate serial number, which the authority assigns itself.',
  'field.businessCategory': 'Business category',
  'field.businessCategory.hint': 'Extended validation (EV) certificates.',
  'field.businessCategory.help':
    'Standard values: Private Organization, Government Entity, Business Entity, Non-Commercial Entity.',
  'field.dc': 'Domain components (DC)',
  'field.dc.hint': 'Directory style: "example", "com" gives DC=example,DC=com.',
  'field.dc.help':
    'A domain name split the way an LDAP directory does. Common in authorities backed by Active Directory.',

  'new.keyTitle': 'Private key',
  'new.keyHint': 'Algorithm, size and protection at rest.',
  'new.keyHelp':
    'The private key is generated here and never leaves this machine. The authority only receives the request, which carries the public key alone.',
  'field.keyType': 'Key type',
  'field.keyType.help':
    'RSA is accepted everywhere. EC gives shorter keys and faster handshakes, though a few older appliances refuse it. The remaining options serve narrow cases.',
  'field.bits': 'Size',
  'field.bits.hint': '2048 is enough everywhere; 3072 for code signing.',
  'field.bits.help':
    'The longer the key, the more each connection costs to sign. 2048 bits is still safe today; past 4096 the gain is theoretical and the cost is not.',
  'field.curve': 'Curve',
  'field.curve.hint': 'prime256v1 is the universal choice.',
  'field.curve.help':
    'prime256v1 (also called P-256) is accepted everywhere. secp384r1 for a higher level. Brainpool curves are required by some European administrations.',
  'field.mldsaLevel': 'Level',
  'field.mldsaLevel.hint': '65 matches the strength of AES-192.',
  'field.mldsaLevel.help':
    'ML-DSA is the post-quantum algorithm standardised by NIST (FIPS 204). Levels 44, 65 and 87 offer increasing margins at the cost of larger signatures.',
  'field.digest': 'Signature digest',
  'field.digest.help':
    'Hash function used to sign the request. SHA-256 is the norm. SHA-3 is sound but still poorly accepted by authorities.',
  'new.digestImplicit':
    'This algorithm picks its own digest, so the setting does not apply.',

  'new.encryptKey': 'Encrypt the private key on disk',
  'new.encryptKeyHint':
    'AES-256. The passphrase will be asked for every use of the key, including PFX assembly.',
  'new.encryptKeyHelp':
    'Without encryption, anyone who can read the file can impersonate the certificate holder. Recommended for an authority key, or anything living on a shared machine.',
  'field.passphrase': 'Passphrase',
  'field.passphrase.help':
    'It protects the key file. It is stored nowhere: lose it and the key is unrecoverable, which makes the certificate useless.',

  'new.extTitle': 'X.509 extensions',
  'new.extHint': 'What the certificate will be allowed to do.',
  'new.extHelp':
    'Extensions declare the permitted usages. An enterprise authority often applies its own template and overrides what you ask here; a public one will simply reject an inconsistent request.',
  'new.extNone': 'none',
  'new.extSummaryUsages': '{n} usages',
  'new.extSummaryEku': '{n} extended',

  'new.keyUsageTitle': 'Key usage',
  'new.keyUsageHelp':
    'Cryptographic operations the key may perform. Marked critical, software that does not understand the extension must reject the certificate rather than ignore it.',
  'new.ekuTitle': 'Extended key usage',
  'new.ekuHelp':
    'What the certificate is for, functionally. This is the field browsers, servers and Windows actually check. A missing usage means rejection, often with no clear message.',
  'new.critical': 'critical',
  'new.criticalHelp':
    'A critical extension must be understood for the certificate to be accepted. Software that does not know it must refuse the connection instead of skipping it.',
  'new.ekuByOid': 'Another usage, by OID:',
  'new.ekuByOidHelp':
    'For a proprietary usage missing from the catalogue. An OID is a dotted sequence of numbers, given by your authority documentation.',

  'new.constraintsTitle': 'Constraints',
  'new.isCa': 'This certificate is a certificate authority',
  'new.isCaHint': 'basicConstraints CA:TRUE. It will be able to sign other certificates.',
  'new.isCaHelp':
    'Tick this only to create an authority. A server certificate marked CA:TRUE is rejected by every browser.',
  'field.pathLen': 'Chain depth (pathlen)',
  'field.pathLen.hint':
    '0 = this authority can only sign end certificates. Empty = unconstrained.',
  'field.pathLen.help':
    'How many intermediate authorities may sit below this one. Setting 0 prevents a sub-authority and limits the damage if the key is compromised.',
  'new.ski': 'Subject key identifier',
  'new.skiHint': 'subjectKeyIdentifier = hash. Recommended, helps chain building.',
  'new.skiHelp':
    'A fingerprint of the public key. It lets software link a certificate to its issuer quickly. No known side effect, leave it ticked.',
  'new.mustStaple': 'OCSP must-staple',
  'new.mustStapleHint':
    'The server will have to staple an OCSP response, or browsers will refuse the connection.',
  'new.mustStapleHelp':
    'The server itself supplies proof that its certificate is not revoked, sparing the browser a round trip to the authority. Powerful, but a misconfigured server becomes entirely unreachable.',

  'field.policies': 'Certificate policies',
  'field.policies.hint': 'OIDs required by some authorities (e.g. 2.23.140.1.2.2).',
  'field.policies.help':
    'Identifiers of the policy the certificate is issued under. The authority sets these: fill this in only if its documentation asks for it.',
  'field.crl': 'CRL distribution points',
  'field.crl.hint': 'URLs of the revocation lists.',
  'field.crl.help':
    'Where to download the list of revoked certificates. Normally set by the authority, not by the requester.',
  'field.ocsp': 'OCSP responders',
  'field.ocsp.help':
    'Address of the service that answers "is this certificate revoked?" in real time. Set by the authority.',
  'field.caIssuers': 'Issuer certificate',
  'field.caIssuers.help':
    'Where to download the authority certificate, so a client can complete a partial chain.',

  'new.customExtTitle': 'Free-form extensions',
  'new.customExtDesc':
    'Written verbatim into the req_ext section, for an extension none of the fields above cover.',
  'new.customExtHelp':
    'An escape hatch for an unusual extension. The syntax is the OpenSSL configuration one: a name, an equals sign, a value. A mistake here makes generation fail.',
  'new.customExtAdd': 'Add an extension',

  'new.attrsTitle': 'Request attributes',
  'new.attrsHint': 'Fields required by some authorities.',
  'new.attrsHelp':
    'These attributes travel with the request but do not appear in the issued certificate. Fill them in only if your authority asks for them.',
  'field.challengePassword': 'Challenge password',
  'field.challengePassword.hint':
    'A secret shared with the authority, used later to request revocation.',
  'field.challengePassword.help':
    'A password filed with the request. Some authorities require it to prove, on the day of a revocation, that the request came from you.',
  'field.unstructuredName': 'Unstructured name',
  'field.unstructuredName.hint': 'Free text sent to the authority.',
  'field.unstructuredName.help':
    'A free comment field. Sometimes used to carry a ticket number or a cost centre.',
  'field.stringMask': 'String encoding',
  'field.stringMask.hint':
    'utf8only suits every modern authority. Change it only if yours asks you to.',
  'field.stringMask.help':
    'How subject characters are encoded. utf8only accepts accents. The other values exist for old authorities that only read ASCII.',

  'new.force': 'Overwrite an existing private key',
  'new.forceHint':
    'If a CSR is already with the authority, the certificate to come will be useless.',
  'new.forceHelp':
    'A certificate only works with the key that produced the request. Regenerating the key while the authority is signing makes the certificate you receive permanently unusable.',

  'new.submit': 'Generate the key and the CSR',
  'new.previewConfig': 'Configuration',
  'new.previewCommands': 'Commands',
  'new.previewIdle': 'Consistency checks will appear here as you type.',
  'new.previewFooter':
    'This is exactly what will be written to the configuration file and handed to openssl. Nothing is sent over the network.',
  'new.previewUnnamed': 'unnamed',

  'new.readyTitle': 'Certificate signing request',
  'new.readyDesc':
    'The private key and the CSR are written. Send the CSR to your authority, then drop its answer here.',
  'new.readyKey': '{desc} private key generated.',
  'new.readyKeyWarn':
    'It must never leave this machine: the authority only needs the CSR.',
  'new.readyKeyBackup':
    'It cannot be regenerated: the certificate the CA sends back is useless without it. Copy this folder somewhere else before sending the request, and you will not have to start over if this machine fails.',
  'new.readyFollow': 'Follow this request',
  'new.readyCopy': 'Copy the CSR',
  'new.readyRequested': 'What was requested',
  'new.readyShowDetail': 'Show detail',
  'new.readyHideDetail': 'Hide detail',
  'new.toastGenerated': 'CSR generated for {name}',
  'new.toastCopied': 'CSR copied to the clipboard',

  'label.subject': 'Subject',
  'label.san': 'SAN',
  'label.privateKey': 'Private key',
  'label.csr': 'CSR',
  'label.config': 'Configuration',
  'label.signedDir': 'CA responses',
  'label.issuer': 'Issuer',
  'label.validity': 'Validity',
  'label.usages': 'Usages',
  'label.key': 'Key',
  'label.fingerprint': 'Fingerprint',
  'label.requestedSans': 'Requested SANs',
  'label.present': 'present',
  'label.absent': 'missing',

  // -------------------------------------------------------------------------
  // Detail
  // -------------------------------------------------------------------------
  'detail.notFoundTitle': 'Folder not found',
  'detail.notFoundDesc': 'This name no longer has a folder in the working directory.',
  'detail.certInPlace': 'Certificate in place',
  'detail.step1': '1 · Signing request',
  'detail.step2': '2 · Authority response',
  'detail.step3': '3 · PFX assembly',
  'detail.openSigned': 'Open Signed/',
  'detail.dropHere': 'Drop here',
  'detail.noSignedTitle': 'No file received',
  'detail.noSignedDesc':
    'Drag the files your authority sent back, or select them. PEM, CRT, CER, DER and P7B are accepted.',
  'detail.pickFiles': 'Select files',
  'detail.dragMore': 'Drag more files to add them.',
  'detail.imported': '{n} file(s) added, {total} in total',
  'detail.dropError': 'The path of these files could not be read.',
  'detail.nothingToAssembleTitle': 'Nothing to assemble',
  'detail.nothingToAssembleDesc':
    'Drop the files your authority sent back at step 2 first.',
  'detail.noKeyDesc': 'The private key is missing, so the PFX cannot be built.',
  'detail.pfxPassword': 'PFX password',
  'detail.pfxPasswordHint':
    'It protects the private key inside the container. Send it separately from the file.',
  'detail.pfxPasswordHelp':
    'The PFX holds the private key. Without a strong password the file is worth the key itself. Send it through a different channel than the file.',
  'detail.suggest': 'Suggest',
  'detail.suggestHelp':
    'Draws a strong random password, fills both fields, shows it and copies it. Save it right away: the application keeps it nowhere.',
  'detail.suggested': 'Password copied. Save it now: it will not be kept.',
  'detail.confirm': 'Confirmation',
  'detail.mismatch': 'The two entries differ.',
  'detail.advancedOptions': 'Advanced options',
  'detail.friendlyName': 'Friendly name',
  'detail.friendlyNameHint': 'Name shown in the Windows certificate store.',
  'detail.friendlyNameHelp':
    'The label Windows will show after import. Purely cosmetic.',
  'detail.keyPassword': 'Private key password',
  'detail.keyPasswordHint': 'Only if the key on disk is encrypted.',
  'detail.keyPasswordHelp':
    'The passphrase chosen at generation time, if you asked for the key to be encrypted.',
  'detail.noPass': 'PFX without a password',
  'detail.noPassHint': 'The private key will no longer be protected inside the container.',
  'detail.noPassHelp':
    'Keep this for automated use where the file sits on an already encrypted disk. Whoever gets the file gets the key.',
  'detail.compat': 'Compatible encryption (3DES / SHA-1)',
  'detail.compatHint':
    'For Windows before 2016, Java 8 and older F5 appliances. Weaker than AES-256.',
  'detail.compatHelp':
    'Old software cannot open a PFX encrypted with AES-256. This option falls back to older, weaker encryption: enable it only when the import fails otherwise.',
  'detail.noRoot': 'Leave out the root CA',
  'detail.noRootHint': 'The root is already trusted by most systems.',
  'detail.noRootHelp':
    'Shipping the root is pointless and some appliances complain about it. Removing it makes the file lighter and breaks nothing, provided the target machine already trusts that authority.',
  'detail.assemble': 'Assemble the PFX',
  'detail.pfxExists': 'A PFX already exists and will be replaced.',
  'detail.chainTitle': 'Chain of trust',
  'detail.leafLabel': 'Server certificate',
  'detail.rootCa': 'Root CA',
  'detail.intermediateCa': 'Intermediate CA',
  'detail.unused': 'Unused ({n}), outside the chain of this certificate:',
  'detail.checksTitle': 'Checks',
  'detail.filesTitle': 'Files produced',
  'detail.filePfx': 'PKCS#12',
  'detail.fileCrt': 'Certificate only',
  'detail.fileChain': 'CA chain',
  'detail.fileFullchain': 'Leaf + chain (nginx, HAProxy)',
  'detail.importWindows': 'Import into the Windows store:',
  'detail.toastAssembled': 'PFX assembled: {name}',
  'detail.archive': 'Put away',
  'detail.archiveHelp':
    'Takes this folder out of the list without deleting anything: it moves to the .archive subfolder of your working folder. A deleted private key cannot be recovered, and a certificate already deployed would stop working: that is why nothing is destroyed here.',
  'detail.archiveConfirmTitle': 'Put {name} away?',
  'detail.archiveConfirmBody':
    'The folder moves to .archive, inside your working folder. Nothing is deleted, and you can put it back with the file explorer.',
  'detail.archiveConfirmOk': 'Put away',
  'detail.archived': '{name} moved to .archive',
  'detail.openArchive': 'Open .archive',
  'detail.csrTitle': 'Signing request',

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  'settings.title': 'Settings',
  'settings.desc':
    'Where to work, which openssl to use, and what to prefill in new requests.',
  'settings.saved': 'Settings saved',
  'settings.locations': 'Locations',
  'settings.root': 'Working folder',
  'settings.rootHint':
    'One subfolder per request is created here. Same as CERT_HOME for the CLI: both interfaces can share one folder.',
  'settings.rootHelp':
    'Avoid a synchronised folder (OneDrive, Dropbox, network share): private keys would be copied off the machine as soon as they are created.',
  'settings.browse': 'Browse',
  'settings.opensslPath': 'OpenSSL binary',
  'settings.opensslPathHint':
    '"openssl" is enough when it is on the PATH. Otherwise give the full path.',
  'settings.opensslPathHelp':
    'All cryptography goes through this binary. On Windows, Git for Windows ships one in C:\\Program Files\\Git\\mingw64\\bin.',
  'settings.opensslDetected': 'OpenSSL detected',
  'settings.test': 'Test',
  'settings.algorithms': 'Available algorithms',
  'settings.curves': 'Elliptic curves: {list}',
  'settings.noCurves': 'none detected',
  'settings.form': 'Form',
  'settings.language': 'Language',
  'settings.languageHint': 'Language of the interface and its messages.',
  'settings.languageHelp':
    'The change is immediate and affects display only. The files produced contain nothing but what you typed.',
  'settings.advancedDefault': 'Open requests in advanced mode',
  'settings.advancedDefaultHint':
    'Shows the full subject, the X.509 extensions and the request attributes right away.',
  'settings.subjectDefaults': 'Subject defaults',
  'settings.subjectDefaultsHelp':
    'Prefilled into new requests. Each request stays editable on its own.',
  'settings.updates': 'Version check',
  'settings.updatesLabel': 'Check at startup whether a newer version exists',
  'settings.updatesHint': 'Off by default. Nothing is contacted until you tick this box.',
  'settings.updatesHelp':
    'One request at startup, to the project releases page, to read a version number. No identifier is sent, nothing is downloaded or installed: if a newer version exists, a banner offers a link and you decide.',
  'settings.log': 'Log',
  'settings.logBody':
    'When a command fails, the reason is written here. The file never contains a private key, a certificate or a password: only the command that ran, its exit code and its error message.',
  'settings.logEmpty': 'Nothing has been written yet: the log only records failures.',
  'settings.logOpen': 'Open the log',
  'settings.privacy': 'Privacy',
  'settings.privacy1':
    'Private keys, CSRs and PFX files stay in the working folder. No data leaves this machine. The application makes no network request, unless you turn on the version check above, which then only reads a version number.',
  'settings.privacy2':
    'Passwords are never stored, here or in a session file. They live only for the duration of a PFX assembly, and reach openssl through its environment rather than its command line.',

  // -------------------------------------------------------------------------
  // Consistency checks
  // -------------------------------------------------------------------------
  'warn.cnRequired': 'The {field} is required.',
  'warn.sanRequired': 'This template needs at least one alternative name. {hint}',
  'warn.rsaTooSmall': 'An RSA key below 2048 bits has been rejected everywhere since 2014.',
  'warn.passphraseEmpty': 'Key encryption is requested but the passphrase is empty.',
  'warn.countryFormat': 'The country must be a two-letter code (FR, BE, CH, and so on).',
  'warn.dualEku':
    'A public TLS certificate can no longer carry clientAuth alongside serverAuth since June 2026. A public authority will reject this request.',
  'warn.publicIp': 'Few public authorities will issue a certificate with an IP address SAN.',
  'warn.internalName':
    'Not a public name: {names}. Use the "Internal server" template instead.',
  'warn.badWildcard':
    'Malformed wildcard: {name}. Only the *.example.com form is accepted.',
  'warn.noKeyUsage': 'The keyUsage extension is enabled but no usage is ticked.',
  'warn.ecKeyEncipherment':
    'keyEncipherment makes no sense with an EC key: ECDHE negotiates the key, it does not encrypt it.',
  'warn.caNoKeyCertSign':
    'CA:TRUE without keyCertSign: this authority could not sign any certificate.',
  'warn.keyCertSignNoCa':
    'keyCertSign on a certificate that is not a CA: inconsistent, and rejected by most authorities.',
  'warn.anyEku': '"Any usage" makes the other usages pointless.',
  'warn.codeSigningBits': 'Authorities require at least 3072 bits for code signing.',
  'warn.mustStaple':
    'OCSP must-staple: the server becomes unreachable if it staples no response.',
  'warn.mldsa':
    'ML-DSA is post-quantum and standardised (FIPS 204), but very few authorities sign it today. Check before sending.',
  'warn.eddsa':
    'Ed25519 and Ed448 remain poorly supported by enterprise authorities and network appliances.',
  'warn.caUnencrypted': 'An unencrypted authority key on disk is a serious risk.',
  'warn.newline': 'The "{field}" field cannot contain a line break.',

  // -------------------------------------------------------------------------
  // Errors
  // -------------------------------------------------------------------------
  'err.nameRequired': 'The request name is required.',
  'err.nameTooLong': 'Name too long (200 characters maximum).',
  'err.nameSeparator': 'The name cannot contain a path separator.',
  'err.nameInvalid': 'Invalid name.',
  'err.nameControlChar': 'The name contains a character forbidden in a folder name.',
  'err.nameCharset':
    'Invalid name: letters, digits, dot, dash, underscore and * only.',
  'err.keyExists':
    'A private key already exists for "{name}".\nIf a CSR is being signed by the authority, regenerating it would make the certificate to come unusable. Tick "Overwrite an existing private key" to proceed anyway.',
  'err.csrVerify': 'The generated CSR does not verify.',
  'err.opensslMissing': 'openssl not found ({bin}). Set its path in the settings.',
  'err.opensslTimeout': 'openssl did not answer within {sec} s.',
  'err.opensslFailed': 'openssl {cmd} failed{why}',
  'err.keyNotFound':
    'Private key not found: {path}\nCheck the name, or generate the CSR first.',
  'err.keyEncrypted': 'The private key is encrypted: enter its password.',
  'err.keyBadPassword': 'Private key unreadable: the password is probably wrong.',
  'err.keyUnreadable': 'Private key unreadable: {path}',
  'err.noSignedFiles':
    'No signed file. Drop the files your authority sent back into {dir}, or select them.',
  'err.noReadableCert': 'No readable certificate in the files provided.',
  'err.noMatchingCert':
    'None of the certificates provided matches the private key.\nThe authority may have signed a different CSR, or the key was regenerated since it was sent.',
  'err.emptyPassword':
    'Empty password. Tick "PFX without a password" if that is intended.',
  'err.urlRefused': 'Address refused: {url}',
  'err.rsaBits': 'Invalid RSA key size: {bits} (2048, 3072 or 4096).',

  // -------------------------------------------------------------------------
  // Assembly checks
  // -------------------------------------------------------------------------
  'check.ignored': '{n} file(s) ignored',
  'check.ignoredDetail': '{names}: neither PEM, DER, nor PKCS#7.',
  'check.distinct': '{n} distinct certificate(s) out of {total} read',
  'check.keyMatch': 'The certificate does match the private key',
  'check.incompleteChain': 'Incomplete chain',
  'check.incompleteChainDetail':
    'Missing issuer: {issuer}. Add the matching CA certificate.',
  'check.sanCovers': 'The SAN does cover {name}',
  'check.sanMissing': 'The SAN does not contain {name}',
  'check.sanMissingDetail': 'Browsers will refuse this certificate for that name.',
  'check.sansAbsent': '{n} requested SAN(s) missing from the certificate',
  'check.expired': 'The certificate has expired',
  'check.expiredDetail': 'Expired on {date}.',
  'check.valid': 'Certificate valid, expires in {n} day(s)',
  'check.chainVerified': 'Chain of trust verified',
  'check.verifyFailed': 'openssl verify fails',
  'check.samePublicKey': 'Same public key as the CSR that was sent',
  'check.pfxRead': 'PFX read back: {n} certificate(s) + 1 private key',
  'check.pfxUnreadable': 'The PFX produced could not be read back',

  // -------------------------------------------------------------------------
  // Menu and system
  // -------------------------------------------------------------------------
  'menu.file': 'File',
  'menu.quit': 'Quit',
  'menu.edit': 'Edit',
  'menu.undo': 'Undo',
  'menu.redo': 'Redo',
  'menu.cut': 'Cut',
  'menu.copy': 'Copy',
  'menu.paste': 'Paste',
  'menu.selectAll': 'Select all',
  'menu.view': 'View',
  'menu.reload': 'Reload',
  'menu.devTools': 'Developer tools',
  'menu.resetZoom': 'Actual size',
  'menu.zoomIn': 'Zoom in',
  'menu.zoomOut': 'Zoom out',
  'menu.fullscreen': 'Full screen',
  'menu.help': 'Help',
  'menu.repo': 'Project repository',

  'dialog.pickRoot': 'Working folder',
  'dialog.pickSigned': 'Files returned by the authority',
  'dialog.certificates': 'Certificates',
  'dialog.allFiles': 'All files',

  'san.DNS': 'DNS name',
  'san.IP': 'IP address',
  'san.email': 'Email',
  'san.URI': 'URI',
  'san.UPN': 'Windows UPN',
  'san.RID': 'Registered OID',
  'san.otherName': 'Other (OID)',
  'san.fromCn': 'from the CN',

  'settings.opensslBundled': 'Shipped with the application',
  'settings.opensslSystem': 'Installed on this machine',
  'settings.opensslBundledHelp':
    'The application ships its own copy of OpenSSL so it depends on nothing else. Leave "openssl" to use it; give a full path only if your organisation mandates a specific binary.',

  'new.readyWhere': 'Your request is ready',
  'new.readyWhereDesc':
    'The file is saved in your workspace. Send it to your certificate authority, then come back to drop its answer here.',
  'new.revealCsr': 'Show the file',
  'new.revealKey': 'Show the key',

  // Greyed examples. These are not values: nothing is prefilled.
  'ph.country': 'GB',
  'ph.state': 'Greater London',
  'ph.locality': 'London',
  'ph.org': 'Acme Ltd',
  'ph.ou': 'IT Department',
  'ph.email': 'pki@example.com',
  'ph.street': '12 High Street',
  'ph.postalCode': 'EC1A 1BB',
  'ph.givenName': 'Jane',
  'ph.surname': 'Doe',
  'ph.title': 'Security officer',
  'ph.uid': 'jdoe',
  'ph.serialNumber': 'SN-12345',
  'ph.businessCategory': 'Private Organization',
  'ph.dc': 'example',

  // The journey, as it appears in the sidebar.
  'nav.journey': 'The journey',
  'nav.step1': 'Create a request',
  'nav.step2': 'Waiting on the authority',
  'nav.step3': 'Ready to assemble',
  'nav.step4': 'Certificates ready',
  'nav.dashboard': 'Dashboard',

  // -------------------------------------------------------------------------
  // Workspace
  // -------------------------------------------------------------------------
  'workspace.label': 'Workspace',
  'workspace.desc': 'All your requests are filed here, one folder each.',
  'workspace.change': 'Change folder',
  'workspace.open': 'Open',
  'workspace.first': 'First thing to do: choose where to work.',
  'workspace.changed': 'Workspace: {path}',
  'workspace.willContain': 'Each request gets its own folder in there:',
  'workspace.fileKey': 'the private key, which never leaves it',
  'workspace.fileCsr': 'the request to send to your authority',
  'workspace.fileSigned': 'a Signed/ folder to drop its answer into',
  'workspace.filePfx': 'the final certificate, in every format',

  // -------------------------------------------------------------------------
  // Getting started wizard
  // -------------------------------------------------------------------------
  'wizard.reopen': 'How it works',
  'wizard.step': 'Step {n} of {total}',
  'wizard.next': 'Next',
  'wizard.back': 'Back',
  'wizard.skip': 'Skip',
  'wizard.start': 'Get started',
  'wizard.close': 'Close',

  'wizard.welcome.title': 'Getting a certificate, end to end',
  'wizard.welcome.body':
    'A certificate is not downloaded: you request one, an authority signs it, then you recombine it with your private key. This guide covers those three moments in about a minute. You can reopen it any time from the left bar.',
  'wizard.welcome.note':
    'Nothing leaves this machine. The application makes no network request: you send the request to your authority yourself, through your usual channel.',

  'wizard.folder.title': 'Where do you want to work?',
  'wizard.folder.body':
    'Each request gets its own folder here: the private key, the request, the authority response and the final certificate. This is the only place the application writes to.',
  'wizard.folder.warn':
    'Avoid a synchronised folder (OneDrive, Dropbox, network share). A private key would be copied off the machine as soon as it is created.',
  'wizard.folder.current': 'Selected folder',
  'wizard.folder.choose': 'Choose a folder',

  'wizard.flow.title': 'Three moments, with a wait in the middle',
  'wizard.flow.body':
    'The second step is out of your hands: it happens at the certificate authority, and can take minutes or days. The application keeps track of your pending requests.',
  'wizard.flow.s1': 'You create the request',
  'wizard.flow.s1d':
    'The application generates a private key, which stays here, and a signing request (CSR) that carries only its public half.',
  'wizard.flow.s2': 'The authority signs',
  'wizard.flow.s2d':
    'You send the .csr file to your authority, through its portal or a ticket. It sends back a signed certificate.',
  'wizard.flow.s3': 'You assemble',
  'wizard.flow.s3d':
    'You drop the response into the application, which recombines it with the private key kept here to produce files a server can load.',

  'wizard.create.title': 'What you create, and what leaves',
  'wizard.create.body':
    'Start by picking what the certificate is for: website, smart card, code signing. The matching X.509 extensions are filled in, and checks flag anything an authority would reject.',
  'wizard.create.keep': 'Stays on this machine',
  'wizard.create.keepDesc':
    'The private key (.key.pem). It must never be sent: whoever holds it can impersonate you.',
  'wizard.create.send': 'Goes to the authority',
  'wizard.create.sendDesc':
    'The request (.csr). It carries your identity and the public key, nothing secret. Paste it into a portal or attach the file.',

  'wizard.assemble.title': 'Where everything comes back together',
  'wizard.assemble.body':
    'This is the step people misread the first time. The certificate the authority returns holds only the public half: on its own it is useless. It has to be reunited with the private key kept on this machine.',
  'wizard.assemble.how':
    'Drag the files you received onto the matching request, and the application does the rest: it finds the right certificate by comparing keys, rebuilds the chain up to the root authority, checks dates and names, then produces the final container.',
  'wizard.assemble.formats': 'Every response format is accepted: PEM, CRT, CER, DER, P7B.',

  'wizard.formats.title': 'What you end up with',
  'wizard.formats.body':
    'One certificate comes in several shapes depending on the server that reads it. The application produces them all at once.',
  'wizard.done.title': 'You are ready',
  'wizard.done.body':
    'Create your first request, or go to the list if your working folder already holds some.',
  'wizard.done.action': 'Create a request',

  // -------------------------------------------------------------------------
  // Output formats
  // -------------------------------------------------------------------------
  'formats.title': 'Which file for which server?',
  'formats.help':
    'The same certificate, packaged differently. Take the row that matches your server and ignore the rest.',
  'formats.pfx.who': 'Windows, IIS, Exchange, Java, Tomcat',
  'formats.pfx.what':
    'The PKCS#12 container: certificate, chain and private key in one password-protected file.',
  'formats.fullchain.who': 'nginx, HAProxy, Traefik',
  'formats.fullchain.what':
    'The certificate followed by its chain, to be given alongside the private key as a separate file.',
  'formats.crt.who': 'Apache, Postfix, Dovecot',
  'formats.crt.what':
    'The certificate on its own. These servers want the chain in a separate directive.',
  'formats.chain.who': 'Authority chain',
  'formats.chain.what':
    'The intermediate certificates, without yours. Reference it where the server asks for it.',
  'formats.key.who': 'Private key',
  'formats.key.what':
    'Needed next to the certificate for nginx and Apache. Already inside the PFX.',

  // -------------------------------------------------------------------------
  // Request progress
  // -------------------------------------------------------------------------
  'flow.title': 'Where this request stands',
  'flow.s1': 'Request created',
  'flow.s2': 'Sent to the authority',
  'flow.s3': 'Response received',
  'flow.s4': 'Certificate ready',
  'flow.todo': 'What to do now',
  'flow.todo.send':
    'Send the .csr file to your certificate authority, then come back here once it has answered.',
  'flow.todo.drop': 'Drop the files the authority returned into step 2 below.',
  'flow.todo.assemble':
    'The files are here. Assemble the final certificate at step 3: choose a password and run it.',
  'flow.todo.done': 'The certificate is ready. Take the format your server needs.',
  'flow.todo.broken':
    'The private key is missing from this folder. Without it the certificate cannot be assembled.',
  'detail.step3Explain':
    'The certificate returned by the authority holds only the public half. Assembly recombines it with the private key kept on this machine, adds the chain, and produces a file a server can load.',
}
