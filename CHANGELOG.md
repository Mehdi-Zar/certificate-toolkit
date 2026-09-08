# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

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
