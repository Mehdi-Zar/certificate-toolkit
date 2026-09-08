/**
 * Ce que le binaire openssl du poste sait reellement faire.
 *
 * Les choix offerts dans le formulaire sont derives d'ici, pas d'une liste
 * ecrite en dur : sur un OpenSSL 1.1 on ne proposera ni ML-DSA ni SHA-3, et
 * les courbes absentes du binaire ne s'affichent pas.
 */
import type { Capabilities } from '../shared/types.ts'
import type { Openssl } from './openssl.ts'

/**
 * Courbes retenues : celles qu'une PKI accepte en pratique. OpenSSL en connait
 * pres de 90, mais la plupart sont historiques ou sans usage TLS.
 */
const CURATED_CURVES = [
  'prime256v1',
  'secp384r1',
  'secp521r1',
  'secp256k1',
  'brainpoolP256r1',
  'brainpoolP384r1',
  'brainpoolP512r1',
]

export async function probeCapabilities(ssl: Openssl): Promise<Capabilities> {
  const [curvesOut, algos, sha3] = await Promise.all([
    ssl.run(['ecparam', '-list_curves']),
    ssl.run(['list', '-public-key-algorithms']),
    ssl.ok(['dgst', '-sha3-256', '-hmac', 'x'], { input: '' }),
  ])

  const available = new Set(
    curvesOut.out
      .split(/\r?\n/)
      .map((l) => l.split(':')[0]?.trim() ?? '')
      .filter(Boolean),
  )
  const curves = CURATED_CURVES.filter((c) => available.has(c))

  const names = algos.out.toLowerCase()
  const has = (needle: string): boolean => names.includes(needle)

  return {
    // Si la liste des courbes n'a pas pu etre lue, on garde la selection par
    // defaut plutot que de vider le menu deroulant.
    curves: curves.length > 0 ? curves : CURATED_CURVES,
    ed25519: has('ed25519'),
    ed448: has('ed448'),
    rsaPss: has('rsa-pss'),
    mldsa: has('ml-dsa'),
    sha3,
  }
}
