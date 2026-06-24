"use client";

import { BubbleMenu, EditorContent, useEditor } from "@tiptap/react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { NodeSelection } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { ResizableImage } from "./extensions/ResizableImage";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { common, createLowlight } from "lowlight";
import { Callout } from "./extensions/Callout";
import { Toggle } from "./extensions/Toggle";
import { TableOfContents } from "./extensions/TableOfContents";
import { DrawioBlock, MINDMAP_TEMPLATE } from "./extensions/DrawioBlock";
import { EditorShortcuts } from "./extensions/EditorShortcuts";
import { HtmlBlock } from "./extensions/HtmlBlock";
import { SvgBlock } from "./extensions/SvgBlock";
import { MediaBlock } from "./extensions/MediaBlock";
import { useEffect, useMemo, useRef, useState } from "react";

const lowlight = createLowlight(common);

// Real-time collaboration is opt-in: set NEXT_PUBLIC_COLLAB=1 and run the
// y-websocket server (npm run collab) to enable multi-user editing.
const COLLAB_ENABLED = process.env.NEXT_PUBLIC_COLLAB === "1";
const COLLAB_WS_URL = process.env.NEXT_PUBLIC_COLLAB_WS || "ws://localhost:1234";
const CURSOR_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

function randomUser() {
  const color = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
  return { name: `用户${Math.floor(Math.random() * 1000)}`, color };
}
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Brain,
  CheckSquare,
  ChevronDown,
  Code,
  Code2,
  Columns3,
  Copy,
  CornerDownRight,
  Film,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImageIcon,
  Info,
  Italic,
  Keyboard,
  Link2,
  Loader2,
  List,
  ListOrdered,
  ListTree,
  Maximize2,
  Minimize2,
  Minus,
  MoveDown,
  MoveUp,
  Paperclip,
  Plus,
  Quote,
  Rows3,
  Shapes,
  Strikethrough,
  TableIcon,
  Trash2,
  Type,
  Underline as UnderlineIcon,
  Workflow,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UploadedFile = {
  name: string;
  url: string;
  type: string;
};

type CommandGroup = "基础" | "结构" | "媒体";

type CommandItem = {
  label: string;
  hint: string;
  group: CommandGroup;
  icon: React.ReactNode;
  keywords: string[];
  action: () => void;
};

function getSlashQuery(editor: Editor | null) {
  if (!editor) return null;
  const { from } = editor.state.selection;
  const text = editor.state.doc.textBetween(Math.max(0, from - 40), from, "\n", "\n");
  const match = text.match(/(?:^|\s)\/([^\s/]*)$/);
  return match ? match[1] : null;
}

export function ClawTipTapEditor({
  content,
  onChange,
  onTextChange,
  onJsonChange,
  docId,
}: {
  content: string;
  onChange: (html: string) => void;
  onTextChange?: (text: string) => void;
  onJsonChange?: (json: unknown) => void;
  docId?: string;
}) {
  const collab = COLLAB_ENABLED && !!docId;
  // One Y.Doc + websocket provider per document (the editor remounts per doc).
  const yState = useMemo(() => {
    if (!collab) return null;
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(COLLAB_WS_URL, `clawnote-${docId}`, ydoc);
    return { ydoc, provider, user: randomUser() };
  }, [collab, docId]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const actionsRef = useRef<CommandItem[]>([]);
  const selectedIndexRef = useRef(0);
  const showMenuRef = useRef(false);
  const activeBlockRef = useRef<HTMLElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [railTop, setRailTop] = useState(12);
  const [blockMenu, setBlockMenu] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  function findBlockElement(target: EventTarget | Node | null) {
    if (!target || !(target instanceof Node)) return null;
    const root = rootRef.current;
    if (!root) return null;
    const element = target.nodeType === Node.TEXT_NODE ? target.parentElement : target;
    if (!(element instanceof HTMLElement)) return null;

    const table = element.closest(".tableWrapper");
    if (table instanceof HTMLElement && root.contains(table)) return table;

    const listItem = element.closest("li");
    if (listItem instanceof HTMLElement && root.contains(listItem)) return listItem;

    const block = element.closest("p, h1, h2, h3, blockquote, pre, hr");
    return block instanceof HTMLElement && root.contains(block) ? block : null;
  }

  function findBlockAtPoint(x: number, y: number) {
    const root = rootRef.current;
    if (!root) return null;
    const ownerDocument = root.ownerDocument;
    const elements = ownerDocument.elementsFromPoint(x, y);
    for (const element of elements) {
      const block = findBlockElement(element);
      if (block) return block;
    }

    const documentWithCaret = ownerDocument as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null;
    };
    const caretNode =
      documentWithCaret.caretRangeFromPoint?.(x, y)?.startContainer ??
      documentWithCaret.caretPositionFromPoint?.(x, y)?.offsetNode ??
      null;
    return findBlockElement(caretNode);
  }

  function syncRailToBlock(block: HTMLElement | null) {
    const root = rootRef.current;
    if (!root || !block) return;
    activeBlockRef.current = block;
    const rootRect = root.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();
    const style = window.getComputedStyle(block);
    const parsedLineHeight = Number.parseFloat(style.lineHeight);
    const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : Math.min(blockRect.height, 32);
    const firstLineHeight = block.matches(".tableWrapper") ? 32 : Math.min(blockRect.height || lineHeight, lineHeight);
    const lineCenter = blockRect.top + firstLineHeight / 2;
    const nextTop = Math.max(0, lineCenter - rootRect.top - 15);
    setRailTop(Math.round(nextTop * 2) / 2);
  }

  function syncRailToSelection() {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;
    const { from } = currentEditor.state.selection;
    const domAtPos = currentEditor.view.domAtPos(from);
    syncRailToBlock(findBlockElement(domAtPos.node));
  }

  function closeSlashMenu() {
    showMenuRef.current = false;
    setShowMenu(false);
    setSlashQuery("");
    selectedIndexRef.current = 0;
    setSelectedIndex(0);
  }

  function openSlashMenu() {
    showMenuRef.current = true;
    setShowMenu(true);
    setSlashQuery("");
    selectedIndexRef.current = 0;
    setSelectedIndex(0);
  }

  function refreshSlashQuery() {
    const query = getSlashQuery(editorRef.current);
    if (query === null) {
      closeSlashMenu();
      return;
    }
    setSlashQuery(query);
    selectedIndexRef.current = 0;
    setSelectedIndex(0);
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        dropcursor: { color: "#2563eb", width: 2 },
        ...(collab ? { history: false } : {}),
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return "标题";
          return "输入 '/' 快速插入块，或直接开始写作...";
        },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false }),
      ResizableImage,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true, handleWidth: 8, cellMinWidth: 64, allowTableNodeSelection: true }),
      TableRow,
      TableCell,
      TableHeader,
      Callout,
      Toggle,
      TableOfContents,
      DrawioBlock,
      HtmlBlock,
      SvgBlock,
      MediaBlock,
      EditorShortcuts,
      ...(collab && yState
        ? [
            Collaboration.configure({ document: yState.ydoc }),
            CollaborationCursor.configure({ provider: yState.provider, user: yState.user }),
          ]
        : []),
    ],
    content: collab ? undefined : content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      onTextChange?.(editor.getText());
      onJsonChange?.(editor.getJSON());
    },
    onSelectionUpdate: () => {
      window.setTimeout(syncRailToSelection, 0);
    },
    onFocus: () => {
      window.setTimeout(syncRailToSelection, 0);
    },
    editorProps: {
      attributes: {
        class: "clawnote-editor min-h-[360px] bg-transparent px-0 py-1 text-[16.5px] leading-8 outline-none",
      },
      handleKeyDown: (_view, event) => {
        if (showMenuRef.current) {
          if (event.key === "Escape") {
            event.preventDefault();
            closeSlashMenu();
            return true;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            const next = Math.min(selectedIndexRef.current + 1, Math.max(0, actionsRef.current.length - 1));
            selectedIndexRef.current = next;
            setSelectedIndex(next);
            return true;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            const next = Math.max(selectedIndexRef.current - 1, 0);
            selectedIndexRef.current = next;
            setSelectedIndex(next);
            return true;
          }
          if (event.key === "Enter" || event.key === "Tab") {
            const item = actionsRef.current[selectedIndexRef.current];
            if (item) {
              event.preventDefault();
              run(item.action);
              return true;
            }
          }
          window.setTimeout(refreshSlashQuery, 0);
        }
        if (event.key === "/") window.setTimeout(openSlashMenu, 0);
        return false;
      },
      handleDrop: (_view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (!file) return false;
        event.preventDefault();
        void uploadFile(file);
        return true;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const timer = window.setTimeout(syncRailToSelection, 0);
    return () => window.clearTimeout(timer);
  }, [editor, content]);

  useEffect(() => {
    const root = rootRef.current;
    if (!editor || !root) return;
    const syncFromPointer = (event: MouseEvent | PointerEvent) => {
      syncRailToBlock(findBlockAtPoint(event.clientX, event.clientY) ?? findBlockElement(event.target));
    };
    root.addEventListener("pointermove", syncFromPointer);
    root.addEventListener("mousemove", syncFromPointer);
    return () => {
      root.removeEventListener("pointermove", syncFromPointer);
      root.removeEventListener("mousemove", syncFromPointer);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || collab) return; // in collab mode the Y.Doc is the source of truth
    if (content && content !== editor.getHTML()) editor.commands.setContent(content, false);
  }, [content, editor, collab]);

  // Collaboration: seed the shared doc from stored HTML once (first client only),
  // and tear the provider down on unmount.
  useEffect(() => {
    if (!editor || !collab || !yState) return;
    const { provider, ydoc } = yState;
    const seed = () => {
      const fragment = ydoc.getXmlFragment("default");
      if (fragment.length === 0 && content) editor.commands.setContent(content, false);
    };
    provider.on("sync", seed);
    return () => {
      provider.off("sync", seed);
      provider.destroy();
      ydoc.destroy();
    };
  }, [editor, collab, yState, content]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeSlashMenu();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function uploadFile(file: File) {
    if (!editor) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/files", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.file) return;
      insertUploaded(data.file as UploadedFile);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // 上传并返回图片 URL（供图片弹窗使用），不直接插入
  async function uploadImageForDialog(file: File): Promise<string | null> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/files", { method: "POST", body: form }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    return data?.file?.url ?? null;
  }

  function insertUploaded(file: UploadedFile) {
    if (!editor) return;
    if (file.type?.startsWith("image/")) {
      editor.chain().focus().setImage({ src: file.url, alt: file.name }).run();
      return;
    }
    editor.chain().focus().insertContent({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: `附件：${file.name}`,
          marks: [{ type: "link", attrs: { href: file.url } }],
        },
      ],
    }).run();
  }

  function removeSlash() {
    if (!editor) return;
    const { from } = editor.state.selection;
    const previous = editor.state.doc.textBetween(Math.max(0, from - 1), from);
    if (previous === "/") editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
  }

  function run(action: () => void) {
    removeSlash();
    closeSlashMenu();
    action();
  }

  // ---- Block handle operations (target the top-level block under the rail) ----
  function topBlockPos(): number | null {
    const ed = editorRef.current;
    const el = activeBlockRef.current;
    if (!ed || !el) return null;
    try {
      const pos = ed.view.posAtDOM(el, 0);
      return ed.state.doc.resolve(pos).before(1);
    } catch {
      return null;
    }
  }
  function activeNode(): { pos: number; node: PMNode } | null {
    const ed = editorRef.current;
    const pos = topBlockPos();
    if (!ed || pos == null) return null;
    const node = ed.state.doc.nodeAt(pos);
    return node ? { pos, node } : null;
  }
  function blockMove(dir: 1 | -1) {
    const ed = editorRef.current;
    const info = activeNode();
    if (!ed || !info) return;
    const { state, view } = ed;
    const { pos, node } = info;
    let tr = state.tr;
    if (dir === 1) {
      const after = pos + node.nodeSize;
      const next = state.doc.nodeAt(after);
      if (!next) return;
      tr = tr.delete(pos, after).insert(pos + next.nodeSize, node);
    } else {
      const $pos = state.doc.resolve(pos);
      const index = $pos.index(0);
      if (index === 0) return;
      const before = $pos.posAtIndex(index - 1, 0);
      tr = tr.delete(pos, pos + node.nodeSize).insert(before, node);
    }
    view.dispatch(tr.scrollIntoView());
    setBlockMenu(false);
  }
  function blockDuplicate() {
    const ed = editorRef.current;
    const info = activeNode();
    if (!ed || !info) return;
    ed.view.dispatch(ed.state.tr.insert(info.pos + info.node.nodeSize, info.node).scrollIntoView());
    setBlockMenu(false);
  }
  function blockDelete() {
    const ed = editorRef.current;
    const info = activeNode();
    if (!ed || !info) return;
    ed.view.dispatch(ed.state.tr.delete(info.pos, info.pos + info.node.nodeSize));
    setBlockMenu(false);
  }
  function blockInsertBelow() {
    const ed = editorRef.current;
    const info = activeNode();
    if (!ed || !info) return;
    const after = info.pos + info.node.nodeSize;
    ed.chain().insertContentAt(after, { type: "paragraph" }).focus(after + 1).run();
    setBlockMenu(false);
    openSlashMenu();
  }
  function blockTurnInto(kind: string) {
    const ed = editorRef.current;
    const info = activeNode();
    if (!ed || !info) return;
    const c = ed.chain().focus().setTextSelection(info.pos + 1);
    if (kind === "paragraph") c.setParagraph().run();
    else if (kind === "h1") c.setNode("heading", { level: 1 }).run();
    else if (kind === "h2") c.setNode("heading", { level: 2 }).run();
    else if (kind === "h3") c.setNode("heading", { level: 3 }).run();
    else if (kind === "bullet") c.toggleBulletList().run();
    else if (kind === "todo") c.toggleTaskList().run();
    else if (kind === "quote") c.toggleBlockquote().run();
    setBlockMenu(false);
  }
  function onGripDragStart(event: React.DragEvent) {
    const ed = editorRef.current;
    const pos = topBlockPos();
    if (!ed || pos == null) {
      event.preventDefault();
      return;
    }
    const { state, view } = ed;
    const sel = NodeSelection.create(state.doc, pos);
    view.dispatch(state.tr.setSelection(sel));
    const slice = view.state.selection.content();
    (view as unknown as { dragging: unknown }).dragging = { slice, move: true };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", " ");
    setBlockMenu(false);
  }

  const setLink = () => {
    if (!editor) return;
    setLinkDialogOpen(true);
  };

  function applyLink(url: string) {
    if (!editor) return;
    const trimmed = url.trim();
    if (trimmed) editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
    else editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkDialogOpen(false);
  }

  function insertCompactTable(rows = 3, cols = 3, columnWidth = 104) {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: "table",
      content: Array.from({ length: rows }, () => ({
        type: "tableRow",
        content: Array.from({ length: cols }, () => ({
          type: "tableCell",
          attrs: { colspan: 1, rowspan: 1, colwidth: [columnWidth] },
          content: [{ type: "paragraph" }],
        })),
      })),
    }).run();
  }

  function resizeActiveTable(columnWidth: number) {
    if (!editor) return;
    const { state, view } = editor;
    const { $from } = state.selection;
    let tableDepth = -1;

    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).type.name === "table") {
        tableDepth = depth;
        break;
      }
    }

    if (tableDepth < 0) return;
    const tableNode = $from.node(tableDepth);
    const tablePos = $from.before(tableDepth);
    let transaction = state.tr;

    tableNode.descendants((node, pos) => {
      if (node.type.name !== "tableCell" && node.type.name !== "tableHeader") return;
      transaction = transaction.setNodeMarkup(tablePos + 1 + pos, undefined, {
        ...node.attrs,
        colwidth: Array.from({ length: Number(node.attrs.colspan ?? 1) }, () => columnWidth),
      });
    });

    if (transaction.docChanged) {
      view.dispatch(transaction);
      view.focus();
    }
  }

  const actions = useMemo<CommandItem[]>(() => {
    if (!editor) return [];
    return [
      {
      label: "正文",
      hint: "转换为普通段落",
      group: "基础",
      icon: <span className="text-sm font-semibold">T</span>,
      keywords: ["paragraph", "text", "正文", "段落"],
      action: () => editor.chain().focus().setParagraph().run(),
    },
    {
      label: "标题 1",
      hint: "页面中的大标题",
      group: "基础",
      icon: <Heading1 className="h-4 w-4" />,
      keywords: ["h1", "heading", "标题", "一级标题"],
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "标题 2",
      hint: "章节标题",
      group: "基础",
      icon: <Heading2 className="h-4 w-4" />,
      keywords: ["h2", "heading", "标题", "二级标题"],
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "标题 3",
      hint: "小节标题",
      group: "基础",
      icon: <Heading3 className="h-4 w-4" />,
      keywords: ["h3", "heading", "标题", "三级标题"],
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "待办",
      hint: "可勾选任务",
      group: "结构",
      icon: <CheckSquare className="h-4 w-4" />,
      keywords: ["todo", "task", "checkbox", "待办", "任务"],
      action: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: "列表",
      hint: "项目符号列表",
      group: "结构",
      icon: <List className="h-4 w-4" />,
      keywords: ["bullet", "list", "ul", "列表"],
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "编号",
      hint: "有序列表",
      group: "结构",
      icon: <ListOrdered className="h-4 w-4" />,
      keywords: ["number", "ordered", "ol", "编号", "有序"],
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "引用",
      hint: "强调一段内容",
      group: "结构",
      icon: <Quote className="h-4 w-4" />,
      keywords: ["quote", "blockquote", "引用"],
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "代码",
      hint: "代码块（语法高亮）",
      group: "结构",
      icon: <Code className="h-4 w-4" />,
      keywords: ["code", "代码", "syntax"],
      action: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: "分割线",
      hint: "水平分割线",
      group: "结构",
      icon: <Minus className="h-4 w-4" />,
      keywords: ["divider", "hr", "分割线", "分隔"],
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      label: "高亮块",
      hint: "Callout 强调框，可换图标",
      group: "结构",
      icon: <Info className="h-4 w-4" />,
      keywords: ["callout", "高亮块", "提示", "强调"],
      action: () => editor.chain().focus().setCallout().run(),
    },
    {
      label: "折叠",
      hint: "Toggle 可折叠内容",
      group: "结构",
      icon: <CornerDownRight className="h-4 w-4" />,
      keywords: ["toggle", "折叠", "collapse", "展开"],
      action: () => editor.chain().focus().setToggle().run(),
    },
    {
      label: "目录",
      hint: "自动汇总文档标题",
      group: "结构",
      icon: <ListTree className="h-4 w-4" />,
      keywords: ["toc", "目录", "大纲", "outline"],
      action: () => editor.chain().focus().setTableOfContents().run(),
    },
    {
      label: "表格",
      hint: "插入紧凑 3 x 3 表格，可拖动列宽",
      group: "结构",
      icon: <TableIcon className="h-4 w-4" />,
      keywords: ["table", "grid", "表格"],
      action: () => insertCompactTable(),
    },
    {
      label: "绘图",
      hint: "draw.io 画布：流程图、架构图、UML",
      group: "媒体",
      icon: <Workflow className="h-4 w-4" />,
      keywords: ["drawio", "diagram", "画图", "绘图", "流程图", "架构图", "uml"],
      action: () => editor.chain().focus().setDrawio().run(),
    },
    {
      label: "脑图",
      hint: "思维导图（draw.io，含起始模板）",
      group: "媒体",
      icon: <Brain className="h-4 w-4" />,
      keywords: ["mindmap", "脑图", "思维导图", "导图"],
      action: () => editor.chain().focus().setDrawio({ xml: MINDMAP_TEMPLATE }).run(),
    },
    {
      label: "图片",
      hint: "上传本地图片，或粘贴图片链接",
      group: "媒体",
      icon: <ImageIcon className="h-4 w-4" />,
      keywords: ["image", "picture", "图片", "上传", "url"],
      action: () => setImageDialogOpen(true),
    },
    {
      label: "HTML",
      hint: "渲染任意 HTML（含 CSS / JS，沙箱运行）",
      group: "媒体",
      icon: <Code2 className="h-4 w-4" />,
      keywords: ["html", "embed", "嵌入", "代码渲染", "网页"],
      action: () => editor.chain().focus().setHtmlBlock().run(),
    },
    {
      label: "SVG 图形",
      hint: "粘贴 / 编写 SVG 源码，内联渲染矢量图",
      group: "媒体",
      icon: <Shapes className="h-4 w-4" />,
      keywords: ["svg", "矢量", "图形", "vector", "画图", "插画"],
      action: () => editor.chain().focus().setSvgBlock().run(),
    },
    {
      label: "AI 生成图片",
      hint: "输入描述，AI 文生图（接入供应商后生效）",
      group: "媒体",
      icon: <ImageIcon className="h-4 w-4" />,
      keywords: ["ai", "图片", "文生图", "生成", "image", "draw", "插图"],
      action: () => editor.chain().focus().setMediaBlock({ kind: "image" }).run(),
    },
    {
      label: "AI 生成视频",
      hint: "输入描述，AI 文生视频（接入供应商后生效）",
      group: "媒体",
      icon: <Film className="h-4 w-4" />,
      keywords: ["ai", "视频", "文生视频", "生成", "video", "短视频"],
      action: () => editor.chain().focus().setMediaBlock({ kind: "video" }).run(),
    },
    {
      label: "上传文件",
      hint: "上传图片或附件",
      group: "媒体",
      icon: <Paperclip className={cn("h-4 w-4", uploading && "animate-pulse")} />,
      keywords: ["file", "attach", "upload", "附件", "上传"],
      action: () => fileInputRef.current?.click(),
    },
    {
      label: "快捷键",
      hint: "查看所有键盘快捷键与 Markdown 语法",
      group: "媒体",
      icon: <Keyboard className="h-4 w-4" />,
      keywords: ["shortcut", "快捷键", "键盘", "markdown", "help", "帮助"],
      action: () => setShortcutsOpen(true),
    },
    ];
  }, [editor, uploading]);

  const filteredActions = actions.filter((item) => {
    const query = slashQuery.trim().toLowerCase();
    if (!query) return true;
    return `${item.label} ${item.hint} ${item.keywords.join(" ")}`.toLowerCase().includes(query);
  });
  actionsRef.current = filteredActions;

  useEffect(() => {
    if (filteredActions.length === 0) return;
    if (selectedIndex < filteredActions.length) return;
    const next = filteredActions.length - 1;
    selectedIndexRef.current = next;
    setSelectedIndex(next);
  }, [filteredActions.length, selectedIndex]);

  const groupedActions = filteredActions.reduce<Record<CommandGroup, CommandItem[]>>((acc, item) => {
    acc[item.group].push(item);
    return acc;
  }, { 基础: [], 结构: [], 媒体: [] });

  const currentIndexOf = (item: CommandItem) => filteredActions.findIndex((action) => action.label === item.label);

  if (!editor) return null;
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__clawEditor = editor;
  }

  return (
    <div
      ref={rootRef}
      className="group/editor relative"
      onMouseMove={(event) => syncRailToBlock(findBlockAtPoint(event.clientX, event.clientY) ?? findBlockElement(event.target))}
    >
      <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(file); }} />

      <div
        data-block-rail
        className="absolute -left-[58px] z-10 hidden h-8 items-center gap-0.5 opacity-0 transition-opacity group-hover/editor:flex group-hover/editor:opacity-100"
        style={{ top: railTop }}
      >
        <button
          type="button"
          title="下方插入块"
          onMouseDown={(event) => {
            event.preventDefault();
            editor.chain().focus().createParagraphNear().run();
            openSlashMenu();
          }}
          className="inline-flex h-8 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="拖动重排 · 点击打开菜单"
          draggable
          onDragStart={onGripDragStart}
          onClick={() => setBlockMenu((v) => !v)}
          className="inline-flex h-8 w-7 cursor-grab items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {blockMenu && rootRef.current && createPortal(
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setBlockMenu(false)} />
          <div
            className="fixed z-[56] w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl"
            style={{
              top: rootRef.current.getBoundingClientRect().top + railTop + 28,
              left: Math.max(12, rootRef.current.getBoundingClientRect().left - 18),
            }}
          >
            <BlockMenuItem icon={<Plus className="h-3.5 w-3.5" />} label="下方插入" onClick={blockInsertBelow} />
            <BlockMenuItem icon={<Copy className="h-3.5 w-3.5" />} label="复制块" onClick={blockDuplicate} />
            <BlockMenuItem icon={<MoveUp className="h-3.5 w-3.5" />} label="上移" onClick={() => blockMove(-1)} />
            <BlockMenuItem icon={<MoveDown className="h-3.5 w-3.5" />} label="下移" onClick={() => blockMove(1)} />
            <BlockMenuItem icon={<Trash2 className="h-3.5 w-3.5" />} label="删除块" tone="danger" onClick={blockDelete} />
            <div className="my-1 border-t border-slate-100" />
            <div className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase text-slate-400">转换为</div>
            <div className="flex flex-wrap gap-1 px-1.5 pb-1">
              <TurnIntoChip label="正文" icon={<Type className="h-3 w-3" />} onClick={() => blockTurnInto("paragraph")} />
              <TurnIntoChip label="H1" icon={<Heading1 className="h-3 w-3" />} onClick={() => blockTurnInto("h1")} />
              <TurnIntoChip label="H2" icon={<Heading2 className="h-3 w-3" />} onClick={() => blockTurnInto("h2")} />
              <TurnIntoChip label="H3" icon={<Heading3 className="h-3 w-3" />} onClick={() => blockTurnInto("h3")} />
              <TurnIntoChip label="列表" icon={<List className="h-3 w-3" />} onClick={() => blockTurnInto("bullet")} />
              <TurnIntoChip label="待办" icon={<CheckSquare className="h-3 w-3" />} onClick={() => blockTurnInto("todo")} />
              <TurnIntoChip label="引用" icon={<Quote className="h-3 w-3" />} onClick={() => blockTurnInto("quote")} />
            </div>
          </div>
        </>,
        document.body,
      )}

      <BubbleMenu
        editor={editor}
        pluginKey="clawnoteTextBubbleMenu"
        tippyOptions={{ duration: 120 }}
        shouldShow={({ editor }) => !editor.state.selection.empty && !editor.isActive("table") && !editor.isActive("image") && !editor.isActive("drawio")}
        className="claw-solid flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
      >
        <Button onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="加粗"><Bold className="h-4 w-4" /></Button>
        <Button onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="斜体"><Italic className="h-4 w-4" /></Button>
        <Button onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="下划线"><UnderlineIcon className="h-4 w-4" /></Button>
        <Button onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="删除线"><Strikethrough className="h-4 w-4" /></Button>
        <Button onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="行内代码"><Code className="h-4 w-4" /></Button>
        <Button onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="高亮"><Highlighter className="h-4 w-4" /></Button>
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <Button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="标题 1">H1</Button>
        <Button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="标题 2">H2</Button>
        <Button onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="列表"><List className="h-4 w-4" /></Button>
        <Button onClick={setLink} active={editor.isActive("link")} title="链接"><Link2 className="h-4 w-4" /></Button>
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <Button onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="左对齐"><AlignLeft className="h-4 w-4" /></Button>
        <Button onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="居中"><AlignCenter className="h-4 w-4" /></Button>
        <Button onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="右对齐"><AlignRight className="h-4 w-4" /></Button>
        <Button onClick={() => navigator.clipboard?.writeText(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to))} title="复制选中内容"><Copy className="h-4 w-4" /></Button>
      </BubbleMenu>

      <BubbleMenu
        editor={editor}
        pluginKey="clawnoteTableBubbleMenu"
        tippyOptions={{ duration: 120, placement: "top-start", offset: [0, 8], maxWidth: "none" }}
        shouldShow={({ editor }) => editor.isActive("table")}
        className="claw-solid flex w-max max-w-[calc(100vw-2rem)] flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
      >
        <TableButton title="紧凑宽度" onClick={() => resizeActiveTable(104)}><Minimize2 className="h-3.5 w-3.5" />紧凑</TableButton>
        <TableButton title="放宽列宽" onClick={() => resizeActiveTable(164)}><Maximize2 className="h-3.5 w-3.5" />放宽</TableButton>
        <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />
        <TableButton title="右侧加列" onClick={() => editor.chain().focus().addColumnAfter().run()}><Columns3 className="h-3.5 w-3.5" />列+</TableButton>
        <TableButton title="下方加行" onClick={() => editor.chain().focus().addRowAfter().run()}><Rows3 className="h-3.5 w-3.5" />行+</TableButton>
        <TableButton title="删除当前列" onClick={() => editor.chain().focus().deleteColumn().run()}>删列</TableButton>
        <TableButton title="删除当前行" onClick={() => editor.chain().focus().deleteRow().run()}>删行</TableButton>
        <TableButton title="删除表格" tone="danger" onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 className="h-3.5 w-3.5" /></TableButton>
        <span className="hidden shrink-0 px-2 text-[11px] text-slate-400 xl:inline">拖列边调整宽度</span>
      </BubbleMenu>

      {showMenu && (
        <div className="absolute left-0 top-9 z-30 w-[316px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <div>
              <div className="text-xs font-medium text-slate-500">快速插入</div>
              {slashQuery && <div className="mt-0.5 text-[11px] text-slate-400">搜索：{slashQuery}</div>}
            </div>
            <kbd className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-400">ESC</kbd>
          </div>
          <div className="max-h-[390px] overflow-y-auto p-2">
            {filteredActions.length === 0 && (
              <div className="rounded-lg px-3 py-6 text-center text-sm text-slate-400">没有找到这个块，试试“标题”“表格”或“上传”。</div>
            )}
            {(["基础", "结构", "媒体"] as CommandGroup[]).map((group) => (
              groupedActions[group].length > 0 && (
                <div key={group} className="mb-2 last:mb-0">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase text-slate-400">{group}</div>
                  {groupedActions[group].map((item) => {
                    const index = currentIndexOf(item);
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onMouseEnter={() => {
                          selectedIndexRef.current = index;
                          setSelectedIndex(index);
                        }}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          run(item.action);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm",
                          index === selectedIndex ? "bg-slate-100 text-slate-950" : "hover:bg-slate-50"
                        )}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">{item.icon}</span>
                        <span className="min-w-0">
                          <span className="block font-medium">{item.label}</span>
                          <span className="block truncate text-xs text-slate-500">{item.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
            <span>↑↓ 选择 · Enter 插入</span>
            <span>只保留文档块</span>
          </div>
        </div>
      )}
      <EditorContent editor={editor} />

      {imageDialogOpen &&
        createPortal(
          <ImageDialog
            uploading={uploading}
            setUploading={setUploading}
            uploadImage={uploadImageForDialog}
            onInsert={(src, alt) => {
              editor.chain().focus().setImage({ src, alt: alt || "image" }).run();
              setImageDialogOpen(false);
            }}
            onClose={() => setImageDialogOpen(false)}
          />,
          document.body,
        )}

      {linkDialogOpen &&
        createPortal(
          <LinkDialog
            initialUrl={editor.getAttributes("link").href || ""}
            onSubmit={applyLink}
            onClose={() => setLinkDialogOpen(false)}
          />,
          document.body,
        )}

      {shortcutsOpen && createPortal(<ShortcutsModal onClose={() => setShortcutsOpen(false)} />, document.body)}
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const mac = typeof navigator !== "undefined" && /Mac|iP(hone|ad)/.test(navigator.platform);
  const mod = mac ? "⌘" : "Ctrl";
  const alt = mac ? "⌥" : "Alt";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups: { title: string; rows: [string, string][] }[] = [
    {
      title: "文字格式",
      rows: [
        ["加粗", `${mod} B`],
        ["斜体", `${mod} I`],
        ["下划线", `${mod} U`],
        ["删除线", `${mod} ⇧ S`],
        ["行内代码", `${mod} E`],
        ["高亮", `${mod} ⇧ H`],
        ["链接", `${mod} K（选区气泡菜单）`],
      ],
    },
    {
      title: "块与结构",
      rows: [
        ["标题 1 / 2 / 3", `${mod} ${alt} 1 / 2 / 3`],
        ["无序列表", `${mod} ⇧ 8`],
        ["有序列表", `${mod} ⇧ 7`],
        ["引用", `${mod} ⇧ B`],
        ["代码块", `${mod} ${alt} C`],
        ["插入块菜单", `/`],
      ],
    },
    {
      title: "块操作",
      rows: [
        ["上移 / 下移块", `${mod} ⇧ ↑ / ↓`],
        ["复制块", `${mod} ⇧ D`],
        ["删除块", `${mod} ⇧ ⌫`],
        ["命令面板", `${mod} K`],
      ],
    },
    {
      title: "Markdown 即时转换（行首输入）",
      rows: [
        ["标题", `# / ## / ###`],
        ["无序 / 有序列表", `- / 1.`],
        ["待办", `[]`],
        ["引用", `>`],
        ["分割线", `---`],
        ["代码块", "``` "],
        ["高亮", `==文字==`],
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Keyboard className="h-4 w-4" /> 快捷键与 Markdown
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid max-h-[calc(80vh-3.5rem)] gap-x-8 gap-y-5 overflow-y-auto p-5 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-2 text-xs font-semibold uppercase text-slate-400">{g.title}</div>
              <div className="space-y-1">
                {g.rows.map(([label, keys]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-600">{label}</span>
                    <kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-500">{keys}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LinkDialog({ initialUrl, onSubmit, onClose }: { initialUrl: string; onSubmit: (url: string) => void; onClose: () => void }) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{initialUrl ? "编辑链接" : "添加链接"}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-slate-400">
            <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit(url);
              }}
              placeholder="粘贴或输入链接，如 https://…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            {initialUrl ? (
              <button onClick={() => onSubmit("")} className="rounded-lg px-2.5 py-1.5 text-sm text-red-500 hover:bg-red-50">
                移除链接
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
                取消
              </button>
              <button onClick={() => onSubmit(url)} className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
                {initialUrl ? "更新" : "添加"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageDialog({
  uploading,
  setUploading,
  uploadImage,
  onInsert,
  onClose,
}: {
  uploading: boolean;
  setUploading: (v: boolean) => void;
  uploadImage: (file: File) => Promise<string | null>;
  onInsert: (src: string, alt?: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }
    setError(null);
    setUploading(true);
    const src = await uploadImage(file);
    setUploading(false);
    if (src) onInsert(src, file.name);
    else setError("上传失败，请重试");
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">插入图片</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 px-4 pt-3">
          <button
            onClick={() => setTab("upload")}
            className={cn("rounded-lg px-3 py-1.5 text-sm", tab === "upload" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-500 hover:bg-slate-50")}
          >
            上传
          </button>
          <button
            onClick={() => setTab("url")}
            className={cn("rounded-lg px-3 py-1.5 text-sm", tab === "url" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-500 hover:bg-slate-50")}
          >
            嵌入链接
          </button>
        </div>

        <div className="p-4">
          {tab === "upload" ? (
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void handleFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-sm transition-colors",
                dragOver ? "border-blue-400 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600",
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  正在上传…
                </>
              ) : (
                <>
                  <ImageIcon className="h-6 w-6" />
                  点击选择，或把图片拖到这里
                  <span className="text-xs text-slate-400">支持 JPG / PNG / GIF / WebP</span>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFile(e.target.files?.[0])} />
            </div>
          ) : (
            <div className="space-y-3">
              <input
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && url.trim()) onInsert(url.trim());
                }}
                placeholder="粘贴图片 URL，如 https://…/photo.png"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              {url.trim() && (
                <div className="overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="预览" className="max-h-48 w-full object-contain" onError={() => setError("无法加载该图片链接")} onLoad={() => setError(null)} />
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => url.trim() && onInsert(url.trim())}
                  disabled={!url.trim()}
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
                >
                  插入
                </button>
              </div>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function Button({ children, onClick, active, title }: { children: React.ReactNode; onClick: () => void; active?: boolean; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn("inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950", active && "bg-slate-100 text-slate-950")}
    >
      {children}
    </button>
  );
}

function BlockMenuItem({ icon, label, onClick, tone = "default" }: { icon: React.ReactNode; label: string; onClick: () => void; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-100",
        tone === "danger" && "text-red-500 hover:bg-red-50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function TurnIntoChip({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
    >
      {icon}
      {label}
    </button>
  );
}

function TableButton({
  children,
  onClick,
  title,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950",
        tone === "danger" && "text-red-500 hover:bg-red-50 hover:text-red-600"
      )}
    >
      {children}
    </button>
  );
}
