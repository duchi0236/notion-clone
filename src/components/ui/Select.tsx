"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
};

type MenuPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

export function Select({
  value,
  options,
  onChange,
  placeholder = "请选择",
  className,
  triggerClassName,
  menuClassName,
  align = "left",
  disabled = false,
  ariaLabel,
  name,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
  disabled?: boolean;
  ariaLabel?: string;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const current = options.find((option) => option.value === value);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportGap = 8;
    const menuGap = 6;
    const width = Math.min(
      Math.max(rect.width, 180),
      window.innerWidth - viewportGap * 2,
    );
    const estimatedHeight = Math.min(
      320,
      options.reduce((height, option) => height + (option.description ? 52 : 40), 8),
    );
    const roomBelow = window.innerHeight - rect.bottom - viewportGap;
    const roomAbove = rect.top - viewportGap;
    const openAbove = roomBelow < Math.min(estimatedHeight, 180) && roomAbove > roomBelow;
    const maxHeight = Math.max(120, Math.min(320, openAbove ? roomAbove - menuGap : roomBelow - menuGap));
    const unclampedLeft = align === "right" ? rect.right - width : rect.left;
    const left = Math.min(
      Math.max(viewportGap, unclampedLeft),
      window.innerWidth - width - viewportGap,
    );
    const top = openAbove
      ? Math.max(viewportGap, rect.top - Math.min(estimatedHeight, maxHeight) - menuGap)
      : rect.bottom + menuGap;

    setPosition({ left, top, width, maxHeight });
  }, [align, options]);

  const enabledIndices = options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);

  const openMenu = useCallback(
    (preferredIndex?: number) => {
      if (disabled || options.length === 0) return;
      const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
      setActiveIndex(
        preferredIndex ??
          (selectedIndex >= 0 ? selectedIndex : enabledIndices[0] ?? -1),
      );
      updatePosition();
      setOpen(true);
    },
    [disabled, enabledIndices, options, updatePosition, value],
  );

  const closeMenu = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    requestAnimationFrame(() => menuRef.current?.focus());
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => updatePosition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, updatePosition]);

  function moveActive(direction: 1 | -1) {
    if (enabledIndices.length === 0) return;
    const currentPosition = enabledIndices.indexOf(activeIndex);
    const nextPosition =
      currentPosition < 0
        ? direction === 1
          ? 0
          : enabledIndices.length - 1
        : (currentPosition + direction + enabledIndices.length) % enabledIndices.length;
    setActiveIndex(enabledIndices[nextPosition]);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    closeMenu(true);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const edgeIndex =
        event.key === "ArrowDown"
          ? enabledIndices[0]
          : enabledIndices[enabledIndices.length - 1];
      openMenu(edgeIndex);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open ? closeMenu() : openMenu();
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(enabledIndices[0] ?? -1);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(enabledIndices[enabledIndices.length - 1] ?? -1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      closeMenu(true);
    }
  }

  return (
    <div className={cn("relative block min-w-0", className)}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "flex min-h-9 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 outline-none transition-[border-color,box-shadow,background-color] hover:border-slate-300 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100",
          open && "border-blue-400 ring-2 ring-blue-100",
          disabled && "cursor-not-allowed bg-slate-50 text-slate-400 hover:border-slate-200",
          triggerClassName,
        )}
      >
        {current?.icon && <span className="flex shrink-0 text-slate-500">{current.icon}</span>}
        <span className={cn("min-w-0 flex-1 truncate", !current && "text-slate-400")}>
          {current?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180 text-slate-600",
          )}
        />
      </button>

      {open &&
        position &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[110]"
              data-claw-floating-layer="select"
              aria-hidden="true"
              onMouseDown={() => closeMenu()}
            />
            <div
              ref={menuRef}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              data-claw-floating-layer="select"
              tabIndex={-1}
              onKeyDown={handleMenuKeyDown}
              className={cn(
                "claw-solid fixed z-[111] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_-14px_rgba(15,23,42,0.34)] outline-none",
                menuClassName,
              )}
              style={{
                left: position.left,
                top: position.top,
                width: position.width,
                maxHeight: position.maxHeight,
              }}
            >
              {options.map((option, index) => {
                const selected = option.value === value;
                const active = index === activeIndex;
                return (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(index)}
                    className={cn(
                      "flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 outline-none transition-colors",
                      active && "bg-slate-100",
                      selected && "bg-blue-50 text-blue-700",
                      selected && active && "bg-blue-100/80",
                      option.disabled && "cursor-not-allowed opacity-45",
                    )}
                  >
                    {option.icon && (
                      <span className="flex shrink-0 text-slate-500">{option.icon}</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.description && (
                        <span className="mt-0.5 block truncate text-xs font-normal text-slate-400">
                          {option.description}
                        </span>
                      )}
                    </span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
