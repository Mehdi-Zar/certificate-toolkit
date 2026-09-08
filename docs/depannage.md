# Dépannage

Les pannes réellement rencontrées, et ce qui les résout.

## Au lancement

### Windows a protégé votre PC

L'exécutable n'est pas signé numériquement. SmartScreen affiche cet écran pour
tout programme dont il ne connaît pas l'éditeur.

Cliquez sur **Informations complémentaires**, puis **Exécuter quand même**.

Il n'existe pas d'autre contournement : seul un certificat de signature de code
ferait disparaître l'avertissement.

### OpenSSL introuvable

Un point rouge en bas de la barre latérale.

L'application embarque sa propre copie d'OpenSSL, donc ce message signifie que
le paquet est incomplet. Retéléchargez-le depuis les
[releases](https://github.com/Mehdi-Zar/certificate-toolkit/releases).

Si vous avez saisi un chemin dans **Réglages, Binaire OpenSSL**, videz-le pour
revenir à la copie embarquée.

## Autour du dossier de travail

### Le bouton Ouvrir ne fait rien

Corrigé en version 1.0.0. Le dossier de travail n'existe pas tant qu'aucune
demande n'a été créée ; l'ouverture le crée désormais.

Si le problème persiste, vérifiez que le chemin affiché dans le bandeau
**Espace de travail** est accessible en écriture.

### Mes certificats ont disparu

L'application ne supprime jamais rien. Vérifiez le chemin dans le bandeau en
haut de la liste : vous regardez probablement un autre dossier.

Les versions portable et installée ont des réglages séparés, donc chacune peut
pointer ailleurs. Utilisez **Changer de dossier** pour retrouver le bon.

### Mes clés privées sont dans OneDrive

Changez de dossier de travail sans attendre, puis considérez les clés
concernées comme compromises et refaites les demandes.

Sur Windows, « Mes documents » est fréquemment redirigé vers OneDrive sans que
ce soit visible. L'application choisit donc par défaut un dossier à la racine du
profil.

## Au moment de créer une demande

### Le bouton Générer reste grisé

Un contrôle bloquant est en cours. Regardez le panneau de droite : les bulles
rouges empêchent la génération.

Les plus fréquentes :

| Message | Ce qu'il faut faire |
|---|---|
| Le nom de domaine est obligatoire | Remplissez le premier champ |
| Ce modèle exige au moins un nom alternatif | Ajoutez un SAN, par exemple l'adresse email pour du S/MIME |
| Le pays doit être un code à deux lettres | `FR`, pas `France` |

### Une clé privée existe déjà

Vous avez déjà créé une demande sous ce nom.

Si la CSR est encore chez l'autorité, **ne l'écrasez pas** : le certificat à
venir serait inutilisable, car il correspondrait à une clé qui n'existe plus.

Créez plutôt une demande sous un autre nom, ou attendez la réponse.

Si l'ancienne demande est réellement abandonnée, cochez **Écraser une clé
privée existante** dans le formulaire.

## Après la réponse de l'autorité

### Aucun certificat fourni ne correspond à la clé privée

Le message le plus déroutant, et le plus important.

L'application compare la clé publique de chaque certificat reçu à celle de
votre clé privée. Aucune ne correspond. Trois causes possibles :

1. **Vous avez déposé la réponse dans la mauvaise demande.** Vérifiez que le
   nom du dossier correspond bien à la demande envoyée.
2. **La clé a été régénérée depuis l'envoi.** Si vous avez recréé la demande
   avec l'option d'écrasement, l'ancienne clé est perdue et le certificat reçu
   est inutilisable. Il faut refaire une demande.
3. **L'autorité a signé une autre CSR.** Cela arrive quand plusieurs demandes
   circulent en parallèle.

### Chaîne incomplète, émetteur manquant

L'autorité n'a pas joint tous les certificats intermédiaires.

Demandez-lui la chaîne complète, ou téléchargez les intermédiaires depuis son
site, puis déposez-les avec le reste dans le dossier `Signed/`.

Le PFX est tout de même produit, mais les clients qui ne connaissent pas
l'intermédiaire refuseront la connexion.

### Le SAN ne contient pas le nom demandé

L'autorité a délivré un certificat pour d'autres noms que ceux demandés. Les
navigateurs le refuseront pour le nom attendu.

Vérifiez la demande auprès de l'autorité. Certaines réécrivent les noms selon
leurs propres règles.

### Le PFX ne s'importe pas

Sur un système ancien, l'échec vient souvent du chiffrement. L'application
utilise AES-256 par défaut, que Windows antérieur à 2016 et Java 8 ne savent
pas ouvrir.

Dans l'étape 3, ouvrez **Options avancées** et cochez **Chiffrement compatible
(3DES / SHA-1)**, puis réassemblez.

Ce chiffrement est plus faible. Ne l'activez que si l'import échoue autrement.

## En ligne de commande

### bash: \r: command not found

Les scripts ont été convertis en fins de ligne Windows. Le dépôt contient un
`.gitattributes` qui l'empêche ; si vous avez copié les fichiers autrement,
reconvertissez-les :

```bash
sed -i 's/\r$//' generate-csr.sh make-pfx.sh
```

### openssl introuvable dans le PATH

Les scripts, contrairement à l'application, utilisent l'OpenSSL du système.
Installez-le, ou passez par l'application.

## Signaler un problème

Ouvrez une issue sur le dépôt en précisant la version, ce que vous avez fait,
ce qui était attendu et ce qui s'est produit.

**Ne joignez jamais de clé privée ni de PFX**, même expiré.
