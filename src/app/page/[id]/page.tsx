"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { NotionEditor } from "@/components/editor/NotionEditor";
import {
  ChevronLeft,
  MoreHorizontal,
  Share,
  Favorite,
  MoreVertical,
  Database,
  FileText,
  Image as ImageIcon,
  Copy,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 模拟页面数据
const mockPage = {
  id: "1",
  title: "Project Roadmap",
  icon: "🗺️",
  coverImage: null,
  content: "<h1>Project Roadmap</h1><p>This is the main project roadmap document.</p>",
  createdAt: "2024-01-15",
  updatedAt: "2 hours ago",
};

export default function PageEditor({ params }: { params: { id: string } }) {
  const [title, setTitle] = useState(mockPage.title);
  const [content, setContent] = useState(mockPage.content);
  const [showCover, setShowCover] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="text-sm text-muted-foreground">
              Last edited {mockPage.updatedAt}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <HeaderButton icon={<Favorite className="w-4 h-4" />} />
            <HeaderButton icon={<Share className="w-4 h-4" />} />
            <button className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
              Share
            </button>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      {showCover && (
        <div className="h-40 bg-gradient-to-r from-pink-500 to-orange-400 relative">
          <button
            onClick={() => setShowCover(false)}
            className="absolute top-2 right-2 p-2 bg-black/20 rounded-lg text-white hover:bg-black/30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Icon & Title */}
        <div className="mb-8">
          <button
            onClick={() => setShowCover(true)}
            className="text-6xl hover:opacity-80 transition-opacity mb-4"
          >
            {mockPage.icon}
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-4xl font-bold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground"
            placeholder="Untitled"
          />
        </div>

        {/* Block Menu */}
        <div className="mb-4 flex flex-wrap gap-2">
          <BlockMenuButton icon={<FileText className="w-4 h-4" />} label="Text" />
          <BlockMenuButton icon={<Heading1 className="w-4 h-4" />} label="Heading 1" />
          <BlockMenuButton icon={<Heading2 className="w-4 h-4" />} label="Heading 2" />
          <BlockMenuButton icon={<Heading3 className="w-4 h-4" />} label="Heading 3" />
          <BlockMenuButton icon={<Database className="w-4 h-4" />} label="Database" />
          <BlockMenuButton icon={<ImageIcon className="w-4 h-4" />} label="Image" />
        </div>

        {/* Editor */}
        <NotionEditor
          content={content}
          onChange={setContent}
          placeholder="Type '/' for commands..."
        />
      </main>
    </div>
  );
}

function HeaderButton({ icon }: { icon: React.ReactNode }) {
  return (
    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
      {icon}
    </button>
  );
}

function BlockMenuButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted rounded-lg transition-colors">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Heading1({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M17 12l3-2v8" />
    </svg>
  );
}

function Heading2({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
    </svg>
  );
}

function Heading3({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" />
      <path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" />
    </svg>
  );
}
