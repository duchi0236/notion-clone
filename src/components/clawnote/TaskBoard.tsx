"use client";

export type BoardTask = {
  id: string;
  name: string;
  status: string;
  progress: number;
};

const columns = ["todo", "doing", "done"];

export function TaskBoard({ tasks }: { tasks: BoardTask[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {columns.map((column) => (
        <section key={column} className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <b>{column}</b>
            <span className="text-xs text-slate-400">{tasks.filter((task) => task.status === column).length}</span>
          </div>
          {tasks.filter((task) => task.status === column).map((task) => (
            <div key={task.id} className="mb-3 rounded-xl border bg-white p-3 text-sm">
              <div className="font-medium">{task.name}</div>
              <div className="text-xs text-slate-500">{task.progress}%</div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
