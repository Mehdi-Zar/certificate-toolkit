# Sécurité

Ce qui est protégé, contre quoi, et ce qui ne l'est pas.

## Le postulat

L'outil manipule des clés privées. Une clé privée compromise permet à qui la
détient de se faire passer pour le titulaire du certificat, jusqu'à sa
révocation ou son expiration.

Tout le reste découle de là.

## Ce que l'application garantit

**Rien ne sort du poste.** Aucune requête réseau, y compris pour les polices.
C'est vous qui transmettez la demande à votre autorité.

Une seule exception, et elle se coche : la vérification des versions, éteinte
par défaut. Activée, elle lit un numéro de version au démarrage sur la page des
versions du projet. Aucun identifiant n'est transmis, rien n'est téléchargé ni
installé, et l'adresse que le processus principal accepte d'ouvrir est limitée
à celles du projet. Voir [Réglages](reglages.md).

**La clé privée ne quitte pas le dossier de travail.** Seule la demande, qui ne
contient rien de secret, est destinée à être transmise.

**Les mots de passe ne sont jamais enregistrés.** Ni dans les réglages, ni dans
un fichier de session. Ils vivent le temps d'une opération.

**Les mots de passe ne passent pas par la ligne de commande.** Ils sont
transmis à openssl par son environnement. Sur un poste partagé, `argv` est
lisible par les autres utilisateurs ; l'environnement d'un processus ne l'est
pas.

**Les clés privées sont créées en `chmod 600`** là où le système de fichiers le
permet.

**Aucune saisie ne peut injecter de directive.** Les valeurs du sujet, des SAN
et des extensions sont écrites dans un fichier de configuration OpenSSL ; un
retour à la ligne y créerait une directive. Ils sont refusés.

**Le nom de la demande ne peut désigner qu'un sous-dossier.** Séparateurs,
`..` et caractères de contrôle sont rejetés avant que le nom ne devienne un
chemin.

## La menace la plus probable

Ce n'est pas un attaquant. C'est la synchronisation.

Sur Windows, « Mes documents » est fréquemment redirigé vers OneDrive sans que
ce soit visible dans le chemin. Une clé privée qui y est créée part dans le
cloud immédiatement, et se retrouve sur tous les postes du même compte.

L'application choisit donc par défaut un dossier à la racine du profil, et
avertit dans les réglages comme dans l'assistant.

**Vérifiez votre dossier de travail avant la première demande.**

## Ce qui n'est pas protégé

**L'exécutable n'est pas signé.** SmartScreen avertit au premier lancement, et
rien ne permet à un utilisateur de vérifier que le fichier téléchargé vient bien
de vous. Signer demanderait un certificat de signature de code, que les
autorités publiques ne délivrent qu'avec un HSM.

**Le dossier de travail n'est pas chiffré.** Les clés sont protégées par les
permissions du système de fichiers, pas par de la cryptographie, sauf si vous
cochez le chiffrement de la clé à la génération.

**Rien n'empêche une mauvaise transmission.** L'outil produit un PFX et affiche
son mot de passe une fois ; ce que vous en faites ensuite lui échappe.

**Aucune révocation.** L'outil ne sait pas révoquer un certificat. Cela se fait
auprès de l'autorité.

**Aucune protection contre un poste déjà compromis.** Un logiciel malveillant
qui tourne sous votre compte lit le dossier de travail comme vous.

## Bonnes pratiques

- Chiffrez la clé quand elle vit longtemps sur un poste partagé, et
  systématiquement pour une autorité intermédiaire.
- Transmettez le PFX et son mot de passe par deux canaux différents.
- Ne joignez jamais de clé privée ni de PFX à un ticket ou à un rapport de bug,
  même expiré.
- Supprimez les notes où vous auriez relevé un mot de passe.

## Le dépôt

Le `.gitignore` exclut les dossiers de travail dans leur ensemble, et non une
liste d'extensions. Une liste d'extensions ne peut pas être exhaustive : c'est
ainsi qu'un fichier de notes portant un mot de passe est entré dans le dépôt
pendant le développement, avant d'en être retiré et l'historique réécrit.

Le principe retenu est d'exclure par défaut et de réintroduire explicitement ce
qui appartient au projet.

## Signaler une faille

Par message privé au responsable du dépôt, jamais dans une issue.

Décrivez le problème et comment le reproduire. Ne joignez aucun matériel
cryptographique.
