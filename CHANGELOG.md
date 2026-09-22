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

- **La documentation montre l'application.** Dix captures d'écran illustrent le
  parcours, des modèles jusqu'aux formats produits. Elles sont produites par
  `npm run captures`, qui rejoue la boucle complète avec un domaine, une
  organisation et une autorité inventés : rien d'un poste réel n'y figure, et
  elles se refont d'une commande quand l'interface change.
- **L'espace de travail est surveillé.** La réponse de l'autorité déposée depuis
  l'explorateur apparaît sans qu'il faille quitter l'écran et y revenir. Deux
  filets : une veille sur le dossier, et le retour du focus sur la fenêtre.
- **Proposer un mot de passe de PFX**, tiré au hasard sûr, sur un alphabet sans
  caractères qui se confondent, rempli dans les deux champs, affiché et copié.
- **Ranger un dossier** le sort de la liste sans rien détruire : il est déplacé
  sous `.archive`. Il n'y a délibérément pas de suppression.
- **Un journal des échecs**, ouvrable depuis les réglages. Il contient la
  commande et son erreur, jamais de clé privée, de certificat ni de mot de
  passe, et il ne consigne que les échecs.
- **Vérification des versions**, décochée par défaut. Activée, elle lit un
  numéro de version au démarrage et propose un lien. Rien n'est téléchargé.
- **Avertissement sur la clé privée** : elle ne peut pas être régénérée, et le
  certificat signé ne vaut rien sans elle.
- **Tri par date** dans la liste, l'ordre par étape restant le défaut.
- **100 tests** : 67 tests d'unité sur le moteur et les catalogues, qui tournent
  en une seconde et demie, et 33 tests qui pilotent l'application réelle, du
  premier écran jusqu'au PFX ouvert avec son mot de passe. L'assemblage est
  vérifié contre une autorité de certification créée pour la durée du test, et
  un test de fumée lance l'exécutable construit.
- **Lint et intégration continue.** ESLint avec deux règles propres au projet :
  aucun message affiché en dur dans le processus principal, aucun mot de passe
  en argument de commande. Un workflow GitHub Actions lance l'ensemble à chaque
  poussée.
- **[Améliorations](docs/ameliorations.md)** : ce qui a été réparé, et pourquoi
  c'était un problème.

### Modifié

- **L'assistant de démarrage retient le focus** et masque ce qui est derrière
  aux lecteurs d'écran. Il était jusqu'ici modal pour la souris seulement.
- Les messages d'erreur sont rattachés à leur champ, donc annoncés.

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
