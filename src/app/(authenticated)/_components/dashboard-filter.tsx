"use client";

import { Select } from "@/components/ui/select";
import { DatePicker, todayStr } from "@/components/ui/date-picker";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import type { GameMode, Opponent } from "@/lib/types";
import { modeLabel } from "@/lib/constants";

const STORAGE_KEY = "dashboard-opponent-filter";

const MODE_TABS: { key: "" | GameMode; label: string }[] = [
  { key: "", label: "すべて" },
  { key: "hardpoint", label: modeLabel.hardpoint },
  { key: "snd", label: modeLabel.snd },
  { key: "overload", label: modeLabel.overload },
];

const PERIOD_OPTIONS = [
  { value: "", label: "全期間" },
  { value: "1w", label: "直近1週間" },
  { value: "1m", label: "直近1ヶ月" },
  { value: "3m", label: "直近3ヶ月" },
  { value: "custom", label: "カスタム指定" },
];

/** 1ヶ月前の日付を YYYY-MM-DD で返す（カスタム期間の初期値用） */
function oneMonthAgoStr(): string {
  const [y, m, d] = todayStr().split("-").map(Number);
  const date = new Date(y, m - 1 - 1, d);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function DashboardFilter({ opponents }: { opponents: Opponent[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const opponent = searchParams.get("opponent") ?? "";
  const period = searchParams.get("period") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const mode = searchParams.get("mode") ?? "";
  const initialized = useRef(false);

  // On mount, restore saved opponent filter if no search param is set
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (!searchParams.has("opponent")) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && opponents.some((o) => o.id === saved)) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("opponent", saved);
        router.replace(`/?${params.toString()}`);
      }
    }
  }, [searchParams, opponents, router]);

  function navigate(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/?${qs}` : "/");
    });
  }

  function handleOpponentChange(value: string) {
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    navigate({ opponent: value });
  }

  function handlePeriodChange(value: string) {
    if (value === "custom") {
      // カスタム選択時は直近1ヶ月を初期範囲にする
      navigate({ period: "custom", from: oneMonthAgoStr(), to: todayStr() });
    } else {
      navigate({ period: value, from: "", to: "" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* モードフィルタタブ */}
        <div className="flex rounded-lg bg-muted p-1 gap-0.5 overflow-x-auto">
          {MODE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => navigate({ mode: t.key })}
              disabled={isPending}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs rounded-md font-medium whitespace-nowrap transition-all ${
                mode === t.key
                  ? "bg-card shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* 期間フィルタ */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              期間
            </label>
            <Select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="w-full sm:w-36"
              disabled={isPending}
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          {/* 対戦チームフィルタ */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              対戦チーム
            </label>
            <Select
              value={opponent}
              onChange={(e) => handleOpponentChange(e.target.value)}
              className="w-full sm:w-44"
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
        </div>
      </div>

      {/* カスタム日付範囲 */}
      {period === "custom" && (
        <div className="flex items-center gap-2 justify-end">
          <div className="w-36 sm:w-40">
            <DatePicker value={from} onChange={(v) => navigate({ from: v })} />
          </div>
          <span className="text-muted-foreground text-sm">〜</span>
          <div className="w-36 sm:w-40">
            <DatePicker value={to} onChange={(v) => navigate({ to: v })} />
          </div>
        </div>
      )}
    </div>
  );
}
