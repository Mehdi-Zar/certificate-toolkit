/**
 * Le flux complet pour un FQDN : la CSR, le depot des retours PKI, puis
 * l'assemblage du PFX. Les trois etapes sont visibles en permanence, celle
 * qui attend une action est ouverte.
 */
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  FileCheck2,
  FileDown,
  FolderOpen,
  Inbox,
  Package,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import type { CertEntry, CertInfo, Check as CheckResult, PfxResult } from '../../shared/types.ts'
import type { Route } from '../App.tsx'
import { PageBody, PageHeader } from '../components/PageHeader.tsx'
import { useToast } from '../components/Toast.tsx'
import {
  Badge,
  Button,
  Card,
  Check as Checkbox,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  Row,
  Rows,
  SectionTitle,
  Spinner,
  cx,
} from '../components/ui.tsx'
import { api, message, unwrap } from '../lib/api.ts'
import { STATUS, basename, commonName, expiryLabel, shortDate, wrapFingerprint } from '../lib/format.ts'
import { useApp } from '../lib/store.tsx'
import { BackLink } from './NewRequestPage.tsx'

export function DetailPage({ fqdn, navigate }: { fqdn: string; navigate: (r: Route) => void }) {
  const { refresh } = useApp()
  const [entry, setEntry] = useState<CertEntry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setEntry(await unwrap(api.inventory.entry(fqdn)))
      setError(null)
    } catch (err) {
      setError(message(err))
    } finally {
      setLoading(false)
    }
  }, [fqdn])

  useEffect(() => {
    void reload()
  }, [reload])

  const afterWrite = async () => {
    await reload()
    await refresh()
  }

  if (loading) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner className="size-5" />
      </div>
    )
  }

  if (!entry) {
    return (
      <>
        <PageHeader title={fqdn} back={<BackLink label="Certificats" onClick={() => navigate({ name: 'list' })} />} />
        <PageBody>
          <Card>
            <EmptyState
              icon={<Inbox className="size-5" />}
              title="Dossier introuvable"
              description={error ?? 'Ce FQDN n’a plus de dossier dans la racine de travail.'}
            />
          </Card>
        </PageBody>
      </>
    )
  }

  const style = STATUS[entry.status]

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            {entry.fqdn}
            <Badge tone={style.tone}>{style.label}</Badge>
          </span>
        }
        description={style.hint}
        back={<BackLink label="Certificats" onClick={() => navigate({ name: 'list' })} />}
        actions={
          <Button
            size="sm"
            icon={<FolderOpen className="size-3.5" />}
            onClick={() => void api.system.openDir(entry.dir)}
          >
            Ouvrir le dossier
          </Button>
        }
      />

      <PageBody>
        {error && <ErrorBanner>{error}</ErrorBanner>}

        {entry.cert && <IssuedCert cert={entry.cert} />}

        <StepCsr entry={entry} />
        <StepSigned entry={entry} onChange={afterWrite} />
        <StepPfx entry={entry} onDone={afterWrite} />
      </PageBody>
    </>
  )
}

// ---------------------------------------------------------------------------
// Certificat emis
// ---------------------------------------------------------------------------

function IssuedCert({ cert }: { cert: CertInfo }) {
  const critical = cert.daysRemaining < 0
  const soon = cert.daysRemaining >= 0 && cert.daysRemaining <= 30

  return (
    <Card
      className={cx(
        'p-5',
        critical ? 'border-danger/30 bg-danger-soft' : soon ? 'border-warn/30 bg-warn-soft' : '',
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck
            className={cx('size-4', critical ? 'text-danger' : soon ? 'text-warn' : 'text-ok')}
          />
          <h3 className="font-medium">Certificat en place</h3>
        </div>
        <span
          className={cx(
            'text-[13px] font-medium',
            critical ? 'text-danger' : soon ? 'text-warn' : 'text-muted',
          )}
        >
          {expiryLabel(cert.daysRemaining)}
        </span>
      </div>

      <Rows>
        <Row label="Sujet">{cert.subject}</Row>
        <Row label="Emetteur">{commonName(cert.issuer)}</Row>
        <Row label="Validite">
          {shortDate(cert.notBefore)} — {shortDate(cert.notAfter)}
        </Row>
        <Row label="SAN">{cert.sans.join(', ') || '(aucun)'}</Row>
        <Row label="Usages">{cert.eku.join(', ') || '(aucun)'}</Row>
        <Row label="Cle">{cert.keyDesc}</Row>
        <Row label="Empreinte">
          <span className="font-mono text-[11.5px] whitespace-pre-line">
            {wrapFingerprint(cert.fingerprint)}
          </span>
        </Row>
      </Rows>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Etape 1
// ---------------------------------------------------------------------------

function StepCsr({ entry }: { entry: CertEntry }) {
  const toast = useToast()
  const [pem, setPem] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open || pem !== null || !entry.hasCsr) return
    void unwrap(api.csr.read(entry.fqdn)).then(setPem, () => setPem(''))
  }, [open, pem, entry.fqdn, entry.hasCsr])

  const copy = async () => {
    const text = pem ?? (await unwrap(api.csr.read(entry.fqdn)).catch(() => ''))
    if (!text) return
    setPem(text)
    await api.system.copy(text)
    setCopied(true)
    toast('success', 'CSR copiee dans le presse-papiers')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section>
      <SectionTitle
        aside={
          entry.hasCsr && (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                icon={open ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? 'Masquer' : 'Afficher'}
              </Button>
              <Button
                size="sm"
                icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                onClick={() => void copy()}
              >
                {copied ? 'Copiee' : 'Copier'}
              </Button>
            </div>
          )
        }
      >
        1 · Demande de signature
      </SectionTitle>

      <Card className="overflow-hidden">
        <div className="p-5">
          <Rows>
            <Row label="Cle privee">
              {entry.hasKey ? entry.keyDesc ?? 'presente' : <span className="text-danger">absente</span>}
            </Row>
            <Row label="SAN demandes">{entry.sans.join(', ') || '(inconnus)'}</Row>
          </Rows>
        </div>

        {open && (
          <pre className="max-h-64 overflow-auto border-t border-line bg-sunken p-4 font-mono text-[11.5px] leading-[1.55] text-muted selectable">
            {pem === null ? 'Lecture...' : pem.trim() || 'CSR illisible.'}
          </pre>
        )}
      </Card>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Etape 2
// ---------------------------------------------------------------------------

function StepSigned({ entry, onChange }: { entry: CertEntry; onChange: () => Promise<void> }) {
  const toast = useToast()
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const depth = useRef(0)

  const importFiles = async (paths: string[]) => {
    if (paths.length === 0) return
    setBusy(true)
    try {
      const files = await unwrap(api.signed.importFiles(entry.fqdn, paths))
      toast('success', paths.length + ' fichier(s) depose(s) · ' + files.length + ' au total')
      await onChange()
    } catch (err) {
      toast('error', message(err))
    } finally {
      setBusy(false)
    }
  }

  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    depth.current = 0
    setDragging(false)
    const paths = Array.from(e.dataTransfer.files)
      .map((f) => api.system.pathForFile(f))
      .filter(Boolean)
    if (paths.length === 0) {
      toast('error', 'Impossible de lire le chemin de ces fichiers.')
      return
    }
    await importFiles(paths)
  }

  return (
    <section>
      <SectionTitle
        aside={
          <Button
            size="sm"
            variant="ghost"
            icon={<FolderOpen className="size-3.5" />}
            onClick={() => void api.system.openDir(entry.dir + '/Signed')}
          >
            Ouvrir Signed/
          </Button>
        }
      >
        2 · Retours de la PKI
      </SectionTitle>

      <Card
        onDragEnter={(e) => {
          e.preventDefault()
          depth.current += 1
          setDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault()
          depth.current -= 1
          if (depth.current <= 0) setDragging(false)
        }}
        onDrop={(e) => void onDrop(e)}
        className={cx('transition-colors', dragging && 'border-accent bg-accent-soft')}
      >
        {entry.signedFiles.length === 0 ? (
          <EmptyState
            icon={busy ? <Spinner /> : <Upload className="size-5" />}
            title={dragging ? 'Deposez ici' : 'Aucun fichier recu'}
            description="Glissez les fichiers renvoyes par la PKI, ou selectionnez-les. PEM, CRT, CER, DER et P7B sont acceptes."
            action={
              <Button
                icon={<FileDown className="size-4" />}
                loading={busy}
                onClick={async () => {
                  const picked = await unwrap(api.system.pickFiles('Fichiers renvoyes par la PKI'))
                  await importFiles(picked)
                }}
              >
                Selectionner des fichiers
              </Button>
            }
          />
        ) : (
          <div className="p-2">
            <ul className="flex flex-col gap-0.5">
              {entry.signedFiles.map((file) => (
                <li
                  key={file}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-inset"
                >
                  <FileCheck2 className="size-4 shrink-0 text-ok" />
                  <span className="min-w-0 flex-1 truncate text-[13px] selectable">
                    {basename(file)}
                  </span>
                  <button
                    onClick={() => void api.system.reveal(file)}
                    title="Montrer dans l’explorateur"
                    aria-label="Montrer dans l’explorateur"
                    className="rounded p-1 text-subtle transition-colors hover:text-ink"
                  >
                    <FolderOpen className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-line px-3 pt-2.5 pb-1 mt-1">
              <p className="text-[12px] text-subtle">
                {dragging ? 'Deposez pour ajouter' : 'Glissez d’autres fichiers pour les ajouter.'}
              </p>
              <Button
                size="sm"
                variant="ghost"
                loading={busy}
                icon={<FileDown className="size-3.5" />}
                onClick={async () => {
                  const picked = await unwrap(api.system.pickFiles('Fichiers renvoyes par la PKI'))
                  await importFiles(picked)
                }}
              >
                Ajouter
              </Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Etape 3
// ---------------------------------------------------------------------------

function StepPfx({ entry, onDone }: { entry: CertEntry; onDone: () => Promise<void> }) {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [keyPassword, setKeyPassword] = useState('')
  const [show, setShow] = useState(false)
  const [noPass, setNoPass] = useState(false)
  const [compat, setCompat] = useState(false)
  const [noRoot, setNoRoot] = useState(false)
  const [friendly, setFriendly] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PfxResult | null>(null)

  const ready = entry.signedFiles.length > 0 && entry.hasKey
  const mismatch = !noPass && confirm.length > 0 && password !== confirm
  const canSubmit = ready && (noPass || (password.length > 0 && password === confirm))

  async function run() {
    setBusy(true)
    setError(null)
    try {
      const res = await unwrap(
        api.pfx.make({
          fqdn: entry.fqdn,
          inputs: [],
          chainFiles: [],
          friendlyName: friendly.trim() || entry.fqdn,
          password,
          noPass,
          compat,
          noRoot,
          keyPassword,
        }),
      )
      setResult(res)
      // Le mot de passe ne reste pas en memoire une fois le PFX ecrit.
      setPassword('')
      setConfirm('')
      setKeyPassword('')
      toast('success', 'PFX assemble : ' + basename(res.pfxPath))
      await onDone()
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <SectionTitle>3 · Assemblage du PFX</SectionTitle>

      {!ready ? (
        <Card>
          <EmptyState
            icon={<Package className="size-5" />}
            title="Rien a assembler"
            description={
              entry.hasKey
                ? 'Deposez d’abord les fichiers renvoyes par la PKI a l’etape 2.'
                : 'La cle privee est absente : le PFX ne peut pas etre construit.'
            }
          />
        </Card>
      ) : (
        <Card className="flex flex-col gap-5 p-5">
          {error && <ErrorBanner>{error}</ErrorBanner>}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Mot de passe du PFX"
              htmlFor="pfxpass"
              hint="Il protege la cle privee dans le conteneur. Transmettez-le separement du fichier."
            >
              <div className="relative">
                <Input
                  id="pfxpass"
                  type={show ? 'text' : 'password'}
                  value={password}
                  disabled={noPass}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Masquer' : 'Afficher'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-subtle hover:text-ink"
                >
                  {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </Field>

            <Field
              label="Confirmation"
              htmlFor="pfxpass2"
              error={mismatch ? 'Les deux saisies different.' : null}
            >
              <Input
                id="pfxpass2"
                type={show ? 'text' : 'password'}
                value={confirm}
                disabled={noPass}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </div>

          <details className="group">
            <summary className="cursor-pointer list-none text-[13px] font-medium text-muted transition-colors hover:text-ink">
              <span className="inline-block transition-transform group-open:rotate-90">›</span>{' '}
              Options avancees
            </summary>

            <div className="mt-4 flex flex-col gap-4 border-l-2 border-line pl-4">
              <Field
                label="Nom convivial"
                htmlFor="friendly"
                hint="Nom affiche dans le magasin de certificats Windows."
              >
                <Input
                  id="friendly"
                  value={friendly}
                  onChange={(e) => setFriendly(e.target.value)}
                  placeholder={entry.fqdn}
                />
              </Field>

              <Field
                label="Mot de passe de la cle privee"
                htmlFor="keypass"
                hint="Uniquement si la cle sur disque est chiffree."
              >
                <Input
                  id="keypass"
                  type="password"
                  value={keyPassword}
                  onChange={(e) => setKeyPassword(e.target.value)}
                  autoComplete="off"
                />
              </Field>

              <div className="flex flex-col">
                <Checkbox
                  checked={noPass}
                  onChange={setNoPass}
                  label="PFX sans mot de passe"
                  hint="La cle privee ne sera plus protegee dans le conteneur."
                  tone="danger"
                />
                <Checkbox
                  checked={compat}
                  onChange={setCompat}
                  label="Chiffrement compatible (3DES / SHA-1)"
                  hint="Pour Windows anterieur a 2016, Java 8 et les anciens F5. Moins sur qu’AES-256."
                />
                <Checkbox
                  checked={noRoot}
                  onChange={setNoRoot}
                  label="Exclure la CA racine"
                  hint="La racine est deja dans le magasin de confiance de la plupart des systemes."
                />
              </div>
            </div>
          </details>

          <div className="flex items-center gap-3 border-t border-line pt-5">
            <Button
              variant="primary"
              loading={busy}
              disabled={!canSubmit}
              onClick={() => void run()}
              icon={<Package className="size-4" />}
            >
              Assembler le PFX
            </Button>
            {entry.hasPfx && !result && (
              <p className="text-[12px] text-warn">Un PFX existe deja : il sera remplace.</p>
            )}
          </div>
        </Card>
      )}

      {result && <PfxOutcome result={result} />}
    </section>
  )
}

// ---------------------------------------------------------------------------

function PfxOutcome({ result }: { result: PfxResult }) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 font-medium">
          <ShieldCheck className="size-4 text-ok" />
          Chaine de confiance
        </h3>

        <ol className="flex flex-col">
          <ChainNode label="Certificat serveur" info={result.leaf} tone="text-ok" />
          {result.chain.map((c) => (
            <ChainNode
              key={c.fingerprint}
              label={c.selfSigned ? 'CA racine' : 'CA intermediaire'}
              info={c}
              tone="text-muted"
            />
          ))}
        </ol>

        {result.unused.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-1.5 text-[12px] text-subtle">
              Non utilises ({result.unused.length}) — hors de la chaine de ce certificat :
            </p>
            <ul className="flex flex-col gap-0.5">
              {result.unused.map((c) => (
                <li key={c.fingerprint} className="truncate text-[12px] text-subtle selectable">
                  {commonName(c.subject)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-medium">Controles</h3>
        <ul className="flex flex-col gap-2">
          {result.checks.map((c, i) => (
            <CheckLine key={i} check={c} />
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-medium">Fichiers produits</h3>
        <div className="flex flex-col gap-1">
          <FileLine path={result.pfxPath} label="PKCS#12" primary />
          <FileLine path={result.crtPath} label="Certificat seul" />
          {result.chainPath && <FileLine path={result.chainPath} label="Chaine de CA" />}
          {result.fullchainPath && (
            <FileLine path={result.fullchainPath} label="Feuille + chaine · nginx, HAProxy" />
          )}
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-1.5 text-[12px] text-subtle">Import dans le magasin Windows :</p>
          <code className="block overflow-x-auto rounded-lg bg-sunken p-3 font-mono text-[11.5px] text-muted selectable">
            Import-PfxCertificate -FilePath '{result.pfxPath}' -CertStoreLocation
            Cert:\LocalMachine\My -Password (Read-Host -AsSecureString)
          </code>
        </div>
      </Card>
    </div>
  )
}

function ChainNode({ label, info, tone }: { label: string; info: CertInfo; tone: string }) {
  return (
    <li className="relative pl-6 pb-4 last:pb-0">
      <span className="absolute left-[5px] top-1.5 bottom-0 w-px bg-line last:hidden" aria-hidden />
      <span
        className={cx('absolute left-0 top-1 size-2.5 rounded-full border-2 border-canvas', tone.replace('text-', 'bg-'))}
        aria-hidden
      />
      <p className={cx('text-[11px] font-medium uppercase tracking-wide', tone)}>{label}</p>
      <p className="truncate text-[13px] selectable">{commonName(info.subject)}</p>
      <p className="text-[12px] text-subtle">
        {shortDate(info.notBefore)} — {shortDate(info.notAfter)} · {info.keyDesc}
      </p>
    </li>
  )
}

function CheckLine({ check }: { check: CheckResult }) {
  const tone = {
    ok: { icon: <Check className="size-3.5" />, cls: 'text-ok' },
    warn: { icon: <Trash2 className="hidden" />, cls: 'text-warn' },
    info: { icon: <Trash2 className="hidden" />, cls: 'text-subtle' },
  }[check.level]

  return (
    <li className="flex items-start gap-2.5 text-[13px]">
      <span className={cx('mt-0.5 shrink-0 font-mono text-[13px] leading-none', tone.cls)}>
        {check.level === 'ok' ? '✓' : check.level === 'warn' ? '!' : 'i'}
      </span>
      <span className="min-w-0">
        <span className={cx(check.level === 'warn' ? 'text-warn' : 'text-ink')}>{check.label}</span>
        {check.detail && (
          <span className="block text-[12px] text-subtle selectable break-words">{check.detail}</span>
        )}
      </span>
    </li>
  )
}

function FileLine({ path, label, primary }: { path: string; label: string; primary?: boolean }) {
  return (
    <div
      className={cx(
        'flex items-center gap-3 rounded-lg px-3 py-2',
        primary ? 'bg-accent-soft' : 'hover:bg-inset',
      )}
    >
      <Package className={cx('size-4 shrink-0', primary ? 'text-accent' : 'text-subtle')} />
      <div className="min-w-0 flex-1">
        <p className={cx('truncate text-[13px] selectable', primary && 'font-medium')}>
          {basename(path)}
        </p>
        <p className="truncate text-[11px] text-subtle">{label}</p>
      </div>
      <button
        onClick={() => void api.system.reveal(path)}
        title="Montrer dans l’explorateur"
        aria-label="Montrer dans l’explorateur"
        className="shrink-0 rounded p-1 text-subtle transition-colors hover:text-ink"
      >
        <FolderOpen className="size-3.5" />
      </button>
    </div>
  )
}
