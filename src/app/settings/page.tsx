"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Save, Trash2, Users } from "lucide-react";

type Member = { id: string; role: string; user: { email: string; name?: string | null } };
type Workspace = {
  id: string;
  name: string;
  icon: string;
  description?: string | null;
  owner?: { email: string; name?: string | null };
  members?: Member[];
  _count?: { documents: number; collections: number; memories: number; inboxItems: number; agentRuns: number };
};

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🧠");
  const [description, setDescription] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/workspace");
    const data = await res.json().catch(() => ({}));
    const item = data.workspace as Workspace | undefined;
    if (!item) return;
    setWorkspace(item);
    setName(item.name ?? "");
    setIcon(item.icon ?? "🧠");
    setDescription(item.description ?? "");
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const res = await fetch("/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon, description }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "保存失败");
      return;
    }
    setWorkspace(data.workspace);
    setMessage("已保存");
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    if (!memberEmail.trim()) return;
    const res = await fetch("/api/workspace/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: memberEmail, name: memberName, role: memberRole }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "添加成员失败");
      return;
    }
    setMemberEmail("");
    setMemberName("");
    setMemberRole("MEMBER");
    setMessage("成员已添加");
    await load();
  }

  async function updateRole(memberId: string, role: string) {
    await fetch(`/api/workspace/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    await load();
  }

  async function removeMember(memberId: string) {
    await fetch(`/api/workspace/members/${memberId}`, { method: "DELETE" });
    await load();
  }

  return (
    <main className="min-h-screen bg-[#f7f7fb] p-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">工作区设置</h1>
            <p className="mt-1 text-sm text-slate-500">管理 ClawNote 个人知识库的基础信息和成员。</p>
          </div>
          <Link href="/clawnote" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm hover:border-violet-300">返回工作台</Link>
        </div>

        <div className="grid grid-cols-[1fr_360px] gap-6">
          <section className="space-y-6">
            <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="mb-5 text-lg font-bold">基础信息</h2>
              <div className="grid grid-cols-[90px_1fr] gap-4">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">图标</span>
                  <input value={icon} onChange={(event) => setIcon(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-2xl outline-none focus:border-violet-400" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">名称</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400" />
                </label>
              </div>
              <label className="mt-4 block text-sm">
                <span className="mb-1 block text-slate-600">描述</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400" />
              </label>
              {message && <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-700">{message}</div>}
              <button className="mt-5 inline-flex items-center rounded-2xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
                <Save className="mr-2 h-4 w-4" />保存
              </button>
            </form>

            <form onSubmit={addMember} className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5" />添加成员</h2>
              <div className="grid grid-cols-2 gap-3">
                <input value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="邮箱" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400" />
                <input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="名称" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400" />
              </div>
              <div className="mt-3 flex gap-3">
                <select value={memberRole} onChange={(event) => setMemberRole(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400">
                  <option value="ADMIN">ADMIN</option>
                  <option value="MEMBER">MEMBER</option>
                  <option value="GUEST">GUEST</option>
                </select>
                <button className="inline-flex items-center rounded-2xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"><Plus className="mr-2 h-4 w-4" />添加</button>
              </div>
            </form>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-bold">统计</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="文档" value={workspace?._count?.documents ?? 0} />
                <Stat label="表格" value={workspace?._count?.collections ?? 0} />
                <Stat label="Memory" value={workspace?._count?.memories ?? 0} />
                <Stat label="Inbox" value={workspace?._count?.inboxItems ?? 0} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5" />成员</h2>
              <div className="space-y-3">
                {workspace?.members?.map((member) => (
                  <div key={member.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                    <div className="font-medium">{member.user.name ?? member.user.email}</div>
                    <div className="text-xs text-slate-500">{member.user.email}</div>
                    <div className="mt-3 flex items-center gap-2">
                      <select value={member.role} onChange={(event) => updateRole(member.id, event.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="GUEST">GUEST</option>
                      </select>
                      <button onClick={() => removeMember(member.id)} className="rounded-xl border border-slate-200 bg-white p-2 text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="text-2xl font-bold">{value}</div></div>;
}
