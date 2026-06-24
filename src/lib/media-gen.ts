// 供应商无关的生成式媒体核心（文生图 / 文生视频）。
// 默认走 mock（返回占位海报，无需任何 Key、可离线渲染），用于打通整条链路；
// 配置 MEDIA_PROVIDER + MEDIA_API_KEY 后接入真实供应商（可灵 / 即梦 / Runway / Pika …）。

export type MediaKind = "image" | "video";

export type GenResult = {
  status: "done" | "error";
  kind: MediaKind;
  url?: string; // 图片 URL（图）或视频 URL（视频，接入真实供应商后）
  poster?: string; // 视频封面图（mock 阶段视频也用海报占位）
  provider: string;
  mock?: boolean;
  error?: string;
};

const PALETTES = [
  ["#6366f1", "#ec4899"],
  ["#3b82f6", "#06b6d4"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#3b82f6"],
  ["#8b5cf6", "#22d3ee"],
];

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 生成一张占位海报（data:URI SVG），把 prompt 画上去，离线可渲染。
function placeholderPoster(kind: MediaKind, prompt: string): string {
  const seed = prompt.length % PALETTES.length;
  const [a, b] = PALETTES[seed];
  const text = esc(prompt.slice(0, 60) || "未命名");
  const badge = kind === "video" ? "▶ 视频占位" : "图片占位";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <rect x="16" y="16" width="120" height="28" rx="14" fill="rgba(255,255,255,0.25)"/>
  <text x="76" y="35" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#fff">${badge}</text>
  <text x="320" y="190" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="700" fill="#fff">${text}</text>
  <text x="320" y="228" text-anchor="middle" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,0.8)">MOCK · 接入供应商后由模型生成</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function mock(kind: MediaKind, prompt: string): GenResult {
  const poster = placeholderPoster(kind, prompt);
  return kind === "image"
    ? { status: "done", kind, url: poster, provider: "mock", mock: true }
    : { status: "done", kind, poster, provider: "mock", mock: true };
}

// 单个能力(图/视频/剪辑)的供应商配置，来自控制台(AiConfig.mediaProviders)。
export type ProviderConfig = { provider?: string; model?: string; apiKey?: string; baseUrl?: string };

// 真实供应商接入位。各家流程基本一致：提交任务 → 轮询任务状态 → 取结果 URL。
// 这里留好骨架与说明；填好控制台供应商/Key 与对应分支即可启用。
async function callProvider(provider: string, kind: MediaKind, prompt: string, cfg: ProviderConfig): Promise<GenResult> {
  const apiKey = cfg.apiKey || process.env.MEDIA_API_KEY;
  if (!apiKey) return { status: "error", kind, provider, error: "未配置该能力的 API Key（请在 AI 控制台 → 媒体生成 中填写）" };

  // TODO: 按供应商实现。示例（伪代码）：
  //   const submit = await fetch(`${BASE}/v1/${kind}/generations`, {
  //     method: "POST",
  //     headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
  //     body: JSON.stringify({ prompt, /* 时长/分辨率/比例等 */ }),
  //   });
  //   const { taskId } = await submit.json();
  //   // 轮询 taskId 直到 succeeded，取 url
  //   return { status: "done", kind, url, poster, provider };
  //
  // 常见供应商：kling(可灵) / jimeng(即梦) / runway / pika / luma / openai(sora) / google(veo)
  switch (provider) {
    case "kling":
    case "jimeng":
    case "runway":
    case "pika":
    case "luma":
    default:
      return { status: "error", kind, provider, error: `供应商 ${provider} 尚未接入（占位）。请在 media-gen.ts 的 callProvider 中实现。` };
  }
}

export async function generateMedia(kind: MediaKind, prompt: string, cfg: ProviderConfig = {}): Promise<GenResult> {
  if (!prompt.trim()) return { status: "error", kind, provider: "none", error: "请输入描述" };
  // 优先用控制台配置的供应商，其次环境变量，最后 mock
  const provider = (cfg.provider || process.env.MEDIA_PROVIDER || "mock").toLowerCase();
  if (provider === "mock" || provider === "" || provider === "none") return mock(kind, prompt);
  try {
    return await callProvider(provider, kind, prompt, cfg);
  } catch (e) {
    return { status: "error", kind, provider, error: e instanceof Error ? e.message : String(e) };
  }
}
