"use client";

import { cn } from "@/lib/utils";

interface NumericInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function NumericInput({ value, onChange, className }: NumericInputProps) {
  const num = value === "" ? 0 : parseInt(value) || 0;

  const moveFocus = (el: HTMLElement, direction: "next" | "prev" | "up" | "down") => {
    if (direction === "next" || direction === "prev") {
      const row = el.closest("tr");
      if (!row) return;
      const inputs = Array.from(row.querySelectorAll<HTMLInputElement>('input[type="number"]'));
      const idx = inputs.indexOf(el as HTMLInputElement);
      if (idx < 0) return;
      const target = direction === "next" ? inputs[idx + 1] : inputs[idx - 1];
      if (target) { target.focus(); target.select(); }
    } else {
      const row = el.closest("tr");
      if (!row) return;
      const tbody = row.closest("tbody");
      if (!tbody) return;
      const rows = Array.from(tbody.querySelectorAll("tr"));
      const rowIdx = rows.indexOf(row as HTMLTableRowElement);
      const inputs = Array.from(row.querySelectorAll<HTMLInputElement>('input[type="number"]'));
      const colIdx = inputs.indexOf(el as HTMLInputElement);
      const targetRow = direction === "down" ? rows[rowIdx + 1] : rows[rowIdx - 1];
      if (!targetRow) return;
      const targetInputs = Array.from(targetRow.querySelectorAll<HTMLInputElement>('input[type="number"]'));
      const target = targetInputs[colIdx];
      if (target) { target.focus(); target.select(); }
    }
  };

  return (
    <input
      type="number"
      min="0"
      value={value}
      placeholder="0"
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") { onChange(""); return; }
        const n = parseInt(v);
        if (!isNaN(n) && n >= 0) onChange(String(n));
      }}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
          e.preventDefault();
        }
        if (e.key === "ArrowUp") { e.preventDefault(); moveFocus(e.currentTarget, "up"); }
        if (e.key === "ArrowDown") { e.preventDefault(); moveFocus(e.currentTarget, "down"); }
        if (e.key === "ArrowRight") { e.preventDefault(); moveFocus(e.currentTarget, "next"); }
        if (e.key === "ArrowLeft") { e.preventDefault(); moveFocus(e.currentTarget, "prev"); }
        if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); moveFocus(e.currentTarget, "next"); }
      }}
      className={cn(
        "h-9 w-16 sm:h-7 sm:w-14 rounded border border-input text-sm sm:text-xs text-center bg-transparent px-1",
        "focus:outline-none focus:ring-1 focus:ring-ring",
        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        "placeholder:text-muted-foreground",
        className
      )}
    />
  );
}
