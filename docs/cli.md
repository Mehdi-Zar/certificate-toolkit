# Scripts en ligne de commande

Deux scripts bash couvrent le même flux que l'application, pour
l'automatisation et les serveurs sans interface.

Ils demandent **bash** et **OpenSSL dans le `PATH`**. Contrairement à
l'application, ils n'embarquent rien. Sous Windows, Git Bash fournit les deux.

## Ce que la ligne de commande ne fait pas

La génération a divergé. `generate-csr.sh` reste limité à un profil serveur TLS
avec clé RSA ou EC, là où l'application couvre les modèles, les sept types de
SAN, le sujet complet et toutes les extensions.

Pour un profil autre qu'un serveur web, passez par l'application.

L'**assemblage** reste identique des deux côtés : une demande créée par
l'application s'assemble avec `make-pfx.sh`, et l'inverse. Les deux partagent
l'arborescence et le fichier `.meta`.

## Étape 1 : créer la demande

```bash
./generate-csr.sh <nom> [SAN...] [options]
```

Le premier argument devient le Common Name et le premier SAN. Les suivants sont
des SAN supplémentaires.

```bash
./generate-csr.sh www.exemple.fr
./generate-csr.sh api.exemple.fr www.exemple.fr exemple.fr
./generate-csr.sh vpn.exemple.fr -a IP:10.20.30.40 -b 4096 -u SecOps
./generate-csr.sh svc.interne.local -o "Ma Societe" -e "" --ec
```

| Option | Effet |
|---|---|
| `-a`, `--alt NOM` | SAN supplémentaire, répétable. Accepte `IP:`, `DNS:`, `email:`, `URI:` |
| `-c`, `--country CODE` | Pays, défaut `FR` |
| `-o`, `--org NOM` | Organisation |
| `-u`, `--ou NOM` | Unité |
| `-e`, `--email ADRESSE` | Email dans le sujet. `""` pour ne pas en mettre |
| `-b`, `--bits N` | Taille RSA : 2048, 3072 ou 4096. Défaut 2048 |
| `--ec [COURBE]` | Clé EC au lieu de RSA. Défaut P-256 |
| `--digest ALGO` | Empreinte de signature. Défaut sha256 |
| `-d`, `--dir DOSSIER` | Racine de travail |
| `--force` | Écrase une clé privée existante |
| `-h`, `--help` | Aide complète |

`--force` rend inutilisable un certificat en cours de signature. Voir
[Dépannage](depannage.md).

## Étape 3 : assembler le PFX

```bash
./make-pfx.sh <nom> [fichiers-signés...] [options]
```

Sans autre argument, le script lit tout ce qui se trouve dans
`<racine>/<nom>/Signed/`.

```bash
./make-pfx.sh www.exemple.fr
./make-pfx.sh api.exemple.fr signed.p7b
./make-pfx.sh api.exemple.fr cert.cer -C intermediate.cer -C root.cer
./make-pfx.sh api.exemple.fr --no-root --compat -p 'MonSecret'
```

| Option | Effet |
|---|---|
| `-c`, `--cert FICHIER` | Fichier signé, répétable |
| `-C`, `--chain FICHIER` | Certificat de CA à ajouter, répétable |
| `-s`, `--signed-dir DOSSIER` | Dossier des retours, défaut `<nom>/Signed` |
| `-k`, `--key FICHIER` | Clé privée, défaut `<nom>/<nom>.key.pem` |
| `-o`, `--out FICHIER` | PFX de sortie |
| `-d`, `--dir DOSSIER` | Racine de travail |
| `-n`, `--name NOM` | Nom convivial dans le magasin Windows |
| `-p`, `--password MDP` | Mot de passe du PFX |
| `--key-password MDP` | Mot de passe de la clé privée si elle est chiffrée |
| `--compat` | Chiffrement 3DES/SHA-1 pour les systèmes anciens |
| `--no-root` | Exclut la CA racine du PFX |
| `--no-pass` | PFX sans mot de passe |
| `--force` | Écrase un PFX existant sans demander |
| `-h`, `--help` | Aide complète |

Tous les formats de retour sont acceptés : PEM, CRT, CER en base64 ou en DER,
P7B et P7C.

Le script identifie le certificat serveur en comparant sa clé publique à votre
clé privée, jamais par son nom de fichier. Il reconstruit ensuite la chaîne par
sujet et émetteur, puis contrôle le SAN, les usages, l'expiration et la
cohérence avec la CSR.

## Variables d'environnement

| Variable | Effet |
|---|---|
| `CERT_HOME` | Racine de travail |
| `CERT_COUNTRY` | Pays, défaut `FR` |
| `CERT_ORG` | Organisation |
| `CERT_OU` | Unité |
| `CERT_EMAIL` | Email |
| `PFX_PASSWORD` | Mot de passe du PFX, sinon demandé |
| `KEY_PASSWORD` | Mot de passe de la clé privée |

Les mots de passe passés par `-p` apparaissent dans la liste des processus le
temps de l'export. L'application, elle, passe par l'environnement d'openssl.
Pour un usage automatisé, préférez les variables.

## Arborescence produite

```
<racine>/<nom>/
    <nom>.key.pem        clé privée          SECRET
    <nom>-req.cnf        configuration OpenSSL
    <nom>.csr            à envoyer à l'autorité
    <nom>.meta           paramètres de la demande
    Signed/              réponses de l'autorité, déposées par vous
    <nom>.pfx            résultat            SECRET
    <nom>.crt.pem        certificat seul
    <nom>.chain.pem      chaîne de CA
    <nom>.fullchain.pem  feuille et chaîne
```

## Fins de ligne

Les scripts doivent rester en LF. Le dépôt contient un `.gitattributes` qui
l'impose. Un fichier converti en CRLF échoue avec `bash: \r: command not found`.
