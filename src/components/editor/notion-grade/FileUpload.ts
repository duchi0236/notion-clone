import type { Editor } from "@tiptap/react";
import type { UploadedFile } from "./types";

export async function uploadEditorFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/files", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.file) throw new Error(data.error ?? "Upload failed");
  return data.file as UploadedFile;
}

export function insertUploadedFile(editor: Editor, file: UploadedFile) {
  if (file.type?.startsWith("image/")) {
    editor.chain().focus().setImage({ src: file.url, alt: file.name }).run();
    return;
  }

  editor
    .chain()
    .focus()
    .insertContent({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: `📎 ${file.name}`,
          marks: [{ type: "link", attrs: { href: file.url } }],
        },
      ],
    })
    .run();
}
