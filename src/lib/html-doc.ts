// 「整页 HTML 文档」判定与工具。两端（Web / 移动端）共用同一套约定：
// 一篇文档若其 contentHtml 是一个完整 HTML 页面（或带 sentinel 标记），
// 则以沙箱方式整页渲染，而非走富文本/Markdown 编辑。

export const FULLHTML_SENTINEL = "<!--clawnote:fullhtml-->";

export function isFullHtmlDoc(html: string | null | undefined): boolean {
  if (!html) return false;
  const t = html.trimStart();
  return (
    t.startsWith(FULLHTML_SENTINEL) ||
    /^<!doctype\s+html/i.test(t) ||
    /^<html[\s>]/i.test(t)
  );
}

// 渲染前去掉 sentinel（注释本身无副作用，去掉更干净）。
export function stripSentinel(html: string): string {
  return (html || "").replace(FULLHTML_SENTINEL, "").trimStart();
}

// 保存为整页 HTML 时，确保带上 sentinel，便于稳定识别。
export function ensureSentinel(html: string): string {
  const t = (html || "").trimStart();
  if (t.startsWith(FULLHTML_SENTINEL)) return html;
  return `${FULLHTML_SENTINEL}\n${html}`;
}

// 把一个外部 URL 包装成「整页 iframe」HTML 文档（全屏内嵌）。
export function urlToFullHtml(url: string): string {
  const safe = url.replace(/"/g, "&quot;");
  return `${FULLHTML_SENTINEL}
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100vh;display:block}</style></head>
<body><iframe src="${safe}" allow="clipboard-read; clipboard-write; fullscreen" referrerpolicy="no-referrer"></iframe></body></html>`;
}

// 一个空白整页 HTML 起始模板（用于「切换为 HTML 渲染」时初始化）。
export function starterFullHtml(title = "新 HTML 页面"): string {
  return `${FULLHTML_SENTINEL}
<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;background:#f6f7f9;color:#0f172a;display:flex;min-height:100vh;align-items:center;justify-content:center}
  .card{background:#fff;border:1px solid #e3e6eb;border-radius:20px;padding:40px;max-width:640px;box-shadow:0 20px 60px rgba(15,23,42,.08)}
  h1{margin:0 0 12px}p{color:#64748b;line-height:1.8}
</style></head>
<body><div class="card"><h1>${title}</h1><p>切到「源码」粘贴或编写你的完整 HTML（含 CSS / JS），切回「预览」即可整页渲染。</p></div></body></html>`;
}
