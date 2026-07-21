import ClawNotePro from "@/components/clawnote/pro/ClawNotePro";

// 玻璃工作台（主入口）。合并期间曾被换成 document-mode 的 DocumentOnlyApp，
// 那套界面保留在 /docs 路由，两者共存。
export default function ClawNotePage() {
  return <ClawNotePro />;
}
