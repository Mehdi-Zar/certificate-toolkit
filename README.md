# Certificate Toolkit

Obtenir un certificat X.509 sans connaître X.509.

L'outil couvre le parcours complet : créer la demande, suivre l'attente pendant
que l'autorité signe, puis assembler le certificat final dans le format attendu
par votre serveur.

Deux interfaces sur la même logique :

- une **application de bureau**, pour un usage quotidien ;
- deux **scripts** en ligne de commande, pour l'automatisation.

## Télécharger

### ⬇ [Certificate Toolkit 1.0.0.exe](https://github.com/Mehdi-Zar/certificate-toolkit/releases/download/v1.0.0/Certificate.Toolkit.1.0.0.exe)

Version portable : on télécharge, on double-clique, rien ne s'installe.

Vous préférez un raccourci dans le menu Démarrer ?
[Prenez l'installeur](https://github.com/Mehdi-Zar/certificate-toolkit/releases/download/v1.0.0/Certificate.Toolkit.Setup.1.0.0.exe).
Les [autres versions](https://github.com/Mehdi-Zar/certificate-toolkit/releases/latest)
sont sur la page des releases.

Rien d'autre à installer : OpenSSL est inclus, et aucun droit administrateur
n'est demandé.

## Démarrer en trois minutes

Au premier lancement, un assistant vous fait choisir votre dossier de travail
puis explique le parcours. Suivez-le.

Si Windows affiche « Windows a protégé votre PC », voyez
[Installer l'application](docs/installer.md).

## Où aller ensuite

| Vous voulez | Lisez |
|---|---|
| obtenir votre premier certificat, pas à pas | [Démarrer](docs/demarrer.md) |
| installer l'application | [Installer](docs/installer.md) |
| comprendre un mot de vocabulaire | [Glossaire](docs/glossaire.md) |
| savoir quel modèle choisir | [Modèles](docs/modeles.md) |
| savoir quel fichier donner à votre serveur | [Formats](docs/formats.md) |
| régler un problème | [Dépannage](docs/depannage.md) |
| automatiser en ligne de commande | [Scripts](docs/cli.md) |
| distribuer l'outil à une équipe | [Distribuer](docs/distribuer.md) |
| reprendre le code | [Architecture](docs/architecture.md) |

L'index complet est dans [docs/](docs/README.md).

## Le parcours, en une image

```
   VOUS                        L'AUTORITÉ                    VOUS
   ----                        ----------                    ----
1. Créez la demande     2. Signe la demande         3. Assemblez
   clé privée (reste ici)      ... quelques heures      clé privée
   + demande .csr    ------>   à quelques jours   ---->  + certificat signé
                                                         = certificat utilisable
```

La clé privée ne quitte jamais votre poste. L'autorité ne reçoit que la
demande, qui ne contient rien de secret.

## Ce que l'outil ne fait pas

- Il ne contacte aucune autorité de certification. C'est vous qui transmettez
  la demande, par le canal habituel de votre organisation.
- Il ne renouvelle rien automatiquement. Il signale les certificats qui
  approchent de leur expiration, mais l'action reste manuelle.
- Il ne stocke aucun mot de passe.

## Licence

Outil interne. Voir [LICENSE](LICENSE).
