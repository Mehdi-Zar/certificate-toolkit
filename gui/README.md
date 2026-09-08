# CSR Toolkit — interface graphique

Application de bureau qui couvre le meme flux que les scripts de la racine :
generer une cle privee et sa CSR, suivre la demande, puis assembler le PFX
quand la PKI a repondu.

```
Certificats            Nouvelle demande         Detail d'un FQDN
-----------            ----------------         ----------------
un dossier par ligne,  FQDN, SAN, sujet,        1. la CSR (afficher, copier)
trie par urgence       type de cle              2. depot des retours PKI
                       -> cle + CSR             3. assemblage du PFX
```

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
`Documents/CSR-Toolkit` dans une version empaquetee. Elle se change dans
**Reglages**, ou par la variable d'environnement `CERT_HOME`.

## Architecture

```
electron/          processus principal — le seul a toucher au disque
  main.ts            fenetre, cycle de vie, posture de securite
  preload.ts         unique pont vers le renderer (contextBridge)
  ipc.ts             handlers, enveloppe Reply<T>
  openssl.ts         appel du binaire openssl
  certs.ts           formats, chaine de confiance, cles publiques
  csr.ts             etape 1 : cle privee + CSR
  pfx.ts             etape 3 : assemblage du PKCS#12
  inventory.ts       scan de la racine, statut de chaque dossier
  store.ts           reglages persistes
shared/types.ts    contrat de donnees partage entre les deux cotes
src/               interface React
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
- Le FQDN est valide avant de devenir un nom de dossier (pas de `..`, pas de
  separateur de chemin), et les valeurs du sujet ne peuvent pas injecter de
  directive dans le fichier de configuration OpenSSL.
- Les cles privees sont creees en `chmod 600`, comme dans la CLI.
