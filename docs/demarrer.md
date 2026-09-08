# Démarrer : votre premier certificat

Ce guide vous mène de zéro à un certificat utilisable. Comptez dix minutes de
travail, plus le temps que met votre autorité à signer.

Aucune connaissance de X.509 n'est nécessaire. Les mots inconnus sont dans le
[glossaire](glossaire.md).

## Ce que vous allez faire

Trois étapes, séparées par une attente :

1. créer une demande, ce qui produit une clé privée et un fichier `.csr` ;
2. envoyer ce `.csr` à votre autorité de certification, et attendre sa réponse ;
3. déposer sa réponse dans l'application, qui produit le certificat final.

L'étape 2 ne dépend pas de vous. Vous pouvez fermer l'application entre-temps.

## Avant de commencer

Il vous faut l'application, à
[télécharger ici](https://github.com/Mehdi-Zar/certificate-toolkit/releases/download/v1.0.0/Certificate.Toolkit.1.0.0.exe)
(la [procédure complète](installer.md) explique l'avertissement Windows), et
l'adresse à laquelle votre organisation reçoit les demandes de certificat : un portail, une boîte aux lettres, un outil de
tickets. Demandez-la à votre équipe sécurité si vous ne la connaissez pas.

## Étape 1 : choisir votre espace de travail

Au premier lancement, l'assistant s'ouvre. Son deuxième écran vous demande où
travailler.

Choisissez un dossier **qui n'est pas synchronisé**. Ni OneDrive, ni Dropbox,
ni un lecteur réseau. Votre clé privée y sera écrite, et une clé privée qui
part dans un cloud est une clé privée compromise.

Un dossier à la racine de votre profil convient : `C:\Users\vous\Certificats`.

Chaque demande y recevra son propre sous-dossier.

## Étape 2 : créer la demande

Cliquez sur **Nouvelle demande**.

### Choisir le modèle

L'application demande d'abord à quoi servira le certificat. Choisissez en
français, pas en jargon :

- un site accessible depuis Internet : **Site web public** ;
- un service sur le réseau interne : **Serveur interne** ;
- se connecter avec une carte à puce : **Ouverture de session par carte à puce** ;
- signer des courriels : **Messagerie S/MIME**.

La liste complète est dans [Modèles](modeles.md). Le modèle pré-remplit les
réglages techniques ; vous n'avez pas à les connaître.

### Remplir le formulaire

Le mode **Simple** ne montre que l'essentiel :

| Champ | Ce qu'on attend |
|---|---|
| Nom de domaine | Le nom principal du site : `www.exemple.fr` |
| Noms alternatifs | Les autres noms que le certificat doit couvrir |
| Pays, Organisation, Unité | L'identité de votre organisation |

Tapez un nom alternatif puis appuyez sur Entrée pour l'ajouter.

Chaque champ porte une icône d'aide. Cliquez-la si un intitulé ne vous parle
pas.

À droite, un panneau affiche ce qui sera envoyé à OpenSSL et signale les
incohérences au fur et à mesure. Une bulle rouge bloque la génération, une
bulle orange est un avertissement que vous pouvez ignorer en connaissance de
cause.

### Générer

Cliquez sur **Générer la clé et la CSR**.

L'application écrit deux fichiers dans votre espace de travail :

- `<nom>.key.pem`, votre clé privée. **Elle ne doit jamais quitter ce poste.**
- `<nom>.csr`, la demande. Elle ne contient rien de secret.

## Étape 3 : envoyer la demande

Cliquez sur **Copier la CSR** et collez le contenu dans le portail de votre
autorité. Si elle attend un fichier, prenez le `.csr` avec le bouton
**Ouvrir le dossier**.

Puis attendez. Selon les organisations, la signature prend de quelques minutes
à quelques jours.

Dans la liste, votre demande porte l'étiquette **En attente PKI**.

## Étape 4 : déposer la réponse

Quand l'autorité répond, elle vous envoie un ou plusieurs fichiers. Leur
extension varie : `.cer`, `.crt`, `.pem`, `.p7b`. Tous sont acceptés, et vous
n'avez pas à savoir lequel est lequel.

Ouvrez votre demande dans la liste, puis glissez les fichiers reçus sur
l'étape 2. L'étiquette passe à **À assembler**.

## Étape 5 : assembler le certificat

C'est l'étape que l'on comprend mal la première fois, alors voici pourquoi elle
existe.

Le certificat que l'autorité vous renvoie ne contient que la moitié publique de
votre identité. Seul, il ne sert à rien : un serveur a besoin de la clé privée
correspondante pour prouver qu'il est bien le titulaire. Cette clé privée est
restée sur votre poste depuis l'étape 2. L'assemblage réunit les deux.

Dans l'étape 3, choisissez un mot de passe, confirmez-le, et cliquez sur
**Assembler le PFX**.

Ce mot de passe protège la clé privée dans le fichier produit. Transmettez-le
par un canal différent de celui du fichier.

L'application vérifie au passage que le certificat correspond bien à votre clé,
reconstruit la chaîne jusqu'à l'autorité racine, et contrôle les dates et les
noms. Les résultats s'affichent sous forme de liste.

## Étape 6 : récupérer le bon fichier

Une table apparaît : **Quel fichier pour quel serveur**. Prenez la ligne qui
correspond au vôtre.

| Votre serveur | Le fichier |
|---|---|
| Windows, IIS, Exchange, Java, Tomcat | `.pfx` |
| nginx, HAProxy, Traefik | `.fullchain.pem` et `.key.pem` |
| Apache, Postfix, Dovecot | `.crt.pem`, `.chain.pem` et `.key.pem` |

Le détail est dans [Formats](formats.md).

## Et ensuite

La liste des certificats signale ceux qui approchent de leur expiration, à
partir de trente jours avant. Un certificat expiré fait tomber le service qui
s'en sert : ne l'attendez pas.

Pour renouveler, créez une nouvelle demande. Le certificat en place continue de
fonctionner jusqu'à ce que vous installiez le nouveau.

## Si quelque chose ne va pas

Voir [Dépannage](depannage.md).
