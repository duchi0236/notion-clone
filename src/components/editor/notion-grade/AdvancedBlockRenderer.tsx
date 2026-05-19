"use client";

import { useMemo } from "react";
import { EmbeddedDatabasePreview, MathPreview, MermaidPreview, renderAdvancedHtml } from "./RenderedBlocks";

type Part =
  | { type: "html"; content: string }
  | { type: "mermaid"; content: string }
  | { type: "math"; content: string }
  | { type: "database"; collectionId: string };

function parseRenderedHtml(html: string): Part[] {
  const transformed = renderAdvancedHtml(html);
  const parts: Part[] = [];
  const regex = /<div data-render="(mermaid|math|database)"(?: data-collection-id="([^"]+)")?>([\s\S]*?)<\/div>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(transformed))) {
    if (match.index > lastIndex) {
      parts.push({ type: "html", content: transformed.slice(lastIndex, match.index) });
    }
    if (match[1] === "mermaid") parts.push({ type: "mermaid", content: match[3] });
    if (match[1] === "math") parts.push({ type: "math", content: match[3] });
    if (match[1] === "database") parts.push({ type: "database", collectionId: match[2] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < transformed.length) parts.push({ type: "html", content: transformed.slice(lastIndex) });
  return parts;
}

export function AdvancedBlockRenderer({ html }: { html: string }) {
  const parts = useMemo(() => parseRenderedHtml(html), [html]);

  return (
    <div className="space-y-4">
      {parts.map((part, index) => {
        if (part.type === "html") return <div key={index} dangerouslySetInnerHTML={{ __html: part.content }} />;
        if (part.type === "mermaid") return <MermaidPreview key={index} code={part.content} />;
        if (part.type === "math") return <MathPreview key={index} expression={part.content} />;
        return <EmbeddedDatabasePreview key={index} collectionId={part.collectionId} />;
      })}
    </div>
  );
}
