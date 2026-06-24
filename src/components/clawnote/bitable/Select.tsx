"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOpt = { value: string; label: string; icon?: ReactNode };

// 自定义下拉（替代原生 <select>）：风格统一、option 列表可定制，portal 弹层避免被裁切。
export function Select({
  value,
  options,
  onChange,
  placeholder = "请选择",
  className,
  triggerClassName,
  align = "left",
  disabled,
}: {
  value: string;
  options: SelectOpt[];
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  align?: "left" | "right";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const current = options.find((o) => o.value === value);

  function toggle() {
    if (disabled) return;
    if (open) { setOpen(false); return; }
    const r = ref.current?.getBoundingClientRect();
    if (r) {
      const width = Math.max(r.width, 140);
      const left = align === "right" ? Math.max(8, r.right - width) : r.left;
      const below = r.bottom + 4;
      const estH = Math.min(280, options.length * 34 + 8);
      const top = below + estH > window.innerHeight ? Math.max(8, r.top - estH - 4) : below;
      setPos({ left, top, width });
    }
    setOpen(true);
  }

  return (
    <div className={cn("inline-block", className)}>
      <button
        ref={ref}
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-sm text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
          disabled && "cursor-not-allowed bg-slate-50 text-slate-400 hover:border-slate-200",
          triggerClassName,
        )}
      >
        {current?.icon && <span className="flex text-slate-400">{current.icon}</span>}
        <span className={cn("flex-1 truncate", !current && "text-slate-400")}>{current?.label ?? placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>

      {open && pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[90]" onMouseDown={() => setOpen(false)} />
            <div
              className="claw-solid fixed z-[91] max-h-[280px] overflow-y-auto rounded-xl border border-slate-200 p-1 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.3)]"
              style={{ left: pos.left, top: pos.top, width: pos.width }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {options.map((o) => (
                <button
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-50",
                    o.value === value ? "text-blue-600" : "text-slate-700",
                  )}
                >
                  {o.icon && <span className="flex text-slate-400">{o.icon}</span>}
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.value === value && <Check className="h-3.5 w-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
