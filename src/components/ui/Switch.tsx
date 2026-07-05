"use client";

/**
 * Accessible toggle. role="switch" + aria-checked, keyboard-operable (it's a
 * real <button>), visible focus ring, and an expanded invisible hit area
 * (≥36px) via a ::before pseudo while keeping the visual track at 24×44.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className = "",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name; required so the toggle is understandable to screen readers. */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 before:absolute before:-inset-2 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-blue-600" : "bg-slate-300"
      } ${className}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-150 ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
