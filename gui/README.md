# Application de bureau

Guide du développeur. Pour l'usage de l'outil, voir [docs/](../docs/README.md).

## Démarrer

```bash
cd gui
npm install
npm run bundle:openssl   # dépose une copie d'OpenSSL dans vendor/
npm run dev
```

`bundle:openssl` n'est nécessaire qu'une fois. Sans lui, l'application se rabat
sur l'OpenSSL du `PATH`.

| Commande | Effet |
|---|---|
| `npm run dev` | Application en développement, rechargement à chaud |
| `npm run lint` | ESLint, typage, contrôle de documentation |
| `npm test` | `lint`, construction, puis tous les tests |
| `npm run test:e2e` | Les tests seuls, sans reconstruire |
| `npm run typecheck` | Vérification TypeScript seule |
| `npm run build` | Typecheck puis bundles de production |
| `npm run bundle:openssl` | Prépare la copie embarquée d'OpenSSL |
| `npm run pack` | Application non empaquetée dans `release/` |
| `npm run dist` | Installateurs |

`pack` et `dist` lancent `bundle:openssl` puis `build` automatiquement.

`npm test` reconstruit avant de tester : les tests pilotent les bundles, pas
les sources. Un changement non reconstruit se traduit sinon par un échec qui
n'a rien à voir avec ce qu'on vient d'écrire.

## Pile

Electron 44, React 19, Vite 8, Tailwind 4, TypeScript 5.9.

Le choix d'Electron plutôt que Tauri est expliqué dans
[Décisions](../docs/decisions.md).

## Organisation

```
electron/            processus principal, seul à toucher au disque
  main.ts              fenêtre, cycle de vie, posture de sécurité
  menu.ts              menu natif
  preload.ts           unique pont vers l'interface
  ipc.ts               points d'entrée
  openssl.ts           appel du binaire
  openssl-path.ts      quelle copie d'OpenSSL utiliser
  capabilities.ts      ce que ce binaire sait faire
  certs.ts             formats, chaîne de confiance, clés publiques
  csr.ts               étape 1
  pfx.ts               étape 3
  inventory.ts         parcours de la racine
  store.ts             réglages persistés
shared/
  types.ts             contrat entre les deux côtés
  templates.ts         catalogue des modèles
  i18n/                traductions
src/                 interface React
scripts/             empaquetage d'OpenSSL
vendor/              binaires OpenSSL, non versionnés
```

Le détail est dans [Architecture](../docs/architecture.md).

## Conventions

**L'interface n'a aucun accès à Node.** Tout passe par `preload.ts`. Un nouvel
appel s'ajoute dans `ipc.ts`, puis dans `preload.ts`, puis dans
`src/lib/api.ts`.

**Chaque réponse est une `Reply<T>`.** Une exception ne traverse jamais le pont.

**Les textes vivent dans `shared/i18n/`.** Le français fait foi ; ajouter une
clé impose de traduire, sinon la compilation échoue.

**Les messages du processus principal sont traduits côté principal.** Les
fonctions qui en produisent reçoivent un `Translate` en paramètre.

**Aucun mot de passe dans `argv`.** Ils passent par l'environnement du processus
openssl.

## Tests

100 tests dans `tests/`, lancés par Playwright, en deux familles.

**`tests/unite/`** appelle le moteur et les catalogues directement, sans rien
ouvrir. En parallèle, une seconde et demie. C'est là que vivent les vingt règles
de cohérence, la validation des noms de dossier et les invariants des
catalogues.

**`tests/e2e/` et `tests/paquet/`** lancent Electron pour de vrai. Un seul à la
fois : l'application impose un verrou d'instance unique. Chaque test reçoit son
propre dossier applicatif et son propre espace de travail.

Les unités passent en premier. Quand une règle de cohérence est cassée, on veut
le savoir avant d'attendre une minute et demie de parcours complets.

```bash
npm test                              # tout
npx playwright test --project=unite   # les unités seules
npx playwright test tests/e2e/03-boucle-complete.spec.ts
```

Deux choix qui portent le reste :

**La vérification passe par l'openssl du poste**, pas par celui qu'embarque
l'application. Un oracle qui partage le binaire testé ne prouverait pas
grand-chose.

**L'assemblage est vérifié contre une autorité de certification jetable**
(`tests/helpers/ca.ts`), racine plus intermédiaire, créée pour la durée d'un
test. Sans elle il faudrait un vrai retour de PKI, donc des données qu'on ne
peut pas versionner.

`tests/paquet/smoke.spec.ts` lance l'exécutable construit, et s'ignore tant
qu'aucun paquet n'existe. Il est là parce que ce qui marche depuis les sources
ne dit rien de ce qui est livré : le défaut le plus grave de ce projet ne se
manifestait qu'une fois OpenSSL copié dans le paquet.

## Ajouter un modèle

1. Ajouter les textes dans `shared/i18n/fr.ts`, puis dans `en.ts`.
2. Ajouter l'entrée dans `TEMPLATES` de `shared/templates.ts`, avec ses clés.
3. Vérifier que la CSR produite est acceptée par openssl.

Les icônes viennent de `lucide-react`, résolues par nom dans `NewRequestPage`.

## Sécurité de la fenêtre

`contextIsolation` et `sandbox` actifs, pas de `nodeIntegration`, pas de
`webviewTag`, Content-Security-Policy stricte, navigation refusée, aucune
requête réseau depuis le rendu. La vérification des versions, si elle est
activée dans les réglages, part du processus principal.

Voir [Sécurité](../docs/securite.md).
