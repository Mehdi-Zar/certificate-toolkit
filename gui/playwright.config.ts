/**
 * Deux familles de tests, qui n'ont pas les memes contraintes.
 *
 * Les tests d'unite n'ouvrent rien : ils appellent le moteur de generation et
 * les catalogues directement. Ils tournent en parallele et en une seconde.
 *
 * Les tests d'application lancent Electron pour de vrai. L'application impose
 * un verrou d'instance unique, donc un seul a la fois. Ils passent en second :
 * quand une regle de coherence est cassee, on veut le savoir avant d'attendre
 * une minute et demie de parcours complets.
 */
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: { trace: 'retain-on-failure' },

  projects: [
    {
      name: 'unite',
      testDir: './tests/unite',
      fullyParallel: true,
      timeout: 20_000,
    },
    {
      name: 'app',
      testDir: './tests',
      testIgnore: '**/unite/**',
      fullyParallel: false,
      workers: 1,
    },
  ],
})
