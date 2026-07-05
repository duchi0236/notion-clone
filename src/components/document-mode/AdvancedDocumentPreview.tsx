"use client";

import { useMemo } from "react";
import { EmbeddedDatabasePreview, MathPreview, MermaidPreview, renderAdvancedHtml } from "@/components/editor/notion-grade/RenderedBlocks";

type Segment =
  | { type: "html"; value: string }
  | { type: "mermaid"; value: string }
  | { type: "math"; value: string }
  | { type: "database"; value: string };

function parseAdvancedHtml(html: string): Segment[] {
  const transformed = renderAdvancedHtml(html);
  const regex = /<div data-render="(mermaid|math|database)"(?: data-collection-id="([^"]+)")?>([\s\S]*?)<\/div>/g;
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(transformed))) {
    if (match.index > lastIndex) {
      segments.push({ type: "html", value: transformed.slice(lastIndex, match.index) });
    }
    const kind = match[1];
    const collectionId = match[2];
    const content = match[3];
    if (kind === "database") segments.push({ type: "database", value: collectionId || "" });
    if (kind === "mermaid") segments.push({ type: "mermaid", value: content });
    if (kind === "math") segments.push({ type: "math", value: content });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < transformed.length) segments.push({ type: "html", value: transformed.slice(lastIndex) });
  return segments;
}

export function AdvancedDocumentPreview({ html }: { html: string }) {
  const segments = useMemo(() => parseAdvancedHtml(html), [html]);

  return (
    <div className="advanced-document-preview prose prose-slate max-w-none">
      {segments.map((segment, index) => {
        if (segment.type === "html") return <div key={index} dangerouslySetInnerHTML={{ __html: segment.value }} />;
        if (segment.type === "mermaid") return <MermaidPreview key={index} code={segment.value} />;
        if (segment.type === "math") return <MathPreview key={index} expression={segment.value} />;
        if (segment.type === "database") return <EmbeddedDatabasePreview key={index} collectionId={segment.value} />;
        return null;
      })}
    </div>
  );
}
