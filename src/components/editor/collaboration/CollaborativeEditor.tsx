"use client";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { COLLAB_WS_URL, getCollabRoomName, randomUserColor } from "./collab-config";

export function CollaborativeEditor({
  documentId,
  content,
  onChange,
  userName = "User",
}: {
  documentId: string;
  content: string;
  onChange: (html: string, text: string) => void;
  userName?: string;
}) {
  const ydoc = useMemo(() => new Y.Doc(), [documentId]);
  const provider = useMemo(() => new WebsocketProvider(COLLAB_WS_URL, getCollabRoomName(documentId), ydoc), [documentId, ydoc]);
  const [status, setStatus] = useState("connecting");
  const initialized = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false, heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "多人协同编辑中，输入 '/' 插入内容..." }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: userName,
          color: randomUserColor(),
        },
      }),
    ],
    editorProps: {
      attributes: { class: "notion-grade-content min-h-[620px] px-1 py-6 outline-none" },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText());
    },
  });

  useEffect(() => {
    provider.on("status", (event: { status: string }) => setStatus(event.status));
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  useEffect(() => {
    if (!editor || initialized.current) return;
    const timeout = setTimeout(() => {
      if (editor.isEmpty && content) {
        editor.commands.setContent(content, false);
      }
      initialized.current = true;
    }, 600);
    return () => clearTimeout(timeout);
  }, [editor, content]);

  if (!editor) return null;

  return (
    <div className="notion-grade-editor quiet-workspace relative">
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-700">
        <span>多人协同模式 · {status === "connected" ? "已连接" : "连接中"}</span>
        <span className="text-xs text-blue-500">Room: {getCollabRoomName(documentId)}</span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
