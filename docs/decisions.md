# Décisions

Les choix tranchés, avec ce qu'ils coûtent. Une décision remplacée n'est pas
réécrite : on ajoute la nouvelle et on marque l'ancienne comme remplacée.

---

## 1. Electron plutôt que Tauri

**Statut** : acceptée

**Contexte.** Il fallait une application de bureau moderne. Tauri produit des
binaires vingt fois plus petits et passe pour le meilleur choix technique.

**Décision.** Electron.

**Raisons.** Tauri demande la chaîne Rust et les outils de compilation
Microsoft, absents du poste de développement. Le poste avait Node et OpenSSL.
Electron construisait le jour même ; Tauri aurait demandé une installation dont
rien ne garantissait qu'elle aboutirait.

**Conséquences.** Le paquet pèse 111 Mo au lieu d'environ 10. Une application
qui existe et pèse 111 Mo vaut mieux qu'une application légère qui ne compile
pas.

---

## 2. Porter la logique des scripts en TypeScript

**Statut** : acceptée

**Contexte.** L'application pouvait appeler `generate-csr.sh` et `make-pfx.sh`,
ou refaire leur travail.

**Décision.** Refaire, en appelant openssl directement.

**Raisons.** Les scripts demandent des mots de passe par `read -s`, ce qui
bloquerait une interface graphique. Ils imposent bash, absent d'un poste
Windows sans Git. Et la traduction des messages aurait été impossible.

**Conséquences.** Deux implémentations à maintenir. La génération a
effectivement divergé : les scripts couvrent un profil, l'application douze.
L'assemblage, lui, est resté identique des deux côtés.

---

## 3. Identifier le certificat par sa clé publique

**Statut** : acceptée

**Contexte.** Une autorité renvoie plusieurs fichiers, aux noms imprévisibles,
contenant plusieurs certificats qui se recouvrent.

**Décision.** Le certificat serveur est celui dont la clé publique correspond à
la clé privée. Jamais celui dont le nom de fichier ressemble au bon.

**Raisons.** C'est la seule méthode qui garantit qu'un PFX est utilisable.

**Conséquences.** Un message d'erreur difficile à comprendre quand rien ne
correspond, mais qui dit la vérité : le certificat reçu ne va pas avec cette
clé. Voir [Dépannage](depannage.md).

---

## 4. serverAuth seul par défaut pour un site public

**Statut** : acceptée

**Contexte.** Le code posait `serverAuth, clientAuth` sur tous les certificats.

**Décision.** Le modèle « Site web public » ne pose que `serverAuth`, et
avertit si on ajoute `clientAuth`.

**Raisons.** Depuis juin 2026, le CA/Browser Forum interdit cette combinaison
pour un certificat public. L'ancien défaut faisait produire des demandes
qu'une autorité publique refuse.

**Conséquences.** Qui a besoin des deux doit prendre « Serveur interne » ou
demander deux certificats. C'est la contrainte du secteur, pas celle de l'outil.

---

## 5. Embarquer OpenSSL

**Statut** : acceptée

**Contexte.** L'application appelait l'openssl du `PATH`. Sur un poste vierge
elle se lançait sans rien pouvoir faire.

**Décision.** Copier openssl et ses bibliothèques dans le paquet, et vérifier à
la construction que la copie répond avec un `PATH` réduit aux DLL système.

**Raisons.** Deux problèmes d'un coup. L'installation devient utilisable telle
quelle. Et la version devient prévisible : sur la machine de développement, le
`PATH` Windows exposait OpenSSL 3.1 quand Git Bash exposait 3.5, et 3.1 ne
connaît ni ML-DSA ni SHA-3. Un utilisateur aurait perdu ces algorithmes sans
le savoir.

**Conséquences.** Le paquet grossit de 7,6 Mo. Il faut suivre les
vulnérabilités d'OpenSSL et republier, ce qui n'était pas le cas avant. Un
chemin saisi dans les réglages l'emporte, pour une organisation qui impose son
binaire.

---

## 6. La racine de travail n'est pas « Mes documents »

**Statut** : acceptée

**Contexte.** Le défaut visait `Documents/Certificate-Toolkit`. En construisant
le premier paquet, ce dossier s'est révélé redirigé vers OneDrive.

**Décision.** Un dossier à la racine du profil utilisateur.

**Raisons.** Une clé privée créée dans un dossier synchronisé part dans le
cloud immédiatement. Pour un outil dont tout l'objet est la protection de clés
privées, c'était le pire défaut possible.

**Conséquences.** Un dossier un peu moins évident à trouver. Compensé par le
bandeau en haut de la liste et par l'assistant, qui fait choisir le dossier
comme deuxième écran.

---

## 7. Le nom du dossier est distinct du Common Name

**Statut** : acceptée

**Contexte.** Le nom de la demande servait à la fois de CN et de nom de
dossier, avec une validation stricte des caractères.

**Décision.** Deux champs. Le nom de dossier est dérivé du CN, puis
indépendant.

**Raisons.** Un CN peut être « Jean Dupont », avec un espace, pour un
certificat S/MIME. Un nom de dossier ne peut pas.

**Conséquences.** Un champ de plus en mode avancé.

---

## 8. Le français fait foi pour les traductions

**Statut** : acceptée

**Contexte.** Deux langues à tenir synchronisées.

**Décision.** Le fichier français définit le type des clés ; l'anglais est typé
`Record<MessageKey, string>`.

**Raisons.** Une traduction oubliée devient une erreur de compilation plutôt
qu'un libellé vide découvert par un utilisateur.

**Conséquences.** Ajouter une clé impose de traduire immédiatement. C'est
l'effet recherché.

---

## 9. Exclure les dossiers de travail dans leur ensemble

**Statut** : acceptée, remplace une exclusion par extensions

**Contexte.** Le `.gitignore` listait les extensions à écarter. En retirant une
ligne devenue inutile, un dossier de travail est entré dans le dépôt avec un
fichier de notes contenant un mot de passe de PFX en clair.

**Décision.** Exclure tous les dossiers de premier niveau, et réintroduire
explicitement ceux du projet.

**Raisons.** Une liste de ce qui sort ne peut pas être exhaustive : un dossier
de travail contient aussi des notes, des exports et des configurations. Une
liste de ce qui entre se trompe moins souvent.

**Conséquences.** Un nouveau dossier du projet doit être ajouté explicitement.
L'historique a été réécrit pour retirer le secret exposé, et le mot de passe
concerné doit être considéré comme compromis.
