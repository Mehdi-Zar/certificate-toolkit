# Certificate Toolkit — interface graphique

Application de bureau qui couvre le meme flux que les scripts de la racine :
generer une cle privee et sa CSR, suivre la demande, puis assembler le PFX
quand la PKI a repondu.

```
Certificats            Nouvelle demande         Detail d'un dossier
-----------            ----------------         -------------------
un dossier par ligne,  1. choix du modele       1. la CSR (afficher, copier)
trie par urgence       2. formulaire            2. depot des retours PKI
                          simple ou avance      3. assemblage du PFX
                       -> cle + CSR
```

## Modeles

Une demande commence par declarer son usage, en clair. Le modele choisi
pre-remplit les extensions X.509 qui vont avec, et affiche les pieges connus.

| Modele | Usages etendus | Particularite |
|---|---|---|
| Site web public (HTTPS) | serverAuth | serverAuth seul : le CA/Browser Forum interdit clientAuth en plus depuis juin 2026 |
| Serveur interne | serverAuth, clientAuth | accepte les IP et les noms non publics |
| Site web + agrafage OCSP | serverAuth | ajoute `tlsfeature = status_request` |
| Client mTLS | clientAuth | cle EC par defaut |
| Messagerie S/MIME | emailProtection | le CN est une personne, l'email va en SAN |
| Carte a puce Windows | clientAuth + 1.3.6.1.4.1.311.20.2.2 | exige un SAN `otherName` UPN |
| Controleur de domaine AD | serverAuth, clientAuth, KDC | exige le nom DNS du domaine en SAN |
| Signature de code | codeSigning | RSA 3072 minimum |
| Autorite d'horodatage | timeStamping (critique) | usage etendu critique, comme l'exige la RFC 3161 |
| Passerelle VPN IPsec | serverAuth, clientAuth, IPsec IKE | |
| Autorite intermediaire | aucun | `CA:TRUE`, `pathlen:0`, keyCertSign + cRLSign |
| Personnalise | aucun | tout est ouvert |

## Mode avance

Le formulaire simple ne montre que ce qui change d'une demande a l'autre. Le
mode avance ouvre le reste :

- **Sujet** : C, ST, L, rue, code postal, O, OU repetables, CN, email,
  serialNumber, businessCategory, DC repetables, UID, titre, prenom, nom.
- **Noms alternatifs** : DNS, IP (v4 et v6), email, URI, RID, UPN Windows et
  `otherName` avec un OID libre.
- **Cle** : RSA (2048 a 8192), RSA-PSS, EC (les courbes que le binaire connait,
  dont brainpool), Ed25519, Ed448 et ML-DSA post-quantique. Chiffrement AES-256
  de la cle au repos.
- **Empreinte** : SHA-2 et SHA-3. Masquee pour les algorithmes qui choisissent
  la leur.
- **Extensions** : les neuf bits de `keyUsage`, les usages etendus du catalogue
  ou par OID, `basicConstraints` avec `pathlen`, `subjectKeyIdentifier`,
  agrafage OCSP, politiques de certification, points de distribution de CRL,
  acces aux informations de l'autorite, et des extensions libres.
- **Attributs** : `challengePassword`, `unstructuredName`, encodage des chaines.

Les choix proposes sont derives de ce que le binaire openssl du poste sait
faire, sonde au demarrage — pas d'une liste ecrite en dur.

## Controles

Un panneau affiche en direct le fichier de configuration produit, les commandes
equivalentes, et ce qui cloche. Quelques exemples de ce qui est signale :

- `clientAuth` en plus de `serverAuth` sur un certificat public (interdit
  depuis juin 2026) ;
- un nom interne ou une adresse IP dans une demande destinee a une autorite
  publique ;
- un joker mal forme (`x.*.exemple.fr`) ;
- `keyEncipherment` sur une cle EC, ou il n'a pas de sens ;
- `CA:TRUE` sans `keyCertSign`, et `keyCertSign` sans `CA:TRUE` ;
- une cle RSA de moins de 2048 bits, ou de moins de 3072 pour de la signature
  de code ;
- une cle d'autorite laissee en clair sur le disque.

## Demarrer

```bash
cd gui
npm install
npm run dev
```

En developpement, OpenSSL doit etre joignable : soit dans le `PATH`, soit via
`npm run bundle:openssl` qui en depose une copie dans `vendor/`. Une version
empaquetee, elle, embarque toujours la sienne.

| Commande | Effet |
|---|---|
| `npm run dev` | Application en mode developpement, rechargement a chaud |
| `npm run typecheck` | Verification TypeScript seule |
| `npm run build` | Typecheck + bundles de production dans `dist/` et `dist-electron/` |
| `npm run pack` | Application non empaquetee dans `release/` (test rapide) |
| `npm run bundle:openssl` | Prepare la copie d'OpenSSL embarquee dans `vendor/` |
| `npm run dist` | Installateurs : NSIS + portable (Windows), DMG (macOS), AppImage + deb (Linux) |

## Racine de travail

Un sous-dossier par FQDN, exactement l'arborescence de la CLI — les deux
interfaces peuvent travailler sur la meme racine, dans n'importe quel ordre :
une CSR generee par `generate-csr.sh` s'assemble dans la GUI, et inversement.

Par defaut la racine est celle du depot en developpement, et
`<profil utilisateur>/Certificate-Toolkit` dans une version empaquetee. Elle se change dans
**Reglages**, ou par la variable d'environnement `CERT_HOME`.

## OpenSSL embarque

L'application ne depend d'aucun OpenSSL installe sur le poste : `npm run dist`
copie l'executable et ses deux bibliotheques dans le paquet, apres avoir
verifie que la copie fonctionne avec un `PATH` reduit aux DLL systeme.

C'est ce qui rend l'installation utilisable telle quelle. C'est aussi ce qui
rend la version previsible : sur la machine de developpement, le `PATH` Windows
exposait OpenSSL 3.1 la ou Git Bash exposait 3.5, et 3.1 ne connait ni ML-DSA
ni SHA-3.

Un chemin saisi dans les reglages l'emporte toujours, pour une organisation qui
impose son propre binaire. Sinon la copie embarquee est prise, et le `PATH` ne
sert plus que de dernier recours.

Les binaires vivent dans `vendor/`, qui n'est pas versionne. La copie est
accompagnee de sa licence (OpenSSL 3 est sous Apache 2.0) et d'un fichier
`NOTICE.txt` qui note l'origine et la version.

## Assistant de demarrage

Au premier lancement, un assistant en six ecrans explique le parcours complet :
ce qui est cree, ce qui part chez l'autorite, ce qui revient, et ce qu'on
obtient a la fin. Son deuxieme ecran fait choisir le dossier de travail, parce
que c'est la premiere decision a prendre. Il se rouvre depuis la barre laterale.

Le detail d'une demande porte le meme souci : un bandeau situe la demande dans
le parcours et enonce la seule chose a faire maintenant, et l'assemblage
explique qu'il recombine le certificat signe avec la cle privee restee sur le
poste. Une fois le PFX produit, une table dit quel fichier donner a quel
serveur.

## Architecture

```
electron/            processus principal — le seul a toucher au disque
  main.ts              fenetre, cycle de vie, posture de securite
  menu.ts              menu minimal (les accelerateurs de copie en dependent)
  preload.ts           unique pont vers le renderer (contextBridge)
  ipc.ts               handlers, enveloppe Reply<T>
  openssl.ts           appel du binaire openssl
  capabilities.ts      ce que ce binaire sait faire
  certs.ts             formats, chaine de confiance, cles publiques
  csr.ts               etape 1 : configuration, generation, controles
  pfx.ts               etape 3 : assemblage du PKCS#12
  inventory.ts         scan de la racine, statut de chaque dossier
  store.ts             reglages persistes
shared/
  types.ts             contrat de donnees partage entre les deux cotes
  templates.ts         catalogue des modeles, usages de cle et usages etendus
src/                 interface React
```

Le renderer n'a **aucun** acces a Node ni au systeme de fichiers : il appelle
les fonctions exposees par `preload.ts`, et rien d'autre.

## Ce que la GUI fait differemment de la CLI

Meme resultat, deux ecarts assumes :

- **Pas de dependance a bash.** La logique des scripts est portee en
  TypeScript et appelle `openssl` directement. L'application fonctionne donc
  sur un poste sans Git Bash.
- **Les mots de passe ne passent pas par la ligne de commande.** La CLI utilise
  `-passout pass:...`, visible dans la liste des processus le temps de
  l'export ; la GUI passe par `-passout env:...`. Aucun mot de passe n'est
  enregistre sur le disque.

L'identification du certificat feuille reste la meme et c'est la garantie
centrale : elle compare la cle publique du certificat a celle de la cle privee,
jamais un nom de fichier. Un PFX ne peut donc pas etre assemble avec un
certificat qui ne correspond pas.

## Securite

- `contextIsolation`, `sandbox`, pas de `nodeIntegration`, pas de `webviewTag`.
- Content-Security-Policy stricte, navigation et ouverture de fenetres refusees ;
  les liens externes partent dans le navigateur du systeme.
- Aucune requete reseau : tout est local, y compris les polices.
- Le nom de la demande est valide avant de devenir un nom de dossier (pas de
  `..`, pas de separateur de chemin) ; il est distinct du CN, qui reste libre.
- Aucune valeur du sujet, du SAN ou d'une extension ne peut contenir de retour
  a la ligne : sans cela, une saisie pourrait injecter une directive dans le
  fichier de configuration OpenSSL.
- Les phrases secretes de chiffrement de cle passent par l'environnement du
  processus openssl, jamais par sa ligne de commande, et ne sont ecrites nulle
  part.
- Les cles privees sont creees en `chmod 600`, comme dans la CLI.
