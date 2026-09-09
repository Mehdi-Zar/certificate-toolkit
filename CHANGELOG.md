# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

### Corrigé

- **La copie d'OpenSSL embarquée ne trouvait pas sa configuration.** Toute
  commande sans `-config` explicite échouait, dont la vérification finale d'une
  demande : **la version 1.0.0 publiée ne sait pas produire de CSR.** Le
  fichier `openssl.cnf` est désormais embarqué et désigné par `OPENSSL_CONF`,
  et la vérification d'empaquetage fait un aller-retour complet au lieu d'un
  simple `openssl version`, qui ne lit aucune configuration.
- **Une adresse IP saisie en nom alternatif était enregistrée comme nom DNS.**
  La détection de type ne l'emportait pas sur le sélecteur.
- **Un SAN de type IP était toujours rapporté absent du certificat signé.**
  OpenSSL imprime `IP Address:`, la comparaison attendait `IPAddress:`.
- **Le message affiché quand aucun certificat ne correspond à la clé privée**
  était écrit en dur, sans accents, et restait en français en session anglaise.
- **Le champ de l'espace de travail portait `id="root"`**, déjà pris par le
  point de montage : son étiquette désignait le mauvais élément.
- **Le bouton d'aide était imbriqué dans le libellé du champ**, ce qui le
  faisait entrer dans le nom accessible de la saisie.
- **Les messages d'erreur n'étaient pas rattachés à leur champ.** Ils
  s'affichaient sans jamais être annoncés par un lecteur d'écran.
- **« Créer une demande » restait sans effet depuis l'écran de confirmation.**
  Il fallait passer par le tableau de bord pour en commencer une autre.
- **« Francais » s'écrivait sans cédille** dans le sélecteur de langue.

### Ajouté

- **Suite de bout en bout** : 22 tests qui pilotent l'application réelle, du
  premier écran jusqu'au PFX ouvert avec son mot de passe. L'assemblage est
  vérifié contre une autorité de certification créée pour la durée du test, ce
  qui rend la suite autonome. `npm test`.
- **[Améliorations identifiées](docs/ameliorations.md)** : onze propositions
  classées, avec ce qu'elles coûtent et ce qu'elles apportent.

## [1.0.0] 2026-09-08

Première version publiée.
[Télécharger](https://github.com/Mehdi-Zar/certificate-toolkit/releases/tag/v1.0.0)

### Ajouté

- **Application de bureau** couvrant le cycle complet d'un certificat : créer
  la demande, suivre l'attente, assembler le certificat final.
- **12 modèles** décrits en français : site web public, serveur interne, carte
  à puce, contrôleur de domaine, S/MIME, signature de code, horodatage, VPN
  IPsec, autorité intermédiaire, et d'autres.
- **Mode avancé** ouvrant le sujet complet, les sept types de SAN, les neuf
  bits de `keyUsage`, les usages étendus par nom ou par OID, les contraintes de
  CA, l'agrafage OCSP, les politiques, les points de distribution de CRL et
  l'accès à l'autorité.
- **Six algorithmes de clé** : RSA, RSA-PSS, EC, Ed25519, Ed448 et ML-DSA
  post-quantique. Les choix offerts dépendent de ce que le binaire OpenSSL sait
  faire, sondé au démarrage.
- **20 contrôles de cohérence** expliqués dans les termes du modèle choisi, et
  **14 contrôles** à l'assemblage.
- **Aperçu en direct** de la configuration OpenSSL et des commandes
  équivalentes.
- **Assistant de démarrage** en six écrans, qui fait choisir le dossier de
  travail puis explique le parcours.
- **Infobulles** sur chaque choix.
- **Interface en français et en anglais**, y compris les messages du processus
  principal.
- **OpenSSL 3.5.5 embarqué**, vérifié autonome à la construction.
- **Table des formats** indiquant quel fichier donner à quel serveur.

### Modifié

- Le modèle « Site web public » ne pose plus que `serverAuth`. Depuis juin
  2026, le CA/Browser Forum interdit d'y ajouter `clientAuth`.
- La racine de travail par défaut n'est plus « Mes documents », fréquemment
  redirigé vers OneDrive.
- Les mots de passe passent par l'environnement d'openssl, plus par sa ligne de
  commande.
- Le nom du dossier de travail est distinct du Common Name, qui peut donc
  contenir des espaces.
- Les valeurs par défaut du sujet sont vides : aucune organisation n'est
  inscrite dans le code.

### Corrigé

- Le bouton d'ouverture du dossier ne faisait rien quand la racine de travail
  n'existait pas encore. Elle est désormais créée.
- Les appels système échouaient en silence. Leurs erreurs sont remontées.
- La liste des certificats ne se rafraîchissait qu'au clic sur Actualiser.
- Les scripts shell sont forcés en fins de ligne LF, sans quoi un clone Windows
  cassait leur shebang.

### Sécurité

- Un fichier de notes contenant un mot de passe de PFX est entré dans le dépôt
  à la suite d'une modification du `.gitignore`, puis en a été retiré et
  l'historique réécrit. **Le mot de passe concerné doit être considéré comme
  compromis.**
- Le `.gitignore` exclut désormais les dossiers de travail dans leur ensemble,
  et non une liste d'extensions.
- Aucune saisie ne peut injecter de directive dans le fichier de configuration
  OpenSSL.
- Le nom d'une demande ne peut désigner qu'un sous-dossier.

### Limites connues

- L'exécutable n'est pas signé : SmartScreen avertit au premier lancement.
- Seul Windows est construit et vérifié.
- La ligne de commande couvre un seul profil, là où l'application en couvre
  douze.

Voir [Dette et risques](docs/dette.md).
