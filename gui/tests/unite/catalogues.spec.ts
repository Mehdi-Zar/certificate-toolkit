/**
 * Ce que le typage ne peut pas garantir sur les catalogues.
 *
 * TypeScript verifie deja que l'anglais couvre chaque cle du francais. Il ne
 * peut rien dire de ce qui suit, et c'est pourtant la que se cachent les
 * defauts qui ne se voient qu'a l'execution :
 *
 *   - un marqueur {nom} present d'un cote et pas de l'autre produit un texte
 *     avec une accolade en clair, dans une seule langue ;
 *   - un modele qui reference une cle absente affiche son propre identifiant ;
 *   - un texte laisse en anglais dans le catalogue francais passe inapercu
 *     jusqu'a ce qu'un utilisateur le lise.
 */
import { expect, test } from '@playwright/test'
import { fr } from '../../shared/i18n/fr.ts'
import { en } from '../../shared/i18n/en.ts'
import { LANGUAGES, translator } from '../../shared/i18n/index.ts'
import { EKU_CATALOG, KEY_USAGE_CATALOG, TEMPLATES } from '../../shared/templates.ts'
import type { MessageKey } from '../../shared/i18n/index.ts'

const keys = Object.keys(fr) as MessageKey[]
const markers = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort()

test('les deux catalogues portent exactement les memes cles', () => {
  expect(Object.keys(en).sort()).toEqual(keys.slice().sort())
})

test('aucun texte n’est vide', () => {
  const vides = keys.filter((k) => !fr[k].trim() || !en[k].trim())
  expect(vides).toEqual([])
})

test('les marqueurs concordent d’une langue a l’autre', () => {
  // Un {name} oublie en anglais s'affiche tel quel a l'ecran : le message
  // reste lisible en francais et devient absurde en anglais, ce qu'aucune
  // relecture d'un seul catalogue ne montre.
  const divergents = keys
    .filter((k) => markers(fr[k]).join(',') !== markers(en[k]).join(','))
    .map((k) => k + ' : fr[' + markers(fr[k]) + '] en[' + markers(en[k]) + ']')
  expect(divergents).toEqual([])
})

test('le remplacement des marqueurs ne laisse rien en place', () => {
  const t = translator('fr')
  // Un marqueur oublie a l'appel est visible ici, sur la seule cle qui en
  // porte deux : la substitution doit toutes les traiter.
  expect(t('wizard.step', { n: 2, total: 6 })).toBe('Étape 2 sur 6')
  expect(t('wizard.step', { n: 2, total: 6 })).not.toContain('{')
})

test('chaque langue se nomme dans sa propre langue, correctement ecrite', () => {
  expect(LANGUAGES.map((l) => l.label)).toEqual(['Français', 'English'])
})

test('aucun tiret cadratin dans les textes affiches', () => {
  // La regle est aussi appliquee par scripts/check-docs.mjs. Elle est reprise
  // ici pour que le rapport de test nomme la cle fautive.
  const fautifs = keys.filter((k) => /[—–]/.test(fr[k]) || /[—–]/.test(en[k]))
  expect(fautifs).toEqual([])
})

test('les apostrophes francaises sont typographiques', () => {
  // L'apostroppe droite est un signe de texte tape a la hate. Le catalogue
  // francais est ecrit, pas tape.
  const fautifs = keys.filter((k) => /\w'\w/.test(fr[k]))
  expect(fautifs).toEqual([])
})

// ---------------------------------------------------------------------------
// Les modeles
// ---------------------------------------------------------------------------

test('chaque modele reference des cles qui existent', () => {
  const manquantes: string[] = []
  for (const tpl of TEMPLATES) {
    const referencees = [
      tpl.labelKey,
      tpl.pitchKey,
      tpl.detailKey,
      tpl.cnKey,
      tpl.cnPlaceholderKey,
      tpl.sanHintKey,
      ...(tpl.noteKeys ?? []),
    ]
    for (const k of referencees) {
      if (!(k in fr)) manquantes.push(tpl.id + ' -> ' + k)
    }
  }
  expect(manquantes).toEqual([])
})

test('les identifiants de modele sont uniques', () => {
  const ids = TEMPLATES.map((t) => t.id)
  expect(new Set(ids).size).toBe(ids.length)
})

test('chaque usage et usage etendu du catalogue a son libelle', () => {
  const manquantes: string[] = []
  for (const e of EKU_CATALOG) if (!(e.labelKey in fr)) manquantes.push(e.labelKey)
  for (const k of KEY_USAGE_CATALOG) if (!(k.labelKey in fr)) manquantes.push(k.labelKey)
  expect(manquantes).toEqual([])
})

test('aucun modele ne demande une cle RSA en dessous de 2048 bits', () => {
  const faibles = TEMPLATES.filter((t) => t.key.algorithm === 'rsa' && t.key.bits < 2048)
  expect(faibles.map((t) => t.id)).toEqual([])
})

test('un modele d’autorite demande keyCertSign, les autres non', () => {
  for (const tpl of TEMPLATES) {
    const signe = tpl.keyUsage.includes('keyCertSign')
    expect(signe, tpl.id).toBe(tpl.ca)
  }
})

test('aucun modele TLS public ne cumule serverAuth et clientAuth', () => {
  // Regle du CA/Browser Forum applicable en juin 2026. Un modele qui la
  // violerait produirait des demandes rejetees par toutes les autorites
  // publiques, sans que rien dans l'interface ne l'annonce.
  const publics = TEMPLATES.filter((t) => t.id === 'tls-public' || t.id === 'tls-muststaple')
  expect(publics.length).toBeGreaterThan(0)
  for (const tpl of publics) {
    expect(tpl.extendedKeyUsage, tpl.id).not.toContain('clientAuth')
  }
})
