"use client";

import { CalendarDays, GalleryHorizontal, KanbanSquare, Plus, Table2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, TaskView } from "./types";

export function TaskPanel({
  tasks,
  taskView,
  setTaskView,
  createTask,
  updateTask,
  deleteTask,
}: {
  tasks: Task[];
  taskView: TaskView;
  setTaskView: (view: TaskView) => void;
  createTask: () => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
}) {
  return (
    <div className="p-6">
      <div className="mb-5 flex justify-between">
        <div>
          <h2 className="text-2xl font-bold">项目跟进表</h2>
          <p className="text-sm text-slate-500">Table / Board / Gallery / Calendar 多视图。</p>
        </div>
        <button onClick={createTask} className="rounded-2xl bg-violet-600 px-4 py-2 text-sm text-white">
          <Plus className="mr-1 inline h-4 w-4" />新增任务
        </button>
      </div>

      <div className="mb-5 flex gap-2">
        {([
          ["table", Table2, "表格"],
          ["board", KanbanSquare, "看板"],
          ["gallery", GalleryHorizontal, "画廊"],
          ["calendar", CalendarDays, "日历"],
        ] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTaskView(key)}
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
              taskView === key ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600"
            )}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {taskView === "table" && <TaskTable tasks={tasks} updateTask={updateTask} deleteTask={deleteTask} />}
      {taskView === "board" && <TaskBoard tasks={tasks} updateTask={updateTask} />}
      {taskView === "gallery" && <TaskGallery tasks={tasks} />}
      {taskView === "calendar" && <TaskCalendar tasks={tasks} />}
    </div>
  );
}

function TaskTable({ tasks, updateTask, deleteTask }: { tasks: Task[]; updateTask: (id: string, patch: Partial<Task>) => void; deleteTask: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200">
      <table className="w-full bg-white text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>{["任务", "负责人", "状态", "优先级", "截止", "进度", ""].map((head) => <th key={head} className="p-3">{head}</th>)}</tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-t border-slate-100">
              <td className="p-3"><input value={task.name} onChange={(e) => updateTask(task.id, { name: e.target.value })} className="w-full bg-transparent outline-none" /></td>
              <td className="p-3"><input value={task.owner} onChange={(e) => updateTask(task.id, { owner: e.target.value })} className="w-24 bg-transparent outline-none" /></td>
              <td className="p-3"><select value={task.status} onChange={(e) => updateTask(task.id, { status: e.target.value as Task["status"] })} className="rounded-xl border px-2 py-1"><option>未开始</option><option>进行中</option><option>已完成</option></select></td>
              <td className="p-3"><select value={task.priority} onChange={(e) => updateTask(task.id, { priority: e.target.value as Task["priority"] })} className="rounded-xl border px-2 py-1"><option>低</option><option>中</option><option>高</option></select></td>
              <td className="p-3"><input type="date" value={task.dueDate} onChange={(e) => updateTask(task.id, { dueDate: e.target.value })} className="bg-transparent" /></td>
              <td className="p-3"><input type="number" value={task.progress} onChange={(e) => updateTask(task.id, { progress: Number(e.target.value) })} className="w-16 rounded-lg border px-2 py-1" />%</td>
              <td><button onClick={() => deleteTask(task.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskBoard({ tasks, updateTask }: { tasks: Task[]; updateTask: (id: string, patch: Partial<Task>) => void }) {
  const statuses: Task["status"][] = ["未开始", "进行中", "已完成"];
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statuses.map((status) => (
        <section key={status} className="w-80 flex-shrink-0 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex justify-between"><h3 className="font-semibold">{status}</h3><span className="text-xs text-slate-500">{tasks.filter((task) => task.status === status).length}</span></div>
          {tasks.filter((task) => task.status === status).map((task) => (
            <div key={task.id} className="mb-3 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="font-medium">{task.name}</div>
              <div className="mt-2 text-xs text-slate-500">{task.owner} · {task.priority} · {task.progress}%</div>
              <div className="mt-3 flex gap-2">{statuses.filter((next) => next !== status).map((next) => <button key={next} onClick={() => updateTask(task.id, { status: next })} className="rounded-lg bg-slate-100 px-2 py-1 text-xs">→ {next}</button>)}</div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function TaskGallery({ tasks }: { tasks: Task[] }) {
  return <div className="grid grid-cols-3 gap-4">{tasks.map((task) => <div key={task.id} className="rounded-3xl border border-slate-200 bg-white p-5"><div className="mb-3 h-24 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100" /><h3 className="font-semibold">{task.name}</h3><p className="mt-1 text-sm text-slate-500">{task.owner} · {task.status}</p><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-violet-500" style={{ width: `${Math.min(100, task.progress)}%` }} /></div></div>)}</div>;
}

function TaskCalendar({ tasks }: { tasks: Task[] }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5">{tasks.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((task) => <div key={task.id} className="flex items-center gap-4 border-b border-slate-100 py-3 last:border-0"><div className="w-28 rounded-xl bg-violet-50 px-3 py-2 text-center text-sm text-violet-700">{task.dueDate}</div><div className="flex-1"><div className="font-medium">{task.name}</div><div className="text-sm text-slate-500">{task.owner} · {task.status} · {task.priority}</div></div></div>)}</div>;
}
