// Apple Calendar-style color palette. Each color maps to the classes used for
// event chips, dots, and the editor swatches.
export type EventColor =
  | "blue"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "purple"
  | "pink"
  | "brown"
  | "graphite";

type ColorStyle = {
  label: string;
  dot: string; // solid background (dots / filled chips)
  text: string; // text color tuned to the hue
  soft: string; // light translucent background for chips
  border: string; // left accent border
  ring: string; // focus ring / selected swatch
};

export const EVENT_COLORS: Record<EventColor, ColorStyle> = {
  blue: { label: "蓝色", dot: "bg-blue-500", text: "text-blue-700", soft: "bg-blue-50", border: "border-blue-500", ring: "ring-blue-500" },
  red: { label: "红色", dot: "bg-red-500", text: "text-red-700", soft: "bg-red-50", border: "border-red-500", ring: "ring-red-500" },
  orange: { label: "橙色", dot: "bg-orange-500", text: "text-orange-700", soft: "bg-orange-50", border: "border-orange-500", ring: "ring-orange-500" },
  yellow: { label: "黄色", dot: "bg-yellow-400", text: "text-yellow-700", soft: "bg-yellow-50", border: "border-yellow-400", ring: "ring-yellow-400" },
  green: { label: "绿色", dot: "bg-green-500", text: "text-green-700", soft: "bg-green-50", border: "border-green-500", ring: "ring-green-500" },
  teal: { label: "青色", dot: "bg-teal-500", text: "text-teal-700", soft: "bg-teal-50", border: "border-teal-500", ring: "ring-teal-500" },
  purple: { label: "紫色", dot: "bg-purple-500", text: "text-purple-700", soft: "bg-purple-50", border: "border-purple-500", ring: "ring-purple-500" },
  pink: { label: "粉色", dot: "bg-pink-500", text: "text-pink-700", soft: "bg-pink-50", border: "border-pink-500", ring: "ring-pink-500" },
  brown: { label: "棕色", dot: "bg-amber-700", text: "text-amber-800", soft: "bg-amber-50", border: "border-amber-700", ring: "ring-amber-700" },
  graphite: { label: "石墨", dot: "bg-slate-500", text: "text-slate-700", soft: "bg-slate-100", border: "border-slate-500", ring: "ring-slate-500" },
};

export const COLOR_KEYS = Object.keys(EVENT_COLORS) as EventColor[];

export function colorStyle(color: string | null | undefined): ColorStyle {
  return EVENT_COLORS[(color as EventColor) ?? "blue"] ?? EVENT_COLORS.blue;
}
