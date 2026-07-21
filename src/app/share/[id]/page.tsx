import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PageIcon } from "@/components/clawnote/pro/PageIcon";
import { isFullHtmlDoc, stripSentinel } from "@/lib/html-doc";

export default async function SharedPage({ params }: { params: { id: string } }) {
  const document = await prisma.document.findFirst({
    where: { id: params.id, isPublished: true, isArchived: false },
  });

  if (!document) notFound();

  // 整页 HTML 文档：全屏沙箱 iframe 呈现，保留原始设计与交互。
  if (isFullHtmlDoc(document.contentHtml)) {
    return (
      <iframe
        title={document.title}
        className="h-screen w-screen border-0"
        sandbox="allow-scripts allow-popups allow-forms allow-modals"
        srcDoc={stripSentinel(document.contentHtml)}
      />
    );
  }

  return (
    <main className="claw-standalone px-4 py-10 sm:px-6 sm:py-14">
      <article className="claw-card mx-auto max-w-[860px] p-7 sm:p-12">
        {document.coverImage && <div className="mb-10 h-64 rounded-[18px] bg-cover bg-center shadow-inner" style={{ backgroundImage: `url(${document.coverImage})` }} />}
        <div className="mb-6"><PageIcon icon={document.icon} size="lg" /></div>
        <h1 className="mb-4 text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">{document.title}</h1>
        <div className="mb-10 border-b border-slate-100 pb-6 text-sm text-slate-500">由 ClawNote 发布 · {formatDate(document.updatedAt)}</div>
        <div className="prose prose-slate max-w-none text-[16px] leading-8" dangerouslySetInnerHTML={{ __html: document.contentHtml }} />
      </article>
    </main>
  );
}
