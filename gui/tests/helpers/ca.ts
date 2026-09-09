/**
 * Une autorite de certification jetable, creee pour la duree d'un test.
 *
 * Sans elle, verifier l'assemblage demanderait un vrai retour de PKI, donc des
 * donnees reelles qu'on ne peut pas versionner. Avec elle, la suite se suffit a
 * elle-meme : elle cree une racine, une intermediaire, signe la demande produite
 * par l'application, et depose la reponse comme le ferait une autorite.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OPENSSL = process.env.OPENSSL_BIN || 'openssl'

function ssl(args: string[], input?: string): string {
  return execFileSync(OPENSSL, args, {
    encoding: 'utf8',
    input,
    windowsHide: true,
    // Sans quoi le bruit d'openssl (points de generation, "self-signature ok")
    // se melange au rapport de test. Une erreur reste lisible : elle voyage
    // dans l'exception levee.
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

export interface TestCa {
  dir: string
  rootCert: string
  intermediateCert: string
  /** Signe une CSR et renvoie le chemin du certificat produit. */
  sign: (csrPath: string, outPath: string, sans: string[]) => string
}

/**
 * Racine auto-signee, puis intermediaire signee par elle. Deux niveaux, pour
 * que la reconstruction de chaine ait quelque chose a reconstruire.
 */
export function createCa(dir: string): TestCa {
  mkdirSync(dir, { recursive: true })
  const p = (n: string) => join(dir, n)

  // --- racine --------------------------------------------------------------
  ssl(['genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048', '-out', p('root.key')])
  writeFileSync(
    p('root.cnf'),
    [
      '[req]', 'prompt=no', 'distinguished_name=dn', 'x509_extensions=ext',
      '[dn]', 'C=FR', 'O=Test Toolkit', 'CN=Test Toolkit Root CA',
      '[ext]', 'basicConstraints=critical,CA:TRUE', 'keyUsage=critical,keyCertSign,cRLSign',
      'subjectKeyIdentifier=hash', '',
    ].join('\n'),
    'utf8',
  )
  ssl([
    'req', '-new', '-x509', '-days', '3650', '-key', p('root.key'),
    '-out', p('root.crt'), '-config', p('root.cnf'), '-extensions', 'ext',
  ])

  // --- intermediaire -------------------------------------------------------
  ssl(['genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048', '-out', p('inter.key')])
  writeFileSync(
    p('inter.cnf'),
    [
      '[req]', 'prompt=no', 'distinguished_name=dn',
      '[dn]', 'C=FR', 'O=Test Toolkit', 'CN=Test Toolkit Issuing CA',
      '[ext]', 'basicConstraints=critical,CA:TRUE,pathlen:0',
      'keyUsage=critical,keyCertSign,cRLSign', 'subjectKeyIdentifier=hash', '',
    ].join('\n'),
    'utf8',
  )
  ssl(['req', '-new', '-key', p('inter.key'), '-out', p('inter.csr'), '-config', p('inter.cnf')])
  ssl([
    'x509', '-req', '-in', p('inter.csr'), '-CA', p('root.crt'), '-CAkey', p('root.key'),
    '-CAcreateserial', '-days', '1825', '-out', p('inter.crt'),
    '-extfile', p('inter.cnf'), '-extensions', 'ext',
  ])

  return {
    dir,
    rootCert: p('root.crt'),
    intermediateCert: p('inter.crt'),

    sign(csrPath, outPath, sans) {
      const extFile = p('leaf-ext.cnf')
      // La numerotation repart de 1 pour chaque type : openssl indexe les
      // entrees par type, et "IP.2" sans "IP.1" n'est pas ce qu'on croit.
      const seen: Record<string, number> = {}
      const altNames = sans.map((s) => {
        const [type, ...rest] = s.includes(':') ? s.split(':') : ['DNS', s]
        seen[type] = (seen[type] ?? 0) + 1
        return `${type}.${seen[type]} = ${rest.join(':')}`
      })
      writeFileSync(
        extFile,
        [
          '[ext]',
          'basicConstraints=CA:FALSE',
          'keyUsage=critical,digitalSignature,keyEncipherment',
          'extendedKeyUsage=serverAuth',
          'subjectKeyIdentifier=hash',
          ...(altNames.length > 0 ? ['subjectAltName=@alt', '', '[alt]', ...altNames] : []),
          '',
        ].join('\n'),
        'utf8',
      )
      ssl([
        'x509', '-req', '-in', csrPath, '-CA', p('inter.crt'), '-CAkey', p('inter.key'),
        '-CAcreateserial', '-days', '365', '-out', outPath,
        '-extfile', extFile, '-extensions', 'ext',
      ])
      return outPath
    },
  }
}

/** Lit un certificat, pour verifier ce qu'il contient reellement. */
export function readCert(path: string): string {
  return ssl(['x509', '-in', path, '-noout', '-text'])
}

/** Ouvre un PFX avec son mot de passe. Leve si le mot de passe est mauvais. */
export function readPfx(path: string, password: string): string {
  return execFileSync(OPENSSL, ['pkcs12', '-in', path, '-passin', 'env:E2E_PFX', '-nokeys'], {
    encoding: 'utf8',
    env: { ...process.env, E2E_PFX: password },
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}
