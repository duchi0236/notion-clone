import type { ReactNode } from "react";

export function AppPage({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-[#f7f8fb] px-8 py-8 text-slate-900">{children}</main>;
}

export function AppContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl ${className}`}>{children}</div>;
}

export function GlassPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.06)] backdrop-blur ${className}`}>{children}</section>;
}

export function PageEyebrow({ children }: { children: ReactNode }) {
  return <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{children}</div>;
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <PageEyebrow>Workspace</PageEyebrow>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PrimaryButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">{children}</button>;
}

export function SecondaryButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm">{children}</button>;
}
