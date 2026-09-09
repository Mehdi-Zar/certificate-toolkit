/**
 * Retenir le focus dans une boite de dialogue.
 *
 * Un dialogue qui couvre l'ecran mais laisse la tabulation en sortir n'est
 * modal que pour la souris. Au clavier, on se retrouve dans le menu qui est
 * derriere, invisible sous le voile, sans savoir comment revenir. C'est
 * exactement ce qui arrivait dans l'assistant de demarrage, des la premiere
 * tabulation, c'est-a-dire pour la premiere personne a decouvrir l'outil sans
 * souris.
 *
 * Ce que fait ce module :
 *   - place le focus a l'ouverture, sur le premier element utile ;
 *   - boucle la tabulation entre le premier et le dernier ;
 *   - rend inerte tout ce qui est derriere, pour les lecteurs d'ecran, qui
 *     autrement continuent de lire la page dessous ;
 *   - rend le focus a l'element qui l'avait, a la fermeture.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const visible = (el: HTMLElement): boolean =>
  !el.hasAttribute('hidden') && el.offsetParent !== null

/**
 * Arme le piege sur un conteneur. Renvoie la fonction de demontage, faite pour
 * etre rendue telle quelle par un useEffect.
 */
export function trapFocus(container: HTMLElement): () => void {
  const previous = document.activeElement as HTMLElement | null

  const items = (): HTMLElement[] =>
    Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible)

  // Le premier element focalisable plutot que le conteneur : on entre dans le
  // dialogue la ou l'on a quelque chose a faire, pas sur son cadre.
  const first = items()[0]
  if (first) first.focus()
  else container.focus()

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const list = items()
    if (list.length === 0) {
      e.preventDefault()
      return
    }
    const head = list[0]!
    const tail = list[list.length - 1]!
    const active = document.activeElement

    // Le focus peut avoir ete pose hors du dialogue par un clic : on le ramene
    // plutot que de laisser la tabulation continuer ailleurs.
    if (!container.contains(active)) {
      e.preventDefault()
      head.focus()
      return
    }
    if (e.shiftKey && active === head) {
      e.preventDefault()
      tail.focus()
    } else if (!e.shiftKey && active === tail) {
      e.preventDefault()
      head.focus()
    }
  }

  document.addEventListener('keydown', onKey, true)

  // Le reste de l'application devient inerte : sans cela un lecteur d'ecran
  // continue d'annoncer le menu et la liste sous le voile.
  //
  // On remonte la chaine des ancetres et on masque les freres a chaque etage.
  // Se contenter des enfants de <body> ne masquerait rien : l'application est
  // montee dans un unique <div id="root">, qui contient aussi le dialogue.
  const restored: Array<{ el: HTMLElement; had: string | null }> = []
  for (let node: HTMLElement | null = container; node && node !== document.body; ) {
    const parent: HTMLElement | null = node.parentElement
    if (!parent) break
    for (const sibling of Array.from(parent.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement)) continue
      restored.push({ el: sibling, had: sibling.getAttribute('aria-hidden') })
      sibling.setAttribute('aria-hidden', 'true')
    }
    node = parent
  }

  return () => {
    document.removeEventListener('keydown', onKey, true)
    for (const { el, had } of restored) {
      if (had === null) el.removeAttribute('aria-hidden')
      else el.setAttribute('aria-hidden', had)
    }
    previous?.focus?.()
  }
}
