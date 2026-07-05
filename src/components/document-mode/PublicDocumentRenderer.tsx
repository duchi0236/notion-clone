"use client";

import { AdvancedBlockRenderer } from "@/components/editor/notion-grade/AdvancedBlockRenderer";

export function PublicDocumentRenderer({ html }: { html: string }) {
  return (
    <div className="prose prose-slate max-w-none">
      <AdvancedBlockRenderer html={html} />
    </div>
  );
}
