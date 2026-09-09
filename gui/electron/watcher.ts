/**
 * Veille sur l'espace de travail.
 *
 * Le parcours demande d'aller chercher un fichier ailleurs et de revenir : on
 * envoie la CSR a l'autorite, on attend, on depose sa reponse dans Signed/.
 * Ce depot se fait depuis l'explorateur, hors de l'application. Sans veille,
 * l'ecran reste sur ce qu'il savait a l'ouverture, et il faut le quitter puis
 * y revenir pour voir arriver la reponse.
 *
 * Deux filets plutot qu'un :
 *
 *   1. fs.watch sur la racine, en recursif la ou le systeme le sait faire.
 *      C'est immediat, et c'est ce qui donne l'impression que l'application
 *      regarde le meme dossier que vous.
 *   2. le retour du focus sur la fenetre. Le recursif n'existe pas sous Linux,
 *      un dossier sur un partage reseau ne remonte pas toujours ses
 *      evenements, et une veille peut mourir sans le dire. Revenir sur la
 *      fenetre apres etre alle chercher un fichier est precisement le geste
 *      qui suit un depot : ce filet couvre le cas reel meme quand le premier
 *      ne voit rien.
 *
 * Les evenements sont regroupes : copier trois fichiers en produit une
 * dizaine, et rafraichir dix fois de suite ferait clignoter la liste.
 */
import { BrowserWindow } from 'electron'
import { watch, type FSWatcher } from 'node:fs'

/** Canal unique : l'interface ne veut pas savoir ce qui a bouge, seulement que. */
export const CHANGED = 'inventory:changed'

/** Duree de regroupement. Assez pour une copie multiple, assez court pour ne pas se voir. */
const QUIET_MS = 400

let current: FSWatcher | null = null
let watched: string | null = null
let timer: NodeJS.Timeout | null = null

function notify(): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send(CHANGED)
    }
  }, QUIET_MS)
}

/** Previent l'interface tout de suite, sans attendre le regroupement. */
export function notifyNow(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(CHANGED)
  }
}

/**
 * Surveille une racine, en remplacant la surveillance precedente. Un dossier
 * absent n'est pas une erreur : il le sera peut-etre a la prochaine demande,
 * et le filet du focus couvre l'intervalle.
 */
export function watchRoot(dir: string): void {
  if (dir === watched && current) return
  stopWatching()
  if (!dir) return

  try {
    current = watch(dir, { recursive: process.platform !== 'linux', persistent: false }, notify)
    current.on('error', () => {
      // Racine supprimee, deconnexion d'un lecteur reseau : on abandonne la
      // veille sans bruit plutot que de faire tomber le processus principal.
      stopWatching()
    })
    watched = dir
  } catch {
    current = null
    watched = null
  }
}

export function stopWatching(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  current?.close()
  current = null
  watched = null
}
