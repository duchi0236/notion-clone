"use client";

import { LogOut, Settings, UserRound } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export function AccountMenu() {
  const { data: session } = useSession();
  const label = session?.user?.name || session?.user?.email || "Account";
  const initial = label.slice(0, 1).toUpperCase();

  return (
    <div className="group relative">
      <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{initial}</span>
        <span className="max-w-[120px] truncate">{label}</span>
      </button>
      <div className="invisible absolute right-0 top-10 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><UserRound className="h-4 w-4" />{label}</div>
          <div className="mt-1 truncate text-xs text-slate-500">{session?.user?.email || "未登录"}</div>
        </div>
        <a href="/account" className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><Settings className="h-4 w-4" />账户设置</a>
        <button onClick={() => void signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
          <LogOut className="h-4 w-4" />退出登录
        </button>
      </div>
    </div>
  );
}
