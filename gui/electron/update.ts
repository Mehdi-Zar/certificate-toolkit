/**
 * Y a-t-il une version plus recente ?
 *
 * Pourquoi c'est desactive par defaut. L'application ne fait aucun appel
 * reseau, et c'est ecrit noir sur blanc dans ses reglages et sa documentation.
 * Beaucoup de postes qui manipulent des cles privees n'ont d'ailleurs pas de
 * sortie. Une verification silencieuse trahirait la promesse, alors on la
 * propose et on attend qu'on l'accepte.
 *
 * Pourquoi elle existe quand meme. La premiere version publiee ne savait pas
 * produire de demande, a cause d'un OpenSSL empaquete sans sa configuration.
 * Republier ne sert a rien si personne n'apprend qu'il faut retelecharger.
 *
 * Ce qui part : une requete GET, sans identifiant, sans cookie, sans rien du
 * poste au-dela de ce que toute requete HTTP comporte. Ce qui revient : un
 * numero de version. Rien n'est telecharge ni installe automatiquement : le
 * lien s'ouvre dans le navigateur, et c'est un humain qui decide.
 */
import { log } from './log.ts'
import { isNewer } from '../shared/version.ts'
import type { UpdateInfo } from '../shared/types.ts'

const LATEST =
  'https://api.github.com/repos/Mehdi-Zar/certificate-toolkit/releases/latest'

const RELEASES = 'https://github.com/Mehdi-Zar/certificate-toolkit/releases/latest'

/** Au-dela, on abandonne : ce n'est pas une raison de retarder le demarrage. */
const TIMEOUT_MS = 5_000

/**
 * Renvoie la version publiee si elle est plus recente, sinon null.
 * N'echoue jamais : pas de reseau, un proxy, une reponse inattendue, tout cela
 * se solde par un null. On ne derange personne pour dire qu'on n'a pas su.
 */
export async function checkForUpdate(current: string): Promise<UpdateInfo | null> {
  const stop = AbortSignal.timeout(TIMEOUT_MS)
  try {
    const r = await fetch(LATEST, {
      signal: stop,
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'certificate-toolkit',
      },
    })
    if (!r.ok) {
      log('verification de version refusee', { code: r.status })
      return null
    }
    const body = (await r.json()) as { tag_name?: unknown; html_url?: unknown }
    const tag = typeof body.tag_name === 'string' ? body.tag_name : ''
    if (!tag || !isNewer(tag, current)) return null

    return {
      latest: tag.replace(/^v/i, ''),
      current,
      url: typeof body.html_url === 'string' ? body.html_url : RELEASES,
    }
  } catch (err) {
    log('verification de version impossible', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
