"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Brain, CheckCircle2, Loader2, LockKeyhole, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "register") {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoading(false);
        setMessage(data.error ?? "注册失败，请稍后重试。");
        return;
      }
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      setMessage("登录失败，请检查邮箱和密码。首次使用请先注册。 ");
      return;
    }

    router.push("/clawnote");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f8fb] px-4 py-8 text-slate-900">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-0 h-96 w-96 rounded-full bg-violet-200/50 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-[2rem] border border-white/70 bg-white/70 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:block">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><Brain className="h-6 w-6" /></div>
            <div>
              <div className="text-xl font-bold">ClawNote</div>
              <div className="text-sm text-slate-500">个人文档、清单和知识工作台</div>
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400">Today workspace</div>
                <h2 className="mt-1 text-3xl font-bold tracking-tight">写作、整理、行动</h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">自动保存</span>
            </div>
            <div className="space-y-3">
              {["ClawNote 产品设计文档", "项目开发计划", "技术实现方案"].map((item, index) => (
                <div key={item} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sm shadow-sm">{index === 0 ? "📄" : index === 1 ? "🚀" : "🧩"}</span><span className="font-medium text-slate-700">{item}</span></div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-blue-50 p-4 text-blue-700"><Sparkles className="mb-2 h-4 w-4" />AI 辅助写作</div>
            <div className="rounded-2xl bg-slate-100 p-4 text-slate-700"><LockKeyhole className="mb-2 h-4 w-4" />个人空间隔离</div>
            <div className="rounded-2xl bg-violet-50 p-4 text-violet-700"><Brain className="mb-2 h-4 w-4" />知识沉淀</div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_24px_90px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25"><Brain className="h-7 w-7" /></div>
            <h1 className="text-2xl font-bold tracking-tight">{mode === "login" ? "欢迎回来" : "创建你的工作台"}</h1>
            <p className="mt-2 text-sm text-slate-500">登录后自动进入你的个人文档空间</p>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm">
            <button type="button" onClick={() => setMode("login")} className={`rounded-xl px-3 py-2 font-medium transition ${mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>登录</button>
            <button type="button" onClick={() => setMode("register")} className={`rounded-xl px-3 py-2 font-medium transition ${mode === "register" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>注册</button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && <label className="block text-sm"><span className="mb-1.5 block font-medium text-slate-600">名称</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="你的名字" className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50" /></label>}
            <label className="block text-sm"><span className="mb-1.5 block font-medium text-slate-600">邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50" /></label>
            <label className="block text-sm"><span className="mb-1.5 block font-medium text-slate-600">密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位密码" className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50" /></label>

            {message && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{message}</p>}

            <button disabled={loading || !email || !password} className="group flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{mode === "login" ? "进入工作台" : "注册并进入"}<ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">每个用户会自动拥有独立个人空间，文档默认仅自己可见。</p>
        </section>
      </div>
    </main>
  );
}
