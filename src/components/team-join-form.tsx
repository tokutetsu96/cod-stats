"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createTeam, joinTeam } from "@/app/_actions/team";

type Mode = "join" | "create";

/** 既存チームへの参加 / 新規チーム作成フォーム。成功後は作成・参加したチームに切り替わる */
export function TeamJoinForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("join");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = value.trim();
    if (!input) return;
    setError("");
    startTransition(async () => {
      const result = await (mode === "join" ? joinTeam(input) : createTeam(input));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setValue("");
      router.push("/");
      router.refresh();
    });
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setValue("");
    setError("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex rounded-lg bg-muted p-0.5 gap-0.5 max-w-xs">
        {(["join", "create"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={cn(
              "flex-1 text-xs py-1.5 rounded-md transition-all",
              mode === m ? "bg-card shadow text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            {m === "join" ? "既存に参加" : "新規作成"}
          </button>
        ))}
      </div>
      <div className="space-y-2 sm:space-y-0 sm:flex sm:gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === "join" ? "招待コード" : "チーム名"}
          autoCapitalize={mode === "join" ? "characters" : undefined}
          autoComplete="off"
          className="h-9 w-full sm:max-w-xs"
          aria-label={mode === "join" ? "招待コード" : "チーム名"}
        />
        <Button type="submit" size="sm" className="h-9" disabled={isPending || !value.trim()}>
          {isPending ? "処理中..." : mode === "join" ? "参加する" : "作成する"}
        </Button>
      </div>
      {mode === "join" && (
        <p className="text-xs text-muted-foreground">招待コードは参加先チームの管理者に設定画面から発行してもらってください。</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
