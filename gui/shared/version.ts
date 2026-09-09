/**
 * Comparaison de numeros de version.
 *
 * Ici plutot que dans le processus principal parce que c'est du calcul pur :
 * un test peut l'eprouver sans lancer Electron, ce qui n'est pas le cas d'un
 * module qui touche a l'application.
 *
 * Une comparaison de chaines dirait que 1.10.0 precede 1.9.0. Le bandeau de
 * mise a jour cesserait alors de s'afficher a partir de la dixieme version
 * mineure, sans que rien ne le signale.
 */

/** "v1.2.3" ou "1.2.3" -> [1, 2, 3]. Ce qui n'est pas un nombre vaut zero. */
function parts(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, '')
    .split(/[.\-+]/)
    .slice(0, 3)
    .map((n) => Number.parseInt(n, 10) || 0)
}

/** Vrai si a est strictement plus recente que b. */
export function isNewer(a: string, b: string): boolean {
  const left = parts(a)
  const right = parts(b)
  for (let i = 0; i < 3; i++) {
    const l = left[i] ?? 0
    const r = right[i] ?? 0
    if (l !== r) return l > r
  }
  return false
}
