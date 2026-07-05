"use client";

import { FormEvent, forwardRef, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Brain, Loader2, Lock, Smartphone, QrCode } from "lucide-react";

type Method = "password" | "phone" | "wechat";
type Notice = { type: "error" | "info" | "success"; text: string } | null;

const METHODS: Method[] = ["password", "phone", "wechat"];

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("password");
  const [callbackUrl, setCallbackUrl] = useState("/clawnote");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<Notice>(null);

  // 密码
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  // 手机
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // 焦点管理
  const tabRefs = useRef<Record<Method, HTMLButtonElement | null>>({ password: null, phone: null, wechat: null });
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  // 标记本次 method 变化是否由 tab 上的方向键引起：是则焦点留在 tab 上（roving），不抢进输入框
  const tabSwitchByKey = useRef(false);

  useEffect(() => {
    try {
      const cb = new URLSearchParams(window.location.search).get("callbackUrl");
      if (cb) setCallbackUrl(cb);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // 切换 method（及首屏）后聚焦当前面板首个输入框；
  // 但若本次切换是 tab 上的方向键触发，则保持焦点在 tab 上（符合 WAI-ARIA tabs 的 roving 行为）。
  useEffect(() => {
    if (tabSwitchByKey.current) { tabSwitchByKey.current = false; return; }
    const target = method === "phone" ? phoneRef.current : method === "password" ? emailRef.current : null;
    target?.focus();
  }, [method]);

  function done(result: { error?: string | null } | undefined, failMsg: string) {
    if (result?.error) { setLoading(false); setMessage({ type: "error", text: failMsg }); return; }
    setMessage({ type: "success", text: "登录成功，正在进入…" });
    window.location.href = callbackUrl; // 整页跳转，确保会话 cookie 生效（含 OIDC 回跳）
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setMessage(null);
    if (mode === "register") {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, password }) });
      if (!res.ok && res.status !== 409) {
        const d = await res.json().catch(() => ({}));
        setLoading(false); setMessage({ type: "error", text: d.error ?? "注册失败" }); return;
      }
    }
    const r = await signIn("credentials", { email, password, redirect: false });
    done(r ?? undefined, "邮箱或密码不正确");
  }

  async function sendCode() {
    if (sending || cooldown > 0 || !phone.trim()) return;
    setSending(true); setMessage(null);
    try {
      const res = await fetch("/api/auth/otp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage({ type: "error", text: d.error ?? "发送失败" }); return; }
      setCooldown(60);
      if (d.devCode) {
        setCode(d.devCode);
        setMessage({ type: "success", text: `开发模式验证码：${d.devCode}（已自动填入）` });
        submitRef.current?.focus();
      }
    } catch {
      setMessage({ type: "error", text: "发送失败，请检查网络" });
    } finally {
      setSending(false);
    }
  }
  async function submitPhone(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setMessage(null);
    const r = await signIn("phone-otp", { phone, code, redirect: false });
    done(r ?? undefined, "验证码无效或已过期");
  }

  async function wechatLogin() {
    setLoading(true); setMessage(null);
    try {
      const start = await fetch("/api/auth/wechat/qrconnect").then((r) => r.json());
      // 生产：展示二维码(start.authUrl) 并轮询 /poll；开发：直接走 mock 回调拿 ticket
      const cb = await fetch(`/api/auth/wechat/callback?code=devcode&state=${encodeURIComponent(start.state)}`).then((r) => r.json());
      if (!cb.ticket) { setLoading(false); setMessage({ type: "error", text: "微信登录失败（开发占位）" }); return; }
      const r = await signIn("wechat", { ticket: cb.ticket, redirect: false });
      done(r ?? undefined, "微信登录失败");
    } catch {
      setLoading(false); setMessage({ type: "error", text: "微信服务未配置" });
    }
  }

  function onTabKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const idx = METHODS.indexOf(method);
    const next = e.key === "ArrowRight" ? METHODS[(idx + 1) % METHODS.length] : METHODS[(idx - 1 + METHODS.length) % METHODS.length];
    tabSwitchByKey.current = true; // 让 method 变化的 effect 跳过抢焦点，焦点留在 tab
    setMethod(next); setMessage(null);
    tabRefs.current[next]?.focus();
  }

  const tab = (m: Method, label: string, Icon: typeof Lock) => {
    const selected = method === m;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={selected}
        tabIndex={selected ? 0 : -1}
        ref={(el) => { tabRefs.current[m] = el; }}
        onClick={() => { setMethod(m); setMessage(null); }}
        onKeyDown={onTabKeyDown}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${selected ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500 active:bg-slate-200"}`}
      >
        <Icon className="h-4 w-4" /> {label}
      </button>
    );
  };
  const input = "w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-150 focus:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-300";

  const notice =
    message?.type === "error"
      ? "bg-rose-50 text-rose-700"
      : message?.type === "success"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-violet-50 text-violet-700";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-900">
      <div className="claw-solid w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white"><Brain className="h-6 w-6" /></div>
          <div><h1 className="text-2xl font-bold">ClawNote</h1><p className="text-sm text-slate-500">登录你的知识工作台</p></div>
        </div>

        <div role="tablist" aria-label="登录方式" className="mb-6 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
          {tab("password", "密码", Lock)}
          {tab("phone", "验证码", Smartphone)}
          {tab("wechat", "微信", QrCode)}
        </div>

        {method === "password" && (
          <form onSubmit={submitPassword} role="tabpanel" className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm">
              <button type="button" aria-pressed={mode === "login"} onClick={() => setMode("login")} className={`rounded-lg px-3 py-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${mode === "login" ? "bg-white shadow-sm" : "text-slate-500 active:bg-slate-200"}`}>登录</button>
              <button type="button" aria-pressed={mode === "register"} onClick={() => setMode("register")} className={`rounded-lg px-3 py-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${mode === "register" ? "bg-white shadow-sm" : "text-slate-500 active:bg-slate-200"}`}>注册</button>
            </div>
            {mode === "register" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称（可选）" autoComplete="name" className={input} />}
            <input ref={emailRef} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱" autoComplete="email" className={input} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "register" ? "密码（至少 10 位）" : "密码"} autoComplete={mode === "register" ? "new-password" : "current-password"} className={input} />
            <Submit ref={submitRef} loading={loading} label={mode === "login" ? "登录" : "注册并登录"} />
          </form>
        )}

        {method === "phone" && (
          <form onSubmit={submitPhone} role="tabpanel" className="space-y-4">
            <input ref={phoneRef} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="手机号" className={input} inputMode="tel" autoComplete="tel" />
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="验证码" className={input} inputMode="numeric" autoComplete="one-time-code" />
              <button
                type="button"
                onClick={sendCode}
                disabled={sending || cooldown > 0 || !phone.trim()}
                aria-label={cooldown > 0 ? `${cooldown}秒后可重新获取验证码` : undefined}
                className="shrink-0 rounded-2xl border border-violet-200 px-4 text-sm font-medium text-violet-600 transition-colors duration-150 active:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "发送中…" : cooldown > 0 ? `${cooldown}s` : "获取验证码"}
              </button>
            </div>
            <Submit ref={submitRef} loading={loading} label="登录 / 注册" />
          </form>
        )}

        {method === "wechat" && (
          <div role="tabpanel" className="space-y-4 text-center">
            <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-300">
              <QrCode className="h-16 w-16" />
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/80 text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-xs">正在登录…</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400">生产环境此处展示微信二维码扫码登录；当前为开发占位。</p>
            <button onClick={wechatLogin} disabled={loading} className="flex w-full items-center justify-center rounded-2xl bg-[#07c160] px-4 py-3 font-medium text-white transition-colors duration-150 hover:opacity-90 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 微信登录（开发模拟）
            </button>
          </div>
        )}

        {message && (
          <p
            role={message.type === "error" ? "alert" : "status"}
            aria-live={message.type === "error" ? "assertive" : "polite"}
            className={`mt-4 rounded-2xl px-4 py-3 text-sm ${notice}`}
          >
            {message.text}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">登录即代表同意隐私政策与用户协议</p>
      </div>
    </main>
  );
}

const Submit = forwardRef<HTMLButtonElement, { loading: boolean; label: string }>(function Submit({ loading, label }, ref) {
  return (
    <button ref={ref} disabled={loading} className="flex w-full items-center justify-center rounded-2xl bg-violet-600 px-4 py-3 font-medium text-white transition-colors duration-150 hover:bg-violet-700 active:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {label}
    </button>
  );
});
