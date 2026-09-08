# Architecture

Pour qui reprend le code.

## Vue d'ensemble

```
racine du dépôt
  generate-csr.sh      étape 1 en ligne de commande
  make-pfx.sh          étape 3 en ligne de commande
  gui/                 application de bureau
  docs/                cette documentation
```

L'application et les scripts partagent l'arborescence de travail et le fichier
`.meta`, ce qui les rend interchangeables sur l'assemblage.

## L'application

```
gui/
  electron/            processus principal, seul à toucher au disque
    main.ts              fenêtre, cycle de vie, posture de sécurité
    menu.ts              menu natif, dont dépendent les raccourcis de copie
    preload.ts           unique pont vers l'interface
    ipc.ts               points d'entrée, enveloppe Reply<T>
    openssl.ts           appel du binaire
    openssl-path.ts      quelle copie d'OpenSSL utiliser
    capabilities.ts      ce que ce binaire sait faire
    certs.ts             formats, chaîne de confiance, clés publiques
    csr.ts               étape 1 : configuration, génération, contrôles
    pfx.ts               étape 3 : assemblage du PKCS#12
    inventory.ts         parcours de la racine, statut de chaque dossier
    store.ts             réglages persistés
  shared/
    types.ts             contrat de données entre les deux côtés
    templates.ts         catalogue des modèles et des usages
    i18n/                traductions, français faisant foi
  src/                 interface React
  scripts/
    bundle-openssl.mjs   prépare la copie embarquée d'OpenSSL
  vendor/              binaires OpenSSL, non versionnés
```

## Le principe qui structure tout

L'interface n'a **aucun** accès à Node ni au système de fichiers. Elle appelle
les fonctions exposées par `preload.ts`, et rien d'autre.

Chaque appel revient dans une enveloppe `Reply<T>` : soit `{ok: true, data}`,
soit `{ok: false, error}`. Une exception ne traverse jamais le pont, et
l'interface reçoit un message affichable plutôt qu'un rejet de promesse.

## La garantie centrale

À l'assemblage, le certificat serveur n'est pas deviné d'après un nom de
fichier. Il est identifié en comparant sa clé publique à celle de la clé
privée.

C'est la seule méthode qui garantit qu'un PFX produit est utilisable. Sans
elle, on peut assembler un conteneur parfaitement formé et parfaitement inutile.

Cette comparaison passe par `node:crypto` plutôt que par openssl : c'est exact,
et cela évite d'ouvrir un processus par certificat.

## Les traductions

Le français fait foi. Le type `MessageKey` en dérive, et le fichier anglais est
typé `Record<MessageKey, string>` : une traduction oubliée est une erreur de
compilation, pas un libellé vide à l'exécution.

Le processus principal traduit lui aussi ses messages. Un avertissement de
validation ou un contrôle d'assemblage arrive à l'interface déjà dans la bonne
langue.

## OpenSSL

L'application ne dépend d'aucun OpenSSL installé sur le poste. `npm run dist`
copie l'exécutable et ses deux bibliothèques dans le paquet, après avoir
vérifié que la copie répond avec un `PATH` réduit aux DLL système.

Sans cela, la version dépendrait de ce que le poste expose. Sur la machine de
développement, le `PATH` Windows donnait OpenSSL 3.1 quand Git Bash donnait 3.5,
et 3.1 ne connaît ni ML-DSA ni SHA-3.

## Sécurité de la fenêtre

`contextIsolation` et `sandbox` actifs, pas de `nodeIntegration`, pas de
`webviewTag`. Content-Security-Policy stricte. Toute navigation et toute
ouverture de fenêtre sont refusées ; les liens externes partent dans le
navigateur du système.

L'application n'émet aucune requête réseau, y compris pour les polices.

## Ce qui n'est pas un bug

**Les mots de passe passent par l'environnement d'openssl, pas par `argv`.**
C'est délibéré : `argv` est visible dans la liste des processus. Le code est
plus verbeux pour cette raison.

**Le nom du dossier est distinct du Common Name.** Un CN peut contenir des
espaces et des accents, un nom de dossier non. Les fusionner casserait les
certificats de personne.

**La racine de travail par défaut n'est pas « Mes documents ».** Ce dossier est
fréquemment redirigé vers OneDrive, ce qui enverrait les clés privées dans le
cloud à leur création.

**`validate()` prend un traducteur en paramètre.** Les messages doivent
atteindre l'interface déjà traduits ; passer des clés obligerait le renderer à
connaître la structure des paramètres de chaque message.

## Développer

Voir [gui/README.md](../gui/README.md).
