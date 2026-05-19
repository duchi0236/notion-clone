"use client";

import { cn } from "@/lib/utils";

export function ToolbarButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm text-slate-600 hover:bg-slate-100",
        active && "bg-blue-50 text-blue-700"
      )}
    >
      {children}
    </button>
  );
}
