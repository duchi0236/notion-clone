"use client";

import { Bell, ChevronRight, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useSession } from "next-auth/react";

const nav = [
  { title: "个人资料", icon: UserRound },
  { title: "密码与登录", icon: KeyRound },
  { title: "权限与安全", icon: ShieldCheck },
  { title: "通知", icon: Bell },
];

export default function AccountPage() {
  const { data: session } = useSession();
  const name = session?.user?.name || "未设置";
  const email = session?.user?.email || "未设置";

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-6 py-8 text-slate-900">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-[1.75rem] border border-white/70 bg-white/80 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="mb-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white">{name.slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0">
              <div className="truncate font-semibold">{name}</div>
              <div className="truncate text-xs text-slate-500">{email}</div>
            </div>
          </div>
          <div className="space-y-1">
            {nav.map((item, index) => {
              const Icon = item.icon;
              return <button key={item.title} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${index === 0 ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}><Icon className="h-4 w-4" />{item.title}</button>;
            })}
          </div>
        </aside>

        <section>
          <div className="mb-6 rounded-[2rem] border border-white/70 bg-white/80 p-7 shadow-[0_20px_70px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">Account settings</div>
                <h1 className="text-3xl font-bold tracking-tight">账户设置</h1>
                <p className="mt-2 text-sm text-slate-500">管理个人资料、安全、权限和通知偏好。</p>
              </div>
              <button className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20">保存修改</button>
            </div>
          </div>

          <div className="space-y-5">
            <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><UserRound className="h-5 w-5" /></div><div><h2 className="font-semibold">个人资料</h2><p className="text-sm text-slate-500">用于文档协作和账户展示</p></div></div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm"><span className="mb-1.5 block font-medium text-slate-600">名称</span><input value={name} readOnly className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none" /></label>
                <label className="text-sm"><span className="mb-1.5 block font-medium text-slate-600">邮箱</span><input value={email} readOnly className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none" /></label>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><KeyRound className="h-5 w-5" /></div><div><h2 className="font-semibold">密码与登录</h2><p className="text-sm text-slate-500">修改密码、找回密码和邮箱验证</p></div></div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm hover:border-blue-200 hover:bg-blue-50"><strong className="block text-slate-900">修改密码</strong><span className="mt-1 block text-xs text-slate-500">定期更新账号密码</span></button>
                <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm hover:border-blue-200 hover:bg-blue-50"><strong className="block text-slate-900">找回密码</strong><span className="mt-1 block text-xs text-slate-500">通过邮件重置密码</span></button>
                <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm hover:border-blue-200 hover:bg-blue-50"><strong className="block text-slate-900">验证邮箱</strong><span className="mt-1 block text-xs text-slate-500">保护账户安全</span></button>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="font-semibold">权限与安全</h2><p className="text-sm text-slate-500">Workspace、成员角色和访问权限管理。</p></div></div>
                <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">当前文档 API 已启用 Workspace 权限校验。</div>
              </div>
              <div className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><Mail className="h-5 w-5" /></div><div><h2 className="font-semibold">通知</h2><p className="text-sm text-slate-500">邮件通知将在配置 SMTP 后启用。</p></div></div>
                <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">SMTP 未配置时，系统会保留通知入口但不发送邮件。</div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
