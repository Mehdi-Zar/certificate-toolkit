/**
 * Traduction de l'interface et des messages.
 *
 * Le francais fait foi : le type MessageKey en derive, et le fichier anglais
 * doit en couvrir chaque cle sous peine d'erreur de compilation. Le processus
 * principal traduit lui aussi ses messages, pour qu'un avertissement de
 * validation arrive au renderer deja dans la bonne langue.
 */
import { en } from './en.ts'
import { fr, type MessageKey } from './fr.ts'

export type { MessageKey }
export type Lang = 'fr' | 'en'

export const LANGUAGES: Array<{ value: Lang; short: string; label: string }> = [
  { value: 'fr', short: 'FR', label: 'Francais' },
  { value: 'en', short: 'EN', label: 'English' },
]

const TABLES: Record<Lang, Record<MessageKey, string>> = { fr, en }

export type Params = Record<string, string | number>

/** Remplace les marqueurs {nom} par leur valeur. */
function interpolate(text: string, params?: Params): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  )
}

export type Translate = (key: MessageKey, params?: Params) => string

export function translator(lang: Lang): Translate {
  const table = TABLES[lang] ?? fr
  return (key, params) => interpolate(table[key] ?? fr[key] ?? key, params)
}

export const isLang = (value: unknown): value is Lang => value === 'fr' || value === 'en'

/** Langue deduite de celle du systeme, au tout premier lancement. */
export function detectLang(locale: string): Lang {
  return locale.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}
