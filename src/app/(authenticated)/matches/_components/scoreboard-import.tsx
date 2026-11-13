"use client";

import { useRef, useState } from "react";
import { ArrowLeftRight, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { NameCandidate } from "@/lib/scoreboard/match";
import type { HardpointScoreboard } from "@/lib/scoreboard/recognize";
import { applyScoreboard, guessOwnSide, type TeamSide } from "./scoreboard-apply";
import type { GameInput } from "./series-form-shared";

type BaseState = Pick<GameInput, "stats" | "opponent_stats" | "score_team" | "score_opponent">;

type Status =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "done"; ownSide: TeamSide; unmatched: string[] }
  | { kind: "error"; message: string };

interface ScoreboardImportProps {
  game: GameInput;
  players: NameCandidate[];
  opponentPlayers: NameCandidate[];
  onApply: (updates: Partial<GameInput>) => void;
}

const sideLabel: Record<TeamSide, string> = { 0: "上段（A）", 1: "下段（B）" };

function imageFromClipboard(e: React.ClipboardEvent): File | null {
  for (const item of e.clipboardData.items) {
    if (item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}

export function ScoreboardImport({
  game,
  players,
  opponentPlayers,
  onApply,
}: ScoreboardImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  // チーム入れ替え用に、取り込み直前のフォーム値と読み取り結果を保持する
  const lastImportRef = useRef<{ board: HardpointScoreboard; base: BaseState } | null>(null);

  const apply = (board: HardpointScoreboard, base: BaseState, ownSide: TeamSide) => {
    const { updates, unmatched } = applyScoreboard({
      game: base,
      board,
      ownSide,
      players,
      opponentPlayers,
    });
    onApply(updates);
    setStatus({ kind: "done", ownSide, unmatched });
  };

  const handleImage = async (file: File | null | undefined) => {
    if (!file || status.kind === "reading") return;
    if (!file.type.startsWith("image/")) {
      setStatus({ kind: "error", message: "画像ファイルを指定してください" });
      return;
    }
    setStatus({ kind: "reading" });
    const base: BaseState = {
      stats: game.stats,
      opponent_stats: game.opponent_stats,
      score_team: game.score_team,
      score_opponent: game.score_opponent,
    };
    try {
      // tesseract.js を含むため、使うときだけ読み込む
      const { readHardpointScoreboard, ScoreboardReadError } = await import(
        "@/lib/scoreboard/recognize"
      );
      try {
        const board = await readHardpointScoreboard(file);
        lastImportRef.current = { board, base };
        apply(board, base, guessOwnSide(board, players));
      } catch (e) {
        setStatus({
          kind: "error",
          message:
            e instanceof ScoreboardReadError
              ? e.message
              : "画像の読み取りに失敗しました。時間をおいて再度お試しください",
        });
      }
    } catch {
      setStatus({ kind: "error", message: "読み取り機能の読み込みに失敗しました" });
    }
  };

  const swapTeams = () => {
    const last = lastImportRef.current;
    if (!last || status.kind !== "done") return;
    apply(last.board, last.base, status.ownSide === 0 ? 1 : 0);
  };

  const reading = status.kind === "reading";

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="スコアボード画像を貼り付け"
        aria-busy={reading}
        onPaste={(e) => {
          const file = imageFromClipboard(e);
          if (file) {
            e.preventDefault();
            void handleImage(file);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleImage(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex flex-col gap-3 rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm outline-none transition-colors sm:flex-row sm:items-center sm:justify-between",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring",
          dragging && "border-primary bg-muted",
        )}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          {reading ? (
            <>
              <Spinner className="h-4 w-4 shrink-0" />
              <span>読み取り中…（初回は文字認識データの読み込みに数秒かかります）</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-4 w-4 shrink-0" />
              <span>
                スコアボード画像をドロップ、またはここをクリックして Ctrl+V / ⌘V で貼り付け
              </span>
            </>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={reading}
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0"
        >
          画像を選択
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleImage(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {status.kind === "error" ? (
        <p className="text-sm text-destructive">{status.message}</p>
      ) : null}

      {status.kind === "done" ? (
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground">
              {sideLabel[status.ownSide]}を自チームとして入力しました。保存前に値を確認してください。
            </p>
            {status.unmatched.length > 0 ? (
              <p className="text-destructive">
                プレイヤーと一致しなかった名前: {status.unmatched.join(" / ")}
                （プレイヤーを手動で選択してください）
              </p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={swapTeams} className="shrink-0">
            <ArrowLeftRight className="h-3 w-3 mr-1" /> 自チーム/相手を入れ替え
          </Button>
        </div>
      ) : null}
    </div>
  );
}
