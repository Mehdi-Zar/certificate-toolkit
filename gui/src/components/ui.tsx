/**
 * Primitives d'interface. Volontairement peu nombreuses : l'application n'a
 * que trois ecrans, une bibliotheque complete ne se justifierait pas.
 */
import { Loader2 } from 'lucide-react'
import { Hint } from './Hint.tsx'
import { cloneElement, isValidElement } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'

export const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ')

// ---------------------------------------------------------------------------
// Bouton
// ---------------------------------------------------------------------------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg hover:bg-accent-hover shadow-sm disabled:hover:bg-accent',
  secondary:
    'bg-surface text-ink border border-line hover:border-line-strong hover:bg-inset',
  ghost: 'text-muted hover:text-ink hover:bg-inset',
  danger: 'bg-danger-soft text-danger border border-transparent hover:border-danger/40',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9.5 px-4 gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap',
        'transition-colors duration-150',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Champs
// ---------------------------------------------------------------------------

interface FieldProps {
  label: string
  /** Ligne courte sous le champ. */
  hint?: ReactNode
  /** Explication longue, dans une infobulle accolee au libelle. */
  help?: string
  error?: string | null
  htmlFor?: string
  children: ReactNode
  className?: string
}

/**
 * Un libelle, le champ, et ce qui se dit autour.
 *
 * Deux details d'accessibilite qui ne se voient pas a l'ecran :
 *
 * Le bouton d'aide est pose a cote du libelle, pas dedans. Un controle place
 * dans un <label> entre dans le nom accessible du champ : la saisie du mot de
 * passe s'annoncait « Mot de passe du PFX Aide : Mot de passe du PFX ».
 *
 * La ligne d'aide et le message d'erreur sont rattaches au champ par
 * aria-describedby. Sans cela, un lecteur d'ecran annonce le libelle et rien
 * d'autre : l'erreur est affichee juste en dessous mais reste muette, et la
 * personne qui l'entend le moins est celle qui en a le plus besoin.
 */
export function Field({ label, hint, help, error, htmlFor, children, className }: FieldProps) {
  const noteId = htmlFor ? htmlFor + '-note' : undefined
  const described = noteId && (error || hint) ? noteId : undefined

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
        <label htmlFor={htmlFor}>{label}</label>
        {help && <Hint text={help} label={label} />}
      </div>

      {described && isValidElement(children)
        ? cloneElement(children as ReactElement<Describable>, {
            'aria-describedby': described,
            'aria-invalid': error ? true : undefined,
          })
        : children}

      {error ? (
        <p id={noteId} className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={noteId} className="text-[12px] text-subtle leading-relaxed">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** Les attributs que Field ajoute au controle qu'on lui confie. */
interface Describable {
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

const CONTROL =
  'w-full rounded-lg bg-surface border border-line px-3 text-ink placeholder:text-subtle ' +
  'transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(CONTROL, 'h-9.5 selectable', className)} />
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx(CONTROL, 'h-9.5 pr-8 cursor-pointer appearance-none', className)}>
      {children}
    </select>
  )
}

interface CheckProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
  /** Explication longue, dans une infobulle accolee au libelle. */
  help?: string
  tone?: 'default' | 'danger'
  disabled?: boolean
}

export function Check({
  checked,
  onChange,
  label,
  hint,
  help,
  tone = 'default',
  disabled,
}: CheckProps) {
  // Le bouton d'aide reste hors du <label>, pour la meme raison que dans
  // Field : un controle imbrique entre dans le nom accessible de la case.
  return (
    <div
      className={cx(
        'flex gap-2.5 items-start rounded-lg p-2.5 -mx-2.5 transition-colors',
        disabled ? 'opacity-50' : 'hover:bg-inset',
      )}
    >
      <label className={cx('flex min-w-0 flex-1 gap-2.5', disabled ? '' : 'cursor-pointer')}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className={cx(
            'mt-0.5 size-4 shrink-0 rounded border-line-strong bg-surface',
            tone === 'danger' ? 'accent-[var(--danger)]' : 'accent-[var(--accent)]',
          )}
        />
        <span className="min-w-0">
          <span
            className={cx(
              'block text-[13px] font-medium',
              tone === 'danger' ? 'text-danger' : 'text-ink',
            )}
          >
            {label}
          </span>
          {hint && <span className="block text-[12px] text-subtle leading-relaxed">{hint}</span>}
        </span>
      </label>
      {help && (
        <span className="mt-0.5 shrink-0">
          <Hint text={help} label={label} />
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conteneurs
// ---------------------------------------------------------------------------

export function Card({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cx('rounded-[var(--radius-panel)] border border-line bg-surface', className)}
    >
      {children}
    </div>
  )
}

export function SectionTitle({
  children,
  aside,
  help,
}: {
  children: ReactNode
  aside?: ReactNode
  help?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-3">
      <h2 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.07em] text-subtle">
        {children}
        {help && <Hint text={help} />}
      </h2>
      {aside}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pastilles et etats
// ---------------------------------------------------------------------------

export function Badge({
  children,
  tone = 'bg-inset text-muted',
  className,
}: {
  children: ReactNode
  tone?: string
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        tone,
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('size-4 animate-spin text-subtle', className)} />
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-inset text-subtle">
        {icon}
      </div>
      <h3 className="font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-subtle leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Bandeau d'erreur, pour ce qui a echoue sans etre bloquant a l'echelle de l'ecran. */
export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-[13px] text-danger whitespace-pre-line selectable">
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Paires cle / valeur
// ---------------------------------------------------------------------------

export function Rows({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-5 gap-y-2 text-[13px]">{children}</dl>
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-subtle">{label}</dt>
      <dd className="min-w-0 text-ink selectable break-words">{children}</dd>
    </>
  )
}
