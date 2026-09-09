/**
 * Tests de bout en bout sur l'application reelle.
 *
 * Un seul worker : l'application impose un verrou d'instance unique, deux
 * lancements simultanes se bloqueraient. Aucun navigateur n'est necessaire,
 * Playwright pilote directement Electron.
 */
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  // Le lancement d'Electron et les operations openssl prennent du temps.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: { trace: 'retain-on-failure' },
})
