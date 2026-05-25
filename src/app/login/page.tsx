"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Brain, Loader2 } from "lucide-react";

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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-900">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white"><Brain className="h-6 w-6" /></div>
          <div><h1 className="text-2xl font-bold">ClawNote</h1><p className="text-sm text-slate-500">个人文档、清单和知识工作台</p></div>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm">
          <button type="button" onClick={() => setMode("login")} className={`rounded-xl px-3 py-2 ${mode === "login" ? "bg-white shadow-sm" : "text-slate-500"}`}>登录</button>
          <button type="button" onClick={() => setMode("register")} className={`rounded-xl px-3 py-2 ${mode === "register" ? "bg-white shadow-sm" : "text-slate-500"}`}>注册</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && <label className="block text-sm"><span className="mb-1 block text-slate-600">名称</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="你的名字" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" /></label>}
          <label className="block text-sm"><span className="mb-1 block text-slate-600">邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" /></label>
          <label className="block text-sm"><span className="mb-1 block text-slate-600">密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位密码" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" /></label>

          {message && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{message}</p>}

          <button disabled={loading || !email || !password} className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{mode === "login" ? "登录" : "注册并登录"}
          </button>
        </form>

        <p className="mt-6 text-xs leading-5 text-slate-500">生产环境请配置 NEXTAUTH_SECRET、DATABASE_URL 和文件存储路径。每个用户会自动拥有独立个人空间。</p>
      </div>
    </main>
  );
}
