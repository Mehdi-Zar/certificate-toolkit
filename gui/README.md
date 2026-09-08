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

OpenSSL doit etre dans le `PATH` ; sinon, indiquez son chemin dans **Reglages**.

| Commande | Effet |
|---|---|
| `npm run dev` | Application en mode developpement, rechargement a chaud |
| `npm run typecheck` | Verification TypeScript seule |
| `npm run build` | Typecheck + bundles de production dans `dist/` et `dist-electron/` |
| `npm run pack` | Application non empaquetee dans `release/` (test rapide) |
| `npm run dist` | Installateurs : NSIS + portable (Windows), DMG (macOS), AppImage + deb (Linux) |

## Racine de travail

Un sous-dossier par FQDN, exactement l'arborescence de la CLI — les deux
interfaces peuvent travailler sur la meme racine, dans n'importe quel ordre :
une CSR generee par `generate-csr.sh` s'assemble dans la GUI, et inversement.

Par defaut la racine est celle du depot en developpement, et
`<profil utilisateur>/Certificate-Toolkit` dans une version empaquetee. Elle se change dans
**Reglages**, ou par la variable d'environnement `CERT_HOME`.

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
