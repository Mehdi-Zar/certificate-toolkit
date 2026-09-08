/**
 * Prepare les binaires OpenSSL embarques dans l'application.
 *
 * L'application appelle openssl ; sans lui, elle se lance mais ne sait rien
 * faire. Compter sur celui du poste ne marche pas : sur la machine de
 * developpement, le PATH Windows expose une version 3.1 quand Git Bash en
 * expose une 3.5, et un poste vierge n'en a aucune. On fige donc la version.
 *
 * Le script copie l'executable et ses bibliotheques depuis une installation
 * locale, puis verifie que la copie fonctionne avec un PATH vide : c'est la
 * seule preuve qu'elle ne depend plus de rien d'autre.
 *
 * Usage :
 *   node scripts/bundle-openssl.mjs [--from <chemin/vers/openssl.exe>]
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PLATFORM = process.platform
const ARCH = process.arch
const TARGET = join(ROOT, 'vendor', 'openssl', `${PLATFORM}-${ARCH}`)
const EXE = PLATFORM === 'win32' ? 'openssl.exe' : 'openssl'

/** Version minimale : en deca, ni ML-DSA ni SHA-3 ne sont disponibles. */
const WANTED_MAJOR_MINOR = [3, 5]

const say = (msg) => console.log('  ' + msg)

// ---------------------------------------------------------------------------
// Trouver une installation source
// ---------------------------------------------------------------------------

function candidates() {
  const fromArg = process.argv.indexOf('--from')
  if (fromArg !== -1 && process.argv[fromArg + 1]) return [process.argv[fromArg + 1]]
  if (process.env.OPENSSL_BUNDLE_FROM) return [process.env.OPENSSL_BUNDLE_FROM]

  if (PLATFORM === 'win32') {
    return [
      // Git for Windows suit OpenSSL de pres, c'est notre source preferee.
      'C:/Program Files/Git/mingw64/bin/openssl.exe',
      'C:/Program Files/Git/usr/bin/openssl.exe',
      'C:/Program Files/OpenSSL/bin/openssl.exe',
      'C:/Program Files/OpenSSL-Win64/bin/openssl.exe',
    ]
  }
  return ['/usr/bin/openssl', '/usr/local/bin/openssl', '/opt/homebrew/bin/openssl']
}

function versionOf(exe) {
  try {
    return execFileSync(exe, ['version'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function pickSource() {
  const seen = []
  for (const c of candidates()) {
    if (!existsSync(c)) continue
    const v = versionOf(c)
    if (!v) continue
    seen.push({ path: c, version: v })
  }
  if (seen.length === 0) return null

  // La version la plus recente gagne, a defaut la premiere qui repond.
  const score = (v) => {
    const m = /OpenSSL (\d+)\.(\d+)\.(\d+)/.exec(v)
    return m ? Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]) : 0
  }
  seen.sort((a, b) => score(b.version) - score(a.version))
  return seen[0]
}

// ---------------------------------------------------------------------------
// Bibliotheques a copier avec l'executable
// ---------------------------------------------------------------------------

/**
 * Les DLL non systeme voisines de l'executable. On reste volontairement dans
 * le meme dossier : une dependance ailleurs signalerait une installation dont
 * on ne peut pas faire une copie autonome.
 */
function libraries(exePath) {
  const dir = dirname(exePath)
  if (PLATFORM !== 'win32') return []

  const wanted = readdirSync(dir).filter((f) =>
    /^lib(ssl|crypto)-\d+(-x64)?\.dll$/i.test(f),
  )
  if (wanted.length === 0) {
    throw new Error(
      'aucune bibliotheque libssl/libcrypto trouvee a cote de ' + exePath + '.',
    )
  }
  return wanted.map((f) => join(dir, f))
}

// ---------------------------------------------------------------------------
// Verification : la copie doit fonctionner seule
// ---------------------------------------------------------------------------

function verifyStandalone(stagedExe) {
  // PATH reduit au strict minimum : si la copie a besoin d'autre chose que de
  // ses voisines et des DLL systeme, elle echouera ici plutot qu'en production.
  const minimalPath =
    PLATFORM === 'win32'
      ? [join(process.env.SystemRoot ?? 'C:/Windows', 'System32')].join(';')
      : '/usr/bin:/bin'

  const out = execFileSync(stagedExe, ['version'], {
    encoding: 'utf8',
    env: { SystemRoot: process.env.SystemRoot, PATH: minimalPath, Path: minimalPath },
  }).trim()
  return out
}

// ---------------------------------------------------------------------------

console.log('\nEmpaquetage d’OpenSSL')

const source = pickSource()
if (!source) {
  console.error(
    '\n  Aucune installation OpenSSL trouvee.\n' +
      '  Indiquez-en une : node scripts/bundle-openssl.mjs --from <chemin/openssl.exe>\n',
  )
  process.exit(1)
}

say('source   : ' + source.path)
say('version  : ' + source.version)

const m = /OpenSSL (\d+)\.(\d+)/.exec(source.version)
if (m && (Number(m[1]) < WANTED_MAJOR_MINOR[0] ||
  (Number(m[1]) === WANTED_MAJOR_MINOR[0] && Number(m[2]) < WANTED_MAJOR_MINOR[1]))) {
  say(
    'ATTENTION : version anterieure a ' + WANTED_MAJOR_MINOR.join('.') +
      '. ML-DSA et SHA-3 ne seront pas proposes.',
  )
}

rmSync(TARGET, { recursive: true, force: true })
mkdirSync(TARGET, { recursive: true })

const files = [source.path, ...libraries(source.path)]
for (const f of files) {
  copyFileSync(f, join(TARGET, basename(f)))
  say('copie    : ' + basename(f))
}

// La licence voyage avec les binaires : OpenSSL 3 est sous Apache 2.0.
const license = join(ROOT, 'build', 'licenses', 'Apache-2.0.txt')
if (existsSync(license)) copyFileSync(license, join(TARGET, 'LICENSE.txt'))

writeFileSync(
  join(TARGET, 'NOTICE.txt'),
  [
    'Ce dossier contient une copie non modifiee d’OpenSSL, redistribuee avec',
    'Certificate Toolkit.',
    '',
    'Composant : OpenSSL',
    'Version   : ' + source.version,
    'Licence   : Apache License 2.0 (voir LICENSE.txt)',
    'Origine   : https://www.openssl.org/',
    '',
    'Copie effectuee depuis ' + source.path,
    'le ' + new Date().toISOString() + '.',
    '',
  ].join('\n'),
  'utf8',
)

const staged = join(TARGET, EXE)
const verified = verifyStandalone(staged)
say('verifie  : ' + verified + ' (PATH reduit aux DLL systeme)')
say('dossier  : ' + TARGET)
console.log()
