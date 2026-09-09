/**
 * Actions systeme, avec leurs erreurs rendues visibles.
 *
 * Ces appels etaient lances en "void" : quand l'un echouait, le bouton ne
 * faisait simplement rien et personne ne savait pourquoi. C'est exactement ce
 * qui est arrive au bouton d'ouverture du dossier, quand la racine de travail
 * n'existait pas encore.
 */
import { useMemo } from 'react'
import { useToast } from '../components/Toast.tsx'
import { api, type Reply } from './api.ts'

export function useSystem() {
  const toast = useToast()

  return useMemo(() => {
    const run = async <T,>(p: Promise<Reply<T>>) => {
      const r = await p
      if (!r.ok) toast('error', r.error)
      return r.ok ? r.data : null
    }
    return {
      openDir: (path: string) => void run(api.system.openDir(path)),
      reveal: (path: string) => void run(api.system.reveal(path)),
      copy: (text: string) => void run(api.system.copy(text)),
      openLog: () => void run(api.system.openLog()),
    }
  }, [toast])
}
