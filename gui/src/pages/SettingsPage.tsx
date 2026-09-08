/**
 * Reglages : racine de travail, binaire openssl et valeurs par defaut du sujet.
 * Rien de secret n'est enregistre ici.
 */
import { CheckCircle2, FolderOpen, RotateCcw, Save, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LANGUAGES, type Lang } from '../../shared/i18n/index.ts'
import type { Capabilities, Settings } from '../../shared/types.ts'
import { PageBody, PageHeader } from '../components/PageHeader.tsx'
import { useToast } from '../components/Toast.tsx'
import {
  Button,
  Card,
  Check as Checkbox,
  ErrorBanner,
  Field,
  Input,
  SectionTitle,
  Select,
  Spinner,
  cx,
} from '../components/ui.tsx'
import { api, message, unwrap } from '../lib/api.ts'
import { useApp, useT } from '../lib/store.tsx'

/** Ce que le binaire detecte sait faire : conditionne les choix du formulaire. */
function CapabilityList({ caps }: { caps: Capabilities }) {
  const t = useT()
  const items: Array<[string, boolean]> = [
    ['RSA-PSS', caps.rsaPss],
    ['Ed25519', caps.ed25519],
    ['Ed448', caps.ed448],
    ['ML-DSA (post-quantique)', caps.mldsa],
    ['SHA-3', caps.sha3],
  ]
  return (
    <div className="rounded-lg border border-line bg-sunken px-3.5 py-3">
      <p className="mb-2 text-[12px] font-medium text-muted">{t('settings.algorithms')}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(([label, on]) => (
          <span
            key={label}
            className={cx(
              'rounded-full px-2 py-0.5 text-[11px]',
              on ? 'bg-ok-soft text-ok' : 'bg-inset text-subtle line-through',
            )}
          >
            {label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11.5px] text-subtle">
        {t('settings.curves', { list: caps.curves.join(', ') || t('settings.noCurves') })}
      </p>
    </div>
  )
}

export function SettingsPage() {
  const { settings, probe, updateSettings, refresh } = useApp()
  const t = useT()
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
      toast('success', t('settings.saved'))
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title={t('settings.title')}
        description={t('settings.desc')}
        actions={
          <>
            {dirty && (
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw className="size-3.5" />}
                onClick={() => settings && setDraft(structuredClone(settings))}
              >
                {t('common.cancel')}
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
              {t('common.save')}
            </Button>
          </>
        }
      />

      <PageBody>
        {error && <ErrorBanner>{error}</ErrorBanner>}

        <section>
          <SectionTitle>{t('settings.locations')}</SectionTitle>
          <Card className="flex flex-col gap-5 p-5">
            <Field
              label={t('settings.root')}
              htmlFor="root"
              hint={t('settings.rootHint')}
              help={t('settings.rootHelp')}
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
                  {t('settings.browse')}
                </Button>
              </div>
            </Field>

            <Field
              label={t('settings.opensslPath')}
              htmlFor="ssl"
              hint={t('settings.opensslPathHint')}
              help={t('settings.opensslBundledHelp')}
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
                    {probe.available ? t('settings.opensslDetected') : t('openssl.notFound')}
                  </p>
                  <p className="mt-0.5 break-words opacity-90 selectable">{probe.version}</p>
                  <p className="mt-1 text-[12px] opacity-75">
                    {probe.bundled ? t('settings.opensslBundled') : t('settings.opensslSystem')}
                    {' · '}
                    <span className="selectable">{probe.path}</span>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto shrink-0"
                  onClick={() => void refresh()}
                >
                  {t('settings.test')}
                </Button>
              </div>
            )}

            {probe?.available && <CapabilityList caps={probe.capabilities} />}
          </Card>
        </section>

        <section>
          <SectionTitle>{t('settings.form')}</SectionTitle>
          <Card className="flex flex-col gap-5 p-5">
            <Field
              label={t('settings.language')}
              htmlFor="lang"
              hint={t('settings.languageHint')}
              help={t('settings.languageHelp')}
            >
              <Select
                id="lang"
                value={draft.language}
                onChange={(e) => set('language', e.target.value as Lang)}
                className="sm:w-64"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="border-t border-line pt-1">
              <Checkbox
                checked={draft.advancedByDefault}
                onChange={(v) => set('advancedByDefault', v)}
                label={t('settings.advancedDefault')}
                hint={t('settings.advancedDefaultHint')}
              />
            </div>
          </Card>
        </section>

        <section>
          <SectionTitle help={t('settings.subjectDefaultsHelp')}>
            {t('settings.subjectDefaults')}
          </SectionTitle>
          <Card className="grid gap-5 p-5 sm:grid-cols-2">
            <Field label={t('field.country')} htmlFor="dc" help={t('field.country.help')}>
              <Input
                id="dc"
                maxLength={2}
                placeholder={t('ph.country')}
                value={draft.defaults.country}
                onChange={(e) => setDefault('country', e.target.value.toUpperCase())}
              />
            </Field>
            <Field label={t('field.state')} htmlFor="dst" help={t('field.state.help')}>
              <Input
                id="dst"
                placeholder={t('ph.state')}
                value={draft.defaults.state}
                onChange={(e) => setDefault('state', e.target.value)}
              />
            </Field>
            <Field label={t('field.locality')} htmlFor="dl" help={t('field.locality.help')}>
              <Input
                id="dl"
                placeholder={t('ph.locality')}
                value={draft.defaults.locality}
                onChange={(e) => setDefault('locality', e.target.value)}
              />
            </Field>
            <Field label={t('field.org')} htmlFor="do" help={t('field.org.help')}>
              <Input
                id="do"
                placeholder={t('ph.org')}
                value={draft.defaults.org}
                onChange={(e) => setDefault('org', e.target.value)}
              />
            </Field>
            <Field label={t('field.ous')} htmlFor="dou" help={t('field.ous.help')}>
              <Input
                id="dou"
                placeholder={t('ph.ou')}
                value={draft.defaults.ou}
                onChange={(e) => setDefault('ou', e.target.value)}
              />
            </Field>
            <Field label={t('field.email')} htmlFor="dmail" help={t('field.email.help')}>
              <Input
                id="dmail"
                type="email"
                placeholder={t('ph.email')}
                value={draft.defaults.email}
                onChange={(e) => setDefault('email', e.target.value)}
              />
            </Field>
          </Card>
        </section>

        <section>
          <SectionTitle>{t('settings.privacy')}</SectionTitle>
          <Card className="p-5 text-[13px] leading-relaxed text-muted">
            <p>{t('settings.privacy1')}</p>
            <p className="mt-2">{t('settings.privacy2')}</p>
          </Card>
        </section>
      </PageBody>
    </>
  )
}
