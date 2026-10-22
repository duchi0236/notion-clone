"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  Check,
  FilePlus2,
  ListChecks,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";
import type { AiSkill, AiSkillAccess } from "@/lib/ai-skills";

type ConfigResponse = {
  config?: { enabledSkills?: string[] };
  skills?: AiSkill[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

const SKILL_ICONS: Record<string, ReactNode> = {
  search: <Search />,
  create: <FilePlus2 />,
  summarize: <Sparkles />,
  memory: <BookOpen />,
  tasks: <ListChecks />,
};

const ACCESS_META: Record<AiSkillAccess, { label: string; description: string; className: string }> = {
  read: {
    label: "只读",
    description: "可以读取授权范围内的数据，不会修改工作区内容。",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  write: {
    label: "可写入",
    description: "可以在授权范围内创建或修改内容，操作会进入工作区记录。",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  review: {
    label: "需确认",
    description: "只生成建议或待审核记录，由用户确认后进入正式数据。",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

export function AgentSkillPanel() {
  const [skills, setSkills] = useState<AiSkill[]>([]);
  const [enabledSkills, setEnabledSkills] = useState<string[]>([]);
  const [savedSkills, setSavedSkills] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/ai/config");
      if (!response.ok) throw new Error(`AI config ${response.status}`);
      const data = (await response.json()) as ConfigResponse;
      const nextSkills = Array.isArray(data.skills) ? data.skills : [];
      const validIds = new Set(nextSkills.filter((skill) => skill.implemented).map((skill) => skill.id));
      const nextEnabled = (data.config?.enabledSkills ?? []).filter((id) => validIds.has(id));
      setSkills(nextSkills);
      setEnabledSkills(nextEnabled);
      setSavedSkills(nextEnabled);
      setSelectedId((current) => current || nextSkills[0]?.id || "");
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedSkill = skills.find((skill) => skill.id === selectedId) ?? skills[0];
  const availableSkills = skills.filter((skill) => skill.implemented);
  const enabledSet = useMemo(() => new Set(enabledSkills), [enabledSkills]);
  const dirty = useMemo(
    () => [...enabledSkills].sort().join("|") !== [...savedSkills].sort().join("|"),
    [enabledSkills, savedSkills],
  );

  function toggleSkill(skill: AiSkill, enabled: boolean) {
    if (!skill.implemented) return;
    setEnabledSkills((current) =>
      enabled ? Array.from(new Set([...current, skill.id])) : current.filter((id) => id !== skill.id),
    );
    setSaveState("idle");
  }

  async function save() {
    if (!dirty || saveState === "saving") return;
    setSaveState("saving");
    try {
      const response = await fetch("/api/ai/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledSkills }),
      });
      if (!response.ok) throw new Error(`AI config ${response.status}`);
      const data = (await response.json()) as ConfigResponse;
      const nextEnabled = data.config?.enabledSkills ?? enabledSkills;
      setEnabledSkills(nextEnabled);
      setSavedSkills(nextEnabled);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
    } catch {
      setSaveState("error");
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400" role="status" aria-label="正在加载 Agent Skill">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-900">无法加载 Agent Skill</h1>
          <p className="mt-1 text-sm text-slate-500">请检查服务连接后重试。</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          <RotateCcw className="h-4 w-4" />
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col px-5 py-7 sm:px-8 sm:py-9">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
            <Wrench className="h-3.5 w-3.5" />
            工作区能力
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">Agent Skill</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
            决定工作区助手可以读取什么、执行什么。关闭后，对应意图不会触发任何操作。
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="font-medium tabular-nums text-slate-900">{enabledSkills.length}</span>
          <span>/ {availableSkills.length} 个可用 Skill 已启用</span>
        </div>
      </header>

      <div className="mt-6 grid min-h-[35rem] overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.35fr)]">
        <section className="border-b border-slate-200 lg:border-b-0 lg:border-r" aria-label="Skill 列表">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">能力清单</h2>
              <p className="mt-0.5 text-xs text-slate-500">{skills.length} 个已登记</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEnabledSkills(availableSkills.map((skill) => skill.id));
                setSaveState("idle");
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
            >
              全部启用
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {skills.map((skill) => {
              const enabled = enabledSet.has(skill.id) && skill.implemented;
              const selected = selectedSkill?.id === skill.id;
              return (
                <div key={skill.id} className={cn("flex items-center gap-2 pr-4 transition-colors", selected ? "bg-slate-100" : "hover:bg-slate-50")}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(skill.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/60"
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4", selected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600")}>
                      {SKILL_ICONS[skill.id] ?? <Wrench />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-slate-900">{skill.name}</span>
                        {!skill.implemented && (
                          <span className="shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                            规划中
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{skill.category}</span>
                    </span>
                  </button>
                  <Switch
                    checked={enabled}
                    disabled={!skill.implemented}
                    onChange={(next) => toggleSkill(skill, next)}
                    label={`${skill.name}（${enabled ? "已启用" : "已关闭"}）`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {selectedSkill && (
          <section className="min-w-0 px-5 py-6 sm:px-7 sm:py-7" aria-label={`${selectedSkill.name} 设置`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white [&_svg]:h-5 [&_svg]:w-5">
                  {SKILL_ICONS[selectedSkill.id] ?? <Wrench />}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-950">{selectedSkill.name}</h2>
                    <span className={cn("rounded border px-2 py-0.5 text-[11px] font-medium", ACCESS_META[selectedSkill.access].className)}>
                      {ACCESS_META[selectedSkill.access].label}
                    </span>
                  </div>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">{selectedSkill.desc}</p>
                </div>
              </div>
              <Switch
                checked={enabledSet.has(selectedSkill.id) && selectedSkill.implemented}
                disabled={!selectedSkill.implemented}
                onChange={(next) => toggleSkill(selectedSkill, next)}
                label={`${selectedSkill.name}（${enabledSet.has(selectedSkill.id) ? "已启用" : "已关闭"}）`}
              />
            </div>

            {!selectedSkill.implemented && (
              <div className="mt-5 border-l-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                这个 Skill 已进入产品规划，但执行链路尚未开放，因此暂时不能启用。
              </div>
            )}

            <dl className="mt-7 divide-y divide-slate-100 border-y border-slate-100">
              <DetailRow label="数据范围" value={selectedSkill.scope} />
              <DetailRow label="触发方式" value={selectedSkill.trigger} />
              <DetailRow label="执行结果" value={selectedSkill.output} />
              <DetailRow label="权限策略" value={ACCESS_META[selectedSkill.access].description} />
            </dl>

            <div className="mt-7">
              <h3 className="text-sm font-semibold text-slate-900">调用示例</h3>
              <div className="mt-3 space-y-2">
                {selectedSkill.examples.map((example) => (
                  <div key={example} className="flex items-center gap-3 border-l-2 border-slate-200 px-3 py-2 text-sm text-slate-600">
                    <span className="font-mono text-xs text-slate-400">›</span>
                    <span>{example}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-start gap-3 border-t border-slate-100 pt-5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <p className="text-xs leading-5 text-slate-500">
                Skill 只在当前工作区生效。Agent API 的 Token、成员角色和服务端权限校验仍会继续限制实际访问范围。
              </p>
            </div>
          </section>
        )}
      </div>

      <footer className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5 text-xs" role="status" aria-live="polite">
          {saveState === "error" ? (
            <span className="text-rose-600">保存失败，请检查网络后重试。</span>
          ) : saveState === "saved" ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              Skill 设置已生效
            </span>
          ) : dirty ? (
            <span className="text-amber-700">有尚未保存的修改</span>
          ) : (
            <span className="text-slate-400">设置保存在当前工作区</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEnabledSkills(savedSkills);
              setSaveState("idle");
            }}
            disabled={!dirty || saveState === "saving"}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            撤销修改
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || saveState === "saving"}
            className="inline-flex min-w-28 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 active:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            保存设置
          </button>
        </div>
      </footer>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3.5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm leading-6 text-slate-700">{value}</dd>
    </div>
  );
}
