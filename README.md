# CSR Toolkit

Outillage pour le cycle de vie des certificats X.509 : generation de la **cle privee + CSR**,
puis assemblage du **PKCS#12 (.pfx)** une fois la demande signee par la PKI.

Deux interfaces sur la meme logique :

| Interface | Ou | Pour qui |
|---|---|---|
| **CLI** (`generate-csr.sh`, `make-pfx.sh`) | racine du depot | scripts, CI, habitues du terminal |
| **GUI** (application de bureau) | [`gui/`](gui/) | usage quotidien, guide pas a pas |

---

## Le flux, en trois temps

```
1. generation          2. PKI                  3. assemblage
   ------------           ---                     ----------
   cle privee    -->   envoi de la .csr    -->   depot des fichiers signes
   + CSR               signature                 => .pfx + .crt + chain
```

1. **Generer** la cle privee et la CSR pour un FQDN.
2. **Envoyer** le fichier `.csr` a la PKI ; elle renvoie un certificat (PEM/CER/P7B...).
3. **Assembler** : le certificat est reapparie a sa cle privee, la chaine est
   reconstruite dans l'ordre, et le tout est exporte en `.pfx`.

## Arborescence de travail

Chaque FQDN a son dossier, cree par l'etape 1 et relu par l'etape 3 :

```
<racine>/<fqdn>/
    <fqdn>.key.pem        cle privee            (etape 1)  ** SECRET **
    <fqdn>-req.cnf        config OpenSSL        (etape 1)
    <fqdn>.csr            a envoyer a la PKI    (etape 1)
    <fqdn>.meta           parametres de la demande (relu a l'etape 3)
    Signed/               retours de la PKI     (depose par vous)
    <fqdn>.pfx            resultat              (etape 3)  ** SECRET **
    <fqdn>.crt.pem        certificat seul       (etape 3)
    <fqdn>.chain.pem      chaine de CA          (etape 3)
    <fqdn>.fullchain.pem  feuille + chaine      (etape 3, nginx / HAProxy)
```

---

## CLI

### Etape 1 - cle privee + CSR

```bash
./generate-csr.sh www.exemple.fr
./generate-csr.sh api.exemple.fr www.exemple.fr exemple.fr
./generate-csr.sh vpn.exemple.fr -a IP:10.20.30.40 -b 4096 -u SecOps
./generate-csr.sh svc.interne.local -o "Ma Societe" -e "" --ec
```

Le CN devient automatiquement le premier SAN. Options : `-a/--alt`, `-c/--country`,
`-o/--org`, `-u/--ou`, `-e/--email`, `-b/--bits`, `--ec [courbe]`, `--digest`,
`-d/--dir`, `--force`. Detail : `./generate-csr.sh --help`.

> `--force` ecrase une cle privee existante. Si une CSR est deja partie chez la
> PKI, le certificat a venir deviendra inutilisable.

### Etape 3 - assemblage du PFX

```bash
./make-pfx.sh www.exemple.fr      # lit <fqdn>/Signed/
./make-pfx.sh api.exemple.fr signed.p7b
./make-pfx.sh api.exemple.fr cert.cer -C intermediate.cer -C root.cer
./make-pfx.sh api.exemple.fr --no-root --compat -p 'MonSecret'
```

Le script accepte **tous** les formats de retour PKI (PEM, CRT, CER base64 ou DER,
P7B/P7C PEM ou DER, bundle ou certificat seul), deduplique, identifie la feuille
en comparant les cles publiques, reconstruit la chaine par sujet/emetteur, puis
controle SAN, EKU, expiration et coherence avec la CSR avant d'exporter.

Options utiles : `--compat` (3DES/SHA1 pour Windows < 2016, Java 8, vieux F5),
`--no-root` (ne pas embarquer la CA racine), `--no-pass`, `-n/--name` (friendly
name Windows). Detail : `./make-pfx.sh --help`.

### Valeurs par defaut

Surchargeables par variables d'environnement :

| Variable | Defaut |
|---|---|
| `CERT_HOME` | dossier du script |
| `CERT_COUNTRY` | `FR` |
| `CERT_ORG` | `Ma Societe` |
| `CERT_OU` | `SecOps` |
| `CERT_EMAIL` | `pki@exemple.fr` |
| `PFX_PASSWORD` / `KEY_PASSWORD` | (demande interactivement) |

---

## GUI

Application de bureau (Electron + React) qui couvre le meme flux, sur la meme
arborescence : les deux interfaces peuvent travailler sur la meme racine, dans
n'importe quel ordre.

```bash
cd gui
npm install
npm run dev        # developpement
npm run dist       # installateurs Windows / macOS / Linux
```

Trois ecrans : la liste des dossiers triee par urgence (a assembler, expire, a
renouveler, en attente PKI), le formulaire de demande, et le detail d'un dossier
qui enchaine les trois etapes — la CSR, le depot des retours de la PKI par
glisser-deposer, puis l'assemblage du PFX avec ses controles.

Une demande commence par le choix d'un **modele** decrit en clair — « un site
web public », « une carte a puce Windows », « une autorite intermediaire » —
qui pre-remplit les extensions X.509 correspondantes. Le **mode avance** ouvre
ensuite chaque reglage : sujet complet, sept types de SAN, usages de cle,
usages etendus par OID, contraintes de CA, agrafage OCSP, politiques, CRL,
OCSP, extensions libres. Un apercu montre en direct le fichier de configuration
produit et signale les incoherences avant l'envoi a la PKI.

La GUI ne depend pas de bash : la logique est ecrite en TypeScript et appelle
`openssl` directement. Elle passe aussi les mots de passe par l'environnement
d'openssl plutot que par sa ligne de commande.

Detail : [`gui/README.md`](gui/README.md).

### Ce que la CLI ne fait pas

Les deux interfaces partagent la meme arborescence et le meme fichier `.meta` :
une CSR generee par la GUI s'assemble avec `make-pfx.sh`, et une CSR generee
par `generate-csr.sh` s'assemble dans la GUI. Mais la **generation** a diverge :
`generate-csr.sh` reste limite a un profil serveur TLS avec cle RSA ou EC, la
ou la GUI couvre les modeles, les sept types de SAN, le sujet complet et toutes
les extensions. Pour un profil autre qu'un serveur web, passez par la GUI.

---

## Prerequis

- **OpenSSL 3.x** dans le `PATH` (`openssl version`)
- **Bash** pour la CLI (Git Bash sous Windows)
- **Node.js 20+** pour la GUI

## Securite

Ce depot ne contient **aucun** materiel cryptographique. Le `.gitignore` exclut
les cles, PFX, certificats, CSR et fichiers d'environnement : les artefacts
restent sur le poste qui les a generes.

- Les cles privees sont creees en `chmod 600`.
- Ne transmettez jamais une cle privee ni un `.pfx` par un canal non chiffre ;
  le mot de passe du PFX doit voyager separement.
- Un `.pfx` contient la cle privee : le perdre revient a perdre le certificat.
