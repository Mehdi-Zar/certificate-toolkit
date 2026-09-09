/**
 * Etape 1 : le choix d'un modele, puis la demande, puis la CSR produite.
 *
 * Le formulaire tient en deux niveaux. Par defaut on ne voit que ce qui change
 * d'une demande a l'autre : le nom, les noms alternatifs, l'organisation. Le
 * mode avance ouvre chaque extension X.509. Dans les deux cas un apercu montre
 * en direct la configuration qui sera passee a openssl et les incoherences
 * detectees, et chaque choix porte une infobulle qui l'explique.
 */
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  CreditCard,
  FileSignature,
  FileText,
  FolderOpen,
  Globe,
  Info,
  KeyRound,
  Landmark,
  Lock,
  Mail,
  Network,
  Server,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Translate } from '../../shared/i18n/index.ts'
import {
  CATEGORY_KEY,
  EKU_CATALOG,
  KEY_USAGE_CATALOG,
  TEMPLATES,
  blankRequest,
  getTemplate,
  type Template,
  type TemplateCategory,
} from '../../shared/templates.ts'
import type {
  Capabilities,
  CsrPreview,
  CsrRequest,
  CsrResult,
  Digest,
  KeyAlgorithm,
  KeyUsageBit,
  San,
  Warning,
} from '../../shared/types.ts'
import type { Route } from '../App.tsx'
import { Disclosure, SanEditor, StringList, ToggleGrid } from '../components/fields.tsx'
import { Hint } from '../components/Hint.tsx'
import { PageBody, PageHeader } from '../components/PageHeader.tsx'
import { useToast } from '../components/Toast.tsx'
import {
  Badge,
  Button,
  Card,
  Check as Checkbox,
  ErrorBanner,
  Field,
  Input,
  Row,
  Rows,
  SectionTitle,
  Select,
  cx,
} from '../components/ui.tsx'
import { api, message, unwrap } from '../lib/api.ts'
import { useSystem } from '../lib/system.ts'
import { useApp, useT } from '../lib/store.tsx'

// ---------------------------------------------------------------------------
// Utilitaires partages avec le moteur (memes regles, cote interface)
// ---------------------------------------------------------------------------

function guessSan(raw: string): San {
  const value = raw.trim()
  const colon = value.indexOf(':')
  if (colon > 0) {
    const known: Record<string, San['type']> = {
      dns: 'DNS', ip: 'IP', email: 'email', uri: 'URI', rid: 'RID', upn: 'UPN',
    }
    const type = known[value.slice(0, colon).toLowerCase()]
    if (type) return { type, value: value.slice(colon + 1) }
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return { type: 'IP', value }
  if (/^[0-9A-Fa-f:]+$/.test(value) && value.includes(':')) return { type: 'IP', value }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return { type: 'URI', value }
  if (/^\d+(\.\d+)+$/.test(value)) return { type: 'RID', value }
  if (value.includes('@')) return { type: 'email', value }
  return { type: 'DNS', value }
}

function slugify(cn: string): string {
  return (
    cn
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9._*-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200) || 'demande'
  )
}

const ICONS: Record<string, ReactNode> = {
  Globe: <Globe className="size-4" />,
  Server: <Server className="size-4" />,
  ShieldCheck: <ShieldCheck className="size-4" />,
  KeyRound: <KeyRound className="size-4" />,
  Mail: <Mail className="size-4" />,
  CreditCard: <CreditCard className="size-4" />,
  Network: <Network className="size-4" />,
  FileSignature: <FileSignature className="size-4" />,
  Clock: <Clock className="size-4" />,
  Lock: <Lock className="size-4" />,
  Landmark: <Landmark className="size-4" />,
  SlidersHorizontal: <SlidersHorizontal className="size-4" />,
}


// ---------------------------------------------------------------------------

export function NewRequestPage({ navigate }: { navigate: (r: Route) => void }) {
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [result, setResult] = useState<CsrResult | null>(null)

  if (result) return <CsrReady result={result} navigate={navigate} />
  if (!templateId) return <TemplatePicker navigate={navigate} onPick={setTemplateId} />
  return (
    <RequestForm
      templateId={templateId}
      onBack={() => setTemplateId(null)}
      onDone={setResult}
      navigate={navigate}
    />
  )
}

// ---------------------------------------------------------------------------
// Choix du modele
// ---------------------------------------------------------------------------

function TemplatePicker({
  navigate,
  onPick,
}: {
  navigate: (r: Route) => void
  onPick: (id: string) => void
}) {
  const t = useT()
  const categories = useMemo(() => {
    const map = new Map<TemplateCategory, Template[]>()
    for (const tpl of TEMPLATES) {
      const list = map.get(tpl.category) ?? []
      list.push(tpl)
      map.set(tpl.category, list)
    }
    return [...map.entries()]
  }, [])

  return (
    <>
      <PageHeader
        title={t('new.pickerTitle')}
        description={t('new.pickerDesc')}
        back={<BackLink label={t('new.backToList')} onClick={() => navigate({ name: 'list' })} />}
      />
      <PageBody>
        {categories.map(([category, list]) => (
          <section key={category}>
            <SectionTitle>{t(CATEGORY_KEY[category])}</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((tpl) => (
                <div
                  key={tpl.id}
                  className={cx(
                    'group relative flex gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-4',
                    'transition-colors hover:border-accent/45 hover:bg-accent-soft/35',
                  )}
                >
                  <button
                    onClick={() => onPick(tpl.id)}
                    aria-label={t(tpl.labelKey)}
                    className="absolute inset-0 rounded-[var(--radius-panel)]"
                  />
                  <span className="pointer-events-none relative mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-inset text-muted transition-colors group-hover:bg-accent group-hover:text-accent-fg">
                    {ICONS[tpl.icon] ?? <ShieldCheck className="size-4" />}
                  </span>
                  <span className="pointer-events-none relative min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{t(tpl.labelKey)}</span>
                    <span className="mt-0.5 block text-[12px] text-subtle leading-relaxed">
                      {t(tpl.pitchKey)}
                    </span>
                  </span>
                  <span className="relative mt-0.5 shrink-0">
                    <Hint text={t(tpl.detailKey)} label={t(tpl.labelKey)} />
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </PageBody>
    </>
  )
}

// ---------------------------------------------------------------------------
// Formulaire
// ---------------------------------------------------------------------------

function RequestForm({
  templateId,
  onBack,
  onDone,
  navigate,
}: {
  templateId: string
  onBack: () => void
  onDone: (r: CsrResult) => void
  navigate: (r: Route) => void
}) {
  const { settings, probe, refresh } = useApp()
  const t = useT()
  const toast = useToast()
  const template = getTemplate(templateId)

  const [req, setReq] = useState<CsrRequest>(() => blankRequest(template, settings?.defaults))
  const [advanced, setAdvanced] = useState(settings?.advancedByDefault ?? false)
  const [nameTouched, setNameTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<CsrPreview | null>(null)

  const caps: Capabilities | null = probe?.capabilities ?? null

  const patch = useCallback((fn: (draft: CsrRequest) => void) => {
    setReq((current) => {
      const next = structuredClone(current)
      fn(next)
      return next
    })
  }, [])

  // Les reglages ne sont pas encore charges au premier rendu : on reseme les
  // valeurs par defaut du sujet des qu'ils arrivent, sans toucher a la saisie.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !settings) return
    seeded.current = true
    setReq((c) => ({
      ...c,
      subject: {
        ...c.subject,
        country: c.subject.country || settings.defaults.country,
        state: c.subject.state || settings.defaults.state,
        locality: c.subject.locality || settings.defaults.locality,
        org: c.subject.org || settings.defaults.org,
        ous:
          c.subject.ous.length > 0
            ? c.subject.ous
            : settings.defaults.ou
              ? [settings.defaults.ou]
              : [],
        email: c.subject.email || settings.defaults.email,
      },
    }))
    setAdvanced(settings.advancedByDefault)
  }, [settings])

  // Le nom du dossier suit le CN tant que l'utilisateur ne l'a pas fixe lui-meme.
  useEffect(() => {
    if (nameTouched) return
    setReq((c) => ({ ...c, name: c.subject.commonName.trim() ? slugify(c.subject.commonName) : '' }))
  }, [req.subject.commonName, nameTouched])

  // Apercu recalcule apres une courte pause de frappe.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void unwrap(api.csr.preview(req)).then(setPreview, () => setPreview(null))
    }, 220)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [req])

  const errors = preview?.warnings.filter((w) => w.level === 'error') ?? []
  const started = req.subject.commonName.trim().length > 0
  const canSubmit = errors.length === 0 && started && !!probe?.available

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await unwrap(api.csr.generate(req))
      toast('success', t('new.toastGenerated', { name: res.name }))
      await refresh()
      onDone(res)
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  const implicitSan = started && template.cnAsSan ? guessSan(req.subject.commonName) : null
  const isRsa = req.key.algorithm === 'rsa' || req.key.algorithm === 'rsa-pss'

  return (
    <>
      <PageHeader
        title={t(template.labelKey)}
        description={t(template.detailKey)}
        back={<BackLink label={t('new.backToPicker')} onClick={onBack} />}
        actions={
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 rounded-lg bg-inset p-0.5">
              <ModeTab active={!advanced} onClick={() => setAdvanced(false)}>
                {t('new.modeSimple')}
              </ModeTab>
              <ModeTab active={advanced} onClick={() => setAdvanced(true)}>
                {t('new.modeAdvanced')}
              </ModeTab>
            </div>
            <Hint text={t('new.modeHelp')} />
          </div>
        }
      />

      <div className="flex flex-col gap-6 px-8 pb-12 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {error && <ErrorBanner>{error}</ErrorBanner>}

          {template.noteKeys.map((k) => (
            <Note key={k} tone="info">
              {t(k)}
            </Note>
          ))}

          {/* ---------------------------------------------------------- */}
          <Card className="flex flex-col gap-5 p-5">
            <Field
              label={t(template.cnKey)}
              htmlFor="cn"
              hint={template.cnAsSan ? t('new.cnHelpAsSan') : t('new.cnHelpNotSan')}
              help={t(template.detailKey)}
            >
              <Input
                id="cn"
                value={req.subject.commonName}
                onChange={(e) => patch((d) => void (d.subject.commonName = e.target.value))}
                placeholder={t(template.cnPlaceholderKey)}
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
            </Field>

            <Field
              label={t('new.sanLabel')}
              htmlFor="san"
              hint={t(template.sanHintKey)}
              help={t('new.sanHelp')}
              error={started ? (errors.find((e) => e.field === 'sans')?.message ?? null) : null}
            >
              <SanEditor
                id="san"
                sans={req.sans}
                onChange={(next) => patch((d) => void (d.sans = next))}
                allowed={
                  advanced ? ['DNS', 'IP', 'email', 'URI', 'UPN', 'RID', 'otherName'] : template.sanTypes
                }
                guess={guessSan}
                implicit={implicitSan}
              />
            </Field>

            {advanced && (
              <Field
                label={t('new.folderLabel')}
                htmlFor="name"
                hint={t('new.folderHint')}
                help={t('new.folderHelp')}
                error={errors.find((e) => e.field === 'name')?.message ?? null}
              >
                <Input
                  id="name"
                  value={req.name}
                  onChange={(e) => {
                    setNameTouched(true)
                    patch((d) => void (d.name = e.target.value))
                  }}
                  spellCheck={false}
                />
              </Field>
            )}
          </Card>

          <SubjectSection req={req} patch={patch} advanced={advanced} errors={errors} t={t} />
          <KeySection
            req={req}
            patch={patch}
            advanced={advanced}
            caps={caps}
            isRsa={isRsa}
            errors={errors}
            t={t}
          />
          {advanced && <ExtensionsSection req={req} patch={patch} t={t} />}
          {advanced && <PkiSection req={req} patch={patch} t={t} />}

          <Card className="p-5">
            <Checkbox
              checked={req.force}
              onChange={(v) => patch((d) => void (d.force = v))}
              tone="danger"
              label={t('new.force')}
              hint={t('new.forceHint')}
              help={t('new.forceHelp')}
            />
          </Card>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              loading={busy}
              disabled={!canSubmit}
              onClick={() => void submit()}
              icon={<Sparkles className="size-4" />}
            >
              {t('new.submit')}
            </Button>
            <Button variant="ghost" onClick={() => navigate({ name: 'list' })}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>

        <PreviewPanel preview={preview} name={req.name} started={started} t={t} />
      </div>
    </>
  )
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'h-8 rounded-md px-3 text-[13px] font-medium transition-colors',
        active ? 'bg-surface text-ink shadow-sm' : 'text-subtle hover:text-muted',
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------

type Patch = (fn: (draft: CsrRequest) => void) => void

interface SectionProps {
  req: CsrRequest
  patch: Patch
  t: Translate
}

function SubjectSection({
  req,
  patch,
  advanced,
  errors,
  t,
}: SectionProps & { advanced: boolean; errors: Warning[] }) {
  const s = req.subject
  const body = (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t('field.country')}
          htmlFor="c"
          help={t('field.country.help')}
          error={errors.find((e) => e.field === 'country')?.message ?? null}
        >
          <Input
            id="c"
            maxLength={2}
            placeholder={t('ph.country')}
            value={s.country}
            onChange={(e) => patch((d) => void (d.subject.country = e.target.value.toUpperCase()))}
          />
        </Field>
        <Field label={t('field.org')} htmlFor="o" help={t('field.org.help')}>
          <Input
            id="o"
            placeholder={t('ph.org')}
            value={s.org}
            onChange={(e) => patch((d) => void (d.subject.org = e.target.value))}
          />
        </Field>
      </div>

      <Field label={t('field.ous')} htmlFor="ous" hint={t('field.ous.hint')} help={t('field.ous.help')}>
        <StringList
          id="ous"
          values={s.ous}
          onChange={(next) => patch((d) => void (d.subject.ous = next))}
          placeholder={t('ph.ou')}
        />
      </Field>

      <Field
        label={t('field.email')}
        htmlFor="mail"
        hint={t('field.email.hint')}
        help={t('field.email.help')}
      >
        <Input
          id="mail"
          type="email"
          placeholder={t('ph.email')}
          value={s.email}
          onChange={(e) => patch((d) => void (d.subject.email = e.target.value))}
        />
      </Field>

      {advanced && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('field.state')} htmlFor="st" help={t('field.state.help')}>
              <Input
                id="st"
                placeholder={t('ph.state')}
                value={s.state}
                onChange={(e) => patch((d) => void (d.subject.state = e.target.value))}
              />
            </Field>
            <Field label={t('field.locality')} htmlFor="l" help={t('field.locality.help')}>
              <Input
                id="l"
                placeholder={t('ph.locality')}
                value={s.locality}
                onChange={(e) => patch((d) => void (d.subject.locality = e.target.value))}
              />
            </Field>
            <Field label={t('field.street')} htmlFor="street" help={t('field.street.help')}>
              <Input
                id="street"
                placeholder={t('ph.street')}
                value={s.street}
                onChange={(e) => patch((d) => void (d.subject.street = e.target.value))}
              />
            </Field>
            <Field label={t('field.postalCode')} htmlFor="pc" help={t('field.postalCode.help')}>
              <Input
                id="pc"
                placeholder={t('ph.postalCode')}
                value={s.postalCode}
                onChange={(e) => patch((d) => void (d.subject.postalCode = e.target.value))}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('field.givenName')} htmlFor="gn" help={t('field.givenName.help')}>
              <Input
                id="gn"
                placeholder={t('ph.givenName')}
                value={s.givenName}
                onChange={(e) => patch((d) => void (d.subject.givenName = e.target.value))}
              />
            </Field>
            <Field label={t('field.surname')} htmlFor="sn" help={t('field.surname.help')}>
              <Input
                id="sn"
                placeholder={t('ph.surname')}
                value={s.surname}
                onChange={(e) => patch((d) => void (d.subject.surname = e.target.value))}
              />
            </Field>
            <Field label={t('field.title')} htmlFor="ti" help={t('field.title.help')}>
              <Input
                id="ti"
                placeholder={t('ph.title')}
                value={s.title}
                onChange={(e) => patch((d) => void (d.subject.title = e.target.value))}
              />
            </Field>
            <Field label={t('field.uid')} htmlFor="uid" help={t('field.uid.help')}>
              <Input
                id="uid"
                placeholder={t('ph.uid')}
                value={s.uid}
                onChange={(e) => patch((d) => void (d.subject.uid = e.target.value))}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={t('field.serialNumber')}
              htmlFor="serial"
              hint={t('field.serialNumber.hint')}
              help={t('field.serialNumber.help')}
            >
              <Input
                id="serial"
                placeholder={t('ph.serialNumber')}
                value={s.serialNumber}
                onChange={(e) => patch((d) => void (d.subject.serialNumber = e.target.value))}
              />
            </Field>
            <Field
              label={t('field.businessCategory')}
              htmlFor="bc"
              hint={t('field.businessCategory.hint')}
              help={t('field.businessCategory.help')}
            >
              <Input
                id="bc"
                placeholder={t('ph.businessCategory')}
                value={s.businessCategory}
                onChange={(e) => patch((d) => void (d.subject.businessCategory = e.target.value))}
              />
            </Field>
          </div>

          <Field label={t('field.dc')} htmlFor="dcs" hint={t('field.dc.hint')} help={t('field.dc.help')}>
            <StringList
              id="dcs"
              values={s.domainComponents}
              onChange={(next) => patch((d) => void (d.subject.domainComponents = next))}
              placeholder={t('ph.dc')}
            />
          </Field>
        </>
      )}
    </div>
  )

  return advanced ? (
    <Disclosure title={t('new.subjectTitle')} hint={t('new.subjectHint')} defaultOpen>
      {body}
    </Disclosure>
  ) : (
    <Card className="p-5">{body}</Card>
  )
}

// ---------------------------------------------------------------------------

function KeySection({
  req,
  patch,
  advanced,
  caps,
  isRsa,
  errors,
  t,
}: SectionProps & {
  advanced: boolean
  caps: Capabilities | null
  isRsa: boolean
  errors: Warning[]
}) {
  const algorithms: Array<{ value: KeyAlgorithm; label: string; available: boolean }> = [
    { value: 'rsa', label: 'RSA', available: true },
    { value: 'ec', label: 'EC', available: true },
    { value: 'rsa-pss', label: 'RSA-PSS', available: caps?.rsaPss ?? false },
    { value: 'ed25519', label: 'Ed25519', available: caps?.ed25519 ?? false },
    { value: 'ed448', label: 'Ed448', available: caps?.ed448 ?? false },
    { value: 'ml-dsa', label: 'ML-DSA', available: caps?.mldsa ?? false },
  ]
  const digests: Digest[] = caps?.sha3
    ? ['sha256', 'sha384', 'sha512', 'sha3-256', 'sha3-384', 'sha3-512']
    : ['sha256', 'sha384', 'sha512']
  const noDigest = ['ed25519', 'ed448', 'ml-dsa'].includes(req.key.algorithm)

  const body = (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t('field.keyType')} htmlFor="alg" help={t('field.keyType.help')}>
          <Select
            id="alg"
            value={req.key.algorithm}
            onChange={(e) => patch((d) => void (d.key.algorithm = e.target.value as KeyAlgorithm))}
          >
            {algorithms
              .filter((a) => a.available || a.value === req.key.algorithm)
              .filter((a) => advanced || a.value === 'rsa' || a.value === 'ec')
              .map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
          </Select>
        </Field>

        {isRsa && (
          <Field
            label={t('field.bits')}
            htmlFor="bits"
            hint={t('field.bits.hint')}
            help={t('field.bits.help')}
            error={errors.find((e) => e.field === 'key')?.message ?? null}
          >
            <Select
              id="bits"
              value={req.key.bits}
              onChange={(e) => patch((d) => void (d.key.bits = Number(e.target.value)))}
            >
              {[2048, 3072, 4096, 8192].map((b) => (
                <option key={b} value={b}>
                  {b} bits
                </option>
              ))}
            </Select>
          </Field>
        )}

        {req.key.algorithm === 'ec' && (
          <Field
            label={t('field.curve')}
            htmlFor="curve"
            hint={t('field.curve.hint')}
            help={t('field.curve.help')}
          >
            <Select
              id="curve"
              value={req.key.curve}
              onChange={(e) => patch((d) => void (d.key.curve = e.target.value))}
            >
              {(caps?.curves ?? ['prime256v1']).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {req.key.algorithm === 'ml-dsa' && (
          <Field
            label={t('field.mldsaLevel')}
            htmlFor="ml"
            hint={t('field.mldsaLevel.hint')}
            help={t('field.mldsaLevel.help')}
          >
            <Select
              id="ml"
              value={req.key.mldsaLevel}
              onChange={(e) =>
                patch((d) => void (d.key.mldsaLevel = e.target.value as '44' | '65' | '87'))
              }
            >
              <option value="44">ML-DSA-44</option>
              <option value="65">ML-DSA-65</option>
              <option value="87">ML-DSA-87</option>
            </Select>
          </Field>
        )}

        {advanced && !noDigest && (
          <Field label={t('field.digest')} htmlFor="dg" help={t('field.digest.help')}>
            <Select
              id="dg"
              value={req.digest}
              onChange={(e) => patch((d) => void (d.digest = e.target.value as Digest))}
            >
              {digests.map((d) => (
                <option key={d} value={d}>
                  {d.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {noDigest && <Note tone="info">{t('new.digestImplicit')}</Note>}

      <div className="border-t border-line pt-1">
        <Checkbox
          checked={req.key.encrypt}
          onChange={(v) => patch((d) => void (d.key.encrypt = v))}
          label={t('new.encryptKey')}
          hint={t('new.encryptKeyHint')}
          help={t('new.encryptKeyHelp')}
        />
        {req.key.encrypt && (
          <div className="mt-3 pl-7">
            <Field
              label={t('field.passphrase')}
              htmlFor="pp"
              help={t('field.passphrase.help')}
              error={errors.find((e) => e.field === 'passphrase')?.message ?? null}
            >
              <Input
                id="pp"
                type="password"
                value={req.key.passphrase}
                onChange={(e) => patch((d) => void (d.key.passphrase = e.target.value))}
                autoComplete="new-password"
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  )

  return advanced ? (
    <Disclosure title={t('new.keyTitle')} hint={t('new.keyHint')} defaultOpen>
      {body}
    </Disclosure>
  ) : (
    <Card className="p-5">{body}</Card>
  )
}

// ---------------------------------------------------------------------------

function ExtensionsSection({ req, patch, t }: SectionProps) {
  const ext = req.extensions
  const [customOid, setCustomOid] = useState('')

  const knownEku = new Set(EKU_CATALOG.map((e) => e.value))
  const extraOids = ext.extendedKeyUsage.purposes.filter((p) => !knownEku.has(p))

  const summary =
    [
      ext.keyUsage.include && t('new.extSummaryUsages', { n: ext.keyUsage.bits.length }),
      ext.extendedKeyUsage.include &&
        t('new.extSummaryEku', { n: ext.extendedKeyUsage.purposes.length }),
      ext.mustStaple && 'must-staple',
      ext.basicConstraints.ca && 'CA',
    ]
      .filter(Boolean)
      .join(' · ') || t('new.extNone')

  return (
    <Disclosure
      title={t('new.extTitle')}
      hint={t('new.extHint')}
      badge={<Badge tone="bg-inset text-muted">{summary}</Badge>}
    >
      <div className="flex flex-col gap-6">
        {/* keyUsage ------------------------------------------------- */}
        <div>
          <div className="mb-2.5 flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[13px] font-medium">
              {t('new.keyUsageTitle')}
              <Hint text={t('new.keyUsageHelp')} label={t('new.keyUsageTitle')} />
            </span>
            <CriticalToggle
              checked={ext.keyUsage.critical}
              onChange={(v) => patch((d) => void (d.extensions.keyUsage.critical = v))}
              t={t}
            />
          </div>
          <ToggleGrid
            options={KEY_USAGE_CATALOG}
            selected={ext.keyUsage.bits}
            onChange={(next) =>
              patch((d) => {
                d.extensions.keyUsage.bits = next as KeyUsageBit[]
                d.extensions.keyUsage.include = next.length > 0
              })
            }
          />
        </div>

        {/* EKU ------------------------------------------------------ */}
        <div className="border-t border-line pt-5">
          <div className="mb-2.5 flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[13px] font-medium">
              {t('new.ekuTitle')}
              <Hint text={t('new.ekuHelp')} label={t('new.ekuTitle')} />
            </span>
            <CriticalToggle
              checked={ext.extendedKeyUsage.critical}
              onChange={(v) => patch((d) => void (d.extensions.extendedKeyUsage.critical = v))}
              t={t}
            />
          </div>
          <ToggleGrid
            options={EKU_CATALOG}
            selected={ext.extendedKeyUsage.purposes.filter((p) => knownEku.has(p))}
            onChange={(next) =>
              patch((d) => {
                d.extensions.extendedKeyUsage.purposes = [...next, ...extraOids]
                d.extensions.extendedKeyUsage.include = next.length + extraOids.length > 0
              })
            }
          />

          <div className="mt-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] text-subtle">
              {t('new.ekuByOid')}
              <Hint text={t('new.ekuByOidHelp')} />
            </p>
            <div className="flex gap-2">
              <Input
                value={customOid}
                onChange={(e) => setCustomOid(e.target.value)}
                placeholder="1.3.6.1.4.1.311.10.3.12"
                className="h-8.5 text-[13px]"
                spellCheck={false}
              />
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                disabled={!/^\d+(\.\d+)+$/.test(customOid.trim())}
                onClick={() =>
                  patch((d) => {
                    const oid = customOid.trim()
                    if (!d.extensions.extendedKeyUsage.purposes.includes(oid)) {
                      d.extensions.extendedKeyUsage.purposes.push(oid)
                      d.extensions.extendedKeyUsage.include = true
                    }
                    setCustomOid('')
                  })
                }
              >
                {t('common.add')}
              </Button>
            </div>
            {extraOids.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {extraOids.map((oid) => (
                  <Badge key={oid} className="gap-1.5 py-1 font-mono">
                    {oid}
                    <button
                      type="button"
                      onClick={() =>
                        patch((d) => {
                          d.extensions.extendedKeyUsage.purposes =
                            d.extensions.extendedKeyUsage.purposes.filter((p) => p !== oid)
                        })
                      }
                      aria-label={t('common.remove') + ' ' + oid}
                      className="opacity-50 hover:opacity-100"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contraintes ---------------------------------------------- */}
        <div className="flex flex-col border-t border-line pt-5">
          <span className="mb-1.5 text-[13px] font-medium">{t('new.constraintsTitle')}</span>
          <Checkbox
            checked={ext.basicConstraints.ca}
            onChange={(v) =>
              patch((d) => {
                d.extensions.basicConstraints.ca = v
                d.extensions.basicConstraints.critical = v
              })
            }
            tone="danger"
            label={t('new.isCa')}
            hint={t('new.isCaHint')}
            help={t('new.isCaHelp')}
          />
          {ext.basicConstraints.ca && (
            <div className="mt-2 pl-7">
              <Field
                label={t('field.pathLen')}
                htmlFor="pl"
                hint={t('field.pathLen.hint')}
                help={t('field.pathLen.help')}
              >
                <Input
                  id="pl"
                  type="number"
                  min={0}
                  max={10}
                  value={ext.basicConstraints.pathLen ?? ''}
                  onChange={(e) =>
                    patch(
                      (d) =>
                        void (d.extensions.basicConstraints.pathLen =
                          e.target.value === '' ? null : Number(e.target.value)),
                    )
                  }
                  className="w-32"
                />
              </Field>
            </div>
          )}
          <Checkbox
            checked={ext.subjectKeyIdentifier}
            onChange={(v) => patch((d) => void (d.extensions.subjectKeyIdentifier = v))}
            label={t('new.ski')}
            hint={t('new.skiHint')}
            help={t('new.skiHelp')}
          />
          <Checkbox
            checked={ext.mustStaple}
            onChange={(v) => patch((d) => void (d.extensions.mustStaple = v))}
            label={t('new.mustStaple')}
            hint={t('new.mustStapleHint')}
            help={t('new.mustStapleHelp')}
          />
        </div>

        {/* Points de distribution ----------------------------------- */}
        <div className="flex flex-col gap-5 border-t border-line pt-5">
          <Field
            label={t('field.policies')}
            hint={t('field.policies.hint')}
            help={t('field.policies.help')}
          >
            <StringList
              values={ext.certificatePolicies}
              onChange={(next) => patch((d) => void (d.extensions.certificatePolicies = next))}
              placeholder="2.23.140.1.2.2"
            />
          </Field>
          <Field label={t('field.crl')} hint={t('field.crl.hint')} help={t('field.crl.help')}>
            <StringList
              values={ext.crlDistributionPoints}
              onChange={(next) => patch((d) => void (d.extensions.crlDistributionPoints = next))}
              placeholder="http://crl.exemple.fr/ca.crl"
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('field.ocsp')} help={t('field.ocsp.help')}>
              <StringList
                values={ext.authorityInfoAccess.ocsp}
                onChange={(next) => patch((d) => void (d.extensions.authorityInfoAccess.ocsp = next))}
                placeholder="http://ocsp.exemple.fr"
              />
            </Field>
            <Field label={t('field.caIssuers')} help={t('field.caIssuers.help')}>
              <StringList
                values={ext.authorityInfoAccess.caIssuers}
                onChange={(next) =>
                  patch((d) => void (d.extensions.authorityInfoAccess.caIssuers = next))
                }
                placeholder="http://ca.exemple.fr/ca.crt"
              />
            </Field>
          </div>
        </div>

        {/* Extensions libres ---------------------------------------- */}
        <div className="border-t border-line pt-5">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium">
            {t('new.customExtTitle')}
            <Hint text={t('new.customExtHelp')} label={t('new.customExtTitle')} />
          </p>
          <p className="mb-2.5 text-[12px] text-subtle">{t('new.customExtDesc')}</p>
          {ext.custom.map((c, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <Input
                value={c.name}
                onChange={(e) => patch((d) => void (d.extensions.custom[i]!.name = e.target.value))}
                placeholder="nsComment"
                className="h-8.5 w-48 shrink-0 text-[13px]"
                spellCheck={false}
              />
              <Input
                value={c.value}
                onChange={(e) => patch((d) => void (d.extensions.custom[i]!.value = e.target.value))}
                placeholder="valeur"
                className="h-8.5 text-[13px]"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() =>
                  patch((d) => void (d.extensions.custom = d.extensions.custom.filter((_, j) => j !== i)))
                }
                aria-label={t('common.remove')}
                className="shrink-0 rounded-md p-1.5 text-subtle hover:text-danger"
              >
                ×
              </button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              patch((d) => void d.extensions.custom.push({ name: '', value: '', critical: false }))
            }
          >
            {t('new.customExtAdd')}
          </Button>
        </div>
      </div>
    </Disclosure>
  )
}

function CriticalToggle({
  checked,
  onChange,
  t,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  t: Translate
}) {
  return (
    <span className="flex items-center gap-1.5">
      <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-subtle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="size-3.5 accent-[var(--accent)]"
        />
        {t('new.critical')}
      </label>
      <Hint text={t('new.criticalHelp')} label={t('new.critical')} />
    </span>
  )
}

// ---------------------------------------------------------------------------

function PkiSection({ req, patch, t }: SectionProps) {
  return (
    <Disclosure title={t('new.attrsTitle')} hint={t('new.attrsHint')}>
      <div className="flex flex-col gap-5">
        <Field
          label={t('field.challengePassword')}
          htmlFor="cp"
          hint={t('field.challengePassword.hint')}
          help={t('field.challengePassword.help')}
        >
          <Input
            id="cp"
            value={req.attributes.challengePassword}
            onChange={(e) => patch((d) => void (d.attributes.challengePassword = e.target.value))}
            autoComplete="off"
          />
        </Field>
        <Field
          label={t('field.unstructuredName')}
          htmlFor="un"
          hint={t('field.unstructuredName.hint')}
          help={t('field.unstructuredName.help')}
        >
          <Input
            id="un"
            value={req.attributes.unstructuredName}
            onChange={(e) => patch((d) => void (d.attributes.unstructuredName = e.target.value))}
          />
        </Field>
        <Field
          label={t('field.stringMask')}
          htmlFor="sm"
          hint={t('field.stringMask.hint')}
          help={t('field.stringMask.help')}
        >
          <Select
            id="sm"
            value={req.stringMask}
            onChange={(e) => patch((d) => void (d.stringMask = e.target.value as CsrRequest['stringMask']))}
          >
            <option value="utf8only">utf8only</option>
            <option value="pkix">pkix</option>
            <option value="nombstr">nombstr</option>
            <option value="default">default</option>
          </Select>
        </Field>
      </div>
    </Disclosure>
  )
}

// ---------------------------------------------------------------------------
// Apercu
// ---------------------------------------------------------------------------

function PreviewPanel({
  preview,
  name,
  started,
  t,
}: {
  preview: CsrPreview | null
  name: string
  started: boolean
  t: Translate
}) {
  const [tab, setTab] = useState<'config' | 'command'>('config')

  // Avant la premiere saisie, un formulaire vide n'est pas une erreur.
  const warnings = started ? (preview?.warnings ?? []) : []
  const errors = warnings.filter((w) => w.level === 'error')
  const warns = warnings.filter((w) => w.level === 'warn')
  const infos = warnings.filter((w) => w.level === 'info')

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 lg:sticky lg:top-6 lg:w-[21rem]">
      {!started && (
        <Card className="px-4 py-3 text-[12px] text-subtle leading-relaxed">
          {t('new.previewIdle')}
        </Card>
      )}

      {errors.length + warns.length + infos.length > 0 && (
        <Card className="flex flex-col gap-2 p-4">
          {errors.map((w, i) => (
            <Note key={'e' + i} tone="error">
              {w.message}
            </Note>
          ))}
          {warns.map((w, i) => (
            <Note key={'w' + i} tone="warn">
              {w.message}
            </Note>
          ))}
          {infos.map((w, i) => (
            <Note key={'i' + i} tone="info">
              {w.message}
            </Note>
          ))}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center gap-0.5 border-b border-line px-2 py-2">
          <PreviewTab active={tab === 'config'} onClick={() => setTab('config')}>
            {t('new.previewConfig')}
          </PreviewTab>
          <PreviewTab active={tab === 'command'} onClick={() => setTab('command')}>
            {t('new.previewCommands')}
          </PreviewTab>
          <span className="ml-auto truncate pr-1 text-[11px] text-subtle">
            {name || t('new.previewUnnamed')}
          </span>
        </div>
        <pre className="max-h-[26rem] overflow-auto bg-sunken p-3.5 font-mono text-[11px] leading-[1.6] text-muted selectable">
          {tab === 'config' ? preview?.config || '…' : preview?.command || '…'}
        </pre>
      </Card>

      <p className="px-1 text-[11.5px] text-subtle leading-relaxed">{t('new.previewFooter')}</p>
    </aside>
  )
}

function PreviewTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
        active ? 'bg-inset text-ink' : 'text-subtle hover:text-muted',
      )}
    >
      {children}
    </button>
  )
}

function Note({ tone, children }: { tone: 'error' | 'warn' | 'info'; children: ReactNode }) {
  const style = {
    error: {
      cls: 'border-danger/30 bg-danger-soft text-danger',
      icon: <ShieldAlert className="size-3.5" />,
    },
    warn: {
      cls: 'border-warn/30 bg-warn-soft text-warn',
      icon: <TriangleAlert className="size-3.5" />,
    },
    info: { cls: 'border-info/25 bg-info-soft text-info', icon: <Info className="size-3.5" /> },
  }[tone]

  return (
    <div
      className={cx(
        'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12px] leading-relaxed',
        style.cls,
      )}
    >
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <span className="min-w-0 selectable">{children}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Resultat
// ---------------------------------------------------------------------------

function CsrReady({ result, navigate }: { result: CsrResult; navigate: (r: Route) => void }) {
  const t = useT()
  const toast = useToast()
  const system = useSystem()
  const [copied, setCopied] = useState(false)
  const [showText, setShowText] = useState(false)

  const copy = async () => {
    await api.system.copy(result.csrPem)
    setCopied(true)
    toast('success', t('new.toastCopied'))
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <PageHeader
        title={result.name}
        description={t('new.readyDesc')}
        back={<BackLink label={t('new.backToList')} onClick={() => navigate({ name: 'list' })} />}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate({ name: 'detail', fqdn: result.name })}
          >
            {t('new.readyFollow')}
          </Button>
        }
      />

      <PageBody>
        {/* Ou est le fichier, et comment l'atteindre. C'est la question que
            se pose tout le monde a cet instant. */}
        <Card className="border-accent/35 bg-accent-soft p-5" data-testid="csr-file-card">
          <div className="flex items-start gap-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-accent">{t('new.readyWhere')}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                {t('new.readyWhereDesc')}
              </p>
              <p className="mt-2 break-all font-mono text-[12px] text-ink selectable">
                {result.csrPath}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => void copy()}
              icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            >
              {copied ? t('common.copied') : t('new.readyCopy')}
            </Button>
            <Button
              icon={<FileText className="size-4" />}
              onClick={() => system.reveal(result.csrPath)}
            >
              {t('new.revealCsr')}
            </Button>
            <Button
              icon={<FolderOpen className="size-4" />}
              onClick={() => system.openDir(result.dir)}
            >
              {t('common.openFolder')}
            </Button>
          </div>
        </Card>

        <Card className="flex items-start gap-3 border-ok/30 bg-ok-soft p-4">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-ok" />
          <div className="min-w-0 flex-1 text-[13px] text-ok">
            <p className="font-medium">{t('new.readyKey', { desc: result.keyDesc })}</p>
            <p className="mt-0.5 break-all opacity-90 selectable">{result.keyPath}</p>
            <p className="mt-1.5 opacity-90">{t('new.readyKeyWarn')}</p>
            {/* Une cle perdue entre l'envoi et le retour de la PKI rend le
                certificat signe inutilisable, et rien ne le disait. */}
            <p className="mt-1.5 font-medium">{t('new.readyKeyBackup')}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0"
            onClick={() => system.reveal(result.keyPath)}
          >
            {t('new.revealKey')}
          </Button>
        </Card>

        <section>
          <SectionTitle
            aside={
              <Button
                size="sm"
                onClick={() => void copy()}
                icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              >
                {copied ? t('common.copied') : t('new.readyCopy')}
              </Button>
            }
          >
            {t('new.readyTitle')}
          </SectionTitle>
          <Card className="overflow-hidden">
            <pre className="max-h-72 overflow-auto bg-sunken p-4 font-mono text-[11.5px] leading-[1.55] text-muted selectable">
              {result.csrPem.trim()}
            </pre>
          </Card>
        </section>

        <section>
          <SectionTitle
            aside={
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setShowText((v) => !v)}>
                  {showText ? t('new.readyHideDetail') : t('new.readyShowDetail')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<FolderOpen className="size-3.5" />}
                  onClick={() => system.openDir(result.dir)}
                >
                  {t('common.openFolder')}
                </Button>
              </div>
            }
          >
            {t('new.readyRequested')}
          </SectionTitle>
          <Card className="overflow-hidden">
            <div className="p-5">
              <Rows>
                <Row label={t('label.subject')}>{result.subject}</Row>
                <Row label={t('label.san')}>{result.sans.join(', ') || t('common.none')}</Row>
                <Row label={t('label.privateKey')}>{result.keyPath}</Row>
                <Row label={t('label.csr')}>{result.csrPath}</Row>
                <Row label={t('label.config')}>{result.cnfPath}</Row>
                <Row label={t('label.signedDir')}>{result.signedDir}</Row>
              </Rows>
            </div>
            {showText && (
              <pre className="max-h-96 overflow-auto border-t border-line bg-sunken p-4 font-mono text-[11px] leading-[1.55] text-muted selectable">
                {result.text}
              </pre>
            )}
          </Card>
        </section>
      </PageBody>
    </>
  )
}

export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="mb-3 flex items-center gap-1.5 text-[13px] text-subtle transition-colors hover:text-ink"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </button>
  )
}
