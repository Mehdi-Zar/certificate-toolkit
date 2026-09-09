/**
 * Le journal.
 *
 * Une application empaquetee n'a pas de console visible. Sans trace ecrite,
 * la seule chose qu'on puisse demander a quelqu'un qui signale une panne est
 * une capture d'ecran, ce qui ne dit ni quelle commande a echoue ni pourquoi.
 *
 * Ce que le journal contient : ce qui a ete lance, avec quel resultat.
 * Ce qu'il ne contient jamais : le contenu envoye sur l'entree standard, donc
 * ni cle privee ni certificat, et aucune valeur qui ressemble a un secret.
 * Les mots de passe passent par l'environnement et pas par les arguments, mais
 * la redaction est appliquee quand meme : une precaution qui ne tient qu'a une
 * convention finit par etre oubliee.
 *
 * Le fichier tourne a 1 Mo et une seule generation est conservee. Un journal
 * qui grossit sans limite finit par etre le probleme qu'il devait aider a
 * resoudre.
 */
import { app } from 'electron'
import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'

const MAX_BYTES = 1_000_000

let file: string | null = null

/** Chemin du journal. Cree le dossier au premier appel. */
export function logPath(): string {
  if (file) return file
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  file = join(dir, 'journal.log')
  return file
}

/**
 * Arguments rendus lisibles, la valeur des options sensibles remplacee.
 *
 * La liste vise les options d'openssl qui prennent un secret. On redige la
 * valeur qui suit, pas l'option : savoir qu'un mot de passe a ete fourni est
 * une information utile, sa valeur ne l'est pas.
 */
const SECRET_OPTIONS = new Set([
  '-passin',
  '-passout',
  '-password',
  '-passwd',
  '-pass',
  '-key',
  '-keypbe',
])

export function redact(args: readonly string[]): string {
  const out: string[] = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    out.push(a)
    if (SECRET_OPTIONS.has(a) && i + 1 < args.length) {
      const v = args[++i]
      // "env:VAR" et "pass:" ne revelent rien par eux-memes : on garde la
      // forme, qui dit comment le secret a ete transmis, et on coupe le reste.
      const scheme = /^(env|pass|file|fd|stdin):/.exec(v)
      out.push(scheme ? scheme[1] + ':***' : '***')
    }
  }
  return out.join(' ')
}

function rotate(path: string): void {
  try {
    if (statSync(path).size < MAX_BYTES) return
    renameSync(path, path + '.1')
  } catch {
    /* fichier absent, ou verrouille : on ecrira a la suite */
  }
}

/**
 * Ecrit une ligne. N'echoue jamais : un journal indisponible ne doit pas
 * empecher l'application de fonctionner.
 */
export function log(message: string, detail?: Record<string, unknown>): void {
  try {
    const path = logPath()
    rotate(path)
    const parts = [new Date().toISOString(), message]
    if (detail) {
      for (const [k, v] of Object.entries(detail)) {
        if (v === undefined || v === null || v === '') continue
        parts.push(k + '=' + String(v))
      }
    }
    appendFileSync(path, parts.join(' | ') + '\n', 'utf8')
  } catch {
    /* disque plein, dossier en lecture seule : on n'a rien de mieux a faire */
  }
}
