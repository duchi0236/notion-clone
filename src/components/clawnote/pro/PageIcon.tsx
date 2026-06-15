import { BookOpen, Brain, FileText, PencilLine, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP = new Map<string, LucideIcon>([
  ["", FileText],
  ["📄", FileText],
  ["📃", FileText],
  ["🗒️", FileText],
  ["📝", PencilLine],
  ["✏️", PencilLine],
  ["📘", BookOpen],
  ["📕", BookOpen],
  ["📗", BookOpen],
  ["📙", BookOpen],
  ["📓", BookOpen],
  ["📔", BookOpen],
  ["📖", BookOpen],
  ["📚", BookOpen],
  ["🧠", Brain],
]);

const sizeClass = {
  sm: "h-5 w-5 rounded-md text-[12px] [&_svg]:h-3.5 [&_svg]:w-3.5",
  md: "h-7 w-7 rounded-lg text-[15px] [&_svg]:h-4 [&_svg]:w-4",
  lg: "h-9 w-9 rounded-xl text-[17px] [&_svg]:h-5 [&_svg]:w-5",
};

export function PageIcon({
  icon,
  size = "sm",
  muted = false,
}: {
  icon?: string | null;
  size?: keyof typeof sizeClass;
  muted?: boolean;
}) {
  const value = icon?.trim() ?? "";
  const Icon = ICON_MAP.get(value);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.03)]",
        sizeClass[size],
        muted && "border-transparent bg-slate-100 text-slate-400"
      )}
    >
      {Icon ? <Icon strokeWidth={1.75} /> : <span className="translate-y-[-0.5px] leading-none">{value}</span>}
    </span>
  );
}
