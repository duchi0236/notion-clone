"use client";

export type ClawTask = {
  id: string;
  name: string;
  status: string;
  progress: number;
};

export function TaskList({ tasks }: { tasks: ClawTask[] }) {
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div key={task.id} className="rounded-xl border bg-white p-3 text-sm">
          <div className="font-medium">{task.name}</div>
          <div className="text-xs text-slate-500">{task.status} · {task.progress}%</div>
        </div>
      ))}
    </div>
  );
}
