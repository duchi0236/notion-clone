"use client";

import { ClawTipTapEditor } from "@/components/editor/ClawTipTapEditor";

export function NotionEditorCompat(props: {
  content?: string;
  onChange?: (html: string) => void;
  onJsonChange?: (json: unknown) => void;
  onTextChange?: (text: string) => void;
}) {
  return (
    <ClawTipTapEditor
      content={props.content ?? ""}
      onChange={(html) => props.onChange?.(html)}
      onTextChange={props.onTextChange}
      onJsonChange={props.onJsonChange}
    />
  );
}
