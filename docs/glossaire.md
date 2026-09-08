# Glossaire

Les mots que l'outil emploie, expliqués sans en employer d'autres.

## Les quatre mots à connaître

**Clé privée**
Un fichier secret, généré sur votre poste. Il prouve que vous êtes bien le
titulaire du certificat. Quiconque l'obtient peut se faire passer pour vous.
Elle ne doit jamais être transmise, ni par courriel, ni dans un dossier
synchronisé. Extension `.key.pem`.

**CSR** (demande de signature de certificat)
Le fichier que vous envoyez à l'autorité. Il contient votre identité et la
moitié publique de votre clé. Il ne contient rien de secret : vous pouvez le
coller dans un ticket sans risque. Extension `.csr`.

**Certificat**
Ce que l'autorité vous renvoie après signature. C'est votre identité, contresignée
par quelqu'un en qui les navigateurs ont confiance. Seul, il ne suffit pas : il
lui faut la clé privée correspondante.

**PFX** (aussi appelé PKCS#12)
Un fichier unique contenant le certificat, sa chaîne et la clé privée, le tout
protégé par un mot de passe. C'est ce que demandent Windows, IIS et Java.
Extension `.pfx`.

## Autour de l'identité

**Autorité de certification** (AC, ou CA, ou PKI)
L'organisme qui signe les certificats. Publique pour un site Internet, interne
pour un service d'entreprise.

**Common Name (CN)**
Le nom principal inscrit dans le certificat. Historiquement le nom du site.
Aujourd'hui les navigateurs l'ignorent et ne regardent que les SAN, mais le
champ reste obligatoire.

**SAN** (nom alternatif du sujet)
La liste des noms que le certificat couvre réellement. C'est elle que vérifient
les navigateurs. Un certificat dont le SAN ne contient pas le nom demandé est
refusé, même si son CN est correct.

**DN** (nom distinctif)
L'identité complète du titulaire : pays, organisation, unité, nom. La plupart
des autorités d'entreprise réécrivent ces champs selon leur propre gabarit.

## Autour de la confiance

**Chaîne de confiance**
La suite de certificats qui relie le vôtre à une autorité racine connue de tous
les systèmes. Un serveur doit présenter cette suite, sinon les clients ne
peuvent pas remonter jusqu'à une racine et refusent la connexion.

**Autorité intermédiaire**
Un maillon de cette suite. Les autorités racines signent rarement en direct :
elles délèguent à des intermédiaires.

**Fullchain**
Votre certificat suivi de sa chaîne, dans un seul fichier. C'est le format
qu'attendent nginx et HAProxy.

## Autour des usages

**Extension X.509**
Un champ du certificat qui déclare ce qu'il a le droit de faire. Les modèles de
l'outil les remplissent pour vous.

**keyUsage**
Les opérations cryptographiques autorisées : signer, chiffrer une clé, signer
d'autres certificats.

**Usage étendu** (EKU)
La fonction du certificat : authentifier un serveur, authentifier un client,
signer du code, signer des courriels. C'est le champ que vérifient réellement
les navigateurs et Windows. Un usage manquant se traduit par un refus, souvent
sans message clair.

**Agrafage OCSP** (must-staple)
Une contrainte qui oblige le serveur à joindre lui-même la preuve que son
certificat n'est pas révoqué. Efficace, mais un serveur mal configuré devient
totalement injoignable.

## Autour des fichiers

**PEM**
Un format texte, reconnaissable à ses lignes `-----BEGIN ...-----`. La plupart
des fichiers de l'outil sont en PEM.

**DER**
Le même contenu, en binaire. Certaines autorités renvoient du DER sous
l'extension `.cer`.

**P7B** (PKCS#7)
Un format qui regroupe plusieurs certificats, souvent utilisé pour livrer une
chaîne complète. L'outil sait le lire.

L'application accepte tous ces formats en entrée sans que vous ayez à les
distinguer.
