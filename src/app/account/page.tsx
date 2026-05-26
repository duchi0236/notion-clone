"use client";

import { KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useSession } from "next-auth/react";

export default function AccountPage() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold">账户设置</h1>
        <p className="mt-2 text-sm text-slate-500">管理个人资料、安全和工作空间。</p>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5" />
            <h2 className="font-semibold">个人资料</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div><strong>名称：</strong>{session?.user?.name || "未设置"}</div>
            <div><strong>邮箱：</strong>{session?.user?.email || "未设置"}</div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><KeyRound className="h-5 w-5" /><h2 className="font-semibold">密码与登录</h2></div>
          <p className="mt-3 text-sm text-slate-500">修改密码、找回密码和邮箱验证入口。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white">修改密码</button>
            <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm">找回密码</button>
            <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm">验证邮箱</button>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" /><h2 className="font-semibold">权限与安全</h2></div>
          <p className="mt-3 text-sm text-slate-500">Workspace、成员角色和访问权限管理。</p>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><Mail className="h-5 w-5" /><h2 className="font-semibold">通知</h2></div>
          <p className="mt-3 text-sm text-slate-500">邮件通知将在配置 SMTP 后启用。</p>
        </section>
      </div>
    </main>
  );
}
