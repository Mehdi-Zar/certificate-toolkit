/**
 * Enveloppe minimale autour du binaire openssl.
 *
 * Deux regles tenues partout dans ce fichier :
 *  - les mots de passe ne passent JAMAIS par argv (visibles dans la liste des
 *    processus) : ils sont injectes par l'environnement et lus via "env:VAR" ;
 *  - openssl est appele directement, jamais via un shell, donc aucun contenu
 *    fourni par l'utilisateur ne peut etre interprete comme une commande.
 */
import { spawn } from 'node:child_process'
import { translator, type Translate } from '../shared/i18n/index.ts'

export interface RunOptions {
  /** Ecrit sur stdin du processus. */
  input?: Buffer | string
  /** Variables ajoutees a l'environnement, pour les "-passin env:VAR". */
  env?: Record<string, string>
  /** Recuperer stdout en binaire (DER) plutot qu'en texte. */
  binary?: boolean
  cwd?: string
}

export interface RunResult {
  code: number
  stdout: Buffer
  stderr: string
  /** stdout decode en UTF-8, sans espaces de bord. */
  out: string
}

export class OpensslError extends Error {
  readonly args: string[]
  readonly stderr: string

  constructor(message: string, args: string[], stderr: string) {
    super(message)
    this.name = 'OpensslError'
    this.args = args
    this.stderr = stderr
  }
}

const TIMEOUT_MS = 60_000

export class Openssl {
  private readonly bin: string
  private readonly t: Translate
  /** Applique a chaque appel : la copie embarquee a besoin d'OPENSSL_CONF. */
  private readonly baseEnv: Record<string, string>

  constructor(
    bin: string = 'openssl',
    t: Translate = translator('fr'),
    baseEnv: Record<string, string> = {},
  ) {
    this.bin = bin
    this.t = t
    this.baseEnv = baseEnv
  }

  /** Execute openssl. Ne rejette jamais sur un code de sortie non nul. */
  run(args: string[], opts: RunOptions = {}): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.bin, args, {
        cwd: opts.cwd,
        env: { ...process.env, ...this.baseEnv, ...opts.env },
        windowsHide: true,
        shell: false,
      })

      const stdout: Buffer[] = []
      let stderr = ''
      let settled = false

      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        child.kill()
        reject(new OpensslError(this.t('err.opensslTimeout', { sec: TIMEOUT_MS / 1000 }), args, stderr))
      }, TIMEOUT_MS)

      child.stdout.on('data', (c: Buffer) => stdout.push(c))
      child.stderr.on('data', (c: Buffer) => {
        stderr += c.toString('utf8')
      })

      child.on('error', (err) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        const hint =
          (err as NodeJS.ErrnoException).code === 'ENOENT'
            ? this.t('err.opensslMissing', { bin: this.bin })
            : err.message
        reject(new OpensslError(hint, args, stderr))
      })

      child.on('close', (code) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        const buf = Buffer.concat(stdout)
        resolve({
          code: code ?? -1,
          stdout: buf,
          stderr: stderr.trim(),
          out: opts.binary ? '' : buf.toString('utf8').trim(),
        })
      })

      if (opts.input !== undefined) {
        child.stdin.on('error', () => {
          /* openssl peut fermer stdin avant qu'on ait fini d'ecrire (EPIPE) */
        })
        child.stdin.end(opts.input)
      } else {
        child.stdin.end()
      }
    })
  }

  /** Idem, mais leve une erreur portant le stderr d'openssl si le code est non nul. */
  async must(args: string[], opts: RunOptions = {}): Promise<RunResult> {
    const r = await this.run(args, opts)
    if (r.code !== 0) {
      const why = r.stderr.split('\n').filter(Boolean).slice(-3).join(' / ')
      throw new OpensslError(
        this.t('err.opensslFailed', {
          cmd: args[0] ?? '',
          why: why ? ' : ' + why : ' (code ' + r.code + ')',
        }),
        args,
        r.stderr,
      )
    }
    return r
  }

  /** true si la commande sort en 0 : sert aux tests de format. */
  async ok(args: string[], opts: RunOptions = {}): Promise<boolean> {
    try {
      return (await this.run(args, opts)).code === 0
    } catch {
      return false
    }
  }

  async version(): Promise<string> {
    const r = await this.run(['version'])
    if (r.code !== 0) {
      throw new OpensslError(
        this.t('err.opensslFailed', { cmd: 'version', why: '' }),
        ['version'],
        r.stderr,
      )
    }
    return r.out
  }
}
