import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: ReactNode
}) {
  return (
    <header className="px-8 pt-7 pb-6">
      {back}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-[13px] text-muted leading-relaxed">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
      </div>
    </header>
  )
}

/** Zone de contenu d'une page : marges et espacement communs. */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6 px-8 pb-12">{children}</div>
}
