/**
 * Controle de la documentation.
 *
 * Trois regles seulement, mais qui echouent le build plutot que d'avertir :
 * un lien mort envoie le lecteur dans le vide, une typographie proscrite
 * revient sinon a chaque contribution, et une reference interdite ne doit pas
 * pouvoir rentrer une seconde fois.
 *
 * Usage : node scripts/check-docs.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Typographie proscrite : le tiret cadratin et le tiret demi-cadratin. */
const FORBIDDEN_CHARS = [
  { char: '—', name: 'tiret cadratin' },
  { char: '–', name: 'tiret demi-cadratin' },
]

/**
 * Noms d'organisation qui ne doivent pas revenir. La liste est volontairement
 * explicite : c'est une garantie, pas une suggestion.
 */
const FORBIDDEN_WORDS = ['thales', 'cloudfoundations', 'thalesgroup']

const SKIP_DIRS = new Set(['node_modules', '.git', 'release', 'vendor', 'dist', 'dist-electron'])

function markdownFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) markdownFiles(full, out)
    else if (name.endsWith('.md')) out.push(full)
  }
  return out
}

const problems = []
const files = markdownFiles(ROOT)

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  const text = readFileSync(file, 'utf8')
  const lines = text.split('\n')

  lines.forEach((line, i) => {
    const where = rel + ':' + (i + 1)

    for (const { char, name } of FORBIDDEN_CHARS) {
      if (line.includes(char)) problems.push(where + ' : ' + name + ' interdit')
    }

    const lower = line.toLowerCase()
    for (const word of FORBIDDEN_WORDS) {
      // Le fichier de controle cite ces mots pour les interdire.
      if (rel.endsWith('check-docs.mjs')) continue
      if (lower.includes(word)) problems.push(where + ' : reference interdite « ' + word + ' »')
    }
  })

  // Liens internes : [texte](chemin) hors http, mailto et ancres.
  for (const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = m[1].split('#')[0].trim()
    if (!target || /^(https?:|mailto:)/.test(target)) continue
    const resolved = resolve(dirname(file), target)
    if (!existsSync(resolved)) {
      problems.push(rel + ' : lien mort vers ' + target)
    }
  }
}

console.log('\nControle de la documentation : ' + files.length + ' fichiers')

if (problems.length === 0) {
  console.log('  aucun probleme\n')
  process.exit(0)
}

for (const p of problems) console.log('  ' + p)
console.log('\n' + problems.length + ' probleme(s)\n')
process.exit(1)
