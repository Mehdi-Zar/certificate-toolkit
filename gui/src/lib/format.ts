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

/** "Sep 7 10:18:00 2026 GMT" -> "7 sept. 2026". */
export function shortDate(openssl: string): string {
  if (!openssl) return '-'
  const d = new Date(openssl.replace(/\s+/g, ' '))
  if (Number.isNaN(d.getTime())) return openssl
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function isoDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '-'
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
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

interface StatusStyle {
  label: string
  /** Classes utilitaires pour la pastille. */
  tone: string
  hint: string
}

export const STATUS: Record<EntryStatus, StatusStyle> = {
  'awaiting-pki': {
    label: 'En attente PKI',
    tone: 'bg-info-soft text-info',
    hint: 'La CSR est prete. Envoyez-la a la PKI.',
  },
  'ready-to-assemble': {
    label: 'A assembler',
    tone: 'bg-accent-soft text-accent',
    hint: 'La PKI a repondu. Assemblez le PFX.',
  },
  issued: {
    label: 'Emis',
    tone: 'bg-ok-soft text-ok',
    hint: 'Le PFX est disponible.',
  },
  expiring: {
    label: 'A renouveler',
    tone: 'bg-warn-soft text-warn',
    hint: 'Le certificat expire bientot.',
  },
  expired: {
    label: 'Expire',
    tone: 'bg-danger-soft text-danger',
    hint: 'Le certificat n’est plus valide.',
  },
  broken: {
    label: 'Incomplet',
    tone: 'bg-inset text-subtle',
    hint: 'Dossier incomplet : cle privee absente ou illisible.',
  },
}

/** "expire dans 42 jours" / "expire depuis 3 jours". */
export function expiryLabel(days: number): string {
  if (days < 0) {
    const n = Math.abs(days)
    return 'expire depuis ' + n + ' jour' + (n > 1 ? 's' : '')
  }
  if (days === 0) return 'expire aujourd’hui'
  return 'expire dans ' + days + ' jour' + (days > 1 ? 's' : '')
}
