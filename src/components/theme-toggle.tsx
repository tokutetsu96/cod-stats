"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { readStoredTheme, storeTheme, type Theme } from "@/lib/theme";

const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "ライト", Icon: Sun },
  { value: "dark", label: "ダーク", Icon: Moon },
  { value: "system", label: "システム", Icon: Monitor },
];

/**
 * テーマ切替。メニュー展開時のみマウントされる（SSRされない）前提で、
 * 初期値を localStorage から直接読む。
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  const select = (value: Theme) => {
    setTheme(value);
    storeTheme(value);
  };

  return (
    <div className="px-3 py-2">
      <p className="text-xs text-muted-foreground mb-1.5">テーマ</p>
      <div role="radiogroup" aria-label="テーマ" className="grid grid-cols-3 gap-0.5 rounded-md bg-muted p-0.5">
        {options.map(({ value, label, Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              title={label}
              onClick={() => select(value)}
              className={cn(
                "flex h-7 items-center justify-center rounded transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
