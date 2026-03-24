import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Settings, User, Database, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

// 模拟数据
const workspaces = [
  { id: "1", name: "Personal", icon: "👤" },
  { id: "2", name: "Work", icon: "💼" },
];

const recentPages = [
  { id: "1", title: "Project Roadmap", icon: "🗺️", updatedAt: "2 hours ago" },
  { id: "2", title: "Meeting Notes", icon: "📝", updatedAt: "Yesterday" },
  { id: "3", title: "Reading List", icon: "📚", updatedAt: "3 days ago" },
];

const databases = [
  { id: "1", name: "Task Board", icon: "📋", type: "board" },
  { id: "2", name: "Investment Tracker", icon: "💰", type: "table" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Notion Clone</h1>
          </div>
          <div className="flex items-center gap-2">
            <SearchButton />
            <IconButton icon={<Settings className="w-5 h-5" />} />
            <IconButton icon={<User className="w-5 h-5" />} />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border min-h-[calc(100vh-57px)] p-2">
          {/* Workspaces */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground">Workspaces</span>
              <button className="p-1 hover:bg-muted rounded">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {workspaces.map((ws) => (
              <WorkspaceItem key={ws.id} workspace={ws} />
            ))}
          </div>

          {/* Quick Find */}
          <button className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded">
            <Search className="w-4 h-4" />
            <span>Quick Find</span>
            <span className="ml-auto text-xs">⌘K</span>
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Recent */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Recent</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentPages.map((page) => (
                <PageCard key={page.id} page={page} />
              ))}
              <NewPageCard />
            </div>
          </section>

          {/* Databases */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Databases</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {databases.map((db) => (
                <Link
                  key={db.id}
                  href={`/database/${db.id}`}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <span className="text-2xl">{db.icon}</span>
                  <span className="font-medium">{db.name}</span>
                </Link>
              ))}
              <NewDatabaseCard />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SearchButton() {
  return (
    <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted rounded-lg hover:bg-muted/80">
      <Search className="w-4 h-4" />
      <span>Search</span>
      <span className="text-xs">⌘K</span>
    </button>
  );
}

function IconButton({ icon }: { icon: React.ReactNode }) {
  return (
    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
      {icon}
    </button>
  );
}

function WorkspaceItem({ workspace }: { workspace: { id: string; name: string; icon: string } }) {
  return (
    <Link
      href={`/workspace/${workspace.id}`}
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-lg transition-colors"
    >
      <span className="text-lg">{workspace.icon}</span>
      <span className="text-sm">{workspace.name}</span>
    </Link>
  );
}

function PageCard({ page }: { page: { id: string; title: string; icon: string; updatedAt: string } }) {
  return (
    <Link
      href={`/page/${page.id}`}
      className="flex flex-col p-3 border border-border rounded-lg hover:bg-muted transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{page.icon}</span>
      </div>
      <h3 className="font-medium mb-1">{page.title}</h3>
      <span className="text-xs text-muted-foreground">{page.updatedAt}</span>
    </Link>
  );
}

function NewPageCard() {
  return (
    <button className="flex flex-col items-center justify-center p-3 border border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors min-h-[120px]">
      <Plus className="w-6 h-6 mb-2 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">New Page</span>
    </button>
  );
}

function NewDatabaseCard() {
  return (
    <button className="flex flex-col items-center justify-center p-3 border border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors min-h-[80px]">
      <Plus className="w-6 h-6 mb-2 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">New Database</span>
    </button>
  );
}
