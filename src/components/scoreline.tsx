import { cn } from "@/lib/utils";
import type { MatchResult } from "@/lib/types";

const resultText: Record<MatchResult, string> = { win: "WIN", lose: "LOSE", draw: "DRAW" };

const resultTone: Record<MatchResult, string> = {
  win: "text-win bg-win/10",
  lose: "text-loss bg-loss/10",
  draw: "text-muted-foreground bg-muted",
};

/** 勝敗バッジ。緑/赤は「結果」だけに使う（自チーム/相手の色とは別の軸） */
export function ResultBadge({ result, className }: { result: MatchResult; className?: string }) {
  return (
    <span className={cn("stat-number inline-block rounded px-2 py-1 text-sm", resultTone[result], className)}>
      {resultText[result]}
    </span>
  );
}

/** 自チーム/相手を示す色付きマーカー。スコア・バー・スタッツ表の見出しで共通に使う */
export function SideMarker({ side, className }: { side: "team" | "opponent"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-[2px]", side === "team" ? "bg-team" : "bg-opponent", className)}
    />
  );
}

/**
 * スコアボード表示。左=自チーム、右=相手で固定し、中央にスコアを大きく置く。
 * `lg` はシリーズ（勝ちゲーム数）、`md` は各ゲームのスコア用。
 */
export function Scoreline({
  teamName,
  opponentName,
  teamScore,
  opponentScore,
  size = "md",
  className,
}: {
  teamName: string;
  opponentName: string;
  teamScore: number;
  opponentScore: number;
  size?: "md" | "lg";
  className?: string;
}) {
  const nameClass = cn("min-w-0 truncate font-medium", size === "lg" ? "text-sm sm:text-lg" : "text-xs sm:text-sm");
  return (
    <div className={cn("grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5", className)}>
      <div className="flex min-w-0 items-center justify-end gap-2">
        <span className={nameClass}>{teamName}</span>
        <SideMarker side="team" />
      </div>
      <div
        className={cn(
          "stat-number flex items-baseline gap-2 sm:gap-3",
          size === "lg" ? "text-6xl sm:text-7xl" : "text-4xl sm:text-5xl",
        )}
      >
        <span className="text-team">{teamScore}</span>
        <span aria-hidden className="text-[0.5em] font-medium text-muted-foreground">
          -
        </span>
        <span className="sr-only">対</span>
        <span className="text-opponent">{opponentScore}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <SideMarker side="opponent" />
        <span className={nameClass}>{opponentName}</span>
      </div>
    </div>
  );
}

/** スコアの比率を示す対向バー。数値は Scoreline 側にあるため装飾扱い */
export function ScoreBar({ team, opponent, className }: { team: number; opponent: number; className?: string }) {
  if (team + opponent <= 0) return null;
  return (
    <div aria-hidden className={cn("flex h-1.5 gap-0.5 overflow-hidden rounded-full", className)}>
      <div className="bg-team" style={{ flexGrow: team, flexBasis: 0 }} />
      <div className="bg-opponent" style={{ flexGrow: opponent, flexBasis: 0 }} />
    </div>
  );
}
