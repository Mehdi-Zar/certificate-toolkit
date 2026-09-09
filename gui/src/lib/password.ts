/**
 * Proposer un mot de passe pour un PFX.
 *
 * Ce mot de passe protege une clé privée dans un fichier destiné à circuler,
 * et la documentation demande de le transmettre séparément du fichier. Sans
 * aide, il sera court, réutilisé, et noté quelque part.
 *
 * Deux contraintes qui décident de tout :
 *
 *   Il sera lu à voix haute, retapé sur une console, ou collé dans un champ
 *   qui n'accepte pas tout. L'alphabet exclut donc ce qui se confond : 0 et O,
 *   1, l et I, ainsi que les caractères qu'un shell interpréterait.
 *
 *   Il ne doit jamais être devinable. Le tirage vient de crypto.getRandomValues
 *   et non de Math.random, et le modulo est rejeté plutôt que replié : replier
 *   un octet sur un alphabet qui ne divise pas 256 rend les premières lettres
 *   plus probables que les dernières.
 */

/** 52 caractères, sans les paires qui se confondent ni la ponctuation risquée. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

/** 20 caractères sur cet alphabet donnent environ 116 bits. Large. */
const LENGTH = 20

/** Coupé tous les cinq caractères : on relit et on dicte un mot de passe. */
const GROUP = 5

export function suggestPassword(): string {
  const max = Math.floor(256 / ALPHABET.length) * ALPHABET.length
  const out: string[] = []
  const buf = new Uint8Array(LENGTH * 2)

  while (out.length < LENGTH) {
    crypto.getRandomValues(buf)
    for (const byte of buf) {
      if (out.length === LENGTH) break
      // Au-dela du dernier multiple entier, l'octet est rejete : c'est ce qui
      // garde chaque caractere equiprobable.
      if (byte >= max) continue
      out.push(ALPHABET[byte % ALPHABET.length])
    }
  }

  const groups: string[] = []
  for (let i = 0; i < out.length; i += GROUP) groups.push(out.slice(i, i + GROUP).join(''))
  return groups.join('-')
}
