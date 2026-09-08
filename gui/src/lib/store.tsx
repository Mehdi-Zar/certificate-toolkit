/**
 * Etat partage : reglages, inventaire, diagnostic openssl.
 *
 * Un contexte suffit — l'application a trois ecrans et une seule source de
 * verite, le systeme de fichiers. Chaque action qui ecrit sur le disque
 * declenche un rafraichissement de l'inventaire.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CertEntry, OpensslProbe, Settings } from '../../shared/types.ts'
import { api, message, unwrap } from './api.ts'

interface AppState {
  settings: Settings | null
  entries: CertEntry[]
  probe: OpensslProbe | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateSettings: (next: Settings) => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp doit etre utilise dans AppProvider')
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [entries, setEntries] = useState<CertEntry[]>([])
  const [probe, setProbe] = useState<OpensslProbe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [s, p] = await Promise.all([
        unwrap(api.settings.get()),
        unwrap(api.openssl.probe()),
      ])
      setSettings(s)
      setProbe(p)
      // Sans openssl, l'inventaire ne peut pas lire les certificats : on evite
      // une cascade d'erreurs et on laisse le bandeau de diagnostic parler.
      setEntries(p.available ? await unwrap(api.inventory.list()) : [])
      setError(null)
    } catch (err) {
      setError(message(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSettings = useCallback(
    async (next: Settings) => {
      setSettings(await unwrap(api.settings.save(next)))
      await refresh()
    },
    [refresh],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<AppState>(
    () => ({ settings, entries, probe, loading, error, refresh, updateSettings }),
    [settings, entries, probe, loading, error, refresh, updateSettings],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export type Theme = 'system' | 'light' | 'dark'

const THEME_KEY = 'certtk.theme'

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
    } catch {
      /* stockage indisponible : on reste sur le theme systeme */
    }
    return 'system'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* non bloquant */
    }
  }, [theme])

  return [theme, setTheme]
}
