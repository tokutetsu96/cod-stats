"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import type { TeamBan } from "@/lib/types";
import { liftBan } from "../actions";

/** 除外済みユーザー一覧（管理者のみ）。解除すると招待コードで再参加できるようになる */
export function BanList({ bans }: { bans: TeamBan[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const handleLift = (ban: TeamBan) => {
    if (!confirm(`${ban.username} の除外を解除しますか？招待コードで再び参加できるようになります。`)) return;
    setError("");
    setPendingId(ban.user_id);
    startTransition(async () => {
      try {
        await liftBan(ban.user_id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "除外の解除に失敗しました");
      }
      setPendingId(null);
    });
  };

  if (bans.length === 0) {
    return <p className="text-sm text-muted-foreground">除外したユーザーはいません</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="rounded-md border border-border divide-y divide-border">
        {bans.map((ban) => (
          <div key={ban.user_id} className="flex items-center justify-between px-3 py-2">
            <span className="text-sm">{ban.username}</span>
            <button
              onClick={() => handleLift(ban)}
              disabled={pendingId === ban.user_id}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {pendingId === ban.user_id ? <Spinner className="h-3.5 w-3.5" /> : "解除"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
