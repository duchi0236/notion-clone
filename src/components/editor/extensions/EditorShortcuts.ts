import { Extension, InputRule, markInputRule } from "@tiptap/core";
import type { Editor } from "@tiptap/core";

// 取选区所在的顶层块（depth-1）的位置与节点
function topBlock(editor: Editor): { pos: number; node: import("@tiptap/pm/model").Node } | null {
  const { state } = editor;
  try {
    const pos = state.selection.$from.before(1);
    const node = state.doc.nodeAt(pos);
    return node ? { pos, node } : null;
  } catch {
    return null;
  }
}

function moveBlock(editor: Editor, dir: 1 | -1): boolean {
  const info = topBlock(editor);
  if (!info) return false;
  const { state, view } = editor;
  const { pos, node } = info;
  let tr = state.tr;
  if (dir === 1) {
    const after = pos + node.nodeSize;
    const next = state.doc.nodeAt(after);
    if (!next) return false;
    tr = tr.delete(pos, after).insert(pos + next.nodeSize, node);
  } else {
    const $pos = state.doc.resolve(pos);
    const index = $pos.index(0);
    if (index === 0) return false;
    const before = $pos.posAtIndex(index - 1, 0);
    tr = tr.delete(pos, pos + node.nodeSize).insert(before, node);
  }
  view.dispatch(tr.scrollIntoView());
  return true;
}

function duplicateBlock(editor: Editor): boolean {
  const info = topBlock(editor);
  if (!info) return false;
  const { state, view } = editor;
  view.dispatch(state.tr.insert(info.pos + info.node.nodeSize, info.node).scrollIntoView());
  return true;
}

function deleteBlock(editor: Editor): boolean {
  const info = topBlock(editor);
  if (!info) return false;
  const { state, view } = editor;
  view.dispatch(state.tr.delete(info.pos, info.pos + info.node.nodeSize));
  return true;
}

// Notion 式 Markdown 即时转换 + 块级键盘快捷键。
export const EditorShortcuts = Extension.create({
  name: "editorShortcuts",

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-ArrowUp": () => moveBlock(this.editor, -1),
      "Mod-Shift-ArrowDown": () => moveBlock(this.editor, 1),
      "Mod-Shift-d": () => duplicateBlock(this.editor),
      "Mod-Shift-Backspace": () => deleteBlock(this.editor),
    };
  },

  addInputRules() {
    const rules: InputRule[] = [];

    // [] / [ ] / [x] + 空格 → 待办（行首）
    rules.push(
      new InputRule({
        find: /^\[( |x|)\]\s$/,
        handler: ({ range, match, chain }) => {
          const checked = match[1] === "x";
          chain().deleteRange({ from: range.from, to: range.to }).toggleTaskList().run();
          if (checked) this.editor.commands.updateAttributes("taskItem", { checked: true });
        },
      }),
    );

    // ==高亮== → highlight 标记
    const highlight = this.editor.schema.marks.highlight;
    if (highlight) {
      rules.push(markInputRule({ find: /(?:^|\s)(==(?!\s)([^=]+)==)$/, type: highlight }));
    }

    return rules;
  },
});
