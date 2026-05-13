import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocumentVersion, htmlToText, summarize, upsertSearchIndex } from "@/lib/clawnote-store";

export async function POST(_: NextRequest, { params }: { params: { id: string; version: string } }) {
  const versionNumber = Number(params.version);
  if (!Number.isFinite(versionNumber)) {
    return NextResponse.json({ error: "Invalid version number" }, { status: 400 });
  }

  const version = await prisma.documentVersion.findUnique({
    where: {
      documentId_version: {
        documentId: params.id,
        version: versionNumber,
      },
    },
  });

  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const snapshot = version.snapshot as Record<string, unknown>;
  const contentHtml = String(snapshot.contentHtml ?? "<h1>Untitled</h1><p></p>");
  const contentText = String(snapshot.contentText ?? htmlToText(contentHtml));
  const tags = Array.isArray(snapshot.tags) ? snapshot.tags.map(String) : [];
  const contentJson =
    snapshot.contentJson && typeof snapshot.contentJson === "object"
      ? snapshot.contentJson
      : { type: "doc", content: [{ type: "html", html: contentHtml }] };

  const document = await prisma.document.update({
    where: { id: params.id },
    data: {
      title: String(snapshot.title ?? "Untitled"),
      icon: typeof snapshot.icon === "string" ? snapshot.icon : "📄",
      contentHtml,
      contentText,
      contentJson: contentJson as object,
      summary: typeof snapshot.summary === "string" ? snapshot.summary : summarize(contentText),
      tags,
    },
  });

  await createDocumentVersion(document.id, "version-restore", document, `restore-version-${versionNumber}`);
  await upsertSearchIndex(document.id, {
    title: document.title,
    text: document.contentText,
    summary: document.summary,
    tags: document.tags,
  });

  return NextResponse.json({ document, restoredFrom: versionNumber });
}
