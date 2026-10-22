"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2, Users } from "lucide-react";
import { Select } from "@/components/ui/Select";

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
    <main className="claw-standalone px-4 sm:px-6">
      <div className="claw-page-wrap">
        <div className="claw-page-top">
          <div>
            <p className="claw-page-kicker">Workspace</p>
            <h1 className="claw-page-title">工作区设置</h1>
            <p className="claw-page-desc">管理 ClawNote 个人知识库的基础信息和成员。常用设置保留在纸面表单里，统计和成员列表放在右侧便于快速核对。</p>
          </div>
          <div className="claw-page-actions">
            <Link href="/clawnote" className="claw-ghost-button"><ArrowLeft className="h-4 w-4" />返回工作台</Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            <form onSubmit={save} className="claw-card p-6">
              <h2 className="mb-5 text-lg font-bold">基础信息</h2>
              <div className="grid gap-4 sm:grid-cols-[90px_1fr]">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">图标</span>
                  <input value={icon} onChange={(event) => setIcon(event.target.value)} className="claw-input w-full px-4 py-3 text-center text-2xl" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">名称</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} className="claw-input w-full px-4 py-3" />
                </label>
              </div>
              <label className="mt-4 block text-sm">
                <span className="mb-1 block text-slate-600">描述</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="claw-input w-full px-4 py-3" />
              </label>
              {message && <div className="claw-status mt-4 px-4 py-3 text-sm">{message}</div>}
              <button className="claw-primary-button mt-5">
                <Save className="mr-2 h-4 w-4" />保存
              </button>
            </form>

            <form onSubmit={addMember} className="claw-card p-6">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5" />添加成员</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="邮箱" className="claw-input px-4 py-3 text-sm" />
                <input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="名称" className="claw-input px-4 py-3 text-sm" />
              </div>
              <div className="mt-3 flex gap-3">
                <Select
                  className="flex-1"
                  value={memberRole}
                  onChange={setMemberRole}
                  ariaLabel="新成员角色"
                  triggerClassName="min-h-12 px-4 py-3"
                  options={[
                    { value: "ADMIN", label: "管理员", description: "可管理内容与普通成员" },
                    { value: "MEMBER", label: "成员", description: "可创建和编辑工作区内容" },
                    { value: "GUEST", label: "访客", description: "仅访问已授权内容" },
                  ]}
                />
                <button className="claw-primary-button"><Plus className="mr-2 h-4 w-4" />添加</button>
              </div>
            </form>
          </section>

          <aside className="space-y-6">
            <div className="claw-card p-6">
              <h2 className="mb-4 text-lg font-bold">统计</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="文档" value={workspace?._count?.documents ?? 0} />
                <Stat label="表格" value={workspace?._count?.collections ?? 0} />
                <Stat label="Memory" value={workspace?._count?.memories ?? 0} />
                <Stat label="Inbox" value={workspace?._count?.inboxItems ?? 0} />
              </div>
            </div>

            <div className="claw-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5" />成员</h2>
              <div className="space-y-3">
                {workspace?.members?.map((member) => (
                  <div key={member.id} className="claw-card-flat p-3 text-sm">
                    <div className="font-medium">{member.user.name ?? member.user.email}</div>
                    <div className="text-xs text-slate-500">{member.user.email}</div>
                    <div className="mt-3 flex items-center gap-2">
                      <Select
                        className="flex-1"
                        value={member.role}
                        onChange={(role) => updateRole(member.id, role)}
                        ariaLabel={`${member.user.name ?? member.user.email}角色`}
                        triggerClassName="min-h-9 px-3 py-2 text-xs"
                        options={[
                          { value: "OWNER", label: "所有者" },
                          { value: "ADMIN", label: "管理员" },
                          { value: "MEMBER", label: "成员" },
                          { value: "GUEST", label: "访客" },
                        ]}
                      />
                      <button onClick={() => removeMember(member.id)} className="claw-danger-button min-h-0 p-2" title="移除成员"><Trash2 className="h-4 w-4" /></button>
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
  return <div className="claw-card-flat p-3"><div className="text-xs text-slate-500">{label}</div><div className="text-2xl font-bold">{value}</div></div>;
}
