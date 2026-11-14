"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** 対戦一覧の対戦チーム絞り込み。選択すると1ページ目に戻して URL を更新する */
export function OpponentFilter({
  opponents,
  opponentId,
}: {
  opponents: { id: string; name: string }[];
  opponentId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="series-opponent-filter"
        className="text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap"
      >
        対戦チーム
      </label>
      <Select
        id="series-opponent-filter"
        value={opponentId}
        onChange={(e) => {
          const value = e.target.value;
          startTransition(() => {
            router.push(value ? `/matches?opponent=${encodeURIComponent(value)}` : "/matches");
          });
        }}
        className={cn("w-full sm:w-48", isPending && "opacity-60")}
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
