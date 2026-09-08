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
import { FlowStepper } from '../components/FlowStepper.tsx'
import { FormatTable } from '../components/FormatTable.tsx'
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
import type { Lang, Translate } from '../../shared/i18n/index.ts'
import {
  STATUS_TONE,
  basename,
  commonName,
  expiryLabel,
  shortDate,
  statusHintKey,
  statusLabelKey,
  wrapFingerprint,
} from '../lib/format.ts'
import { useApp, useT } from '../lib/store.tsx'
import { useSystem } from '../lib/system.ts'
import { BackLink } from './NewRequestPage.tsx'

/**
 * Les fichiers d'une demande deja assemblee. Sans ce bloc, quelqu'un qui
 * revient le lendemain ne retrouve plus ce qu'il doit donner a son serveur.
 */
function ExistingFiles({ entry, t }: { entry: CertEntry; t: Translate }) {
  const base = entry.dir + '/' + entry.fqdn
  return (
    <section>
      <SectionTitle help={t('formats.help')}>{t('formats.title')}</SectionTitle>
      <Card className="p-5">
        <FormatTable
          t={t}
          paths={{
            pfx: base + '.pfx',
            fullchain: base + '.fullchain.pem',
            crt: base + '.crt.pem',
            chain: base + '.chain.pem',
            key: base + '.key.pem',
          }}
        />
      </Card>
    </section>
  )
}

export function DetailPage({ fqdn, navigate }: { fqdn: string; navigate: (r: Route) => void }) {
  const { refresh, settings } = useApp()
  const t = useT()
  const system = useSystem()
  const lang: Lang = settings?.language ?? 'fr'
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
        <PageHeader
          title={fqdn}
          back={<BackLink label={t('new.backToList')} onClick={() => navigate({ name: 'list' })} />}
        />
        <PageBody>
          <Card>
            <EmptyState
              icon={<Inbox className="size-5" />}
              title={t('detail.notFoundTitle')}
              description={error ?? t('detail.notFoundDesc')}
            />
          </Card>
        </PageBody>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            {entry.fqdn}
            <Badge tone={STATUS_TONE[entry.status]}>{t(statusLabelKey(entry.status))}</Badge>
          </span>
        }
        description={t(statusHintKey(entry.status))}
        back={<BackLink label={t('new.backToList')} onClick={() => navigate({ name: 'list' })} />}
        actions={
          <Button
            size="sm"
            icon={<FolderOpen className="size-3.5" />}
            onClick={() => system.openDir(entry.dir)}
          >
            {t('common.openFolder')}
          </Button>
        }
      />

      <PageBody>
        {error && <ErrorBanner>{error}</ErrorBanner>}

        <FlowStepper status={entry.status} t={t} />

        {entry.cert && <IssuedCert cert={entry.cert} t={t} lang={lang} />}

        <StepCsr entry={entry} />
        <StepSigned entry={entry} onChange={afterWrite} />
        <StepPfx entry={entry} onDone={afterWrite} />

        {entry.hasPfx && <ExistingFiles entry={entry} t={t} />}
      </PageBody>
    </>
  )
}

// ---------------------------------------------------------------------------
// Certificat emis
// ---------------------------------------------------------------------------

function IssuedCert({ cert, t, lang }: { cert: CertInfo; t: Translate; lang: Lang }) {
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
          <h3 className="font-medium">{t('detail.certInPlace')}</h3>
        </div>
        <span
          className={cx(
            'text-[13px] font-medium',
            critical ? 'text-danger' : soon ? 'text-warn' : 'text-muted',
          )}
        >
          {expiryLabel(cert.daysRemaining, t)}
        </span>
      </div>

      <Rows>
        <Row label={t('label.subject')}>{cert.subject}</Row>
        <Row label={t('label.issuer')}>{commonName(cert.issuer)}</Row>
        <Row label={t('label.validity')}>
          {shortDate(cert.notBefore, lang)} / {shortDate(cert.notAfter, lang)}
        </Row>
        <Row label={t('label.san')}>{cert.sans.join(', ') || t('common.none')}</Row>
        <Row label={t('label.usages')}>{cert.eku.join(', ') || t('common.none')}</Row>
        <Row label={t('label.key')}>{cert.keyDesc}</Row>
        <Row label={t('label.fingerprint')}>
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
  const t = useT()
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
    toast('success', t('new.toastCopied'))
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
                {open ? t('common.hide') : t('common.show')}
              </Button>
              <Button
                size="sm"
                icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                onClick={() => void copy()}
              >
                {copied ? t('common.copied') : t('common.copy')}
              </Button>
            </div>
          )
        }
      >
        {t('detail.step1')}
      </SectionTitle>

      <Card className="overflow-hidden">
        <div className="p-5">
          <Rows>
            <Row label={t('label.privateKey')}>
              {entry.hasKey ? (
                (entry.keyDesc ?? t('label.present'))
              ) : (
                <span className="text-danger">{t('label.absent')}</span>
              )}
            </Row>
            <Row label={t('label.requestedSans')}>{entry.sans.join(', ') || t('common.unknown')}</Row>
          </Rows>
        </div>

        {open && (
          <pre className="max-h-64 overflow-auto border-t border-line bg-sunken p-4 font-mono text-[11.5px] leading-[1.55] text-muted selectable">
            {pem === null ? t('common.reading') : pem.trim() || t('common.none')}
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
  const t = useT()
  const toast = useToast()
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const depth = useRef(0)

  const importFiles = async (paths: string[]) => {
    if (paths.length === 0) return
    setBusy(true)
    try {
      const files = await unwrap(api.signed.importFiles(entry.fqdn, paths))
      toast('success', t('detail.imported', { n: paths.length, total: files.length }))
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
      toast('error', t('detail.dropError'))
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
            {t('detail.openSigned')}
          </Button>
        }
      >
        {t('detail.step2')}
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
            title={dragging ? t('detail.dropHere') : t('detail.noSignedTitle')}
            description={t('detail.noSignedDesc')}
            action={
              <Button
                icon={<FileDown className="size-4" />}
                loading={busy}
                onClick={async () => {
                  const picked = await unwrap(api.system.pickFiles(t('dialog.pickSigned')))
                  await importFiles(picked)
                }}
              >
                {t('detail.pickFiles')}
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
                    title={t('common.reveal')}
                    aria-label={t('common.reveal')}
                    className="rounded p-1 text-subtle transition-colors hover:text-ink"
                  >
                    <FolderOpen className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-line px-3 pt-2.5 pb-1 mt-1">
              <p className="text-[12px] text-subtle">
                {dragging ? t('detail.dropHere') : t('detail.dragMore')}
              </p>
              <Button
                size="sm"
                variant="ghost"
                loading={busy}
                icon={<FileDown className="size-3.5" />}
                onClick={async () => {
                  const picked = await unwrap(api.system.pickFiles(t('dialog.pickSigned')))
                  await importFiles(picked)
                }}
              >
                {t('common.add')}
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
  const t = useT()
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
      toast('success', t('detail.toastAssembled', { name: basename(res.pfxPath) }))
      await onDone()
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <SectionTitle help={t('detail.step3Explain')}>{t('detail.step3')}</SectionTitle>

      {ready && (
        <p className="mb-3 text-[13px] leading-relaxed text-muted">{t('detail.step3Explain')}</p>
      )}

      {!ready ? (
        <Card>
          <EmptyState
            icon={<Package className="size-5" />}
            title={t('detail.nothingToAssembleTitle')}
            description={
              entry.hasKey ? t('detail.nothingToAssembleDesc') : t('detail.noKeyDesc')
            }
          />
        </Card>
      ) : (
        <Card className="flex flex-col gap-5 p-5">
          {error && <ErrorBanner>{error}</ErrorBanner>}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={t('detail.pfxPassword')}
              htmlFor="pfxpass"
              hint={t('detail.pfxPasswordHint')}
              help={t('detail.pfxPasswordHelp')}
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
                  aria-label={show ? t('common.hide') : t('common.show')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-subtle hover:text-ink"
                >
                  {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </Field>

            <Field
              label={t('detail.confirm')}
              htmlFor="pfxpass2"
              error={mismatch ? t('detail.mismatch') : null}
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
              {t('detail.advancedOptions')}
            </summary>

            <div className="mt-4 flex flex-col gap-4 border-l-2 border-line pl-4">
              <Field
                label={t('detail.friendlyName')}
                htmlFor="friendly"
                hint={t('detail.friendlyNameHint')}
                help={t('detail.friendlyNameHelp')}
              >
                <Input
                  id="friendly"
                  value={friendly}
                  onChange={(e) => setFriendly(e.target.value)}
                  placeholder={entry.fqdn}
                />
              </Field>

              <Field
                label={t('detail.keyPassword')}
                htmlFor="keypass"
                hint={t('detail.keyPasswordHint')}
                help={t('detail.keyPasswordHelp')}
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
                  label={t('detail.noPass')}
                  hint={t('detail.noPassHint')}
                  help={t('detail.noPassHelp')}
                  tone="danger"
                />
                <Checkbox
                  checked={compat}
                  onChange={setCompat}
                  label={t('detail.compat')}
                  hint={t('detail.compatHint')}
                  help={t('detail.compatHelp')}
                />
                <Checkbox
                  checked={noRoot}
                  onChange={setNoRoot}
                  label={t('detail.noRoot')}
                  hint={t('detail.noRootHint')}
                  help={t('detail.noRootHelp')}
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
              {t('detail.assemble')}
            </Button>
            {entry.hasPfx && !result && (
              <p className="text-[12px] text-warn">{t('detail.pfxExists')}</p>
            )}
          </div>
        </Card>
      )}

      {result && <PfxOutcome result={result} t={t} />}
    </section>
  )
}

// ---------------------------------------------------------------------------

function PfxOutcome({ result, t }: { result: PfxResult; t: Translate }) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 font-medium">
          <ShieldCheck className="size-4 text-ok" />
          {t('detail.chainTitle')}
        </h3>

        <ol className="flex flex-col">
          <ChainNode label={t('detail.leafLabel')} info={result.leaf} tone="text-ok" />
          {result.chain.map((c) => (
            <ChainNode
              key={c.fingerprint}
              label={c.selfSigned ? t('detail.rootCa') : t('detail.intermediateCa')}
              info={c}
              tone="text-muted"
            />
          ))}
        </ol>

        {result.unused.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-1.5 text-[12px] text-subtle">
              {t('detail.unused', { n: result.unused.length })}
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
        <h3 className="mb-3 font-medium">{t('detail.checksTitle')}</h3>
        <ul className="flex flex-col gap-2">
          {result.checks.map((c, i) => (
            <CheckLine key={i} check={c} />
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-1.5 font-medium">{t('formats.title')}</h3>
        <p className="mb-3 text-[12px] leading-relaxed text-subtle">{t('formats.help')}</p>
        <FormatTable
          t={t}
          paths={{
            pfx: result.pfxPath,
            fullchain: result.fullchainPath,
            crt: result.crtPath,
            chain: result.chainPath,
          }}
        />

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-1.5 text-[12px] text-subtle">{t('detail.importWindows')}</p>
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
        {shortDate(info.notBefore)} / {shortDate(info.notAfter)} · {info.keyDesc}
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
