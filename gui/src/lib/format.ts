import type { Lang, MessageKey, Translate } from '../../shared/i18n/index.ts'
import type { EntryStatus } from '../../shared/types.ts'

/** Un DN RFC2253 ("CN=a,OU=b,O=c") eclate en paires, dans l'ordre de lecture. */
export function parseDn(dn: string): Array<[string, string]> {
  if (!dn) return []
  // Une virgule echappee (\,) fait partie de la valeur, elle ne separe pas.
  return dn
    .split(/(?<!\\),/)
    .map((part) => {
      const eq = part.indexOf('=')
      if (eq < 0) return null
      return [part.slice(0, eq).trim(), part.slice(eq + 1).trim().replace(/\\,/g, ',')] as [
        string,
        string,
      ]
    })
    .filter((p): p is [string, string] => p !== null)
}

/** Le CN d'un DN, ou le DN entier s'il n'en a pas. */
export function commonName(dn: string): string {
  return parseDn(dn).find(([k]) => k.toUpperCase() === 'CN')?.[1] ?? dn
}

const DATE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' } as const
const LOCALE: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB' }

/** "Sep 7 10:18:00 2026 GMT" -> "7 sept. 2026". */
export function shortDate(openssl: string, lang: Lang = 'fr'): string {
  if (!openssl) return '-'
  const d = new Date(openssl.replace(/\s+/g, ' '))
  if (Number.isNaN(d.getTime())) return openssl
  return d.toLocaleDateString(LOCALE[lang], DATE_FORMAT)
}

export function isoDate(iso: string | null, lang: Lang = 'fr'): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString(LOCALE[lang], DATE_FORMAT)
}

/** Une empreinte SHA-256 sur deux lignes, plus lisible qu'une seule longue. */
export function wrapFingerprint(fp: string): string {
  const parts = fp.split(':')
  if (parts.length < 16) return fp
  const half = Math.ceil(parts.length / 2)
  return parts.slice(0, half).join(':') + '\n' + parts.slice(half).join(':')
}

export function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

/** Couleur de la pastille de statut. Le libelle vient des traductions. */
export const STATUS_TONE: Record<EntryStatus, string> = {
  'awaiting-pki': 'bg-info-soft text-info',
  'ready-to-assemble': 'bg-accent-soft text-accent',
  issued: 'bg-ok-soft text-ok',
  expiring: 'bg-warn-soft text-warn',
  expired: 'bg-danger-soft text-danger',
  broken: 'bg-inset text-subtle',
}

export const statusLabelKey = (s: EntryStatus): MessageKey => ('status.' + s) as MessageKey
export const statusHintKey = (s: EntryStatus): MessageKey => ('status.' + s + '.hint') as MessageKey

/** "expire dans 42 jours" / "expired 3 days ago". */
export function expiryLabel(days: number, t: Translate): string {
  if (days < 0) return t('list.expiredSince', { n: Math.abs(days) })
  if (days === 0) return t('list.expiresToday')
  return t('list.expiresIn', { n: days })
}
