export type AiCommand = "summary" | "memory" | "tasks" | "search";
export type PickerCommand = "page-mention" | "database" | "ai-block";

export type SlashCommand = {
  id: string;
  title: string;
  description: string;
  keywords: string;
  run: () => void;
};

export type UploadedFile = {
  name: string;
  url: string;
  type: string;
};

export type NotionGradeEditorProps = {
  content: string;
  onChange: (html: string) => void;
  onTextChange?: (text: string) => void;
  onJsonChange?: (json: unknown) => void;
  onAiCommand?: (command: AiCommand) => void;
  onPickerCommand?: (command: PickerCommand) => void;
};
