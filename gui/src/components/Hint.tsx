/**
 * Infobulle d'aide.
 *
 * Un petit bouton en forme de point d'interrogation, qui explique le choix
 * auquel il est accole. La bulle est rendue dans un portail et positionnee en
 * coordonnees ecran : elle n'est donc jamais rognee par un conteneur qui
 * defile, et elle passe au-dessus du reste sans bataille de z-index.
 *
 * Accessible : le bouton est atteignable au clavier, la bulle s'ouvre au
 * survol comme au focus, Echap la referme, et le texte est rattache au bouton
 * par aria-describedby.
 */
import { HelpCircle } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../lib/store.tsx'
import { cx } from './ui.tsx'

interface Position {
  top: number
  left: number
  /** La bulle pointe vers le haut quand elle s'affiche sous le bouton. */
  below: boolean
}

const WIDTH = 288
const GAP = 8
const MARGIN = 12

export function Hint({ text, label }: { text: string; label?: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Position | null>(null)
  const anchor = useRef<HTMLButtonElement>(null)
  const id = useId()

  const place = useCallback(() => {
    const el = anchor.current
    if (!el) return
    const r = el.getBoundingClientRect()

    // Centree sur le bouton, puis ramenee dans la fenetre.
    let left = r.left + r.width / 2 - WIDTH / 2
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - WIDTH - MARGIN))

    // Au-dessus s'il y a la place, sinon en dessous.
    const below = r.top < 200
    const top = below ? r.bottom + GAP : r.top - GAP

    setPos({ top, left, below })
  }, [])

  const show = () => {
    place()
    setOpen(true)
  }
  const hide = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    // Le repositionnement suit le defilement plutot que de laisser la bulle
    // flotter loin de son bouton.
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  return (
    <>
      <button
        ref={anchor}
        type="button"
        // Le libelle du champ ne suffit pas : sans le mot "aide", un lecteur
        // d'ecran annonce deux boutons identiques, celui-ci et le champ.
        aria-label={label ? t('common.help') + ' : ' + label : t('common.help')}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.preventDefault()
          if (open) hide()
          else show()
        }}
        className={cx(
          'inline-grid size-4 shrink-0 place-items-center rounded-full align-middle transition-colors',
          open ? 'text-accent' : 'text-subtle hover:text-muted',
        )}
      >
        <HelpCircle className="size-3.5" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{
              top: pos.top,
              left: pos.left,
              width: WIDTH,
              transform: pos.below ? undefined : 'translateY(-100%)',
            }}
            className={cx(
              'pointer-events-none fixed z-[100] rounded-lg border border-line bg-surface px-3 py-2.5',
              'text-[12px] leading-relaxed text-muted shadow-[var(--shadow-panel)]',
              'animate-in',
            )}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  )
}
