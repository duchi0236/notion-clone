// 净化并返回安全可内联的 SVG 字符串；非法则返回空串。
// 移除 <script>/<foreignObject>、on* 事件属性和 javascript: 链接，避免 XSS。
export function sanitizeSvg(input: string): string {
  if (typeof window === "undefined" || !input.trim()) return "";
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(input, "image/svg+xml");
  } catch {
    return "";
  }
  if (doc.querySelector("parsererror")) return "";
  const svg = doc.querySelector("svg");
  if (!svg) return "";
  svg.querySelectorAll("script, foreignObject").forEach((el) => el.remove());
  const walk = (el: Element) => {
    Array.from(el.attributes).forEach((a) => {
      const name = a.name.toLowerCase();
      const val = a.value.replace(/\s/g, "").toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(a.name);
      if ((name === "href" || name === "xlink:href") && val.startsWith("javascript:")) el.removeAttribute(a.name);
    });
    Array.from(el.children).forEach(walk);
  };
  walk(svg);
  return svg.outerHTML;
}
