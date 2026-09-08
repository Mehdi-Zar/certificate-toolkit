# Installer l'application

Deux formes au choix. Aucune ne demande de droits administrateur, et aucune ne
demande d'installer OpenSSL : il est inclus.

| Forme | Fichier | Pour qui |
|---|---|---|
| **Portable** | `Certificate Toolkit 1.0.0.exe` | Poste verrouillé, usage ponctuel, clé USB |
| **Installeur** | `Certificate Toolkit Setup 1.0.0.exe` | Usage régulier, raccourci dans le menu Démarrer |

Les deux pèsent environ 111 Mo. Ils font la même chose ; le portable ne
s'installe pas, il se lance.

## Version portable

1. Téléchargez `Certificate Toolkit 1.0.0.exe`.
2. Placez-le où vous voulez.
3. Double-cliquez.

C'est tout. Rien n'est écrit dans le registre. Pour désinstaller, supprimez le
fichier.

## Version installée

1. Téléchargez `Certificate Toolkit Setup 1.0.0.exe`.
2. Double-cliquez et suivez l'assistant. Vous pouvez changer le dossier
   d'installation.
3. L'application apparaît dans le menu Démarrer.

L'installation se fait dans votre profil utilisateur, pas dans
`Program Files` : aucun droit administrateur n'est demandé.

## L'avertissement Windows

Au premier lancement, Windows affiche :

> Windows a protégé votre PC
> Microsoft Defender SmartScreen a empêché le démarrage d'une application non
> reconnue.

C'est normal, et c'est attendu : **l'application n'est pas signée
numériquement**. SmartScreen affiche cet écran pour tout exécutable dont il ne
connaît pas l'éditeur.

Pour continuer : cliquez sur **Informations complémentaires**, puis sur
**Exécuter quand même**.

Si cet avertissement pose problème dans votre organisation, la seule solution
est de signer l'exécutable avec un certificat de signature de code. Voir
[Distribuer](distribuer.md).

## Vérifier que tout va bien

En bas de la barre latérale, un point vert et la mention `OpenSSL 3.5.5`
indiquent que tout est en place.

Un point rouge et « OpenSSL introuvable » signifie que la copie embarquée n'a
pas été trouvée : le paquet est probablement incomplet. Retéléchargez-le.

## Où sont mes fichiers

| Quoi | Où |
|---|---|
| Vos certificats | Le dossier choisi au premier lancement, visible en haut de la liste |
| Vos réglages | `%APPDATA%\Certificate Toolkit\settings.json` |
| L'application (version installée) | `%LOCALAPPDATA%\Programs\certificate-toolkit-gui` |

Les réglages ne contiennent aucun mot de passe.

## Désinstaller

- Portable : supprimez l'exécutable.
- Installée : Paramètres Windows, Applications, Certificate Toolkit,
  Désinstaller.

Dans les deux cas, **vos certificats ne sont pas supprimés**. Ils restent dans
votre dossier de travail.

## macOS et Linux

L'application est configurée pour produire un `.dmg` (macOS) et un `.AppImage`
plus un `.deb` (Linux), mais ces paquets n'ont pas été construits ni testés.
Seul Windows est vérifié à ce jour.
