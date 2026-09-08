import type { CertificateToolkitApi } from '../../electron/preload.ts'
import type { Reply } from '../../shared/types.ts'

declare global {
  interface Window {
    certtk: CertificateToolkitApi
  }
}

export const api = window.certtk

/**
 * Deballe un Reply<T> : le code appelant travaille sur la valeur, et gere
 * l'echec avec un try/catch au lieu de tester ok/error a chaque appel.
 */
export async function unwrap<T>(p: Promise<Reply<T>>): Promise<T> {
  const r = await p
  if (!r.ok) throw new Error(r.error)
  return r.data
}

export const message = (err: unknown): string =>
  err instanceof Error ? err.message : String(err)
