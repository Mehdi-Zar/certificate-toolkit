/**
 * Etape 1 : formulaire de demande, puis la CSR produite, prete a etre copiee
 * vers le portail de la PKI.
 */
import { ArrowLeft, Check, Copy, FolderOpen, KeyRound, Plus, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { CsrRequest, CsrResult, San } from '../../shared/types.ts'
import type { Route } from '../App.tsx'
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

/** Duplique la detection de type de generate-csr.sh, pour l'apercu immediat. */
function guessSan(raw: string): San {
  const value = raw.trim()
  const colon = value.indexOf(':')
  if (colon > 0) {
    const prefix = value.slice(0, colon).toLowerCase()
    const known = { dns: 'DNS', ip: 'IP', email: 'email', uri: 'URI' } as const
    const type = known[prefix as keyof typeof known]
    if (type) return { type, value: value.slice(colon + 1) }
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return { type: 'IP', value }
  if (/^[0-9A-Fa-f:]+$/.test(value) && value.includes(':')) return { type: 'IP', value }
  if (value.includes('@')) return { type: 'email', value }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return { type: 'URI', value }
  return { type: 'DNS', value }
}

export function NewRequestPage({ navigate }: { navigate: (r: Route) => void }) {
  const { settings, refresh, probe } = useApp()
  const toast = useToast()

  const [fqdn, setFqdn] = useState('')
  const [sans, setSans] = useState<San[]>([])
  const [sanDraft, setSanDraft] = useState('')
  const [country, setCountry] = useState('')
  const [org, setOrg] = useState('')
  const [ou, setOu] = useState('')
  const [email, setEmail] = useState('')
  const [keyType, setKeyType] = useState<'rsa' | 'ec'>('rsa')
  const [bits, setBits] = useState(2048)
  const [curve, setCurve] = useState<'P-256' | 'P-384' | 'P-521'>('P-256')
  const [digest, setDigest] = useState<'sha256' | 'sha384' | 'sha512'>('sha256')
  const [force, setForce] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CsrResult | null>(null)

  // Les valeurs par defaut du sujet viennent des reglages.
  useEffect(() => {
    if (!settings) return
    setCountry((c) => c || settings.defaults.country)
    setOrg((c) => c || settings.defaults.org)
    setOu((c) => c || settings.defaults.ou)
    setEmail((c) => c || settings.defaults.email)
  }, [settings])

  const addSan = () => {
    const raw = sanDraft.trim()
    if (!raw) return
    const san = guessSan(raw)
    if (!san.value) return
    setSans((list) =>
      list.some((s) => s.type === san.type && s.value === san.value) ? list : [...list, san],
    )
    setSanDraft('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!fqdn.trim()) {
      setError('Le FQDN est obligatoire.')
      return
    }
    setBusy(true)
    setError(null)

    const req: CsrRequest = {
      fqdn: fqdn.trim(),
      sans,
      country: country.trim(),
      org: org.trim(),
      ou: ou.trim(),
      email: email.trim(),
      keyType,
      bits,
      curve,
      digest,
      force,
    }

    try {
      const res = await unwrap(api.csr.generate(req))
      setResult(res)
      toast('success', 'CSR generee pour ' + res.fqdn)
      await refresh()
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return <CsrReady result={result} navigate={navigate} />
  }

  return (
    <form onSubmit={submit}>
      <PageHeader
        title="Nouvelle demande"
        description="Genere la cle privee et la CSR a envoyer a la PKI. La cle ne quitte jamais ce poste."
        back={<BackLink onClick={() => navigate({ name: 'list' })} />}
      />

      <PageBody>
        {error && <ErrorBanner>{error}</ErrorBanner>}

        {/* ---------------------------------------------------------------- */}
        <section>
          <SectionTitle>Identite</SectionTitle>
          <Card className="flex flex-col gap-5 p-5">
            <Field
              label="FQDN (Common Name)"
              htmlFor="fqdn"
              hint="Devient automatiquement le premier SAN du certificat."
            >
              <Input
                id="fqdn"
                value={fqdn}
                onChange={(e) => setFqdn(e.target.value)}
                placeholder="api.exemple.fr"
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
            </Field>

            <Field
              label="Noms alternatifs (SAN)"
              hint="Un nom DNS, une adresse IP, un email ou une URI. Le type est detecte automatiquement ; forcez-le avec un prefixe (IP:10.0.0.1)."
            >
              <div className="flex gap-2">
                <Input
                  value={sanDraft}
                  onChange={(e) => setSanDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addSan()
                    }
                  }}
                  placeholder="www.exemple.fr"
                  spellCheck={false}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  onClick={addSan}
                  icon={<Plus className="size-4" />}
                  disabled={!sanDraft.trim()}
                >
                  Ajouter
                </Button>
              </div>

              {(fqdn.trim() || sans.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {fqdn.trim() && (
                    <Badge tone="bg-accent-soft text-accent" className="gap-1.5 py-1">
                      <span className="opacity-70">{guessSan(fqdn).type}</span>
                      {guessSan(fqdn).value}
                      <span className="opacity-60">· CN</span>
                    </Badge>
                  )}
                  {sans.map((san, i) => (
                    <Badge key={san.type + san.value} className="gap-1.5 py-1">
                      <span className="opacity-60">{san.type}</span>
                      {san.value}
                      <button
                        type="button"
                        onClick={() => setSans((l) => l.filter((_, j) => j !== i))}
                        aria-label={'Retirer ' + san.value}
                        className="ml-0.5 rounded opacity-50 transition-opacity hover:opacity-100"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </Field>
          </Card>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section>
          <SectionTitle>Sujet du certificat</SectionTitle>
          <Card className="grid gap-5 p-5 sm:grid-cols-2">
            <Field label="Pays (C)" htmlFor="c">
              <Input id="c" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2} />
            </Field>
            <Field label="Organisation (O)" htmlFor="o">
              <Input id="o" value={org} onChange={(e) => setOrg(e.target.value)} />
            </Field>
            <Field label="Unite (OU)" htmlFor="ou">
              <Input id="ou" value={ou} onChange={(e) => setOu(e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="mail" hint="Laissez vide pour ne pas l’inclure dans le DN.">
              <Input id="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </Card>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section>
          <SectionTitle>Cryptographie</SectionTitle>
          <Card className="flex flex-col gap-5 p-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Type de cle" htmlFor="kt">
                <Select
                  id="kt"
                  value={keyType}
                  onChange={(e) => setKeyType(e.target.value as 'rsa' | 'ec')}
                >
                  <option value="rsa">RSA</option>
                  <option value="ec">EC (courbe elliptique)</option>
                </Select>
              </Field>

              {keyType === 'rsa' ? (
                <Field label="Taille" htmlFor="bits" hint="2048 suffit pour la plupart des PKI.">
                  <Select id="bits" value={bits} onChange={(e) => setBits(Number(e.target.value))}>
                    <option value={2048}>2048 bits</option>
                    <option value={3072}>3072 bits</option>
                    <option value={4096}>4096 bits</option>
                  </Select>
                </Field>
              ) : (
                <Field label="Courbe" htmlFor="curve">
                  <Select
                    id="curve"
                    value={curve}
                    onChange={(e) => setCurve(e.target.value as typeof curve)}
                  >
                    <option value="P-256">P-256</option>
                    <option value="P-384">P-384</option>
                    <option value="P-521">P-521</option>
                  </Select>
                </Field>
              )}

              <Field label="Empreinte de signature" htmlFor="digest">
                <Select
                  id="digest"
                  value={digest}
                  onChange={(e) => setDigest(e.target.value as typeof digest)}
                >
                  <option value="sha256">SHA-256</option>
                  <option value="sha384">SHA-384</option>
                  <option value="sha512">SHA-512</option>
                </Select>
              </Field>
            </div>

            <div className="border-t border-line pt-1">
              <Checkbox
                checked={force}
                onChange={setForce}
                tone="danger"
                label="Ecraser une cle privee existante"
                hint="Si une CSR est deja partie chez la PKI, le certificat a venir deviendra inutilisable."
              />
            </div>
          </Card>
        </section>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            loading={busy}
            disabled={!fqdn.trim() || !probe?.available}
            icon={<Sparkles className="size-4" />}
          >
            Generer la cle et la CSR
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate({ name: 'list' })}>
            Annuler
          </Button>
        </div>
      </PageBody>
    </form>
  )
}

// ---------------------------------------------------------------------------

function CsrReady({ result, navigate }: { result: CsrResult; navigate: (r: Route) => void }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await api.system.copy(result.csrPem)
    setCopied(true)
    toast('success', 'CSR copiee dans le presse-papiers')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <PageHeader
        title={result.fqdn}
        description="La cle privee et la CSR sont ecrites. Envoyez la CSR a la PKI, puis deposez sa reponse."
        back={<BackLink onClick={() => navigate({ name: 'list' })} />}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate({ name: 'detail', fqdn: result.fqdn })}
          >
            Suivre cette demande
          </Button>
        }
      />

      <PageBody>
        <Card className="flex items-start gap-3 border-ok/30 bg-ok-soft p-4">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-ok" />
          <div className="min-w-0 text-[13px] text-ok">
            <p className="font-medium">Cle privee {result.keyDesc} generee.</p>
            <p className="mt-0.5 opacity-90 selectable break-all">{result.keyPath}</p>
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
            <pre
              className={cx(
                'max-h-72 overflow-auto bg-sunken p-4 font-mono text-[11.5px] leading-[1.55]',
                'text-muted selectable',
              )}
            >
              {result.csrPem.trim()}
            </pre>
          </Card>
        </section>

        <section>
          <SectionTitle
            aside={
              <Button
                size="sm"
                variant="ghost"
                icon={<FolderOpen className="size-3.5" />}
                onClick={() => void api.system.openDir(result.dir)}
              >
                Ouvrir le dossier
              </Button>
            }
          >
            Fichiers produits
          </SectionTitle>
          <Card className="p-5">
            <Rows>
              <Row label="Sujet">{result.subject}</Row>
              <Row label="SAN">{result.sans.join(', ')}</Row>
              <Row label="Cle privee">{result.keyPath}</Row>
              <Row label="CSR">{result.csrPath}</Row>
              <Row label="Configuration">{result.cnfPath}</Row>
              <Row label="Retours PKI">{result.signedDir}</Row>
            </Rows>
          </Card>
        </section>
      </PageBody>
    </>
  )
}

export function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="mb-3 flex items-center gap-1.5 text-[13px] text-subtle transition-colors hover:text-ink"
    >
      <ArrowLeft className="size-3.5" />
      Certificats
    </button>
  )
}
