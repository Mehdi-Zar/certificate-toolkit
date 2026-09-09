# Dette et risques

Ce qui ne tient pas encore. Un projet qui prétend n'avoir aucune dette ment ou
ne se connaît pas.

Trois niveaux : **bloquant** empêche un usage légitime, **gênant** coûte du
temps ou de la confiance, **à surveiller** n'a pas encore fait de dégâts.

---

## Bloquant

### L'exécutable n'est pas signé

SmartScreen avertit au premier lancement, et rien ne permet de vérifier
l'origine du fichier téléchargé. Pour un outil de sécurité distribué en
interne, c'est le pire signal possible.

**Remède.** Un certificat de signature de code. Les autorités publiques le
délivrent aujourd'hui avec obligation de HSM, ce que cet outil ne peut pas
produire lui-même. C'est un achat et une procédure, pas une ligne de code.

**En attendant.** L'avertissement est documenté dans
[Installer](installer.md) et dans les notes de version.

---

## Gênant

### La ligne de commande a divergé

`generate-csr.sh` couvre un profil serveur TLS. L'application en couvre douze,
avec toutes les extensions.

L'assemblage, lui, est resté identique des deux côtés.

**Remède.** Porter les modèles vers bash, ou faire appeler l'application en
mode sans interface. Aucun des deux n'est engagé.

**Risque.** Quelqu'un automatise avec les scripts en croyant obtenir ce que
produit l'interface.


### Seul Windows est vérifié

Les cibles macOS et Linux sont configurées mais n'ont jamais été construites.
Le script d'empaquetage d'OpenSSL connaît des chemins pour ces systèmes, sans
qu'ils aient été essayés.

**Remède.** Construire sur chaque plateforme et vérifier l'autonomie de la
copie d'OpenSSL comme sous Windows.

### La couverture s'arrête au mode avancé

100 tests couvrent le parcours complet, les règles de cohérence et les
catalogues. Ce qui reste peu couvert, ce sont les combinaisons rares du mode
avancé : sept types de SAN, neuf bits de `keyUsage` et douze usages étendus font
plus de combinaisons qu'on n'en écrira jamais.

**Remède partiel appliqué.** Chaque règle de cohérence est éprouvée deux fois,
sur un cas qui doit la lever et sur un cas qui ne doit pas. Une règle qui ne se
déclencherait jamais serait pire qu'absente.

**Risque résiduel.** Une combinaison exotique peut produire une demande qu'une
autorité refusera, sans qu'aucun test ne l'ait vue passer. Voir plus bas, « Le
mode avancé peut produire une demande refusée ».

---

## À surveiller

### OpenSSL embarqué à suivre

En embarquant OpenSSL, le projet hérite du devoir de suivre ses
vulnérabilités et de republier. Ce n'était pas le cas quand il dépendait du
système.

La version livrée est inscrite dans `NOTICE.txt` à côté des binaires.

### Aucune mise à jour automatique

Une version corrigée demande à chacun de retélécharger. La vérification des
versions, si elle est activée dans les réglages, affiche un bandeau et un lien ;
elle ne télécharge ni n'installe rien, ce qui demanderait une signature de code.

Sur quelques postes c'est acceptable ; au-delà, il faudra un mécanisme, et la
vérification est éteinte par défaut, donc personne ne sera prévenu sans l'avoir
demandé.

### Un mot de passe a été exposé

Pendant le développement, un fichier de notes contenant un mot de passe de PFX
est entré dans le dépôt, à la suite d'une modification du `.gitignore`.

L'historique a été réécrit et le dépôt distant vérifié par clone neuf. **Le mot
de passe concerné doit être considéré comme compromis** et le PFX régénéré.

Le `.gitignore` exclut désormais les dossiers de travail dans leur ensemble.

### Le mode avancé peut produire une demande refusée

Il ouvre toutes les extensions, y compris des combinaisons qu'aucune autorité
n'acceptera. Vingt contrôles préviennent les cas connus ; ils ne couvrent pas
tout.

C'est le prix d'un mode avancé qui mérite son nom.

### Pas de renouvellement automatique

L'outil signale les certificats qui expirent, à partir de trente jours. Il ne
renouvelle rien. Avec des validités publiques qui tombent à 100 jours en 2027,
le renouvellement manuel deviendra pesant.

**Remède éventuel.** Un support d'ACME pour les autorités qui l'exposent.
