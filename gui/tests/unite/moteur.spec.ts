/**
 * Le moteur de generation, sans ouvrir de fenetre.
 *
 * Ces tests appellent directement les fonctions qui decident du contenu d'une
 * demande. Ils couvrent ce que le parcours de bout en bout ne traverse pas :
 * les combinaisons du mode avance, et les regles de coherence qui ne se
 * declenchent que sur des saisies qu'on ne ferait pas expres.
 *
 * Une regle de validation qui ne se declenche jamais est pire qu'absente :
 * elle donne l'illusion d'un controle. Chaque regle est donc eprouvee deux
 * fois, sur un cas qui doit la lever et sur un cas qui ne doit pas.
 */
import { expect, test } from '@playwright/test'
import { assertSafeName, buildSanList, renderConfig, validate } from '../../electron/csr.ts'
import { TEMPLATES, blankRequest, getTemplate } from '../../shared/templates.ts'
import { translator } from '../../shared/i18n/index.ts'
import type { CsrRequest } from '../../shared/types.ts'

const t = translator('fr')

/** Une demande minimale et valide, sur le modele demande. */
function request(templateId: string, patch: (r: CsrRequest) => void = () => {}): CsrRequest {
  const r = blankRequest(getTemplate(templateId))
  r.name = 'test.interne.local'
  r.subject.commonName = 'test.interne.local'
  patch(r)
  return r
}

/** Les messages d'un niveau donne, pour dire ce qui a ete leve en cas d'echec. */
const messages = (r: CsrRequest, level?: 'error' | 'warn' | 'info') =>
  validate(r, t)
    .filter((w) => !level || w.level === level)
    .map((w) => w.message)

// ---------------------------------------------------------------------------
// Ce qui bloque
// ---------------------------------------------------------------------------

test.describe('les regles bloquantes', () => {
  test('une demande complete ne bloque rien', () => {
    expect(messages(request('tls-internal'), 'error')).toEqual([])
  })

  test('un nom courant vide bloque', () => {
    const r = request('tls-internal', (x) => void (x.subject.commonName = '   '))
    expect(messages(r, 'error').join(' ')).toContain('obligatoire')
  })

  test('une cle RSA sous 2048 bits bloque', () => {
    const r = request('tls-internal', (x) => void (x.key.bits = 1024))
    expect(messages(r, 'error').join(' ')).toContain('2048')
    // Et 2048 passe : la borne est bien inferieure stricte.
    const ok = request('tls-internal', (x) => void (x.key.bits = 2048))
    expect(messages(ok, 'error')).toEqual([])
  })

  test('demander le chiffrement sans phrase secrete bloque', () => {
    const r = request('tls-internal', (x) => void (x.key.encrypt = true))
    expect(messages(r, 'error')).toHaveLength(1)
    const ok = request('tls-internal', (x) => {
      x.key.encrypt = true
      x.key.passphrase = 'quelque chose'
    })
    expect(messages(ok, 'error')).toEqual([])
  })

  test('un pays qui n’a pas deux lettres bloque', () => {
    for (const country of ['F', 'FRA', 'France']) {
      const r = request('tls-internal', (x) => void (x.subject.country = country))
      expect(messages(r, 'error').join(' '), country).toContain('deux lettres')
    }
    const ok = request('tls-internal', (x) => void (x.subject.country = 'FR'))
    expect(messages(ok, 'error')).toEqual([])
  })

  test('un modele qui exige un SAN bloque quand il n’y en a aucun', () => {
    // Le CN sert de SAN quand le modele le prevoit : on prend donc un modele
    // qui ne reprend pas le CN, sans quoi la regle ne pourrait jamais lever.
    const r = blankRequest(getTemplate('smime'))
    r.name = 'jean'
    r.subject.commonName = 'Jean Dupont'
    expect(messages(r, 'error').join(' ')).toContain('nom alternatif')

    r.sans = [{ type: 'email', value: 'jean@exemple.fr' }]
    expect(messages(r, 'error')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Ce qui avertit
// ---------------------------------------------------------------------------

test.describe('les avertissements', () => {
  test('un certificat public ne doit pas demander clientAuth', () => {
    const r = request('tls-public', (x) => {
      x.subject.commonName = 'www.exemple.fr'
      x.extensions.extendedKeyUsage.purposes.push('clientAuth')
    })
    expect(messages(r, 'warn').join(' ')).toMatch(/clientAuth/)
  })

  test('le modele public ne porte pas clientAuth par defaut', () => {
    // Regle CA/Browser Forum applicable en juin 2026. C'est le defaut du
    // modele qui compte : personne ne va decocher ce qu'il ne connait pas.
    const tpl = getTemplate('tls-public')
    expect(tpl.extendedKeyUsage).toEqual(['serverAuth'])
  })

  test('une adresse IP dans un certificat public est signalee', () => {
    const r = request('tls-public', (x) => {
      x.subject.commonName = 'www.exemple.fr'
      x.sans = [{ type: 'IP', value: '203.0.113.10' }]
    })
    expect(messages(r, 'warn').join(' ')).toMatch(/IP|adresse/i)
  })

  test('un nom interne dans un certificat public est signale', () => {
    for (const name of ['serveur.local', 'intranet.corp', 'machine']) {
      const r = request('tls-public', (x) => {
        x.subject.commonName = name
      })
      expect(messages(r, 'warn').join(' '), name).toMatch(/public|interne/i)
    }
  })

  test('un nom public ne declenche rien', () => {
    const r = request('tls-public', (x) => void (x.subject.commonName = 'www.exemple.fr'))
    expect(messages(r, 'warn')).toEqual([])
  })

  test('un joker mal place est signale, un joker correct ne l’est pas', () => {
    const mauvais = ['*.*.exemple.fr', 'www.*.exemple.fr', '*']
    for (const name of mauvais) {
      const r = request('tls-internal', (x) => {
        x.sans = [{ type: 'DNS', value: name }]
      })
      expect(messages(r, 'warn').join(' '), name).toMatch(/joker/i)
    }
    const bon = request('tls-internal', (x) => {
      x.sans = [{ type: 'DNS', value: '*.exemple.fr' }]
    })
    expect(messages(bon, 'warn')).toEqual([])
  })

  test('une autorite sans keyCertSign est signalee', () => {
    const r = request('intermediate-ca', (x) => {
      x.extensions.keyUsage.bits = x.extensions.keyUsage.bits.filter((b) => b !== 'keyCertSign')
      x.key.encrypt = true
      x.key.passphrase = 'secret'
    })
    expect(messages(r, 'warn').join(' ')).toMatch(/keyCertSign/)
  })

  test('keyCertSign hors autorite est signale', () => {
    const r = request('tls-internal', (x) => {
      x.extensions.keyUsage.bits.push('keyCertSign')
    })
    expect(messages(r, 'warn').join(' ')).toMatch(/keyCertSign|autorité/i)
  })

  test('une cle d’autorite non chiffree est signalee', () => {
    const r = request('intermediate-ca')
    expect(messages(r, 'warn').join(' ')).toMatch(/chiffr/i)
  })

  test('keyEncipherment sur une cle EC est signale', () => {
    const r = request('tls-internal', (x) => {
      x.key.algorithm = 'ec'
      x.extensions.keyUsage.bits = ['digitalSignature', 'keyEncipherment']
    })
    expect(messages(r, 'warn').join(' ')).toMatch(/EC|chiffrement/i)
  })

  test('keyUsage active mais vide est signale', () => {
    const r = request('tls-internal', (x) => {
      x.extensions.keyUsage.include = true
      x.extensions.keyUsage.bits = []
    })
    expect(messages(r, 'warn').join(' ')).toMatch(/keyUsage/)
  })

  test('« tous usages » rend les autres inutiles', () => {
    const r = request('tls-internal', (x) => {
      x.extensions.extendedKeyUsage.purposes.push('anyExtendedKeyUsage')
    })
    expect(messages(r, 'warn').join(' ')).toMatch(/usages/i)
  })

  test('une signature de code sous 3072 bits est signalee', () => {
    const r = request('code-signing', (x) => void (x.key.bits = 2048))
    expect(messages(r, 'warn').join(' ')).toMatch(/3072|signature/i)
  })
})

// ---------------------------------------------------------------------------
// Ce qui informe
// ---------------------------------------------------------------------------

test.describe('les informations', () => {
  test('ML-DSA, Ed25519 et l’agrafage obligatoire sont expliques', () => {
    const mldsa = request('tls-internal', (x) => void (x.key.algorithm = 'ml-dsa'))
    expect(messages(mldsa, 'info')).not.toEqual([])

    const ed = request('tls-internal', (x) => void (x.key.algorithm = 'ed25519'))
    expect(messages(ed, 'info')).not.toEqual([])

    const staple = request('tls-internal', (x) => void (x.extensions.mustStaple = true))
    expect(messages(staple, 'info')).not.toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Noms de dossier : c'est la que se joue la traversee de chemin
// ---------------------------------------------------------------------------

test.describe('le nom de la demande', () => {
  const refuse = [
    ['', 'vide'],
    ['..', 'remontee'],
    ['../ailleurs', 'remontee avec chemin'],
    ['a/b', 'separateur unix'],
    ['a\\b', 'separateur windows'],
    ['C:\\Windows', 'chemin absolu'],
    ['nom\u0000nul', 'octet nul'],
    ['nom\nligne', 'retour a la ligne'],
    ['x'.repeat(201), 'trop long'],
  ] as const

  for (const [name, why] of refuse) {
    test('refuse : ' + why, () => {
      expect(() => assertSafeName(name, t), JSON.stringify(name)).toThrow()
    })
  }

  const accepte = ['app.interne.local', 'mon-serveur', 'SERVEUR_01', 'wildcard.exemple.fr']
  for (const name of accepte) {
    test('accepte : ' + name, () => {
      expect(() => assertSafeName(name, t)).not.toThrow()
    })
  }
})

// ---------------------------------------------------------------------------
// Les SAN
// ---------------------------------------------------------------------------

test.describe('la liste des noms alternatifs', () => {
  test('le CN est repris en SAN quand le modele le prevoit', () => {
    const r = request('tls-internal')
    expect(buildSanList(r).map((s) => s.type + ':' + s.value)).toContain(
      'DNS:test.interne.local',
    )
  })

  test('il n’y est pas deux fois quand il est aussi saisi a la main', () => {
    const r = request('tls-internal', (x) => {
      x.sans = [{ type: 'DNS', value: 'test.interne.local' }]
    })
    const list = buildSanList(r).filter((s) => s.value === 'test.interne.local')
    expect(list).toHaveLength(1)
  })

  test('les types sont conserves tels quels', () => {
    const r = request('tls-internal', (x) => {
      x.sans = [
        { type: 'IP', value: '10.0.0.1' },
        { type: 'email', value: 'a@b.fr' },
        { type: 'URI', value: 'https://exemple.fr/' },
      ]
    })
    const kinds = buildSanList(r).map((s) => s.type)
    expect(kinds).toContain('IP')
    expect(kinds).toContain('email')
    expect(kinds).toContain('URI')
  })
})

// ---------------------------------------------------------------------------
// La configuration rendue
// ---------------------------------------------------------------------------

test.describe('la configuration openssl', () => {
  test('chaque modele produit une configuration lisible', () => {
    for (const tpl of TEMPLATES) {
      const r = request(tpl.id, (x) => {
        x.subject.commonName = 'exemple.fr'
        // Les modeles qui exigent un SAN sans reprendre le CN en recoivent un.
        if (tpl.sanRequired && !tpl.cnAsSan) {
          x.sans = [{ type: tpl.sanTypes[0]!, value: sampleFor(tpl.sanTypes[0]!) }]
        }
      })
      const config = renderConfig(r, buildSanList(r), t)
      expect(config, tpl.id).toContain('[ req ]')
      expect(config, tpl.id).toContain('[ req_distinguished_name ]')
      expect(config, tpl.id).toContain('commonName = exemple.fr')
    }
  })

  test('les extensions du modele se retrouvent dans la configuration', () => {
    const r = request('tls-internal')
    const config = renderConfig(r, buildSanList(r), t)
    expect(config).toContain('extendedKeyUsage = serverAuth, clientAuth')
    expect(config).toContain('DNS.1 = test.interne.local')
  })

  test('une autorite declare CA:TRUE et keyCertSign', () => {
    const r = request('intermediate-ca', (x) => void (x.subject.commonName = 'Autorite Test'))
    const config = renderConfig(r, buildSanList(r), t)
    expect(config).toContain('CA:TRUE')
    expect(config).toContain('keyCertSign')
  })

  test('une valeur avec un retour a la ligne est refusee', () => {
    // Une valeur multiligne casserait le format .cnf et pourrait injecter une
    // directive : c'est la seule voie d'injection dans ce fichier.
    const r = request('tls-internal', (x) => void (x.subject.org = 'Ma Societe\nCN=autre'))
    expect(() => renderConfig(r, buildSanList(r), t)).toThrow()
  })
})

/** Un exemple valide pour chaque type de SAN, utilise par les tests groupes. */
function sampleFor(type: string): string {
  switch (type) {
    case 'IP':
      return '10.0.0.1'
    case 'email':
      return 'personne@exemple.fr'
    case 'URI':
      return 'https://exemple.fr/'
    case 'RID':
      return '1.3.6.1.4.1.311.20.2.3'
    case 'UPN':
      return 'personne@exemple.local'
    case 'otherName':
      return 'personne@exemple.local'
    default:
      return 'exemple.fr'
  }
}
