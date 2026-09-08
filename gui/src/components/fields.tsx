/**
 * Champs composes du formulaire de demande : listes editables, editeur de SAN,
 * groupes de cases a cocher. Isoles ici pour que la page reste lisible.
 */
import { ChevronRight, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { San, SanType } from '../../shared/types.ts'
import { Badge, Button, Input, Select, cx } from './ui.tsx'

// ---------------------------------------------------------------------------
// Liste de valeurs simples (unites d'organisation, OID de politique, URL...)
// ---------------------------------------------------------------------------

export function StringList({
  values,
  onChange,
  placeholder,
  addLabel = 'Ajouter',
  type = 'text',
}: {
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
  addLabel?: string
  type?: string
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const v = draft.trim()
    if (!v || values.includes(v)) return setDraft('')
    onChange([...values, v])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-2">
      {values.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {values.map((v, i) => (
            <li key={v + i} className="flex min-w-0 items-center gap-2">
              <Input
                value={v}
                onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
                className="h-8.5 text-[13px]"
              />
              <button
                type="button"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                aria-label={'Retirer ' + v}
                className="shrink-0 rounded-md p-1.5 text-subtle transition-colors hover:bg-inset hover:text-danger"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="h-8.5 text-[13px]"
          spellCheck={false}
        />
        <Button
          type="button"
          size="sm"
          onClick={add}
          disabled={!draft.trim()}
          icon={<Plus className="size-3.5" />}
          className="shrink-0"
        >
          {addLabel}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Noms alternatifs
// ---------------------------------------------------------------------------

const SAN_LABEL: Record<SanType, string> = {
  DNS: 'Nom DNS',
  IP: 'Adresse IP',
  email: 'Email',
  URI: 'URI',
  UPN: 'UPN Windows',
  RID: 'OID enregistre',
  otherName: 'Autre (OID)',
}

const SAN_PLACEHOLDER: Record<SanType, string> = {
  DNS: 'www.exemple.fr',
  IP: '10.0.0.5',
  email: 'jean@exemple.fr',
  URI: 'https://exemple.fr/id',
  UPN: 'jdupont@exemple.local',
  RID: '1.3.6.1.4.1.311',
  otherName: 'valeur',
}

export function SanEditor({
  sans,
  onChange,
  allowed,
  guess,
  /** Le CN, ajoute automatiquement en premier SAN par certains modeles. */
  implicit,
}: {
  sans: San[]
  onChange: (next: San[]) => void
  allowed: SanType[]
  guess: (raw: string) => San
  implicit: San | null
}) {
  const [type, setType] = useState<SanType>(allowed[0] ?? 'DNS')
  const [value, setValue] = useState('')
  const [oid, setOid] = useState('')

  // Si le modele change, le type courant peut ne plus etre propose.
  const activeType = allowed.includes(type) ? type : (allowed[0] ?? 'DNS')

  const add = () => {
    const v = value.trim()
    if (!v) return
    // Un prefixe explicite ("IP:10.0.0.1") l'emporte sur le selecteur.
    const detected = guess(v)
    const san: San =
      detected.value !== v
        ? detected
        : { type: activeType, value: v, ...(activeType === 'otherName' ? { oid: oid.trim() } : {}) }
    if (sans.some((s) => s.type === san.type && s.value === san.value)) return setValue('')
    onChange([...sans, san])
    setValue('')
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2">
        {allowed.length > 1 && (
          <Select
            value={activeType}
            onChange={(e) => setType(e.target.value as SanType)}
            className="h-9.5 w-36 shrink-0 text-[13px]"
            aria-label="Type de nom"
          >
            {allowed.map((t) => (
              <option key={t} value={t}>
                {SAN_LABEL[t]}
              </option>
            ))}
          </Select>
        )}
        {activeType === 'otherName' && (
          <Input
            value={oid}
            onChange={(e) => setOid(e.target.value)}
            placeholder="OID"
            className="w-32 shrink-0"
            spellCheck={false}
          />
        )}
        <div className="min-w-0 flex-1">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder={SAN_PLACEHOLDER[activeType]}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          onClick={add}
          disabled={!value.trim()}
          icon={<Plus className="size-4" />}
          className="shrink-0"
        >
          Ajouter
        </Button>
      </div>

      {(implicit || sans.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {implicit && (
            <Badge tone="bg-accent-soft text-accent" className="gap-1.5 py-1">
              <span className="opacity-70">{implicit.type}</span>
              {implicit.value}
              <span className="opacity-60">· depuis le CN</span>
            </Badge>
          )}
          {sans.map((san, i) => (
            <Badge key={san.type + san.value + i} className="gap-1.5 py-1">
              <span className="opacity-60">{san.type}</span>
              {san.value}
              {san.oid && <span className="opacity-50">({san.oid})</span>}
              <button
                type="button"
                onClick={() => onChange(sans.filter((_, j) => j !== i))}
                aria-label={'Retirer ' + san.value}
                className="ml-0.5 rounded opacity-50 transition-opacity hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Groupe de cases a cocher avec explication
// ---------------------------------------------------------------------------

export function ToggleGrid<T extends string>({
  options,
  selected,
  onChange,
  columns = 2,
}: {
  options: Array<{ value: T; label: string; hint: string }>
  selected: T[]
  onChange: (next: T[]) => void
  columns?: 1 | 2
}) {
  const toggle = (v: T) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])

  return (
    <div className={cx('grid gap-1', columns === 2 ? 'sm:grid-cols-2' : '')}>
      {options.map((o) => {
        const on = selected.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            aria-pressed={on}
            className={cx(
              'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
              on
                ? 'border-accent/45 bg-accent-soft'
                : 'border-transparent hover:border-line hover:bg-inset',
            )}
          >
            <span
              className={cx(
                'mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition-colors',
                on ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong',
              )}
              aria-hidden
            >
              {on && (
                <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M2 6.5 4.5 9 10 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="min-w-0">
              <span className={cx('block text-[13px] font-medium', on ? 'text-accent' : 'text-ink')}>
                {o.label}
              </span>
              <span className="block text-[11.5px] text-subtle leading-snug">{o.hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section repliable
// ---------------------------------------------------------------------------

export function Disclosure({
  title,
  hint,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string
  hint?: string
  children: ReactNode
  defaultOpen?: boolean
  badge?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-[var(--radius-panel)] border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-5 py-3.5 text-left"
      >
        <ChevronRight
          className={cx('size-4 shrink-0 text-subtle transition-transform', open && 'rotate-90')}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium">{title}</span>
          {hint && <span className="block text-[12px] text-subtle">{hint}</span>}
        </span>
        {badge}
      </button>
      {open && <div className="border-t border-line px-5 py-5">{children}</div>}
    </div>
  )
}
