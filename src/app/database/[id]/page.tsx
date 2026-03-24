"use client";

import { useState } from "react";
import Link from "next/link";
import { NotionEditor } from "@/components/editor/NotionEditor";
import {
  ChevronLeft,
  Plus,
  MoreHorizontal,
  Table as TableIcon,
  Kanban,
  Gallery,
  Calendar,
  Filter,
  SortAsc,
  MoreVertical,
  GripVertical,
} from "lucide-react";

// 模拟数据库数据
const mockDatabase = {
  id: "1",
  name: "Task Board",
  icon: "📋",
  type: "board",
  schema: [
    { id: "name", name: "Name", type: "title" },
    { id: "status", name: "Status", type: "select", options: ["Not Started", "In Progress", "Done"] },
    { id: "priority", name: "Priority", type: "select", options: ["Low", "Medium", "High"] },
    { id: "assignee", name: "Assignee", type: "people" },
    { id: "dueDate", name: "Due Date", type: "date" },
  ],
  records: [
    {
      id: "1",
      name: "Design Homepage",
      status: "Done",
      priority: "High",
      assignee: "John",
      dueDate: "2024-02-15",
    },
    {
      id: "2",
      name: "Implement Auth",
      status: "In Progress",
      priority: "High",
      assignee: "Jane",
      dueDate: "2024-02-20",
    },
    {
      id: "3",
      name: "Write Documentation",
      status: "Not Started",
      priority: "Low",
      assignee: null,
      dueDate: null,
    },
  ],
};

const views = [
  { id: "board", name: "Board", icon: Kanban },
  { id: "table", name: "Table", icon: TableIcon },
  { id: "gallery", name: "Gallery", icon: Gallery },
];

export default function DatabaseView({ params }: { params: { id: string } }) {
  const [currentView, setCurrentView] = useState("board");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="text-2xl">{mockDatabase.icon}</span>
            <input
              type="text"
              defaultValue={mockDatabase.name}
              className="text-xl font-semibold bg-transparent border-none outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg">
              <SortAsc className="w-4 h-4" />
              Sort
            </button>
            <button className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
              <Plus className="w-4 h-4 inline mr-1" />
              New
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 px-4 pb-2">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setCurrentView(view.id)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                currentView === view.id
                  ? "bg-muted font-medium"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <view.icon className="w-4 h-4" />
              {view.name}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        {currentView === "board" && <BoardView data={mockDatabase} />}
        {currentView === "table" && <TableView data={mockDatabase} />}
        {currentView === "gallery" && <GalleryView data={mockDatabase} />}
      </main>
    </div>
  );
}

// Board View (Kanban)
function BoardView({ data }: { data: typeof mockDatabase }) {
  const statusColumns = data.schema.find((s) => s.id === "status")?.options || [];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statusColumns.map((status) => (
        <div key={status} className="flex-shrink-0 w-72">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{status}</h3>
            <span className="text-sm text-muted-foreground">
              {data.records.filter((r) => r.status === status).length}
            </span>
          </div>
          <div className="space-y-2">
            {data.records
              .filter((r) => r.status === status)
              .map((record) => (
                <div
                  key={record.id}
                  className="p-3 bg-background border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium">{record.name}</span>
                    <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={record.priority} />
                    {record.assignee && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {record.assignee}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            <button className="flex items-center gap-2 w-full p-2 text-sm text-muted-foreground hover:bg-muted rounded-lg">
              <Plus className="w-4 h-4" />
              Add card
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Table View
function TableView({ data }: { data: typeof mockDatabase }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="w-8 p-3">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </th>
            {data.schema.map((field) => (
              <th key={field.id} className="p-3 text-left text-sm font-medium">
                {field.name}
              </th>
            ))}
            <th className="w-8 p-3"></th>
          </tr>
        </thead>
        <tbody>
          {data.records.map((record) => (
            <tr key={record.id} className="border-t border-border hover:bg-muted/30">
              <td className="p-3">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              </td>
              <td className="p-3 font-medium">{record.name}</td>
              <td className="p-3">
                <StatusBadge status={record.status} />
              </td>
              <td className="p-3">
                <PriorityBadge priority={record.priority} />
              </td>
              <td className="p-3">{record.assignee || "-"}</td>
              <td className="p-3 text-muted-foreground">{record.dueDate || "-"}</td>
              <td className="p-3">
                <button className="p-1 hover:bg-muted rounded">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="flex items-center gap-2 w-full p-3 text-sm text-muted-foreground hover:bg-muted/50 border-t border-border">
        <Plus className="w-4 h-4" />
        Add row
      </button>
    </div>
  );
}

// Gallery View
function GalleryView({ data }: { data: typeof mockDatabase }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {data.records.map((record) => (
        <div
          key={record.id}
          className="border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
        >
          <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-500" />
          <div className="p-3">
            <h3 className="font-medium mb-2">{record.name}</h3>
            <div className="flex items-center gap-2">
              <StatusBadge status={record.status} />
              <PriorityBadge priority={record.priority} />
            </div>
          </div>
        </div>
      ))}
      <button className="flex flex-col items-center justify-center h-40 border border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors">
        <Plus className="w-6 h-6 mb-2 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">New</span>
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "Not Started": "bg-gray-100 text-gray-600",
    "In Progress": "bg-yellow-100 text-yellow-700",
    Done: "bg-green-100 text-green-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] || ""}`}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    Low: "bg-blue-100 text-blue-700",
    Medium: "bg-orange-100 text-orange-700",
    High: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[priority] || ""}`}>
      {priority}
    </span>
  );
}
