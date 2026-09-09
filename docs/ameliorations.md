# Améliorations identifiées

Ce que l'outil gagnerait à faire, classé par ce que ça change pour la personne
qui s'en sert. Rien ici n'est engagé : c'est une liste de propositions, chacune
avec ce qu'elle coûte et ce qu'elle apporte.

Distinction avec [Dette et risques](dette.md) : la dette décrit ce qui ne tient
pas. Cette page décrit ce qui tient, mais pourrait tenir mieux.

Les constats viennent de la suite de bout en bout et d'une lecture du code, pas
d'impressions. Quand un constat s'appuie sur un fichier précis, il est cité.

---

## D'abord, ce qui a déjà été corrigé

La suite de bout en bout a trouvé dix défauts réels, tous corrigés. Ils sont
listés ici parce qu'ils disent où l'application était fragile, et donc où
regarder ensuite.

| Défaut | Effet réel |
|---|---|
| OpenSSL embarqué sans sa configuration | **L'application livrée ne savait pas produire une demande.** La vérification finale échouait. |
| Une adresse IP saisie en nom alternatif était enregistrée en DNS | Certificat inutilisable pour l'adresse demandée |
| Comparaison des SAN sur le mauvais libellé (`IP Address` contre `IPAddress`) | Toute IP demandée était rapportée absente du certificat signé |
| Message d'erreur écrit en dur, sans accents, hors du catalogue | Français fautif, et texte resté français en session anglaise |
| `id="root"` en double avec le point de montage | L'étiquette du champ « espace de travail » ne le désignait pas |
| Bouton d'aide imbriqué dans le libellé | Le champ s'annonçait « Mot de passe du PFX Aide : Mot de passe du PFX » |
| Message d'erreur non rattaché au champ | Une erreur affichée mais jamais annoncée par un lecteur d'écran |
| « Créer une demande » sans effet depuis l'écran de confirmation | Impossible d'enchaîner deux demandes sans détour |
| Bouton « Ouvrir le dossier » silencieux quand le dossier n'existait pas | Un clic sans effet ni explication |
| « Francais » sans cédille | Le premier mot que lit un francophone |

Ce que cette liste apprend : les défauts ne se voyaient pas à la lecture du
code. Cinq d'entre eux ne se voient pas non plus à l'écran.

---

## Expérience utilisateur

### 1. Le dossier `Signed/` n'est pas surveillé

**Le constat.** `DetailPage` recharge à l'ouverture et rien d'autre
(`gui/src/pages/DetailPage.tsx`, effet ligne 103). Aucune veille sur le
système de fichiers dans tout le projet.

**Ce que ça donne.** Le parcours demande d'aller chercher un fichier ailleurs
et de revenir. Quelqu'un qui laisse la fiche ouverte, dépose la réponse de
l'autorité depuis l'explorateur, puis revient sur la fenêtre, ne voit rien
changer. Il faut quitter la fiche et y revenir.

C'est exactement la gêne déjà signalée sur la liste des certificats, au même
endroit du parcours, sur un autre écran.

**Remède.** Un `fs.watch` sur le dossier de travail côté processus principal,
qui pousse un événement vers l'interface. À défaut, un rechargement quand la
fenêtre reprend le focus, ce qui couvre le cas réel à peu de frais.

**Coût.** Faible dans la version « au retour du focus ». Moyen pour une vraie
veille, qui demande de gérer les dossiers qui disparaissent et les écritures
partielles.

### 2. Le mot de passe du PFX se saisit deux fois, sans aide

**Le constat.** Deux champs, un bouton « Afficher », et rien d'autre
(`gui/src/pages/DetailPage.tsx`). Aucune proposition de mot de passe, aucune
indication de solidité.

**Ce que ça donne.** Ce mot de passe protège une clé privée dans un fichier
destiné à circuler. La documentation demande de le transmettre séparément.
Sans aide, il sera court, réutilisé, et noté quelque part.

**Remède.** Un bouton « proposer un mot de passe » qui tire une chaîne solide
avec `crypto.randomUUID` ou un générateur de mots, la remplit dans les deux
champs et la copie. Le geste devient : cliquer, coller dans le gestionnaire de
mots de passe, continuer.

**Coût.** Faible. Une trentaine de lignes, plus deux clés de traduction.

**Attention.** Ne pas écrire ce mot de passe dans un fichier de l'espace de
travail, ce qui recréerait le problème que le `.gitignore` a déjà connu.

### 3. Rien ne se supprime depuis l'application

**Le constat.** Aucune action de suppression ni d'archivage nulle part.

**Ce que ça donne.** Un essai raté, une faute de frappe dans le nom, une
demande abandonnée : le dossier reste. Au bout de quelques mois le tableau de
bord mélange le réel et les brouillons, et il faut passer par l'explorateur.

**Remède.** Une action « archiver », qui déplace le dossier dans un
sous-dossier plutôt que de le détruire. Supprimer une clé privée est
irréversible et peut casser un certificat déjà déployé : le déplacement donne
le même confort sans le risque.

**Coût.** Faible. Le plus dur est le libellé, qui doit dire ce qui se passe
sans faire peur.

### 4. L'assistant ne retient pas le focus

**Le constat.** `Onboarding.tsx` gère `role="dialog"` et la touche Échap, mais
ne place pas le focus à l'ouverture et ne le retient pas.

**Ce que ça donne.** À la tabulation, on sort de l'assistant et on se retrouve
dans le menu qui est derrière, sans le voir. Quelqu'un qui navigue au clavier
perd l'écran d'accueil dès la première tabulation.

**Remède.** Placer le focus sur le titre à l'ouverture, boucler la tabulation
entre le premier et le dernier élément, rendre le fond inerte avec
`aria-hidden` ou l'attribut `inert`.

**Coût.** Faible, une trentaine de lignes bien connues.

### 5. Rien ne rappelle de sauvegarder la clé privée

**Le constat.** L'écran de confirmation dit où est la clé et qu'elle ne doit
pas circuler. Il ne dit pas qu'elle est irremplaçable.

**Ce que ça donne.** Un poste reformaté entre l'envoi de la demande et le
retour de l'autorité, et le certificat signé ne sert plus à rien : sans sa clé,
il n'y a pas de PFX possible. C'est une perte définitive, et rien ne prévient.

**Remède.** Une ligne à l'écran de confirmation, et une mention dans
l'assistant : la clé ne peut pas être régénérée, une sauvegarde du dossier
avant l'envoi évite de tout recommencer.

**Coût.** Deux phrases. C'est l'amélioration au meilleur rapport de la liste.

### 6. La liste ne dit pas ce qui a bougé depuis la dernière fois

**Le constat.** Le tableau de bord trie par état puis par nom
(`gui/electron/inventory.ts`, ligne 55). La date de création est lue mais ne
sert pas au tri.

**Ce que ça donne.** Avec cinq certificats, aucune importance. Avec cinquante,
retrouver celui d'hier demande de le chercher, alors que la recherche existe
déjà pour cela.

**Remède.** Un tri par date au choix, ou simplement afficher la date sur
chaque ligne. Le champ est déjà disponible.

**Coût.** Faible.

---

## Technique

### 7. Aucune intégration continue

Déjà inscrit dans [Dette et risques](dette.md), mais le contexte a changé : il
y a désormais une suite de tests qui tourne en cinquante secondes et qui a
prouvé sa valeur en trouvant dix défauts. Sans automatisation, elle ne sera
lancée que par celui qui y pense.

**Remède.** Un workflow qui enchaîne `tsc --noEmit`, `node scripts/check-docs.mjs`
et `npm test`. Les tests pilotent Electron, ce qui demande un affichage virtuel
sous Linux, ou un exécuteur Windows.

**Coût.** Faible à moyen selon l'exécuteur retenu.

### 8. Aucun linter

Seul le typage vérifie quelque chose. Les conventions du projet, elles, tiennent
par la discipline : nommage, imports inutilisés, `console.log` oubliés.

Un import mort a d'ailleurs été trouvé à la main pendant ce travail
(`Trash2` dans `DetailPage.tsx`), signalé par le compilateur seulement parce
que le code qui l'utilisait a disparu en entier.

**Remède.** ESLint avec `typescript-eslint`, `react-hooks` et une poignée de
règles, plus la règle maison qui compte : aucune chaîne de texte destinée à
l'utilisateur hors du catalogue de traduction. Le message d'erreur écrit en dur
serait tombé dessus.

**Coût.** Moyen. La configuration prend une heure ; la première passe sur le
code existant peut en prendre plus.

### 9. Rien ne trace ce qui s'est passé

**Le constat.** Une seule ligne de journalisation dans tout le processus
principal (`gui/electron/ipc.ts`, ligne 39), vers la console. Une application
empaquetée n'a pas de console visible.

**Ce que ça donne.** Quand quelqu'un signale que « ça ne marche pas », il n'y
a rien à demander sinon une capture d'écran.

**Remède.** Un fichier de journal tournant dans le dossier applicatif, la
commande openssl et son code de retour, jamais son entrée ni les mots de passe.
Un bouton « ouvrir le journal » dans les réglages.

**Attention.** Les mots de passe passent par l'environnement et jamais par la
ligne de commande. Un journal naïf annulerait cette précaution.

**Coût.** Faible.

### 10. Les 99 vérifications du moteur restent hors du dépôt

Déjà dans [Dette et risques](dette.md). La partie assemblage est désormais
couverte dans le dépôt par une autorité de certification créée à la volée
(`gui/tests/helpers/ca.ts`), ce qui lève l'obstacle qui les tenait dehors : il
n'y a plus besoin de données réelles.

**Remède.** Verser les vérifications du moteur en tests unitaires, dans le même
répertoire, et les brancher au même `npm test`.

### 11. Aucune mise à jour automatique

Déjà dans [Dette et risques](dette.md). À signaler à nouveau ici pour une
raison précise : la version publiée en v1.0.0 est antérieure à la correction
d'OpenSSL, donc **elle ne sait pas produire de demande**. Republier ne suffit
pas si personne n'apprend qu'il faut retélécharger.

**Remède minimal.** Une vérification de version au lancement, qui lit la page
des versions et affiche un bandeau. Sans installateur automatique, ce qui
demanderait une signature de code.

---

## Ce qui va bien, et qu'il ne faut pas « corriger »

À l'attention de qui reprend le projet.

**Le statut d'un dossier se déduit des fichiers présents**, jamais d'un état
enregistré (`gui/electron/inventory.ts`). C'est pour cela que déposer un
fichier à la main fonctionne, et qu'aucun état ne peut se désynchroniser du
disque.

**Le certificat feuille se reconnaît par comparaison de clé publique**, pas par
son nom de fichier (`gui/electron/pfx.ts`). Une autorité qui renomme, ou qui
renvoie plusieurs certificats dans le désordre, ne gêne pas l'assemblage.

**Le modèle « site web public » ne demande pas `clientAuth`.** Ce n'est pas un
oubli : les règles du CA/Browser Forum applicables en juin 2026 l'interdisent
à côté de `serverAuth`. L'ajouter ferait rejeter la demande.

**Les commentaires du code sont sans accents, les textes affichés en ont.**
Le catalogue de traduction est la seule source des seconds.

**La vérification d'OpenSSL empaqueté fait un aller-retour complet** et pas un
simple `openssl version`. C'est la leçon du défaut le plus grave de la liste :
`version` ne lit aucune configuration, et son succès ne prouvait rien.
