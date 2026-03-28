"use client";

import { Select } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import type { Opponent } from "@/lib/types";

const STORAGE_KEY = "dashboard-opponent-filter";

export function DashboardFilter({ opponents }: { opponents: Opponent[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const current = searchParams.get("opponent") ?? "";
  const initialized = useRef(false);

  // On mount, restore saved filter if no search param is set
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (!searchParams.has("opponent")) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && opponents.some((o) => o.id === saved)) {
        router.replace(`/?opponent=${saved}`);
      }
    }
  }, [searchParams, opponents, router]);

  function handleChange(value: string) {
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    startTransition(() => {
      router.push(value ? `/?opponent=${value}` : "/");
    });
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">
        対戦チーム
      </label>
      <Select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="w-48"
        disabled={isPending}
      >
        <option value="">すべて</option>
        {opponents.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
