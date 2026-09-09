# Améliorations

Onze améliorations ont été identifiées puis mises en place. Cette page dit ce
qui a changé, et pourquoi c'était un problème, pour que personne n'ait à le
redécouvrir.

Distinction avec [Dette et risques](dette.md) : la dette décrit ce qui ne tient
toujours pas. Cette page décrit ce qui a été réparé.

Tous les constats venaient de la suite de tests ou d'une lecture du code, pas
d'impressions. Chaque correction est couverte par un test.

---

## Expérience utilisateur

### Le dossier `Signed/` est surveillé

**Ce qui n'allait pas.** La fiche d'une demande ne se relisait qu'à l'ouverture.
Or tout le parcours repose sur un aller-retour hors de l'application : on envoie
la demande à l'autorité, on attend, on dépose sa réponse dans `Signed/` depuis
l'explorateur. Ce dépôt n'apparaissait qu'après avoir quitté la fiche et y être
revenu.

**Ce qui a été fait.** Deux filets, parce qu'un seul ne suffit pas.

`fs.watch` sur la racine de travail, en récursif là où le système le sait faire,
regroupe les événements sur 400 ms : copier trois fichiers en produit une
dizaine, et rafraîchir dix fois ferait clignoter la liste.

Le retour du focus sur la fenêtre déclenche la même relecture. Le récursif
n'existe pas sous Linux, un dossier sur un partage réseau ne remonte pas
toujours ses événements, et une veille peut mourir sans le dire. Revenir sur la
fenêtre après être allé chercher un fichier est précisément le geste qui suit un
dépôt : ce filet couvre le cas réel même quand le premier ne voit rien.

La relecture qui suit n'affiche pas d'indicateur de chargement. Elle n'a pas été
demandée : elle ne doit pas se voir.

### Un mot de passe peut être proposé

**Ce qui n'allait pas.** Deux champs, un bouton pour révéler, rien d'autre. Ce
mot de passe protège une clé privée dans un fichier destiné à circuler, et la
documentation demande de le transmettre séparément. Sans aide, il est court,
réutilisé, et noté quelque part.

**Ce qui a été fait.** Un bouton « Proposer » tire un mot de passe, remplit les
deux champs, l'affiche et le copie. Le geste devient : cliquer, coller dans un
gestionnaire de mots de passe, continuer.

Deux détails qui décident de tout. Le tirage vient de `crypto.getRandomValues`
et non de `Math.random`, et le modulo est rejeté plutôt que replié : replier un
octet sur un alphabet qui ne divise pas 256 rendrait les premières lettres plus
probables que les dernières. L'alphabet exclut ce qui se confond à la relecture,
`0` et `O`, `1`, `l` et `I`, ainsi que la ponctuation qu'un shell
interpréterait : ce mot de passe sera dicté et retapé.

### Un dossier peut être rangé

**Ce qui n'allait pas.** Rien ne se supprimait ni ne s'archivait depuis
l'application. Un essai raté, une faute de frappe dans le nom, une demande
abandonnée : le dossier restait pour toujours, et il fallait passer par
l'explorateur.

**Ce qui a été fait.** « Ranger » déplace le dossier vers `.archive`, dans votre
espace de travail. Le scan l'ignore, puisqu'il saute déjà tout ce qui commence
par un point. Un horodatage évite d'écraser une archive du même nom, ce qui
arrive dès qu'on refait une demande sous le même nom.

**Ce qui n'a délibérément pas été fait : supprimer.** Effacer une clé privée est
irréversible et peut rendre inutilisable un certificat déjà déployé ailleurs. Ce
que vous rangez par erreur se récupère à la main, avec l'explorateur.

La confirmation est une boîte native : elle bloque réellement la fenêtre, elle
est annoncée comme un dialogue, et Échap l'annule sans qu'on ait à le
programmer.

### L'assistant retient le focus

**Ce qui n'allait pas.** L'assistant de démarrage était modal pour la souris
seulement. À la tabulation, on sortait vers le menu caché sous le voile, sans le
voir. La première personne à découvrir l'outil sans souris perdait donc l'écran
d'accueil dès la première tabulation.

**Ce qui a été fait.** Le focus entre tout seul sur le premier élément utile,
boucle entre le premier et le dernier, et revient à sa place à la fermeture. Ce
qui est derrière est masqué aux lecteurs d'écran, qui sans cela continuent
d'annoncer le menu et la liste.

Un détail qui a coûté un aller-retour : masquer les enfants de `<body>` ne
masquait rien. L'application est montée dans un unique `<div id="root">`, qui
contient aussi le dialogue. Il faut remonter la chaîne des ancêtres et masquer
les frères à chaque étage.

### La clé privée est annoncée comme irremplaçable

**Ce qui n'allait pas.** L'écran de confirmation disait où était la clé et
qu'elle ne devait pas circuler. Il ne disait pas qu'elle ne peut pas être
régénérée.

Un poste reformaté entre l'envoi de la demande et le retour de l'autorité, et le
certificat signé ne sert plus à rien : sans sa clé, il n'y a pas de PFX
possible. C'est une perte définitive, et rien ne prévenait.

**Ce qui a été fait.** Une phrase, à l'endroit et au moment où elle sert : copier
le dossier ailleurs avant d'envoyer la demande.

### La liste se trie par date

**Ce qui n'allait pas.** L'ordre était toujours le même : ce qui demande une
action d'abord, puis par nom. C'est le bon ordre pour cinq certificats. Pour
cinquante, retrouver celui d'hier demande de le chercher.

**Ce qui a été fait.** Un sélecteur ajoute un ordre par date, le plus récent en
tête. L'ordre par étape reste le défaut, parce qu'il reste le bon la plupart du
temps.

---

## Technique

### Il y a une intégration continue

Un workflow GitHub Actions lance à chaque poussée, sur Windows : le lint, le
typage, le contrôle de documentation, la construction et les 100 tests. Les
traces Playwright sont conservées en cas d'échec, ce qui est la seule façon de
comprendre un échec qu'on ne reproduit pas en local.

Windows plutôt que Linux : l'application est testée en la lançant pour de vrai,
et c'est la seule plateforme réellement livrée aujourd'hui.

### Il y a un linter, avec deux règles maison

ESLint, `typescript-eslint` et `react-hooks`. Ce qui compte, ce sont les deux
règles propres au projet, chacune écrite après une infraction réelle :

**Aucun message d'erreur affiché ne peut être une chaîne littérale dans le
processus principal.** Le message montré quand aucun certificat ne correspond à
la clé privée était écrit en dur, sans accents, hors du catalogue : il restait
donc en français dans une session anglaise.

**Aucun mot de passe ne peut être passé en argument à openssl.** Les arguments
d'un processus sont visibles de tout le système. Le code passait déjà par
l'environnement, mais une règle qui ne tient qu'à une convention finit par être
oubliée.

Les deux règles ont été vérifiées en les enfreignant volontairement. Une règle
qui ne se déclenche jamais est pire qu'absente.

Le contrôle de documentation lit aussi les catalogues de traduction. Ce sont les
seuls fichiers de code qu'un utilisateur lit vraiment, et un tiret cadratin y
passait jusqu'ici sans rien déclencher.

### Les échecs sont écrits dans un journal

**Ce qui n'allait pas.** Une seule ligne de journalisation dans tout le processus
principal, vers la console. Une application empaquetée n'a pas de console
visible : quand quelqu'un signalait une panne, il n'y avait rien à lui demander
sinon une capture d'écran.

**Ce qui a été fait.** `journal.log`, dans le dossier applicatif, ouvrable depuis
les réglages où son chemin est affiché pour pouvoir le dicter.

Il contient la commande lancée, son code de retour et les dernières lignes
d'erreur. Il ne contient jamais ce qui est envoyé sur l'entrée standard, donc ni
clé privée ni certificat, et la valeur des options qui portent un secret est
remplacée avant écriture, même si ces options ne sont jamais employées ainsi.

Seuls les échecs sont consignés. Un journal qui note chaque succès noie le seul
événement qu'on vient y chercher. Le fichier tourne à 1 Mo.

### Le moteur est couvert par des tests d'unité

67 tests appellent directement les fonctions qui décident du contenu d'une
demande, sans ouvrir de fenêtre. Ils tournent en une seconde et demie, en
parallèle, et passent avant les tests d'application : quand une règle de
cohérence est cassée, on veut le savoir avant d'attendre une minute et demie de
parcours complets.

Ils couvrent les vingt règles de cohérence, chacune éprouvée deux fois, sur un
cas qui doit la lever et sur un cas qui ne doit pas ; la validation des noms de
dossier, où se joue la traversée de chemin ; le rendu de la configuration pour
les douze modèles ; et les invariants des catalogues que le typage ne peut pas
exprimer, dont la concordance des marqueurs `{nom}` entre le français et
l'anglais.

Pour que ces tests soient possibles, `blankRequest` a quitté l'écran de création
pour `shared/templates.ts`. C'est la forme que le processus principal valide :
elle n'avait rien à faire dans un composant React.

### La vérification des versions existe, et elle est éteinte

**Pourquoi c'était nécessaire.** La première version publiée ne savait pas
produire de demande. Republier ne sert à rien si personne n'apprend qu'il faut
retélécharger.

**Pourquoi c'est éteint par défaut.** L'application ne fait aucun appel réseau,
et c'est écrit dans ses réglages et sa documentation. Beaucoup de postes qui
manipulent des clés privées n'ont d'ailleurs pas de sortie. Une vérification
silencieuse trahirait la promesse : elle se propose et attend qu'on l'accepte.

**Ce qui part quand on l'accepte.** Une requête, au démarrage, vers la page des
versions du projet. Aucun identifiant. Ce qui revient : un numéro de version.
Rien n'est téléchargé ni installé : un bandeau propose un lien, et c'est un
humain qui décide.

Le test du réglage est fait dans le processus principal et non dans l'interface,
pour que la promesse tienne même si quelqu'un appelle ce canal sans le savoir.
L'adresse que le processus principal accepte d'ouvrir est limitée à celles du
projet : elle vient d'une réponse reçue du réseau, donc elle n'est pas de
confiance.

---

## Ce qui va bien, et qu'il ne faut pas « corriger »

À l'attention de qui reprend le projet.

**Le statut d'un dossier se déduit des fichiers présents**, jamais d'un état
enregistré (`gui/electron/inventory.ts`). C'est pour cela que déposer un fichier
à la main fonctionne, et qu'aucun état ne peut se désynchroniser du disque.

**Un dossier sans clé, sans demande et sans PFX n'est pas une entrée.** L'espace
de travail est un dossier ordinaire, où l'on range aussi autre chose.

**Le certificat feuille se reconnaît par comparaison de clé publique**, pas par
son nom de fichier (`gui/electron/pfx.ts`). Une autorité qui renomme, ou qui
renvoie plusieurs certificats dans le désordre, ne gêne pas l'assemblage.

**Le modèle « site web public » ne demande pas `clientAuth`.** Ce n'est pas un
oubli : les règles du CA/Browser Forum applicables en juin 2026 l'interdisent à
côté de `serverAuth`. L'ajouter ferait rejeter la demande. Un test d'unité fige
ce défaut de modèle.

**Les commentaires du code sont sans accents, les textes affichés en ont.** Le
catalogue de traduction est la seule source des seconds, et le lint le fait
respecter dans le processus principal.

**La vérification d'OpenSSL empaqueté fait un aller-retour complet** et pas un
simple `openssl version`. C'est la leçon du défaut le plus grave rencontré sur
ce projet : `version` ne lit aucune configuration, et son succès ne prouvait
rien.

**Il n'y a pas de suppression, seulement « Ranger ».** Voir plus haut.
