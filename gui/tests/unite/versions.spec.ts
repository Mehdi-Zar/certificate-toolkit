/**
 * La comparaison de versions.
 *
 * Une comparaison de chaines dirait que 1.10.0 est anterieure a 1.9.0, et le
 * bandeau de mise a jour ne s'afficherait jamais a partir de la dixieme version
 * mineure. C'est le genre de defaut qui ne se voit qu'un an plus tard.
 */
import { expect, test } from '@playwright/test'
import { isNewer } from '../../shared/version.ts'

const plusRecente: Array<[string, string]> = [
  ['1.0.1', '1.0.0'],
  ['1.1.0', '1.0.9'],
  ['2.0.0', '1.99.99'],
  ['v1.0.1', '1.0.0'],
  ['1.0.1', 'v1.0.0'],
  // Le piege : dix est superieur a neuf, mais "10" est inferieur a "9".
  ['1.10.0', '1.9.0'],
  ['1.0.10', '1.0.9'],
]

for (const [a, b] of plusRecente) {
  test(a + ' est plus recente que ' + b, () => {
    expect(isNewer(a, b)).toBe(true)
    // Et la relation ne vaut que dans un sens.
    expect(isNewer(b, a)).toBe(false)
  })
}

const pasPlusRecente: Array<[string, string]> = [
  ['1.0.0', '1.0.0'],
  ['v1.0.0', '1.0.0'],
  ['1.0.0', '1.0.1'],
  ['1.0.0-beta', '1.0.0'],
  ['', '1.0.0'],
  ['nimporte quoi', '1.0.0'],
]

for (const [a, b] of pasPlusRecente) {
  test(JSON.stringify(a) + ' ne depasse pas ' + b, () => {
    expect(isNewer(a, b)).toBe(false)
  })
}

test('une etiquette incomplete ne fait pas croire a une nouveaute', () => {
  // "v2" doit valoir 2.0.0, donc bien plus recent que 1.9.9, sans planter.
  expect(isNewer('v2', '1.9.9')).toBe(true)
  expect(isNewer('1', '1.0.0')).toBe(false)
})
