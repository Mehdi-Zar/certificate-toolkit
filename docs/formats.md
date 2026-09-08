# Formats

Un assemblage produit quatre fichiers. C'est le même certificat, empaqueté
différemment selon le serveur qui doit le lire.

Prenez la ligne qui correspond au vôtre, ignorez les autres.

## Quel fichier pour quel serveur

| Votre serveur | Ce qu'il vous faut |
|---|---|
| Windows, IIS, Exchange | `.pfx` seul |
| Java, Tomcat, JBoss | `.pfx` seul |
| nginx, HAProxy, Traefik | `.fullchain.pem` et `.key.pem` |
| Apache | `.crt.pem`, `.chain.pem` et `.key.pem` |
| Postfix, Dovecot | `.crt.pem` et `.key.pem` |

## Ce que contient chaque fichier

**`<nom>.pfx`**
Le certificat, sa chaîne et la clé privée, dans un seul fichier protégé par mot
de passe. Aussi appelé PKCS#12. C'est le format des univers Windows et Java.

**`<nom>.fullchain.pem`**
Votre certificat suivi de sa chaîne, sans la clé. Il se donne avec le
`.key.pem` en fichier séparé.

**`<nom>.crt.pem`**
Votre certificat seul, sans la chaîne.

**`<nom>.chain.pem`**
Les certificats intermédiaires, sans le vôtre.

**`<nom>.key.pem`**
La clé privée. Elle est produite à l'étape 1 et n'est pas régénérée par
l'assemblage. Elle est déjà incluse dans le `.pfx`.

## Exemples de configuration

### nginx

```nginx
ssl_certificate     /chemin/exemple.fr.fullchain.pem;
ssl_certificate_key /chemin/exemple.fr.key.pem;
```

### Apache

```apache
SSLCertificateFile      /chemin/exemple.fr.crt.pem
SSLCertificateKeyFile   /chemin/exemple.fr.key.pem
SSLCertificateChainFile /chemin/exemple.fr.chain.pem
```

### Windows, en PowerShell

```powershell
Import-PfxCertificate -FilePath 'C:\chemin\exemple.fr.pfx' `
  -CertStoreLocation Cert:\LocalMachine\My `
  -Password (Read-Host -AsSecureString)
```

La commande complète, avec le bon chemin, est affichée dans l'application après
l'assemblage.

## Erreurs fréquentes

**Donner le `.crt.pem` à nginx.** Il ne contient pas la chaîne. Le site
fonctionnera dans votre navigateur, qui a peut-être déjà l'intermédiaire en
cache, et échouera ailleurs. Utilisez le `.fullchain.pem`.

**Chercher la clé privée dans le PFX pour Apache.** Elle y est, mais Apache
veut un fichier séparé. Prenez le `.key.pem` produit à l'étape 1.

**Transmettre le PFX et son mot de passe ensemble.** Le PFX contient la clé
privée : le fichier et le mot de passe doivent voyager par deux canaux
différents.

## Compatibilité du PFX

Le PFX est chiffré en AES-256 par défaut. Windows antérieur à 2016, Java 8 et
certains équipements réseau anciens ne savent pas l'ouvrir.

Dans ce cas, réassemblez en cochant **Chiffrement compatible (3DES / SHA-1)**
dans les options avancées de l'étape 3. Ce chiffrement est plus faible ;
réservez-le aux cas où l'import échoue autrement.

## Retrouver ces fichiers plus tard

Ouvrez la demande dans la liste. La table des formats reste affichée en bas de
la page, avec un bouton par fichier pour l'ouvrir dans l'explorateur.
