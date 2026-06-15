import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PageIcon } from "@/components/clawnote/pro/PageIcon";

export default async function SharedPage({ params }: { params: { id: string } }) {
  const document = await prisma.document.findFirst({
    where: { id: params.id, isPublished: true, isArchived: false },
  });

  if (!document) notFound();

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-slate-900">
      <article className="mx-auto max-w-3xl">
        {document.coverImage && <div className="mb-10 h-56 rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${document.coverImage})` }} />}
        <div className="mb-5"><PageIcon icon={document.icon} size="lg" /></div>
        <h1 className="mb-4 text-5xl font-bold tracking-normal">{document.title}</h1>
        <div className="mb-10 text-sm text-slate-500">由 ClawNote 发布 · {formatDate(document.updatedAt)}</div>
        <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: document.contentHtml }} />
      </article>
    </main>
  );
}
