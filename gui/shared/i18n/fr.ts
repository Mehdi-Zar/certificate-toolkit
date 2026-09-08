/**
 * Textes francais. Cette table fait foi : le fichier anglais doit en couvrir
 * chaque cle, et TypeScript le verifie a la compilation.
 *
 * Les valeurs peuvent contenir des marqueurs {nom}, remplaces a l'appel.
 */
export const fr = {
  // -------------------------------------------------------------------------
  // Application
  // -------------------------------------------------------------------------
  'app.subtitle': 'Certificats X.509',
  'nav.certificates': 'Certificats',
  'nav.newRequest': 'Nouvelle demande',
  'nav.settings': 'Réglages',

  'theme.system': 'Thème du système',
  'theme.light': 'Thème clair',
  'theme.dark': 'Thème sombre',

  'openssl.label': 'OpenSSL',
  'openssl.notFound': 'OpenSSL introuvable',
  'openssl.blocked': 'OpenSSL est introuvable, aucune opération n’est possible.',
  'openssl.setPath': 'Indiquer le chemin',

  'common.cancel': 'Annuler',
  'common.save': 'Enregistrer',
  'common.add': 'Ajouter',
  'common.remove': 'Retirer',
  'common.copy': 'Copier',
  'common.copied': 'Copié',
  'common.show': 'Afficher',
  'common.hide': 'Masquer',
  'common.openFolder': 'Ouvrir le dossier',
  'common.reveal': 'Montrer dans l’explorateur',
  'common.refresh': 'Actualiser',
  'common.none': '(aucun)',
  'common.unknown': '(inconnu)',
  'common.reading': 'Lecture…',
  'common.help': 'Aide',

  // -------------------------------------------------------------------------
  // Liste des certificats
  // -------------------------------------------------------------------------
  'list.title': 'Certificats',
  'list.filter': 'Filtrer par nom ou SAN',
  'list.filterLabel': 'Filtrer',
  'list.tabAll': 'Tous',
  'list.tabTodo': 'À traiter',
  'list.emptyTitle': 'Aucun certificat',
  'list.emptyDesc':
    'La racine de travail ne contient encore aucun dossier de demande. Commencez par générer une CSR.',
  'list.noResultTitle': 'Aucun résultat',
  'list.noResultDesc': 'Aucun dossier ne correspond à ce filtre.',
  'list.keyUnknown': 'clé inconnue',
  'list.extraSans': '{n} SAN supplémentaire(s)',
  'list.filesReceived': '{n} fichier(s) reçu(s)',
  'list.createdOn': 'créé le {date}',
  'list.expiresIn': 'expire dans {n} jour(s)',
  'list.expiresToday': 'expire aujourd’hui',
  'list.expiredSince': 'expiré depuis {n} jour(s)',

  'status.awaiting-pki': 'En attente PKI',
  'status.awaiting-pki.hint': 'La CSR est prête. Envoyez-la à la PKI.',
  'status.ready-to-assemble': 'À assembler',
  'status.ready-to-assemble.hint': 'La PKI a répondu. Assemblez le PFX.',
  'status.issued': 'Émis',
  'status.issued.hint': 'Le PFX est disponible.',
  'status.expiring': 'À renouveler',
  'status.expiring.hint': 'Le certificat expire bientôt.',
  'status.expired': 'Expiré',
  'status.expired.hint': 'Le certificat n’est plus valide.',
  'status.broken': 'Incomplet',
  'status.broken.hint': 'Dossier incomplet : clé privée absente ou illisible.',

  // -------------------------------------------------------------------------
  // Catégories et modèles
  // -------------------------------------------------------------------------
  'category.web': 'Sites et services web',
  'category.identite': 'Identité et authentification',
  'category.signature': 'Signature',
  'category.infra': 'Infrastructure',
  'category.autorite': 'Autorités et cas particuliers',

  'tpl.tls-public.label': 'Site web public (HTTPS)',
  'tpl.tls-public.pitch':
    'Un site accessible depuis Internet, dont le certificat sera signé par une autorité publique.',
  'tpl.tls-public.detail':
    'Usage limité à l’authentification serveur, comme l’exige le CA/Browser Forum. Les noms doivent être des noms DNS publics : une adresse IP ou un nom interne serait refusé.',
  'tpl.tls-public.cn': 'Nom de domaine',
  'tpl.tls-public.cnPlaceholder': 'www.exemple.fr',
  'tpl.tls-public.sanHint':
    'Ajoutez tous les noms que le site doit servir : exemple.fr, www.exemple.fr, etc.',
  'tpl.tls-public.note1':
    'Depuis juin 2026, un certificat TLS public ne peut plus porter clientAuth en plus de serverAuth. Pour du mTLS, prenez le modèle « Serveur interne » ou demandez deux certificats.',
  'tpl.tls-public.note2':
    'Les validités publiques passent à 200 jours en 2026, puis 100 en 2027. Prévoyez un renouvellement automatisé.',

  'tpl.tls-internal.label': 'Serveur interne (PKI d’entreprise)',
  'tpl.tls-internal.pitch':
    'Un service sur le réseau interne, signé par l’autorité de votre organisation.',
  'tpl.tls-internal.detail':
    'Serveur et client, ce qui permet aussi le mTLS. Les adresses IP et les noms non publics sont acceptés : les règles du CA/Browser Forum ne s’appliquent pas à une PKI privée.',
  'tpl.tls-internal.cn': 'Nom du serveur',
  'tpl.tls-internal.cnPlaceholder': 'app.interne.local',
  'tpl.tls-internal.sanHint': 'Noms DNS et adresses IP par lesquels le service est joint.',

  'tpl.tls-muststaple.label': 'Site web avec agrafage OCSP obligatoire',
  'tpl.tls-muststaple.pitch':
    'Comme un site public, mais le serveur doit prouver à chaque connexion que le certificat n’est pas révoqué.',
  'tpl.tls-muststaple.detail':
    'Ajoute l’extension tlsfeature=status_request. Le navigateur refusera la connexion si le serveur n’agrafe pas de réponse OCSP : à n’activer que si votre serveur est configuré pour le faire.',
  'tpl.tls-muststaple.cn': 'Nom de domaine',
  'tpl.tls-muststaple.cnPlaceholder': 'www.exemple.fr',
  'tpl.tls-muststaple.sanHint': 'Tous les noms que le site doit servir.',
  'tpl.tls-muststaple.note1':
    'Un serveur qui n’agrafe pas de réponse OCSP deviendra injoignable. Vérifiez la configuration avant de déployer.',

  'tpl.client-mtls.label': 'Client mTLS (machine ou service)',
  'tpl.client-mtls.pitch':
    'Une application qui doit prouver son identité pour appeler une API protégée.',
  'tpl.client-mtls.detail':
    'Authentification client uniquement. Le nom peut être un identifiant de service plutôt qu’un nom DNS.',
  'tpl.client-mtls.cn': 'Identifiant du client',
  'tpl.client-mtls.cnPlaceholder': 'service-paiement',
  'tpl.client-mtls.sanHint': 'Facultatif. Certaines passerelles exigent un SAN URI ou DNS.',

  'tpl.smime.label': 'Messagerie S/MIME',
  'tpl.smime.pitch': 'Signer et chiffrer les courriels d’une personne.',
  'tpl.smime.detail':
    'Le nom est celui de la personne et l’adresse email doit figurer en SAN : c’est elle que les clients de messagerie vérifient, pas le CN.',
  'tpl.smime.cn': 'Nom de la personne',
  'tpl.smime.cnPlaceholder': 'Jean Dupont',
  'tpl.smime.sanHint': 'L’adresse email du titulaire. Obligatoire.',

  'tpl.smartcard.label': 'Ouverture de session par carte à puce',
  'tpl.smartcard.pitch':
    'Se connecter à un poste Windows avec une carte à puce au lieu d’un mot de passe.',
  'tpl.smartcard.detail':
    'Authentification client plus l’usage Microsoft Smartcard Logon. Le SAN doit contenir l’UPN du compte Active Directory (otherName), sans quoi le contrôleur de domaine refusera l’ouverture de session.',
  'tpl.smartcard.cn': 'Nom du titulaire',
  'tpl.smartcard.cnPlaceholder': 'Jean Dupont',
  'tpl.smartcard.sanHint':
    'L’UPN du compte, sous la forme jdupont@exemple.local. Obligatoire.',

  'tpl.domain-controller.label': 'Contrôleur de domaine Active Directory',
  'tpl.domain-controller.pitch': 'Le certificat que présente un contrôleur de domaine Windows.',
  'tpl.domain-controller.detail':
    'Serveur, client et authentification KDC. Le SAN doit porter le nom DNS complet du domaine, faute de quoi l’ouverture de session par carte à puce échoue avec l’événement KDC 29.',
  'tpl.domain-controller.cn': 'Nom du contrôleur',
  'tpl.domain-controller.cnPlaceholder': 'dc01.exemple.local',
  'tpl.domain-controller.sanHint':
    'Le nom du contrôleur et le nom DNS du domaine (exemple.local).',

  'tpl.code-signing.label': 'Signature de code',
  'tpl.code-signing.pitch':
    'Signer un logiciel pour que le système d’exploitation l’accepte sans avertissement.',
  'tpl.code-signing.detail':
    'Signature numérique seule, clé RSA 3072 bits au minimum. Les autorités publiques imposent aujourd’hui que la clé vive dans un module matériel (HSM ou token) : vérifiez leurs conditions avant de générer une clé logicielle.',
  'tpl.code-signing.cn': 'Nom de l’éditeur',
  'tpl.code-signing.cnPlaceholder': 'Ma Société SAS',
  'tpl.code-signing.sanHint': 'Facultatif pour la signature de code.',
  'tpl.code-signing.note1':
    'Une clé de signature de code générée sur un poste ne sera pas acceptée par une autorité publique : elles exigent un HSM certifié.',

  'tpl.timestamping.label': 'Autorité d’horodatage',
  'tpl.timestamping.pitch': 'Délivrer des preuves de date pour des signatures (RFC 3161).',
  'tpl.timestamping.detail':
    'L’usage étendu doit être critique et unique : c’est une exigence de la RFC 3161, sans quoi les vérificateurs rejettent les jetons.',
  'tpl.timestamping.cn': 'Nom du service',
  'tpl.timestamping.cnPlaceholder': 'Horodatage Ma Société',
  'tpl.timestamping.sanHint': 'Facultatif.',

  'tpl.vpn-ipsec.label': 'Passerelle VPN IPsec',
  'tpl.vpn-ipsec.pitch': 'Un tunnel VPN entre deux sites, ou un accès distant.',
  'tpl.vpn-ipsec.detail':
    'Ajoute l’usage IPsec IKE en plus de serveur et client, ce qu’attendent la plupart des passerelles.',
  'tpl.vpn-ipsec.cn': 'Nom de la passerelle',
  'tpl.vpn-ipsec.cnPlaceholder': 'vpn.exemple.fr',
  'tpl.vpn-ipsec.sanHint': 'Le nom public et l’adresse IP de la passerelle.',

  'tpl.intermediate-ca.label': 'Autorité de certification intermédiaire',
  'tpl.intermediate-ca.pitch':
    'Une autorité subordonnée, qui signera elle-même des certificats.',
  'tpl.intermediate-ca.detail':
    'basicConstraints CA:TRUE avec une profondeur de 0, et les usages de signature de certificats et de CRL. Une CA ne porte pas d’usage étendu.',
  'tpl.intermediate-ca.cn': 'Nom de l’autorité',
  'tpl.intermediate-ca.cnPlaceholder': 'Ma Société Issuing CA 1',
  'tpl.intermediate-ca.sanHint': 'Une CA n’a normalement pas de SAN.',
  'tpl.intermediate-ca.note1':
    'Une clé de CA compromise compromet tout ce qu’elle a signé. Chiffrez-la, ou générez-la dans un HSM.',

  'tpl.custom.label': 'Personnalisé',
  'tpl.custom.pitch': 'Rien de pré-rempli : vous choisissez chaque extension.',
  'tpl.custom.detail':
    'Pour une PKI qui impose un profil particulier, ou pour reproduire un certificat existant.',
  'tpl.custom.cn': 'Common Name (CN)',
  'tpl.custom.cnPlaceholder': 'exemple.fr',
  'tpl.custom.sanHint': 'Tous les types de SAN sont disponibles.',

  // -------------------------------------------------------------------------
  // Usages de clé
  // -------------------------------------------------------------------------
  'ku.digitalSignature': 'Signature numérique',
  'ku.digitalSignature.hint': 'Signer un échange. Nécessaire à presque tout.',
  'ku.nonRepudiation': 'Non-répudiation',
  'ku.nonRepudiation.hint': 'Le signataire ne peut pas nier son geste.',
  'ku.keyEncipherment': 'Chiffrement de clé',
  'ku.keyEncipherment.hint': 'Échange de clé RSA. Inutile en ECDHE seul.',
  'ku.dataEncipherment': 'Chiffrement de données',
  'ku.dataEncipherment.hint': 'Rare : chiffrer directement des données.',
  'ku.keyAgreement': 'Accord de clé',
  'ku.keyAgreement.hint': 'Négociation Diffie-Hellman (clés EC).',
  'ku.keyCertSign': 'Signature de certificats',
  'ku.keyCertSign.hint': 'Réservé aux autorités de certification.',
  'ku.cRLSign': 'Signature de CRL',
  'ku.cRLSign.hint': 'Réservé aux autorités de certification.',
  'ku.encipherOnly': 'Chiffrement seul',
  'ku.encipherOnly.hint': 'Restreint keyAgreement au chiffrement.',
  'ku.decipherOnly': 'Déchiffrement seul',
  'ku.decipherOnly.hint': 'Restreint keyAgreement au déchiffrement.',

  // -------------------------------------------------------------------------
  // Usages étendus
  // -------------------------------------------------------------------------
  'eku.serverAuth': 'Authentification serveur TLS',
  'eku.serverAuth.hint': 'Un serveur prouve son identité (HTTPS).',
  'eku.clientAuth': 'Authentification client TLS',
  'eku.clientAuth.hint': 'Un client prouve son identité (mTLS).',
  'eku.codeSigning': 'Signature de code',
  'eku.codeSigning.hint': 'Signer un binaire ou un script.',
  'eku.emailProtection': 'Messagerie S/MIME',
  'eku.emailProtection.hint': 'Signer et chiffrer des courriels.',
  'eku.timeStamping': 'Horodatage',
  'eku.timeStamping.hint': 'Autorité d’horodatage RFC 3161.',
  'eku.OCSPSigning': 'Signature de réponses OCSP',
  'eku.OCSPSigning.hint': 'Répondeur de révocation.',
  'eku.ipsec': 'IPsec IKE',
  'eku.ipsec.hint': 'Tunnel VPN IPsec.',
  'eku.smartcard': 'Ouverture de session par carte à puce',
  'eku.smartcard.hint': 'Microsoft Smartcard Logon.',
  'eku.kdc': 'Authentification KDC',
  'eku.kdc.hint': 'Contrôleur de domaine Kerberos.',
  'eku.efs': 'Chiffrement de fichiers EFS',
  'eku.efs.hint': 'Windows Encrypting File System.',
  'eku.docSigning': 'Signature de document',
  'eku.docSigning.hint': 'Microsoft Document Signing.',
  'eku.any': 'Tous usages',
  'eku.any.hint': 'À éviter : annule l’intérêt de l’extension.',

  // -------------------------------------------------------------------------
  // Nouvelle demande
  // -------------------------------------------------------------------------
  'new.pickerTitle': 'À quoi servira ce certificat ?',
  'new.pickerDesc':
    'Choisissez l’usage : les extensions X.509 correspondantes seront pré-remplies. Tout reste modifiable ensuite.',
  'new.backToList': 'Certificats',
  'new.backToPicker': 'Changer de modèle',
  'new.modeSimple': 'Simple',
  'new.modeAdvanced': 'Avancé',
  'new.modeHelp':
    'Le mode simple ne montre que ce qui change d’une demande à l’autre. Le mode avancé ouvre le sujet complet, toutes les extensions X.509 et les attributs exigés par certaines PKI.',

  'new.sanLabel': 'Noms alternatifs (SAN)',
  'new.sanHelp':
    'Les noms que le certificat couvrira réellement. Les navigateurs et les clients TLS vérifient cette liste, pas le Common Name, qui n’est plus qu’un libellé d’affichage. Tapez un nom puis Entrée. Un préfixe explicite comme IP:10.0.0.1 force le type.',
  'new.cnHelpAsSan': 'Il sera ajouté automatiquement comme premier nom alternatif.',
  'new.cnHelpNotSan':
    'Le nom du titulaire. Il n’est pas ajouté aux noms alternatifs pour ce modèle.',
  'new.sanTypeLabel': 'Type de nom',

  'new.folderLabel': 'Nom du dossier de travail',
  'new.folderHint': 'Sert de nom de dossier et de préfixe aux fichiers.',
  'new.folderHelp':
    'Dérivé du nom ci-dessus, mais indépendant : le Common Name peut contenir des espaces et des accents, pas un nom de dossier. Changez-le si vous voulez ranger la demande sous un autre libellé.',

  'new.subjectTitle': 'Sujet du certificat',
  'new.subjectHint': 'Qui demande ce certificat (le DN).',
  'new.subjectHelp':
    'Le Distinguished Name identifie le titulaire. La plupart des PKI d’entreprise réécrivent ces champs selon leur propre gabarit : renseignez ce que la vôtre demande, sans vous étonner si le certificat délivré diffère.',

  'field.country': 'Pays (C)',
  'field.country.help': 'Code ISO à deux lettres : FR, BE, CH, CA.',
  'field.org': 'Organisation (O)',
  'field.org.help':
    'La raison sociale exacte. Une autorité publique la vérifie auprès d’un registre officiel et refusera une variante approximative.',
  'field.ous': 'Unités d’organisation (OU)',
  'field.ous.hint': 'Répétable : une ligne par niveau hiérarchique.',
  'field.ous.help':
    'Service ou équipe. Le CA/Browser Forum interdit ce champ dans les certificats publics depuis 2022 ; il reste courant en PKI privée.',
  'field.email': 'Email',
  'field.email.hint': 'Dans le DN. Pour du S/MIME, c’est le SAN email qui compte.',
  'field.email.help':
    'Adresse placée dans le Distinguished Name. Les clients de messagerie ne la lisent pas : pour du S/MIME, ajoutez un SAN de type email.',
  'field.state': 'Région ou État (ST)',
  'field.state.help': 'Nom complet, non abrégé : « Île-de-France », pas « IDF ».',
  'field.locality': 'Ville (L)',
  'field.locality.help': 'Ville du siège de l’organisation.',
  'field.street': 'Rue',
  'field.street.help': 'Adresse postale. Utile seulement pour les certificats à validation étendue.',
  'field.postalCode': 'Code postal',
  'field.postalCode.help': 'Comme la rue, réservé aux certificats à validation étendue.',
  'field.givenName': 'Prénom',
  'field.givenName.help': 'Pour un certificat de personne. Distinct du Common Name.',
  'field.surname': 'Nom de famille',
  'field.surname.help': 'Pour un certificat de personne. Distinct du Common Name.',
  'field.title': 'Fonction',
  'field.title.help': 'Intitulé de poste du titulaire. Rarement exigé.',
  'field.uid': 'Identifiant (UID)',
  'field.uid.help': 'Identifiant de connexion dans un annuaire LDAP ou Active Directory.',
  'field.serialNumber': 'Numéro de série',
  'field.serialNumber.hint': 'Identifiant unique imposé par certaines PKI.',
  'field.serialNumber.help':
    'Attribut du sujet, à ne pas confondre avec le numéro de série du certificat, que l’autorité attribue elle-même.',
  'field.businessCategory': 'Catégorie d’entreprise',
  'field.businessCategory.hint': 'Certificats à validation étendue (EV).',
  'field.businessCategory.help':
    'Valeurs normalisées : Private Organization, Government Entity, Business Entity, Non-Commercial Entity.',
  'field.dc': 'Composants de domaine (DC)',
  'field.dc.hint': 'Style annuaire : « exemple », « fr » donne DC=exemple,DC=fr.',
  'field.dc.help':
    'Décomposition d’un nom de domaine à la manière d’un annuaire LDAP. Fréquent dans les PKI adossées à Active Directory.',

  'new.keyTitle': 'Clé privée',
  'new.keyHint': 'Algorithme, taille et protection au repos.',
  'new.keyHelp':
    'La clé privée est générée ici et ne quitte jamais ce poste. La PKI ne reçoit que la demande, qui contient uniquement la clé publique.',
  'field.keyType': 'Type de clé',
  'field.keyType.help':
    'RSA est accepté partout. EC produit des clés plus courtes et des poignées de main plus rapides, mais quelques équipements anciens le refusent. Les autres options sont réservées à des cas précis.',
  'field.bits': 'Taille',
  'field.bits.hint': '2048 suffit partout ; 3072 pour la signature de code.',
  'field.bits.help':
    'Plus la clé est longue, plus la signature coûte cher à chaque connexion. 2048 bits reste sûr aujourd’hui ; au-delà de 4096, le gain est théorique et le coût bien réel.',
  'field.curve': 'Courbe',
  'field.curve.hint': 'prime256v1 est le choix universel.',
  'field.curve.help':
    'prime256v1 (aussi appelée P-256) est acceptée partout. secp384r1 pour un niveau supérieur. Les courbes brainpool sont exigées par certaines administrations européennes.',
  'field.mldsaLevel': 'Niveau',
  'field.mldsaLevel.hint': '65 correspond à la robustesse d’AES-192.',
  'field.mldsaLevel.help':
    'ML-DSA est l’algorithme post-quantique normalisé par le NIST (FIPS 204). Les niveaux 44, 65 et 87 correspondent à des marges de sécurité croissantes, au prix de signatures plus volumineuses.',
  'field.digest': 'Empreinte de signature',
  'field.digest.help':
    'Fonction de hachage utilisée pour signer la demande. SHA-256 est la norme. SHA-3 est solide mais encore mal accepté par les PKI.',
  'new.digestImplicit':
    'Cet algorithme choisit lui-même son empreinte : le réglage ne s’applique pas.',

  'new.encryptKey': 'Chiffrer la clé privée sur le disque',
  'new.encryptKeyHint':
    'AES-256. La phrase secrète sera demandée à chaque usage de la clé, y compris pour assembler le PFX.',
  'new.encryptKeyHelp':
    'Sans chiffrement, quiconque lit le fichier peut se faire passer pour le titulaire du certificat. Recommandé pour une clé d’autorité ou tout ce qui reste longtemps sur un poste partagé.',
  'field.passphrase': 'Phrase secrète',
  'field.passphrase.help':
    'Elle protège le fichier de clé. Elle n’est enregistrée nulle part : si vous la perdez, la clé est irrécupérable et le certificat inutilisable.',

  'new.extTitle': 'Extensions X.509',
  'new.extHint': 'Ce que le certificat aura le droit de faire.',
  'new.extHelp':
    'Les extensions déclarent les usages autorisés. Une PKI d’entreprise applique souvent son propre gabarit et remplace ce que vous demandez ici ; une autorité publique, elle, refusera une demande incohérente.',
  'new.extNone': 'aucune',
  'new.extSummaryUsages': '{n} usages',
  'new.extSummaryEku': '{n} étendus',

  'new.keyUsageTitle': 'Usages de la clé',
  'new.keyUsageHelp':
    'Opérations cryptographiques que la clé a le droit d’effectuer. Marquée critique, un logiciel qui ne comprend pas cette extension doit refuser le certificat plutôt que de l’ignorer.',
  'new.ekuTitle': 'Usages étendus',
  'new.ekuHelp':
    'À quoi le certificat sert, fonctionnellement. C’est le champ que vérifient les navigateurs, les serveurs et Windows. Un usage manquant se traduit par un refus, souvent sans message clair.',
  'new.critical': 'critique',
  'new.criticalHelp':
    'Une extension critique doit être comprise pour que le certificat soit accepté. Un logiciel qui ne la connaît pas doit refuser la connexion au lieu de passer outre.',
  'new.ekuByOid': 'Autre usage, par son OID :',
  'new.ekuByOidHelp':
    'Pour un usage propriétaire absent du catalogue. Un OID est une suite de nombres séparés par des points, fournie par la documentation de votre PKI.',

  'new.constraintsTitle': 'Contraintes',
  'new.isCa': 'Ce certificat est une autorité de certification',
  'new.isCaHint': 'basicConstraints CA:TRUE. Il pourra signer d’autres certificats.',
  'new.isCaHelp':
    'À ne cocher que pour créer une autorité. Un certificat de serveur marqué CA:TRUE est rejeté par tous les navigateurs.',
  'field.pathLen': 'Profondeur de chaîne (pathlen)',
  'field.pathLen.hint':
    '0 = cette CA ne peut signer que des certificats finaux. Vide = non contraint.',
  'field.pathLen.help':
    'Nombre d’autorités intermédiaires autorisées sous celle-ci. Mettre 0 empêche la création d’une sous-autorité et limite les dégâts en cas de compromission.',
  'new.ski': 'Identifiant de clé du sujet',
  'new.skiHint': 'subjectKeyIdentifier = hash. Recommandé, aide au chaînage.',
  'new.skiHelp':
    'Empreinte de la clé publique. Elle permet aux logiciels de relier rapidement un certificat à son émetteur. Sans effet de bord connu, laissez cochée.',
  'new.mustStaple': 'Agrafage OCSP obligatoire',
  'new.mustStapleHint':
    'Le serveur devra agrafer une réponse OCSP, sinon les navigateurs refuseront la connexion.',
  'new.mustStapleHelp':
    'Le serveur joint lui-même la preuve que son certificat n’est pas révoqué, ce qui évite au navigateur d’interroger l’autorité. Puissant, mais un serveur mal configuré devient totalement injoignable.',

  'field.policies': 'Politiques de certification',
  'field.policies.hint': 'OID imposés par certaines PKI (ex. 2.23.140.1.2.2).',
  'field.policies.help':
    'Identifiants de la politique sous laquelle le certificat est émis. C’est l’autorité qui les impose : ne remplissez ce champ que si sa documentation le demande.',
  'field.crl': 'Points de distribution de CRL',
  'field.crl.hint': 'URL des listes de révocation.',
  'field.crl.help':
    'Adresses où télécharger la liste des certificats révoqués. Normalement renseignées par l’autorité elle-même, pas par le demandeur.',
  'field.ocsp': 'Répondeurs OCSP',
  'field.ocsp.help':
    'Adresse du service qui répond en direct à la question « ce certificat est-il révoqué ? ». Fixée par l’autorité.',
  'field.caIssuers': 'Certificat de l’émetteur',
  'field.caIssuers.help':
    'Adresse où télécharger le certificat de l’autorité, pour qu’un client puisse compléter une chaîne incomplète.',

  'new.customExtTitle': 'Extensions libres',
  'new.customExtDesc':
    'Écrites telles quelles dans la section req_ext, pour une extension qu’aucun champ ci-dessus ne couvre.',
  'new.customExtHelp':
    'Échappatoire pour une extension exotique. La syntaxe est celle des fichiers de configuration OpenSSL : un nom, un signe égal, une valeur. Une erreur ici fait échouer la génération.',
  'new.customExtAdd': 'Ajouter une extension',

  'new.attrsTitle': 'Attributs de la demande',
  'new.attrsHint': 'Champs exigés par certaines PKI.',
  'new.attrsHelp':
    'Ces attributs voyagent avec la demande mais ne se retrouvent pas dans le certificat délivré. Ne les remplissez que si votre PKI les réclame.',
  'field.challengePassword': 'Challenge password',
  'field.challengePassword.hint':
    'Secret partagé avec la PKI, qui permettra plus tard de demander la révocation.',
  'field.challengePassword.help':
    'Mot de passe déposé avec la demande. Certaines autorités l’exigent pour prouver, le jour d’une révocation, que vous êtes bien à l’origine de la demande.',
  'field.unstructuredName': 'Nom non structuré',
  'field.unstructuredName.hint': 'Texte libre transmis à la PKI.',
  'field.unstructuredName.help':
    'Champ de commentaire libre. Sert parfois à faire passer un numéro de ticket ou un code de service.',
  'field.stringMask': 'Encodage des chaînes',
  'field.stringMask.hint':
    'utf8only convient à toutes les PKI modernes. Ne changez que si la vôtre le demande.',
  'field.stringMask.help':
    'Façon d’encoder les caractères du sujet. utf8only accepte les accents. Les autres valeurs existent pour des PKI anciennes qui ne savent lire que l’ASCII.',

  'new.force': 'Écraser une clé privée existante',
  'new.forceHint':
    'Si une CSR est déjà partie chez la PKI, le certificat à venir deviendra inutilisable.',
  'new.forceHelp':
    'Un certificat ne fonctionne qu’avec la clé qui a produit la demande. Régénérer la clé pendant que la PKI signe rend le certificat reçu définitivement inutilisable.',

  'new.submit': 'Générer la clé et la CSR',
  'new.previewConfig': 'Configuration',
  'new.previewCommands': 'Commandes',
  'new.previewIdle':
    'Les contrôles de cohérence s’afficheront ici au fur et à mesure de la saisie.',
  'new.previewFooter':
    'C’est exactement ce qui sera écrit dans le fichier de configuration et passé à openssl. Rien n’est envoyé sur le réseau.',
  'new.previewUnnamed': 'sans nom',

  'new.readyTitle': 'Demande de signature',
  'new.readyDesc':
    'La clé privée et la CSR sont écrites. Envoyez la CSR à la PKI, puis déposez sa réponse.',
  'new.readyKey': 'Clé privée {desc} générée.',
  'new.readyKeyWarn':
    'Elle ne doit jamais quitter ce poste : la PKI n’a besoin que de la CSR.',
  'new.readyFollow': 'Suivre cette demande',
  'new.readyCopy': 'Copier la CSR',
  'new.readyRequested': 'Ce qui a été demandé',
  'new.readyShowDetail': 'Voir le détail',
  'new.readyHideDetail': 'Masquer le détail',
  'new.toastGenerated': 'CSR générée pour {name}',
  'new.toastCopied': 'CSR copiée dans le presse-papiers',

  'label.subject': 'Sujet',
  'label.san': 'SAN',
  'label.privateKey': 'Clé privée',
  'label.csr': 'CSR',
  'label.config': 'Configuration',
  'label.signedDir': 'Retours PKI',
  'label.issuer': 'Émetteur',
  'label.validity': 'Validité',
  'label.usages': 'Usages',
  'label.key': 'Clé',
  'label.fingerprint': 'Empreinte',
  'label.requestedSans': 'SAN demandés',
  'label.present': 'présente',
  'label.absent': 'absente',

  // -------------------------------------------------------------------------
  // Détail
  // -------------------------------------------------------------------------
  'detail.notFoundTitle': 'Dossier introuvable',
  'detail.notFoundDesc': 'Ce nom n’a plus de dossier dans la racine de travail.',
  'detail.certInPlace': 'Certificat en place',
  'detail.step1': '1 · Demande de signature',
  'detail.step2': '2 · Retours de la PKI',
  'detail.step3': '3 · Assemblage du PFX',
  'detail.openSigned': 'Ouvrir Signed/',
  'detail.dropHere': 'Déposez ici',
  'detail.noSignedTitle': 'Aucun fichier reçu',
  'detail.noSignedDesc':
    'Glissez les fichiers renvoyés par la PKI, ou sélectionnez-les. PEM, CRT, CER, DER et P7B sont acceptés.',
  'detail.pickFiles': 'Sélectionner des fichiers',
  'detail.dragMore': 'Glissez d’autres fichiers pour les ajouter.',
  'detail.imported': '{n} fichier(s) déposé(s), {total} au total',
  'detail.dropError': 'Impossible de lire le chemin de ces fichiers.',
  'detail.nothingToAssembleTitle': 'Rien à assembler',
  'detail.nothingToAssembleDesc':
    'Déposez d’abord les fichiers renvoyés par la PKI à l’étape 2.',
  'detail.noKeyDesc': 'La clé privée est absente : le PFX ne peut pas être construit.',
  'detail.pfxPassword': 'Mot de passe du PFX',
  'detail.pfxPasswordHint':
    'Il protège la clé privée dans le conteneur. Transmettez-le séparément du fichier.',
  'detail.pfxPasswordHelp':
    'Le PFX contient la clé privée. Sans mot de passe solide, le fichier vaut la clé elle-même. Envoyez-le par un canal différent de celui du fichier.',
  'detail.confirm': 'Confirmation',
  'detail.mismatch': 'Les deux saisies diffèrent.',
  'detail.advancedOptions': 'Options avancées',
  'detail.friendlyName': 'Nom convivial',
  'detail.friendlyNameHint': 'Nom affiché dans le magasin de certificats Windows.',
  'detail.friendlyNameHelp':
    'Libellé sous lequel Windows présentera le certificat après import. Purement cosmétique.',
  'detail.keyPassword': 'Mot de passe de la clé privée',
  'detail.keyPasswordHint': 'Uniquement si la clé sur disque est chiffrée.',
  'detail.keyPasswordHelp':
    'La phrase secrète choisie à la génération, si vous aviez demandé le chiffrement de la clé.',
  'detail.noPass': 'PFX sans mot de passe',
  'detail.noPassHint': 'La clé privée ne sera plus protégée dans le conteneur.',
  'detail.noPassHelp':
    'À réserver à un usage automatisé où le fichier reste sur un disque déjà chiffré. Quiconque obtient le fichier obtient la clé.',
  'detail.compat': 'Chiffrement compatible (3DES / SHA-1)',
  'detail.compatHint':
    'Pour Windows antérieur à 2016, Java 8 et les anciens F5. Moins sûr qu’AES-256.',
  'detail.compatHelp':
    'Les vieux logiciels ne savent pas ouvrir un PFX chiffré en AES-256. Cette option retombe sur un chiffrement ancien, plus faible : ne l’activez que si l’import échoue autrement.',
  'detail.noRoot': 'Exclure la CA racine',
  'detail.noRootHint':
    'La racine est déjà dans le magasin de confiance de la plupart des systèmes.',
  'detail.noRootHelp':
    'Embarquer la racine est inutile et certains équipements s’en plaignent. La retirer allège le fichier sans rien casser, à condition que le poste cible connaisse déjà cette autorité.',
  'detail.assemble': 'Assembler le PFX',
  'detail.pfxExists': 'Un PFX existe déjà : il sera remplacé.',
  'detail.chainTitle': 'Chaîne de confiance',
  'detail.leafLabel': 'Certificat serveur',
  'detail.rootCa': 'CA racine',
  'detail.intermediateCa': 'CA intermédiaire',
  'detail.unused': 'Non utilisés ({n}), hors de la chaîne de ce certificat :',
  'detail.checksTitle': 'Contrôles',
  'detail.filesTitle': 'Fichiers produits',
  'detail.filePfx': 'PKCS#12',
  'detail.fileCrt': 'Certificat seul',
  'detail.fileChain': 'Chaîne de CA',
  'detail.fileFullchain': 'Feuille + chaîne (nginx, HAProxy)',
  'detail.importWindows': 'Import dans le magasin Windows :',
  'detail.toastAssembled': 'PFX assemblé : {name}',
  'detail.csrTitle': 'Demande de signature',

  // -------------------------------------------------------------------------
  // Réglages
  // -------------------------------------------------------------------------
  'settings.title': 'Réglages',
  'settings.desc':
    'Où travailler, avec quel openssl, et quelles valeurs pré-remplir dans les demandes.',
  'settings.saved': 'Réglages enregistrés',
  'settings.locations': 'Emplacements',
  'settings.root': 'Racine de travail',
  'settings.rootHint':
    'Un sous-dossier par demande y est créé. Équivalent de CERT_HOME pour la CLI : les deux interfaces peuvent partager la même racine.',
  'settings.rootHelp':
    'Évitez un dossier synchronisé (OneDrive, Dropbox, partage réseau) : les clés privées y seraient copiées hors du poste dès leur création.',
  'settings.browse': 'Parcourir',
  'settings.opensslPath': 'Binaire OpenSSL',
  'settings.opensslPathHint':
    '« openssl » suffit s’il est dans le PATH. Sinon, indiquez le chemin complet.',
  'settings.opensslPathHelp':
    'Toute la cryptographie passe par ce binaire. Sous Windows, Git for Windows en fournit un dans C:\\Program Files\\Git\\mingw64\\bin.',
  'settings.opensslDetected': 'OpenSSL détecté',
  'settings.test': 'Tester',
  'settings.algorithms': 'Algorithmes disponibles',
  'settings.curves': 'Courbes elliptiques : {list}',
  'settings.noCurves': 'aucune détectée',
  'settings.form': 'Formulaire',
  'settings.language': 'Langue',
  'settings.languageHint': 'Langue de l’interface et des messages.',
  'settings.languageHelp':
    'Le changement est immédiat et n’affecte que l’affichage. Les fichiers produits, eux, ne contiennent que ce que vous avez saisi.',
  'settings.advancedDefault': 'Ouvrir les demandes en mode avancé',
  'settings.advancedDefaultHint':
    'Affiche d’emblée le sujet complet, les extensions X.509 et les attributs PKI.',
  'settings.subjectDefaults': 'Valeurs par défaut du sujet',
  'settings.subjectDefaultsHelp':
    'Pré-remplissage des nouvelles demandes. Chaque demande reste modifiable individuellement.',
  'settings.privacy': 'Confidentialité',
  'settings.privacy1':
    'Les clés privées, les CSR et les PFX restent dans la racine de travail. Aucune donnée ne sort de ce poste, l’application n’émet aucune requête réseau.',
  'settings.privacy2':
    'Les mots de passe ne sont jamais enregistrés, ni ici, ni dans un fichier de session. Ils ne vivent que le temps de l’assemblage d’un PFX, et sont transmis à openssl par son environnement plutôt que par sa ligne de commande.',

  // -------------------------------------------------------------------------
  // Contrôles de cohérence
  // -------------------------------------------------------------------------
  'warn.cnRequired': 'Le {field} est obligatoire.',
  'warn.sanRequired': 'Ce modèle exige au moins un nom alternatif. {hint}',
  'warn.rsaTooSmall': 'Une clé RSA de moins de 2048 bits est refusée partout depuis 2014.',
  'warn.passphraseEmpty':
    'Le chiffrement de la clé est demandé mais la phrase secrète est vide.',
  'warn.countryFormat': 'Le pays doit être un code à deux lettres (FR, BE, CH, etc.).',
  'warn.dualEku':
    'Un certificat TLS public ne peut plus porter clientAuth en plus de serverAuth depuis juin 2026. Une autorité publique refusera cette demande.',
  'warn.publicIp':
    'Une adresse IP en SAN n’est délivrée que par de rares autorités publiques.',
  'warn.internalName':
    'Nom non public : {names}. Utilisez plutôt le modèle « Serveur interne ».',
  'warn.badWildcard':
    'Joker mal formé : {name}. Seule la forme *.exemple.fr est acceptée.',
  'warn.noKeyUsage': 'L’extension keyUsage est activée mais aucun usage n’est coché.',
  'warn.ecKeyEncipherment':
    'keyEncipherment n’a pas de sens avec une clé EC : ECDHE négocie la clé, il ne la chiffre pas.',
  'warn.caNoKeyCertSign':
    'CA:TRUE sans keyCertSign : cette autorité ne pourrait signer aucun certificat.',
  'warn.keyCertSignNoCa':
    'keyCertSign sur un certificat qui n’est pas une CA : incohérent, et refusé par la plupart des PKI.',
  'warn.anyEku': '« Tous usages » rend les autres usages inutiles.',
  'warn.codeSigningBits':
    'Les autorités exigent 3072 bits au minimum pour la signature de code.',
  'warn.mustStaple':
    'Agrafage OCSP obligatoire : le serveur deviendra injoignable s’il n’agrafe pas de réponse.',
  'warn.mldsa':
    'ML-DSA est post-quantique et normalisé (FIPS 204), mais très peu de PKI le signent aujourd’hui. Vérifiez avant d’envoyer.',
  'warn.eddsa':
    'Ed25519 et Ed448 restent mal supportés par les PKI d’entreprise et les équipements réseau.',
  'warn.caUnencrypted':
    'Une clé d’autorité non chiffrée sur le disque est un risque majeur.',
  'warn.newline': 'Le champ « {field} » ne peut pas contenir de retour à la ligne.',

  // -------------------------------------------------------------------------
  // Erreurs
  // -------------------------------------------------------------------------
  'err.nameRequired': 'Le nom de la demande est obligatoire.',
  'err.nameTooLong': 'Nom trop long (200 caractères au maximum).',
  'err.nameSeparator': 'Le nom ne peut pas contenir de séparateur de chemin.',
  'err.nameInvalid': 'Nom invalide.',
  'err.nameControlChar':
    'Le nom contient un caractère interdit dans un nom de dossier.',
  'err.nameCharset':
    'Nom invalide : lettres, chiffres, point, tiret, souligné et * uniquement.',
  'err.keyExists':
    'Une clé privée existe déjà pour « {name} ».\nSi une CSR est en cours de signature chez la PKI, la régénérer rendrait le certificat à venir inutilisable. Cochez « Écraser la clé existante » pour passer outre.',
  'err.csrVerify': 'La CSR générée ne se vérifie pas.',
  'err.opensslMissing':
    'openssl introuvable ({bin}). Renseignez son chemin dans les réglages.',
  'err.opensslTimeout': 'openssl n’a pas répondu en {sec} s.',
  'err.opensslFailed': 'openssl {cmd} a échoué{why}',
  'err.keyNotFound':
    'Clé privée introuvable : {path}\nVérifiez le nom, ou générez d’abord la CSR.',
  'err.keyEncrypted': 'La clé privée est chiffrée : renseignez son mot de passe.',
  'err.keyBadPassword':
    'Clé privée illisible : le mot de passe est probablement incorrect.',
  'err.keyUnreadable': 'Clé privée illisible : {path}',
  'err.noSignedFiles':
    'Aucun fichier signé. Déposez les fichiers renvoyés par la PKI dans {dir}, ou sélectionnez-les.',
  'err.noReadableCert': 'Aucun certificat lisible dans les fichiers fournis.',
  'err.noMatchingCert':
    'Aucun certificat fourni ne correspond à la clé privée.\nLa PKI a peut-être signé une autre CSR, ou la clé a été régénérée depuis l’envoi.',
  'err.emptyPassword':
    'Mot de passe vide. Cochez « PFX sans mot de passe » si c’est voulu.',
  'err.rsaBits': 'Taille de clé RSA invalide : {bits} (2048, 3072 ou 4096).',

  // -------------------------------------------------------------------------
  // Contrôles de l'assemblage
  // -------------------------------------------------------------------------
  'check.ignored': '{n} fichier(s) ignoré(s)',
  'check.ignoredDetail': '{names} : ni PEM, ni DER, ni PKCS#7.',
  'check.distinct': '{n} certificat(s) distinct(s) sur {total} lu(s)',
  'check.keyMatch': 'Le certificat correspond bien à la clé privée',
  'check.incompleteChain': 'Chaîne incomplète',
  'check.incompleteChainDetail':
    'Émetteur manquant : {issuer}. Ajoutez le certificat de CA correspondant.',
  'check.sanCovers': 'Le SAN couvre bien {name}',
  'check.sanMissing': 'Le SAN ne contient pas {name}',
  'check.sanMissingDetail': 'Les navigateurs refuseront ce certificat pour ce nom.',
  'check.sansAbsent': '{n} SAN demandé(s) absent(s) du certificat',
  'check.expired': 'Le certificat est expiré',
  'check.expiredDetail': 'Expiré le {date}.',
  'check.valid': 'Certificat valide, expire dans {n} jour(s)',
  'check.chainVerified': 'Chaîne de confiance vérifiée',
  'check.verifyFailed': 'openssl verify échoue',
  'check.samePublicKey': 'Même clé publique que la CSR envoyée',
  'check.pfxRead': 'PFX relu : {n} certificat(s) + 1 clé privée',
  'check.pfxUnreadable': 'Le PFX produit n’a pas pu être relu',

  // -------------------------------------------------------------------------
  // Menu et système
  // -------------------------------------------------------------------------
  'menu.file': 'Fichier',
  'menu.quit': 'Quitter',
  'menu.edit': 'Édition',
  'menu.undo': 'Annuler',
  'menu.redo': 'Rétablir',
  'menu.cut': 'Couper',
  'menu.copy': 'Copier',
  'menu.paste': 'Coller',
  'menu.selectAll': 'Tout sélectionner',
  'menu.view': 'Affichage',
  'menu.reload': 'Recharger',
  'menu.devTools': 'Outils de développement',
  'menu.resetZoom': 'Taille normale',
  'menu.zoomIn': 'Agrandir',
  'menu.zoomOut': 'Réduire',
  'menu.fullscreen': 'Plein écran',
  'menu.help': 'Aide',
  'menu.repo': 'Dépôt du projet',

  'dialog.pickRoot': 'Racine de travail',
  'dialog.pickSigned': 'Fichiers renvoyés par la PKI',
  'dialog.certificates': 'Certificats',
  'dialog.allFiles': 'Tous les fichiers',

  'san.DNS': 'Nom DNS',
  'san.IP': 'Adresse IP',
  'san.email': 'Email',
  'san.URI': 'URI',
  'san.UPN': 'UPN Windows',
  'san.RID': 'OID enregistré',
  'san.otherName': 'Autre (OID)',
  'san.fromCn': 'depuis le CN',

  'settings.opensslBundled': 'Version livrée avec l’application',
  'settings.opensslSystem': 'Version installée sur le poste',
  'settings.opensslBundledHelp':
    'L’application embarque sa propre copie d’OpenSSL, pour ne dépendre de rien sur le poste. Laissez « openssl » pour l’utiliser ; indiquez un chemin complet seulement si votre organisation impose un binaire précis.',

  'new.readyWhere': 'Votre demande est prête',
  'new.readyWhereDesc':
    'Le fichier est enregistré dans votre espace de travail. Envoyez-le à votre autorité de certification, puis revenez déposer sa réponse.',
  'new.revealCsr': 'Montrer le fichier',
  'new.revealKey': 'Montrer la clé',

  // Exemples grises. Ce ne sont pas des valeurs : rien n'est pre-rempli.
  'ph.country': 'FR',
  'ph.state': 'Île-de-France',
  'ph.locality': 'Paris',
  'ph.org': 'Ma Société',
  'ph.ou': 'Direction des systèmes d’information',
  'ph.email': 'pki@exemple.fr',
  'ph.street': '12 rue de la Paix',
  'ph.postalCode': '75002',
  'ph.givenName': 'Jean',
  'ph.surname': 'Dupont',
  'ph.title': 'Responsable sécurité',
  'ph.uid': 'jdupont',
  'ph.serialNumber': 'SN-12345',
  'ph.businessCategory': 'Private Organization',
  'ph.dc': 'exemple',

  // -------------------------------------------------------------------------
  // Espace de travail
  // -------------------------------------------------------------------------
  'workspace.label': 'Espace de travail',
  'workspace.desc': 'Toutes vos demandes sont rangées ici, une par dossier.',
  'workspace.change': 'Changer de dossier',
  'workspace.open': 'Ouvrir',
  'workspace.first': 'Première chose à faire : choisir où travailler.',
  'workspace.changed': 'Espace de travail : {path}',
  'workspace.willContain': 'Chaque demande y recevra son dossier :',
  'workspace.fileKey': 'la clé privée, qui ne bouge jamais d’ici',
  'workspace.fileCsr': 'la demande à envoyer à l’autorité',
  'workspace.fileSigned': 'un dossier Signed/ où déposer sa réponse',
  'workspace.filePfx': 'le certificat final, dans tous ses formats',

  // -------------------------------------------------------------------------
  // Assistant de demarrage
  // -------------------------------------------------------------------------
  'wizard.reopen': 'Comment ça marche ?',
  'wizard.step': 'Étape {n} sur {total}',
  'wizard.next': 'Suivant',
  'wizard.back': 'Précédent',
  'wizard.skip': 'Passer',
  'wizard.start': 'Commencer',
  'wizard.close': 'Fermer',

  'wizard.welcome.title': 'Obtenir un certificat, de bout en bout',
  'wizard.welcome.body':
    'Un certificat ne se télécharge pas : on le demande, une autorité le signe, puis on le recombine avec sa clé privée. Cet assistant explique ces trois temps en une minute. Vous pourrez le rouvrir à tout moment depuis la barre de gauche.',
  'wizard.welcome.note':
    'Rien ne sort de ce poste. L’application ne fait aucune requête réseau : c’est vous qui transmettez la demande à votre autorité, par le canal habituel.',

  'wizard.folder.title': 'Où voulez-vous travailler ?',
  'wizard.folder.body':
    'Chaque demande aura son propre dossier ici : la clé privée, la demande, la réponse de l’autorité et le certificat final. C’est le seul endroit où l’application écrit.',
  'wizard.folder.warn':
    'Évitez un dossier synchronisé (OneDrive, Dropbox, partage réseau). Une clé privée y serait copiée hors du poste dès sa création.',
  'wizard.folder.current': 'Dossier retenu',
  'wizard.folder.choose': 'Choisir un dossier',

  'wizard.flow.title': 'Trois temps, et une attente au milieu',
  'wizard.flow.body':
    'La deuxième étape ne dépend pas de vous : elle se passe chez l’autorité de certification, et peut prendre de quelques minutes à plusieurs jours. L’application garde la trace de vos demandes en attente.',
  'wizard.flow.s1': 'Vous créez la demande',
  'wizard.flow.s1d':
    'L’application génère une clé privée, qui reste ici, et une demande de signature (CSR) qui n’en contient que la partie publique.',
  'wizard.flow.s2': 'L’autorité signe',
  'wizard.flow.s2d':
    'Vous envoyez le fichier .csr à votre autorité, par son portail ou par ticket. Elle vous renvoie un certificat signé.',
  'wizard.flow.s3': 'Vous assemblez',
  'wizard.flow.s3d':
    'Vous déposez la réponse dans l’application, qui la recombine avec la clé privée gardée ici pour produire les fichiers utilisables par un serveur.',

  'wizard.create.title': 'Ce que vous créez, et ce qui part',
  'wizard.create.body':
    'Choisissez d’abord l’usage du certificat : site web, carte à puce, signature de code. Les extensions X.509 correspondantes sont pré-remplies, et des contrôles signalent ce qu’une autorité refuserait.',
  'wizard.create.keep': 'Reste sur ce poste',
  'wizard.create.keepDesc':
    'La clé privée (.key.pem). Elle ne doit jamais être transmise : quiconque la détient peut se faire passer pour vous.',
  'wizard.create.send': 'Part chez l’autorité',
  'wizard.create.sendDesc':
    'La demande (.csr). Elle contient votre identité et la clé publique, rien de secret. Vous pouvez la copier dans un portail ou joindre le fichier.',

  'wizard.assemble.title': 'Le moment où tout se recolle',
  'wizard.assemble.body':
    'C’est l’étape que l’on comprend mal la première fois. Le certificat renvoyé par l’autorité ne contient que la partie publique : seul, il ne sert à rien. Il faut le réunir avec la clé privée restée sur ce poste.',
  'wizard.assemble.how':
    'Vous glissez le ou les fichiers reçus dans la demande concernée, et l’application fait le reste : elle retrouve le bon certificat en comparant les clés, reconstruit la chaîne jusqu’à l’autorité racine, vérifie les dates et les noms, puis produit le conteneur final.',
  'wizard.assemble.formats': 'Tous les formats de retour sont acceptés : PEM, CRT, CER, DER, P7B.',

  'wizard.formats.title': 'Ce que vous obtenez à la fin',
  'wizard.formats.body':
    'Un même certificat se présente sous plusieurs formes selon le serveur qui doit le lire. L’application les produit toutes en une fois.',
  'wizard.done.title': 'Vous pouvez commencer',
  'wizard.done.body':
    'Créez votre première demande, ou revenez à la liste si des dossiers existent déjà dans votre dossier de travail.',
  'wizard.done.action': 'Créer une demande',

  // -------------------------------------------------------------------------
  // Formats de sortie
  // -------------------------------------------------------------------------
  'formats.title': 'Quel fichier pour quel serveur ?',
  'formats.help':
    'Le même certificat, empaqueté différemment. Prenez la ligne qui correspond à votre serveur, ignorez les autres.',
  'formats.pfx.who': 'Windows, IIS, Exchange, Java, Tomcat',
  'formats.pfx.what':
    'Le conteneur PKCS#12 : certificat, chaîne et clé privée dans un seul fichier protégé par mot de passe.',
  'formats.fullchain.who': 'nginx, HAProxy, Traefik',
  'formats.fullchain.what':
    'Le certificat suivi de sa chaîne, à donner avec la clé privée en fichier séparé.',
  'formats.crt.who': 'Apache, Postfix, Dovecot',
  'formats.crt.what':
    'Le certificat seul. Ces serveurs veulent la chaîne dans une directive distincte.',
  'formats.chain.who': 'Chaîne de l’autorité',
  'formats.chain.what':
    'Les certificats intermédiaires, sans le vôtre. À référencer là où le serveur le demande.',
  'formats.key.who': 'Clé privée',
  'formats.key.what':
    'Nécessaire à côté du certificat pour nginx et Apache. Déjà incluse dans le PFX.',

  // -------------------------------------------------------------------------
  // Progression d'une demande
  // -------------------------------------------------------------------------
  'flow.title': 'Où en est cette demande',
  'flow.s1': 'Demande créée',
  'flow.s2': 'Envoi à l’autorité',
  'flow.s3': 'Réponse reçue',
  'flow.s4': 'Certificat prêt',
  'flow.todo': 'À faire maintenant',
  'flow.todo.send':
    'Envoyez le fichier .csr à votre autorité de certification, puis revenez ici quand elle aura répondu.',
  'flow.todo.drop':
    'Déposez le ou les fichiers renvoyés par l’autorité dans l’étape 2 ci-dessous.',
  'flow.todo.assemble':
    'Les fichiers sont là. Assemblez le certificat final à l’étape 3 : choisissez un mot de passe et lancez.',
  'flow.todo.done': 'Le certificat est prêt. Récupérez le format adapté à votre serveur.',
  'flow.todo.broken':
    'La clé privée manque dans ce dossier. Sans elle, le certificat ne peut pas être assemblé.',
  'detail.step3Explain':
    'Le certificat renvoyé par l’autorité ne contient que la partie publique. L’assemblage le recombine avec la clé privée restée sur ce poste, et y ajoute la chaîne, pour produire un fichier qu’un serveur sait charger.',
} as const

export type MessageKey = keyof typeof fr
