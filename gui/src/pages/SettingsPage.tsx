/**
 * Reglages : racine de travail, binaire openssl et valeurs par defaut du sujet.
 * Rien de secret n'est enregistre ici.
 */
import { CheckCircle2, FolderOpen, RotateCcw, Save, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Settings } from '../../shared/types.ts'
import { PageBody, PageHeader } from '../components/PageHeader.tsx'
import { useToast } from '../components/Toast.tsx'
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  SectionTitle,
  Spinner,
  cx,
} from '../components/ui.tsx'
import { api, message, unwrap } from '../lib/api.ts'
import { useApp } from '../lib/store.tsx'

export function SettingsPage() {
  const { settings, probe, updateSettings, refresh } = useApp()
  const toast = useToast()

  const [draft, setDraft] = useState<Settings | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (settings) setDraft(structuredClone(settings))
  }, [settings])

  if (!draft) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner className="size-5" />
      </div>
    )
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d))

  const setDefault = (key: keyof Settings['defaults'], value: string) =>
    setDraft((d) => (d ? { ...d, defaults: { ...d.defaults, [key]: value } } : d))

  async function save() {
    if (!draft) return
    setBusy(true)
    setError(null)
    try {
      await updateSettings(draft)
      toast('success', 'Reglages enregistres')
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Reglages"
        description="Ou travailler, avec quel openssl, et quelles valeurs pre-remplir dans les demandes."
        actions={
          <>
            {dirty && (
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw className="size-3.5" />}
                onClick={() => settings && setDraft(structuredClone(settings))}
              >
                Annuler
              </Button>
            )}
            <Button
              size="sm"
              variant="primary"
              loading={busy}
              disabled={!dirty}
              icon={<Save className="size-3.5" />}
              onClick={() => void save()}
            >
              Enregistrer
            </Button>
          </>
        }
      />

      <PageBody>
        {error && <ErrorBanner>{error}</ErrorBanner>}

        <section>
          <SectionTitle>Emplacements</SectionTitle>
          <Card className="flex flex-col gap-5 p-5">
            <Field
              label="Racine de travail"
              htmlFor="root"
              hint="Un sous-dossier par FQDN y est cree. Equivalent de CERT_HOME pour la CLI : les deux interfaces peuvent partager la meme racine."
            >
              <div className="flex gap-2">
                <Input
                  id="root"
                  value={draft.rootDir}
                  onChange={(e) => set('rootDir', e.target.value)}
                  spellCheck={false}
                />
                <Button
                  icon={<FolderOpen className="size-4" />}
                  onClick={async () => {
                    const dir = await unwrap(api.system.pickDir())
                    if (dir) set('rootDir', dir)
                  }}
                >
                  Parcourir
                </Button>
              </div>
            </Field>

            <Field
              label="Binaire OpenSSL"
              htmlFor="ssl"
              hint="« openssl » suffit s’il est dans le PATH. Sinon, indiquez le chemin complet."
            >
              <Input
                id="ssl"
                value={draft.opensslPath}
                onChange={(e) => set('opensslPath', e.target.value)}
                spellCheck={false}
              />
            </Field>

            {probe && (
              <div
                className={cx(
                  'flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px]',
                  probe.available
                    ? 'border-ok/30 bg-ok-soft text-ok'
                    : 'border-danger/30 bg-danger-soft text-danger',
                )}
              >
                {probe.available ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium">
                    {probe.available ? 'OpenSSL detecte' : 'OpenSSL introuvable'}
                  </p>
                  <p className="mt-0.5 break-words opacity-90 selectable">{probe.version}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto shrink-0"
                  onClick={() => void refresh()}
                >
                  Tester
                </Button>
              </div>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle>Valeurs par defaut du sujet</SectionTitle>
          <Card className="grid gap-5 p-5 sm:grid-cols-2">
            <Field label="Pays (C)" htmlFor="dc">
              <Input
                id="dc"
                maxLength={2}
                value={draft.defaults.country}
                onChange={(e) => setDefault('country', e.target.value)}
              />
            </Field>
            <Field label="Organisation (O)" htmlFor="do">
              <Input
                id="do"
                value={draft.defaults.org}
                onChange={(e) => setDefault('org', e.target.value)}
              />
            </Field>
            <Field label="Unite (OU)" htmlFor="dou">
              <Input
                id="dou"
                value={draft.defaults.ou}
                onChange={(e) => setDefault('ou', e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="dmail">
              <Input
                id="dmail"
                type="email"
                value={draft.defaults.email}
                onChange={(e) => setDefault('email', e.target.value)}
              />
            </Field>
          </Card>
        </section>

        <section>
          <SectionTitle>Confidentialite</SectionTitle>
          <Card className="p-5 text-[13px] leading-relaxed text-muted">
            <p>
              Les cles privees, les CSR et les PFX restent dans la racine de travail : aucune
              donnee ne sort de ce poste, l’application n’emet aucune requete reseau.
            </p>
            <p className="mt-2">
              Les mots de passe ne sont jamais enregistres — ni ici, ni dans un fichier de
              session. Ils ne vivent que le temps de l’assemblage d’un PFX, et sont transmis a
              openssl par son environnement plutot que par sa ligne de commande.
            </p>
          </Card>
        </section>
      </PageBody>
    </>
  )
}
