import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicDocumentRenderer } from "@/components/document-mode/PublicDocumentRenderer";

export default async function PublicDocumentPage({ params }: { params: { id: string } }) {
  const document = await prisma.document.findFirst({
    where: {
      id: params.id,
      isPublished: true,
      isArchived: false,
    },
  });

  if (!document) notFound();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <article className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-8 text-5xl">{document.icon ?? "📄"}</div>
        <h1 className="mb-4 text-5xl font-bold tracking-tight">{document.title}</h1>
        <div className="mb-10 flex gap-4 border-b border-slate-100 pb-5 text-sm text-slate-500">
          <span>ClawNote Public Document</span>
          <span>{new Date(document.updatedAt).toLocaleDateString()}</span>
        </div>
        <PublicDocumentRenderer html={document.contentHtml} />
      </article>
    </main>
  );
}
