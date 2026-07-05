"use client";
import { createRoot, type Root } from "react-dom/client";
import { useModalA11y } from "@/hooks/useModalA11y";

export type ConfirmOptions = {
  title: string;
  body?: string;
  confirmText?: string;
  cancelText?: string;
  /** Style the confirm button as destructive (red). */
  danger?: boolean;
};

function ConfirmModal({ opts, onResolve }: { opts: ConfirmOptions; onResolve: (v: boolean) => void }) {
  const ref = useModalA11y<HTMLDivElement>({ open: true, onClose: () => onResolve(false) });
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onResolve(false);
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={opts.title}
        className="claw-solid w-full max-w-sm rounded-2xl p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-slate-900">{opts.title}</h2>
        {opts.body && <p className="mt-2 text-sm leading-relaxed text-slate-500">{opts.body}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onResolve(false)}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
          >
            {opts.cancelText ?? "取消"}
          </button>
          <button
            type="button"
            onClick={() => onResolve(true)}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              opts.danger
                ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500"
                : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500"
            }`}
          >
            {opts.confirmText ?? "确定"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Promise-based confirmation that matches the app's glass styling and manages
 * focus (trap + restore) — a drop-in replacement for window.confirm():
 *   if (await confirm({ title: "清空回收站？", danger: true })) { ... }
 * Self-mounts into a detached portal; no provider wiring required.
 */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root: Root = createRoot(host);
    let settled = false;
    const finish = (v: boolean) => {
      if (settled) return;
      settled = true;
      resolve(v);
      // defer unmount so useModalA11y's cleanup can restore focus first
      requestAnimationFrame(() => {
        root.unmount();
        host.remove();
      });
    };
    root.render(<ConfirmModal opts={opts} onResolve={finish} />);
  });
}
