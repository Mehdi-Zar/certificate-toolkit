/**
 * Etape 1 : le choix d'un modele, puis la demande, puis la CSR produite.
 *
 * Le formulaire tient en deux niveaux. Par defaut on ne voit que ce qui change
 * d'une demande a l'autre — le nom, les noms alternatifs, l'organisation ; le
 * mode avance ouvre chaque extension X.509. Dans les deux cas un apercu montre
 * en direct la configuration qui sera passee a openssl et les incoherences
 * detectees.
 */
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  CreditCard,
  FileSignature,
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
import {
  CATEGORY_LABEL,
  EKU_CATALOG,
  KEY_USAGE_CATALOG,
  TEMPLATES,
  extensionsFromTemplate,
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
  Settings,
  Warning,
} from '../../shared/types.ts'
import type { Route } from '../App.tsx'
import { Disclosure, SanEditor, StringList, ToggleGrid } from '../components/fields.tsx'
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
import { useApp } from '../lib/store.tsx'

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

function blankRequest(template: Template, settings: Settings | null): CsrRequest {
  return {
    name: '',
    templateId: template.id,
    subject: {
      commonName: '',
      country: settings?.defaults.country ?? 'FR',
      state: settings?.defaults.state ?? '',
      locality: settings?.defaults.locality ?? '',
      org: settings?.defaults.org ?? '',
      ous: settings?.defaults.ou ? [settings.defaults.ou] : [],
      email: settings?.defaults.email ?? '',
      serialNumber: '',
      businessCategory: '',
      domainComponents: [],
      uid: '',
      street: '',
      postalCode: '',
      title: '',
      givenName: '',
      surname: '',
    },
    sans: [],
    key: {
      algorithm: template.key.algorithm,
      bits: template.key.bits,
      curve: template.key.curve,
      mldsaLevel: '65',
      encrypt: false,
      passphrase: '',
    },
    digest: template.digest,
    extensions: extensionsFromTemplate(template),
    attributes: { challengePassword: '', unstructuredName: '' },
    stringMask: 'utf8only',
    force: false,
  }
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
  const categories = useMemo(() => {
    const map = new Map<TemplateCategory, Template[]>()
    for (const t of TEMPLATES) {
      const list = map.get(t.category) ?? []
      list.push(t)
      map.set(t.category, list)
    }
    return [...map.entries()]
  }, [])

  return (
    <>
      <PageHeader
        title="A quoi servira ce certificat ?"
        description="Choisissez l’usage : les extensions X.509 correspondantes seront pre-remplies. Tout reste modifiable ensuite."
        back={<BackLink label="Certificats" onClick={() => navigate({ name: 'list' })} />}
      />
      <PageBody>
        {categories.map(([category, list]) => (
          <section key={category}>
            <SectionTitle>{CATEGORY_LABEL[category]}</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onPick(t.id)}
                  className={cx(
                    'group flex gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-4 text-left',
                    'transition-colors hover:border-accent/45 hover:bg-accent-soft/35',
                  )}
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-inset text-muted transition-colors group-hover:bg-accent group-hover:text-accent-fg">
                    {ICONS[t.icon] ?? <ShieldCheck className="size-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium">{t.label}</span>
                    <span className="mt-0.5 block text-[12px] text-subtle leading-relaxed">{t.pitch}</span>
                  </span>
                </button>
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
  const toast = useToast()
  const template = getTemplate(templateId)

  const [req, setReq] = useState<CsrRequest>(() => blankRequest(template, settings))
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
        ous: c.subject.ous.length > 0 ? c.subject.ous : settings.defaults.ou ? [settings.defaults.ou] : [],
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
  const canSubmit = errors.length === 0 && !!req.subject.commonName.trim() && !!probe?.available

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await unwrap(api.csr.generate(req))
      toast('success', 'CSR generee pour ' + res.name)
      await refresh()
      onDone(res)
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  const started = req.subject.commonName.trim().length > 0
  const implicitSan = started && template.cnAsSan ? guessSan(req.subject.commonName) : null
  const isRsa = req.key.algorithm === 'rsa' || req.key.algorithm === 'rsa-pss'

  return (
    <>
      <PageHeader
        title={template.label}
        description={template.detail}
        back={<BackLink label="Changer de modele" onClick={onBack} />}
        actions={
          <div className="flex items-center gap-0.5 rounded-lg bg-inset p-0.5">
            <ModeTab active={!advanced} onClick={() => setAdvanced(false)}>
              Simple
            </ModeTab>
            <ModeTab active={advanced} onClick={() => setAdvanced(true)}>
              Avance
            </ModeTab>
          </div>
        }
      />

      <div className="flex flex-col gap-6 px-8 pb-12 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {error && <ErrorBanner>{error}</ErrorBanner>}

          {template.notes.map((n) => (
            <Note key={n} tone="info">
              {n}
            </Note>
          ))}

          {/* ---------------------------------------------------------- */}
          <Card className="flex flex-col gap-5 p-5">
            <Field
              label={template.commonNameLabel}
              htmlFor="cn"
              hint={
                template.cnAsSan
                  ? 'Devient automatiquement le premier nom alternatif.'
                  : 'Le nom du titulaire. Il n’est pas ajoute aux noms alternatifs pour ce modele.'
              }
            >
              <Input
                id="cn"
                value={req.subject.commonName}
                onChange={(e) => patch((d) => void (d.subject.commonName = e.target.value))}
                placeholder={template.commonNamePlaceholder}
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
            </Field>

            <Field
              label="Noms alternatifs (SAN)"
              hint={template.sanHint}
              // Tant que rien n'est saisi, on n'a rien a reprocher.
              error={started ? (errors.find((e) => e.field === 'sans')?.message ?? null) : null}
            >
              <SanEditor
                sans={req.sans}
                onChange={(next) => patch((d) => void (d.sans = next))}
                allowed={advanced ? ['DNS', 'IP', 'email', 'URI', 'UPN', 'RID', 'otherName'] : template.sanTypes}
                guess={guessSan}
                implicit={implicitSan}
              />
            </Field>

            {advanced && (
              <Field
                label="Nom du dossier de travail"
                htmlFor="name"
                hint="Sert de nom de dossier et de prefixe aux fichiers. Derive du nom ci-dessus par defaut."
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

          {/* ---------------------------------------------------------- */}
          <SubjectSection req={req} patch={patch} advanced={advanced} errors={errors} />

          {/* ---------------------------------------------------------- */}
          <KeySection req={req} patch={patch} advanced={advanced} caps={caps} isRsa={isRsa} errors={errors} />

          {/* ---------------------------------------------------------- */}
          {advanced && <ExtensionsSection req={req} patch={patch} />}
          {advanced && <PkiSection req={req} patch={patch} />}

          <Card className="p-5">
            <Checkbox
              checked={req.force}
              onChange={(v) => patch((d) => void (d.force = v))}
              tone="danger"
              label="Ecraser une cle privee existante"
              hint="Si une CSR est deja partie chez la PKI, le certificat a venir deviendra inutilisable."
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
              Generer la cle et la CSR
            </Button>
            <Button variant="ghost" onClick={() => navigate({ name: 'list' })}>
              Annuler
            </Button>
          </div>
        </div>

        <PreviewPanel preview={preview} name={req.name} started={started} />
      </div>
    </>
  )
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
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

function SubjectSection({
  req,
  patch,
  advanced,
  errors,
}: {
  req: CsrRequest
  patch: Patch
  advanced: boolean
  errors: Warning[]
}) {
  const s = req.subject
  const body = (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Pays (C)" htmlFor="c" error={errors.find((e) => e.field === 'country')?.message ?? null}>
          <Input id="c" maxLength={2} value={s.country} onChange={(e) => patch((d) => void (d.subject.country = e.target.value.toUpperCase()))} />
        </Field>
        <Field label="Organisation (O)" htmlFor="o">
          <Input id="o" value={s.org} onChange={(e) => patch((d) => void (d.subject.org = e.target.value))} />
        </Field>
      </div>

      <Field label="Unites d’organisation (OU)" hint="Repetable : une ligne par niveau hierarchique.">
        <StringList
          values={s.ous}
          onChange={(next) => patch((d) => void (d.subject.ous = next))}
          placeholder="Direction des systemes d’information"
        />
      </Field>

      <Field label="Email" htmlFor="mail" hint="Dans le DN. Pour du S/MIME, c’est le SAN email qui compte.">
        <Input id="mail" type="email" value={s.email} onChange={(e) => patch((d) => void (d.subject.email = e.target.value))} />
      </Field>

      {advanced && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Region / Etat (ST)" htmlFor="st">
              <Input id="st" value={s.state} onChange={(e) => patch((d) => void (d.subject.state = e.target.value))} />
            </Field>
            <Field label="Ville (L)" htmlFor="l">
              <Input id="l" value={s.locality} onChange={(e) => patch((d) => void (d.subject.locality = e.target.value))} />
            </Field>
            <Field label="Rue" htmlFor="street">
              <Input id="street" value={s.street} onChange={(e) => patch((d) => void (d.subject.street = e.target.value))} />
            </Field>
            <Field label="Code postal" htmlFor="pc">
              <Input id="pc" value={s.postalCode} onChange={(e) => patch((d) => void (d.subject.postalCode = e.target.value))} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Prenom" htmlFor="gn">
              <Input id="gn" value={s.givenName} onChange={(e) => patch((d) => void (d.subject.givenName = e.target.value))} />
            </Field>
            <Field label="Nom de famille" htmlFor="sn">
              <Input id="sn" value={s.surname} onChange={(e) => patch((d) => void (d.subject.surname = e.target.value))} />
            </Field>
            <Field label="Fonction" htmlFor="ti">
              <Input id="ti" value={s.title} onChange={(e) => patch((d) => void (d.subject.title = e.target.value))} />
            </Field>
            <Field label="Identifiant (UID)" htmlFor="uid">
              <Input id="uid" value={s.uid} onChange={(e) => patch((d) => void (d.subject.uid = e.target.value))} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Numero de serie" htmlFor="serial" hint="Identifiant unique impose par certaines PKI.">
              <Input id="serial" value={s.serialNumber} onChange={(e) => patch((d) => void (d.subject.serialNumber = e.target.value))} />
            </Field>
            <Field label="Categorie d’entreprise" htmlFor="bc" hint="Certificats a validation etendue (EV).">
              <Input id="bc" value={s.businessCategory} onChange={(e) => patch((d) => void (d.subject.businessCategory = e.target.value))} />
            </Field>
          </div>

          <Field label="Composants de domaine (DC)" hint="Style annuaire : « exemple », « fr » donne DC=exemple,DC=fr.">
            <StringList
              values={s.domainComponents}
              onChange={(next) => patch((d) => void (d.subject.domainComponents = next))}
              placeholder="exemple"
            />
          </Field>
        </>
      )}
    </div>
  )

  return advanced ? (
    <Disclosure title="Sujet du certificat" hint="Qui demande ce certificat (le DN)." defaultOpen>
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
}: {
  req: CsrRequest
  patch: Patch
  advanced: boolean
  caps: Capabilities | null
  isRsa: boolean
  errors: Warning[]
}) {
  const algorithms: Array<{ value: KeyAlgorithm; label: string; available: boolean }> = [
    { value: 'rsa', label: 'RSA', available: true },
    { value: 'ec', label: 'EC (courbe elliptique)', available: true },
    { value: 'rsa-pss', label: 'RSA-PSS', available: caps?.rsaPss ?? false },
    { value: 'ed25519', label: 'Ed25519', available: caps?.ed25519 ?? false },
    { value: 'ed448', label: 'Ed448', available: caps?.ed448 ?? false },
    { value: 'ml-dsa', label: 'ML-DSA (post-quantique)', available: caps?.mldsa ?? false },
  ]
  const digests: Digest[] = caps?.sha3
    ? ['sha256', 'sha384', 'sha512', 'sha3-256', 'sha3-384', 'sha3-512']
    : ['sha256', 'sha384', 'sha512']
  const noDigest = ['ed25519', 'ed448', 'ml-dsa'].includes(req.key.algorithm)

  const body = (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Type de cle" htmlFor="alg">
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
          <Field label="Taille" htmlFor="bits" hint="2048 suffit partout ; 3072 pour la signature de code." error={errors.find((e) => e.field === 'key')?.message ?? null}>
            <Select id="bits" value={req.key.bits} onChange={(e) => patch((d) => void (d.key.bits = Number(e.target.value)))}>
              {[2048, 3072, 4096, 8192].map((b) => (
                <option key={b} value={b}>
                  {b} bits
                </option>
              ))}
            </Select>
          </Field>
        )}

        {req.key.algorithm === 'ec' && (
          <Field label="Courbe" htmlFor="curve" hint="prime256v1 est le choix universel.">
            <Select id="curve" value={req.key.curve} onChange={(e) => patch((d) => void (d.key.curve = e.target.value))}>
              {(caps?.curves ?? ['prime256v1']).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {req.key.algorithm === 'ml-dsa' && (
          <Field label="Niveau" htmlFor="ml" hint="65 correspond a la robustesse d’AES-192.">
            <Select id="ml" value={req.key.mldsaLevel} onChange={(e) => patch((d) => void (d.key.mldsaLevel = e.target.value as '44' | '65' | '87'))}>
              <option value="44">ML-DSA-44</option>
              <option value="65">ML-DSA-65</option>
              <option value="87">ML-DSA-87</option>
            </Select>
          </Field>
        )}

        {advanced && !noDigest && (
          <Field label="Empreinte de signature" htmlFor="dg">
            <Select id="dg" value={req.digest} onChange={(e) => patch((d) => void (d.digest = e.target.value as Digest))}>
              {digests.map((d) => (
                <option key={d} value={d}>
                  {d.toUpperCase().replace('SHA3-', 'SHA3-')}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {noDigest && (
        <Note tone="info">
          {req.key.algorithm === 'ml-dsa' ? 'ML-DSA' : 'Cet algorithme'} choisit lui-meme son empreinte : le
          reglage ne s’applique pas.
        </Note>
      )}

      <div className="border-t border-line pt-1">
        <Checkbox
          checked={req.key.encrypt}
          onChange={(v) => patch((d) => void (d.key.encrypt = v))}
          label="Chiffrer la cle privee sur le disque"
          hint="AES-256. La phrase secrete sera demandee a chaque usage de la cle, y compris pour assembler le PFX."
        />
        {req.key.encrypt && (
          <div className="mt-3 pl-7">
            <Field label="Phrase secrete" htmlFor="pp" error={errors.find((e) => e.field === 'passphrase')?.message ?? null}>
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
    <Disclosure title="Cle privee" hint="Algorithme, taille et protection au repos." defaultOpen>
      {body}
    </Disclosure>
  ) : (
    <Card className="p-5">{body}</Card>
  )
}

// ---------------------------------------------------------------------------

function ExtensionsSection({ req, patch }: { req: CsrRequest; patch: Patch }) {
  const ext = req.extensions
  const [customOid, setCustomOid] = useState('')

  const knownEku = new Set(EKU_CATALOG.map((e) => e.value))
  const extraOids = ext.extendedKeyUsage.purposes.filter((p) => !knownEku.has(p))

  return (
    <Disclosure
      title="Extensions X.509"
      hint="Ce que le certificat aura le droit de faire."
      badge={
        <Badge tone="bg-inset text-muted">
          {[
            ext.keyUsage.include && ext.keyUsage.bits.length + ' usages',
            ext.extendedKeyUsage.include && ext.extendedKeyUsage.purposes.length + ' etendus',
            ext.mustStaple && 'must-staple',
            ext.basicConstraints.ca && 'CA',
          ]
            .filter(Boolean)
            .join(' · ') || 'aucune'}
        </Badge>
      }
    >
      <div className="flex flex-col gap-6">
        {/* keyUsage ------------------------------------------------- */}
        <div>
          <div className="mb-2.5 flex items-center justify-between gap-4">
            <span className="text-[13px] font-medium">Usages de la cle</span>
            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-subtle">
              <input
                type="checkbox"
                checked={ext.keyUsage.critical}
                onChange={(e) => patch((d) => void (d.extensions.keyUsage.critical = e.target.checked))}
                className="size-3.5 accent-[var(--accent)]"
              />
              critique
            </label>
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
            <span className="text-[13px] font-medium">Usages etendus</span>
            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-subtle">
              <input
                type="checkbox"
                checked={ext.extendedKeyUsage.critical}
                onChange={(e) => patch((d) => void (d.extensions.extendedKeyUsage.critical = e.target.checked))}
                className="size-3.5 accent-[var(--accent)]"
              />
              critique
            </label>
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
            <p className="mb-1.5 text-[12px] text-subtle">Autre usage, par son OID :</p>
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
                Ajouter
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
                      aria-label={'Retirer ' + oid}
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
          <span className="mb-1.5 text-[13px] font-medium">Contraintes</span>
          <Checkbox
            checked={ext.basicConstraints.ca}
            onChange={(v) =>
              patch((d) => {
                d.extensions.basicConstraints.ca = v
                d.extensions.basicConstraints.critical = v
              })
            }
            tone="danger"
            label="Ce certificat est une autorite de certification"
            hint="basicConstraints CA:TRUE. Il pourra signer d’autres certificats."
          />
          {ext.basicConstraints.ca && (
            <div className="mt-2 pl-7">
              <Field label="Profondeur de chaine (pathlen)" htmlFor="pl" hint="0 = cette CA ne peut signer que des certificats finaux. Vide = non contraint.">
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
            label="Identifiant de cle du sujet"
            hint="subjectKeyIdentifier = hash. Recommande, aide au chainage."
          />
          <Checkbox
            checked={ext.mustStaple}
            onChange={(v) => patch((d) => void (d.extensions.mustStaple = v))}
            label="Agrafage OCSP obligatoire"
            hint="Le serveur devra agrafer une reponse OCSP, sinon les navigateurs refuseront la connexion."
          />
        </div>

        {/* Points de distribution ----------------------------------- */}
        <div className="flex flex-col gap-5 border-t border-line pt-5">
          <Field label="Politiques de certification" hint="OID imposes par certaines PKI (ex. 2.23.140.1.2.2).">
            <StringList
              values={ext.certificatePolicies}
              onChange={(next) => patch((d) => void (d.extensions.certificatePolicies = next))}
              placeholder="2.23.140.1.2.2"
            />
          </Field>
          <Field label="Points de distribution de CRL" hint="URL des listes de revocation.">
            <StringList
              values={ext.crlDistributionPoints}
              onChange={(next) => patch((d) => void (d.extensions.crlDistributionPoints = next))}
              placeholder="http://crl.exemple.fr/ca.crl"
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Repondeurs OCSP">
              <StringList
                values={ext.authorityInfoAccess.ocsp}
                onChange={(next) => patch((d) => void (d.extensions.authorityInfoAccess.ocsp = next))}
                placeholder="http://ocsp.exemple.fr"
              />
            </Field>
            <Field label="Certificat de l’emetteur">
              <StringList
                values={ext.authorityInfoAccess.caIssuers}
                onChange={(next) => patch((d) => void (d.extensions.authorityInfoAccess.caIssuers = next))}
                placeholder="http://ca.exemple.fr/ca.crt"
              />
            </Field>
          </div>
        </div>

        {/* Extensions libres ---------------------------------------- */}
        <div className="border-t border-line pt-5">
          <p className="mb-2 text-[13px] font-medium">Extensions libres</p>
          <p className="mb-2.5 text-[12px] text-subtle">
            Ecrites telles quelles dans la section req_ext, pour une extension qu’aucun champ ci-dessus ne couvre.
          </p>
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
                onClick={() => patch((d) => void (d.extensions.custom = d.extensions.custom.filter((_, j) => j !== i)))}
                aria-label="Retirer"
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
            onClick={() => patch((d) => void d.extensions.custom.push({ name: '', value: '', critical: false }))}
          >
            Ajouter une extension
          </Button>
        </div>
      </div>
    </Disclosure>
  )
}

// ---------------------------------------------------------------------------

function PkiSection({ req, patch }: { req: CsrRequest; patch: Patch }) {
  return (
    <Disclosure title="Attributs de la demande" hint="Champs exiges par certaines PKI.">
      <div className="flex flex-col gap-5">
        <Field
          label="Challenge password"
          htmlFor="cp"
          hint="Secret partage avec la PKI, qui permettra plus tard de demander la revocation."
        >
          <Input
            id="cp"
            value={req.attributes.challengePassword}
            onChange={(e) => patch((d) => void (d.attributes.challengePassword = e.target.value))}
            autoComplete="off"
          />
        </Field>
        <Field label="Nom non structure" htmlFor="un" hint="Texte libre transmis a la PKI.">
          <Input
            id="un"
            value={req.attributes.unstructuredName}
            onChange={(e) => patch((d) => void (d.attributes.unstructuredName = e.target.value))}
          />
        </Field>
        <Field
          label="Encodage des chaines"
          htmlFor="sm"
          hint="utf8only convient a toutes les PKI modernes. Ne changez que si la votre le demande."
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
}: {
  preview: CsrPreview | null
  name: string
  started: boolean
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
          Les controles de coherence s’afficheront ici au fur et a mesure de la saisie.
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
            Configuration
          </PreviewTab>
          <PreviewTab active={tab === 'command'} onClick={() => setTab('command')}>
            Commandes
          </PreviewTab>
          <span className="ml-auto truncate pr-1 text-[11px] text-subtle">{name || 'sans nom'}</span>
        </div>
        <pre className="max-h-[26rem] overflow-auto bg-sunken p-3.5 font-mono text-[11px] leading-[1.6] text-muted selectable">
          {tab === 'config' ? preview?.config || '…' : preview?.command || '…'}
        </pre>
      </Card>

      <p className="px-1 text-[11.5px] text-subtle leading-relaxed">
        C’est exactement ce qui sera ecrit dans le fichier de configuration et passe a openssl. Rien
        n’est envoye sur le reseau.
      </p>
    </aside>
  )
}

function PreviewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
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
    error: { cls: 'border-danger/30 bg-danger-soft text-danger', icon: <ShieldAlert className="size-3.5" /> },
    warn: { cls: 'border-warn/30 bg-warn-soft text-warn', icon: <TriangleAlert className="size-3.5" /> },
    info: { cls: 'border-info/25 bg-info-soft text-info', icon: <Info className="size-3.5" /> },
  }[tone]

  return (
    <div className={cx('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12px] leading-relaxed', style.cls)}>
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <span className="min-w-0 selectable">{children}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Resultat
// ---------------------------------------------------------------------------

function CsrReady({ result, navigate }: { result: CsrResult; navigate: (r: Route) => void }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [showText, setShowText] = useState(false)

  const copy = async () => {
    await api.system.copy(result.csrPem)
    setCopied(true)
    toast('success', 'CSR copiee dans le presse-papiers')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <PageHeader
        title={result.name}
        description="La cle privee et la CSR sont ecrites. Envoyez la CSR a la PKI, puis deposez sa reponse."
        back={<BackLink label="Certificats" onClick={() => navigate({ name: 'list' })} />}
        actions={
          <Button variant="primary" size="sm" onClick={() => navigate({ name: 'detail', fqdn: result.name })}>
            Suivre cette demande
          </Button>
        }
      />

      <PageBody>
        <Card className="flex items-start gap-3 border-ok/30 bg-ok-soft p-4">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-ok" />
          <div className="min-w-0 text-[13px] text-ok">
            <p className="font-medium">Cle privee {result.keyDesc} generee.</p>
            <p className="mt-0.5 break-all opacity-90 selectable">{result.keyPath}</p>
            <p className="mt-1.5 opacity-90">
              Elle ne doit jamais quitter ce poste : la PKI n’a besoin que de la CSR.
            </p>
          </div>
        </Card>

        <section>
          <SectionTitle
            aside={
              <Button
                size="sm"
                onClick={() => void copy()}
                icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              >
                {copied ? 'Copiee' : 'Copier la CSR'}
              </Button>
            }
          >
            Demande de signature
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
                  {showText ? 'Masquer le detail' : 'Voir le detail'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<FolderOpen className="size-3.5" />}
                  onClick={() => void api.system.openDir(result.dir)}
                >
                  Ouvrir le dossier
                </Button>
              </div>
            }
          >
            Ce qui a ete demande
          </SectionTitle>
          <Card className="overflow-hidden">
            <div className="p-5">
              <Rows>
                <Row label="Sujet">{result.subject}</Row>
                <Row label="SAN">{result.sans.join(', ') || '(aucun)'}</Row>
                <Row label="Cle privee">{result.keyPath}</Row>
                <Row label="CSR">{result.csrPath}</Row>
                <Row label="Configuration">{result.cnfPath}</Row>
                <Row label="Retours PKI">{result.signedDir}</Row>
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
