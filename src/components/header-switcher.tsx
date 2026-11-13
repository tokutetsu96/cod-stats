"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SwitcherItem {
  id: string;
  label: string;
  badge?: string;
}

interface HeaderSwitcherProps {
  items: SwitcherItem[];
  currentId?: string;
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
  /** ドロップダウン末尾に表示するリンク（例: チームを追加） */
  footerLink?: { href: string; label: string };
  className?: string;
}

/** ヘッダーのドロップダウン切り替え（作品・チーム共通） */
export function HeaderSwitcher({
  items,
  currentId,
  placeholder,
  ariaLabel,
  disabled,
  onSelect,
  footerLink,
  className,
}: HeaderSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = items.find((item) => item.id === currentId);

  const handleSelect = (id: string) => {
    setOpen(false);
    if (id !== currentId) onSelect(id);
  };

  return (
    <div className={cn("flex items-center relative shrink-0", className)} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1 h-8 px-2 rounded-md transition-colors text-xs sm:text-sm max-w-[8rem] sm:max-w-[12rem]",
          "hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-60",
          open && "bg-accent text-foreground"
        )}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <span className="truncate">{current?.label ?? placeholder}</span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-52 bg-popover border rounded-md shadow-xl z-50 py-1 overflow-hidden">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left",
                item.id === currentId && "text-primary font-medium"
              )}
            >
              <span className="truncate">{item.label}</span>
              {item.badge && <span className="text-xs text-muted-foreground ml-2 shrink-0">{item.badge}</span>}
            </button>
          ))}
          {footerLink && (
            <Link
              href={footerLink.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 mt-1 border-t text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {footerLink.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
