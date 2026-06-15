"use client";

import { useEffect, useState } from "react";
import { Check, KeyRound, Loader2, Sparkles, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_PROVIDERS, AI_SKILLS } from "@/lib/ai-skills";

type Config = {
  provider: string;
  model: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  enabledSkills: string[];
  hasApiKey: boolean;
};

export function AiConfigPanel() {
  const [config, setConfig] = useState<Config | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetch("/api/ai/config").then((r) => r.json()).then((d) => d.config && setConfig(d.config)).catch(() => null);
  }, []);

  if (!config) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const provider = AI_PROVIDERS.find((p) => p.id === config.provider) ?? AI_PROVIDERS[0];
  const set = <K extends keyof Config>(k: K, v: Config[K]) => setConfig((c) => (c ? { ...c, [k]: v } : c));
  const toggleSkill = (id: string) =>
    set("enabledSkills", config.enabledSkills.includes(id) ? config.enabledSkills.filter((s) => s !== id) : [...config.enabledSkills, id]);

  async function save() {
    if (!config) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      enabledSkills: config.enabledSkills,
    };
    if (apiKey.trim()) body.apiKey = apiKey.trim();
    const res = await fetch("/api/ai/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => null);
    setSaving(false);
    if (res?.config) {
      setConfig(res.config);
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-9">
      <h1 className="text-2xl font-bold">AI 配置</h1>
      <p className="mt-1.5 text-sm text-slate-500">配置对话使用的模型，以及助手可调用的技能工具。</p>

      <div className={cn("mt-4 rounded-xl border px-4 py-2.5 text-sm", config.provider === "none" ? "border-slate-200 bg-slate-50 text-slate-600" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
        {config.provider === "none"
          ? "当前使用内置规则助手（无需模型，可执行搜索 / 新建 / 总结）。"
          : `已配置模型：${provider.name}${config.model ? ` · ${config.model}` : ""}${config.hasApiKey ? "" : "（缺少 API Key）"}`}
      </div>

      {/* Model */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
          <Sparkles className="h-4 w-4 text-slate-600" /> 模型
        </div>
        <div className="grid gap-4">
          <Field label="供应商">
            <select value={config.provider} onChange={(e) => { set("provider", e.target.value); set("model", ""); }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400">
              {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          {config.provider !== "none" && (
            <>
              <Field label="模型">
                {provider.models.length > 0 ? (
                  <select value={config.model} onChange={(e) => set("model", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400">
                    <option value="">选择模型…</option>
                    {provider.models.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input value={config.model} onChange={(e) => set("model", e.target.value)} placeholder="模型 ID，如 my-model" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                )}
              </Field>

              <Field label="API Key" hint={config.hasApiKey ? "已配置（留空表示不修改）" : "尚未配置"}>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-slate-400">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={config.hasApiKey ? "••••••••（已保存）" : "sk-…"} className="flex-1 bg-transparent text-sm outline-none" />
                </div>
              </Field>

              {(config.provider === "custom" || config.provider === "openai") && (
                <Field label="Base URL" hint="兼容 OpenAI 的接口地址，可选">
                  <input value={config.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} placeholder="https://api.example.com/v1" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                </Field>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label={`温度 ${config.temperature.toFixed(1)}`}>
                  <input type="range" min={0} max={2} step={0.1} value={config.temperature} onChange={(e) => set("temperature", Number(e.target.value))} className="w-full accent-slate-900" />
                </Field>
                <Field label="最大 Tokens">
                  <input type="number" min={256} max={32000} step={256} value={config.maxTokens} onChange={(e) => set("maxTokens", Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                </Field>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Skills */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
          <Wrench className="h-4 w-4 text-slate-600" /> 技能工具
        </div>
        <div className="space-y-1">
          {AI_SKILLS.map((s) => {
            const on = config.enabledSkills.includes(s.id);
            return (
              <div key={s.id} className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    {s.name}
                    {!s.implemented && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">即将支持</span>}
                  </div>
                  <div className="text-xs text-slate-500">{s.desc}</div>
                </div>
                <Switch checked={on} onChange={() => toggleSkill(s.id)} />
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-5 flex items-center gap-3">
        <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? "已保存" : "保存配置"}
        </button>
        <span className="text-xs text-slate-400">配置即时生效；关闭的技能助手将不再执行。</span>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{label}</span>
        {hint && <span className="font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-slate-900" : "bg-slate-200")}>
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-4" : "left-0.5")} />
    </button>
  );
}
