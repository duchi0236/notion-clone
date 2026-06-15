"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Link2, List } from "lucide-react";
import { cn } from "@/lib/utils";

type OutlineItem = { index: number; level: number; text: string };

function headingEls(): HTMLElement[] {
  const root = document.querySelector(".ProseMirror");
  return root ? (Array.from(root.querySelectorAll("h1, h2, h3")) as HTMLElement[]) : [];
}

// Shared outline state: reads the live editor headings, rescans on DOM changes,
// scroll-spies the current section, and navigates by index (ProseMirror re-creates
// heading DOM, wiping ids, so indices are the stable handle).
function useDocOutline(docId: string) {
  const [items, setItems] = useState<OutlineItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const ioRef = useRef<IntersectionObserver | null>(null);

  const scan = useCallback(() => {
    const headings = headingEls();
    setItems(headings.map((el, i) => ({ index: i, level: Number(el.tagName[1]), text: el.textContent?.trim() || "无标题" })));

    ioRef.current?.disconnect();
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) {
          const idx = headings.indexOf(hit.target as HTMLElement);
          if (idx >= 0) setActiveIndex(idx);
        }
      },
      { rootMargin: "-8% 0px -75% 0px", threshold: 0 },
    );
    headings.forEach((h) => io.observe(h));
    ioRef.current = io;
  }, []);

  useEffect(() => {
    let timer: number;
    const debounced = () => {
      clearTimeout(timer);
      timer = window.setTimeout(scan, 250);
    };
    debounced();
    const mo = new MutationObserver(debounced);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      clearTimeout(timer);
      mo.disconnect();
      ioRef.current?.disconnect();
    };
  }, [scan, docId]);

  // Honor #h-<n> anchor on load
  useEffect(() => {
    const m = /^h-(\d+)$/.exec(window.location.hash.slice(1));
    if (!m) return;
    const idx = Number(m[1]);
    const t = setTimeout(() => headingEls()[idx]?.scrollIntoView({ behavior: "smooth", block: "center" }), 500);
    return () => clearTimeout(t);
  }, [items.length]);

  const goTo = useCallback((index: number) => {
    headingEls()[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveIndex(index);
  }, []);

  return { items, activeIndex, goTo };
}

// Always-expanded outline list for the document's right inspector pane
// (opened from the header 大纲 button — the discoverable entry point).
export function OutlinePanel({ docId }: { docId: string }) {
  const { items, activeIndex, goTo } = useDocOutline(docId);
  const [copied, setCopied] = useState<number | null>(null);

  function copyLink(index: number) {
    const url = `${window.location.origin}${window.location.pathname}#h-${index}`;
    navigator.clipboard?.writeText(url);
    setCopied(index);
    setTimeout(() => setCopied((c) => (c === index ? null : c)), 1500);
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-slate-400">
        文档中还没有标题。
        <br />
        用 <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">/</kbd> 插入「标题 1/2/3」后，大纲会自动生成。
      </div>
    );
  }

  return (
    <ul className="space-y-0.5 p-3">
      {items.map((item) => {
        const active = item.index === activeIndex;
        return (
          <li key={item.index} className="group/oitem flex items-center">
            <button
              onClick={() => goTo(item.index)}
              title={item.text}
              className={cn(
                "min-w-0 flex-1 truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] leading-5",
                item.level === 2 && "pl-6",
                item.level >= 3 && "pl-9",
                active ? "bg-slate-200/80 font-medium text-slate-950" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900",
              )}
            >
              {item.text}
            </button>
            <button
              onClick={() => copyLink(item.index)}
              title="复制锚点链接"
              className="mr-0.5 shrink-0 rounded p-1 text-slate-300 opacity-0 hover:bg-slate-200 hover:text-slate-600 group-hover/oitem:opacity-100"
            >
              {copied === item.index ? <Check className="h-3 w-3 text-green-500" /> : <Link2 className="h-3 w-3" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// Floating right-side rail (语雀/Notion style): collapsed dash indicators that
// expand on hover. Only shown on xl screens with at least 2 headings.
export function DocumentOutline({ docId }: { docId: string }) {
  const { items, activeIndex, goTo } = useDocOutline(docId);
  const [copied, setCopied] = useState<number | null>(null);

  function copyLink(index: number) {
    const url = `${window.location.origin}${window.location.pathname}#h-${index}`;
    navigator.clipboard?.writeText(url);
    setCopied(index);
    setTimeout(() => setCopied((c) => (c === index ? null : c)), 1500);
  }

  if (items.length < 2) return null;

  return (
    <nav className="group fixed right-3 top-1/2 z-20 hidden max-h-[70vh] w-9 -translate-y-1/2 overflow-hidden rounded-lg transition-all duration-200 hover:w-60 hover:bg-white hover:shadow-lg hover:ring-1 hover:ring-slate-200 xl:block">
      <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
        <List className="h-3.5 w-3.5" /> 大纲
      </div>
      <ul className="max-h-[calc(70vh-1.5rem)] overflow-y-auto py-1">
        {items.map((item) => {
          const active = item.index === activeIndex;
          return (
            <li key={item.index} className="flex items-center">
              <button
                onClick={() => goTo(item.index)}
                title={item.text}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1 text-left",
                  item.level === 2 && "pl-4",
                  item.level >= 3 && "pl-6",
                )}
              >
                <span className={cn("h-0.5 shrink-0 rounded-full transition-all group-hover:hidden", active ? "w-4 bg-slate-700" : "w-2.5 bg-slate-300")} />
                <span className={cn("hidden truncate text-[13px] leading-5 group-hover:block", active ? "font-medium text-slate-900" : "text-slate-500 hover:text-slate-800")}>
                  {item.text}
                </span>
              </button>
              <button
                onClick={() => copyLink(item.index)}
                title="复制锚点链接"
                className="mr-1 hidden shrink-0 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600 group-hover:block"
              >
                {copied === item.index ? <Check className="h-3 w-3 text-green-500" /> : <Link2 className="h-3 w-3" />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
