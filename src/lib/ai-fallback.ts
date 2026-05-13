export function normalizeText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function fallbackSummary(input: string, max = 180) {
  const text = normalizeText(input);
  if (!text) return "暂无摘要";

  const sentences = text
    .split(/[。！？.!?\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const first = sentences.slice(0, 3).join("。") || text;
  return first.length > max ? `${first.slice(0, max)}…` : first;
}

const KEYWORD_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "are", "was", "were",
  "一个", "一种", "可以", "需要", "当前", "这个", "那个", "以及", "通过", "进行", "已经", "支持",
]);

export function fallbackTags(input: string, limit = 8) {
  const text = normalizeText(input);
  const words = text
    .replace(/[，。！？,.!?;；:：()[\]{}<>"'`]/g, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !KEYWORD_STOP_WORDS.has(item));

  const scores = new Map<string, number>();
  for (const word of words) scores.set(word, (scores.get(word) ?? 0) + 1);

  const explicit = ["OpenClaw", "ClawNote", "Notion", "语雀", "Word", "Excel", "Memory", "Agent", "AI"]
    .filter((item) => text.toLowerCase().includes(item.toLowerCase()));

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .filter((word) => !explicit.includes(word));

  return [...explicit, ...ranked].slice(0, limit);
}

export function extractTodos(input: string, limit = 20) {
  const text = normalizeText(input);
  const candidates = text
    .split(/[。！？.!?\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => /需要|TODO|待办|下一步|实现|修复|部署|接入|补|完成/i.test(item));

  return candidates.slice(0, limit).map((item, index) => ({
    id: `todo-${index + 1}`,
    name: item.length > 80 ? `${item.slice(0, 80)}…` : item,
    status: "未开始",
    priority: /紧急|高|P0|必须/i.test(item) ? "高" : "中",
  }));
}
