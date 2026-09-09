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

### Les vérifications du moteur ne sont pas dans le dépôt

Une suite de bout en bout est désormais versionnée : 22 tests dans
`gui/tests/`, du premier écran jusqu'au PFX ouvert avec son mot de passe.
L'assemblage est couvert par une autorité de certification créée à la volée
(`gui/tests/helpers/ca.ts`), ce qui lève la dépendance à des données réelles
qui tenait ces tests dehors.

Reste dehors la suite du moteur de génération, 99 vérifications, écrite avant
que le dépôt n'ait de cadre de test.

**Remède.** La verser en tests unitaires dans le même répertoire, sous le même
`npm test`.

**Risque.** Réduit mais pas nul : le moteur de génération n'est vérifié que par
ce que le parcours de bout en bout traverse, soit une partie des combinaisons
d'extensions qu'ouvre le mode avancé.

### Seul Windows est vérifié

Les cibles macOS et Linux sont configurées mais n'ont jamais été construites.
Le script d'empaquetage d'OpenSSL connaît des chemins pour ces systèmes, sans
qu'ils aient été essayés.

**Remède.** Construire sur chaque plateforme et vérifier l'autonomie de la
copie d'OpenSSL comme sous Windows.

### Aucune intégration continue

Rien ne vérifie automatiquement que le code compile, que les tests passent ou
que la documentation reste juste.

C'est devenu plus coûteux qu'avant : la suite de bout en bout tourne en
cinquante secondes et a trouvé dix défauts réels, mais elle n'est lancée que
par qui y pense.

**Remède.** Un workflow qui lance le typage, les tests et le contrôle de
documentation à chaque poussée. Voir [Améliorations](ameliorations.md).

---

## À surveiller

### OpenSSL embarqué à suivre

En embarquant OpenSSL, le projet hérite du devoir de suivre ses
vulnérabilités et de republier. Ce n'était pas le cas quand il dépendait du
système.

La version livrée est inscrite dans `NOTICE.txt` à côté des binaires.

### Aucune mise à jour automatique

Une version corrigée demande à chacun de retélécharger. Sur quelques postes
c'est acceptable ; au-delà, il faudra un mécanisme.

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
