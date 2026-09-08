# Distribuer l'outil

Pour qui livre l'application à une équipe.

## Construire

Sur un poste Windows avec Node 20 ou plus, et Git for Windows installé pour
fournir OpenSSL à copier :

```bash
cd gui
npm install
npm run dist
```

La commande enchaîne trois étapes :

1. `bundle-openssl` copie openssl et ses deux bibliothèques dans `vendor/`,
   puis **vérifie que la copie répond avec un `PATH` réduit aux DLL système**.
   Si elle échoue, la construction s'arrête.
2. `build` produit les bundles de l'application.
3. `electron-builder` produit les exécutables dans `gui/release/`.

Résultat : deux fichiers d'environ 111 Mo.

| Fichier | Forme |
|---|---|
| `Certificate Toolkit 1.0.0.exe` | Portable |
| `Certificate Toolkit Setup 1.0.0.exe` | Installeur NSIS |

Aucun ne demande de droits administrateur.

## Choisir la source d'OpenSSL

Par défaut, le script prend la version la plus récente parmi les installations
connues, en préférant celle de Git for Windows qui suit OpenSSL de près.

Pour imposer une source :

```bash
node scripts/bundle-openssl.mjs --from "C:/chemin/vers/openssl.exe"
```

En dessous d'OpenSSL 3.5, le script avertit : ML-DSA et SHA-3 ne seront pas
proposés dans l'interface.

## Publier

```bash
gh release create v1.0.0 \
  "gui/release/Certificate Toolkit 1.0.0.exe" \
  "gui/release/Certificate Toolkit Setup 1.0.0.exe" \
  --title "Certificate Toolkit 1.0.0" --notes-file notes.md
```

Le dépôt étant privé, seuls les comptes qui y ont accès peuvent télécharger.
C'est le mécanisme de contrôle : gérez l'accès au dépôt, pas au fichier.

GitHub remplace les espaces des noms de fichiers par des points.

## L'avertissement SmartScreen

L'exécutable n'est pas signé. Au premier lancement, Windows affiche « Windows a
protégé votre PC ». L'utilisateur doit cliquer sur **Informations
complémentaires**, puis **Exécuter quand même**.

Prévenez-en vos utilisateurs dans le message d'annonce. Un avertissement de
sécurité non expliqué produit soit un abandon, soit l'habitude de passer outre,
et les deux sont mauvais.

Pour le supprimer, il faut un certificat de signature de code. Les autorités
publiques imposent aujourd'hui que sa clé vive dans un module matériel. C'est un
achat et une procédure ; voir [Dette et risques](dette.md).

## Préconfigurer des postes

Les variables d'environnement sont lues au premier lancement, avant qu'aucun
réglage ne soit enregistré. Vous pouvez donc livrer des postes déjà réglés :

```
CERT_HOME=D:\Certificats
CERT_COUNTRY=FR
CERT_ORG=Ma Societe
CERT_OU=Direction des systemes d'information
CERT_EMAIL=pki@exemple.fr
```

`OPENSSL_BIN` impose un binaire précis, si votre organisation en exige un.

Une fois les réglages enregistrés par l'utilisateur, ce sont eux qui font foi.

## Ce qu'il faut dire aux utilisateurs

Trois choses, et elles suffisent :

1. **Téléchargez, double-cliquez.** Rien à installer, OpenSSL est inclus.
2. **Windows va vous avertir au premier lancement**, c'est normal, voici
   comment passer.
3. **Choisissez un dossier de travail non synchronisé** quand l'assistant le
   demande. Pas OneDrive.

Le reste, l'assistant s'en charge.

## Mettre à jour

Il n'y a pas de mise à jour automatique. Une nouvelle version demande à chacun
de retélécharger.

Les réglages et les certificats survivent : ils vivent hors de l'application.

## Plateformes

Seul Windows est construit et vérifié. Les cibles macOS et Linux figurent dans
la configuration mais n'ont jamais été produites ni testées.
