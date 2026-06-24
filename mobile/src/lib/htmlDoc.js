// 「整页 HTML 文档」判定与工具（与 web 端 src/lib/html-doc.ts 约定一致）。
export const FULLHTML_SENTINEL = "<!--clawnote:fullhtml-->";

export function isFullHtmlDoc(html) {
  if (!html) return false;
  const t = html.trimStart();
  return t.startsWith(FULLHTML_SENTINEL) || /^<!doctype\s+html/i.test(t) || /^<html[\s>]/i.test(t);
}

export function stripSentinel(html) {
  return (html || "").replace(FULLHTML_SENTINEL, "").trimStart();
}

export function ensureSentinel(html) {
  const t = (html || "").trimStart();
  if (t.startsWith(FULLHTML_SENTINEL)) return html;
  return `${FULLHTML_SENTINEL}\n${html}`;
}

export function urlToFullHtml(url) {
  const safe = url.replace(/"/g, "&quot;");
  return `${FULLHTML_SENTINEL}
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100vh;display:block}</style></head>
<body><iframe src="${safe}" allow="clipboard-read; clipboard-write; fullscreen"></iframe></body></html>`;
}

export function starterFullHtml(title = "新 HTML 页面") {
  return `${FULLHTML_SENTINEL}
<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;background:#f6f7f9;color:#0f172a;display:flex;min-height:100vh;align-items:center;justify-content:center}
  .card{background:#fff;border:1px solid #e3e6eb;border-radius:20px;padding:32px;max-width:560px;box-shadow:0 20px 60px rgba(15,23,42,.08)}
  h1{margin:0 0 12px}p{color:#64748b;line-height:1.8}
</style></head>
<body><div class="card"><h1>${title}</h1><p>切到「源码」粘贴或编写完整 HTML（含 CSS / JS），切回「预览」即整页渲染。</p></div></body></html>`;
}
