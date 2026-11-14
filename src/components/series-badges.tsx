import { cn } from "@/lib/utils";
import { seriesTypeLabel } from "@/lib/constants";
import type { SeriesType } from "@/lib/types";

interface ResultCounts {
  wins: number;
  losses: number;
  draws: number;
}

/** シリーズ種別（Scrim / 大会）のバッジ */
export function SeriesTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "text-xs px-1.5 py-0.5 rounded font-medium",
        type === "tournament" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {seriesTypeLabel[type as SeriesType] ?? type}
    </span>
  );
}

/** シリーズ勝敗（W / L / D の1文字バッジ + 「2W 1L」） */
export function SeriesResultSummary({ wins, losses, draws }: ResultCounts) {
  const isWin = wins > losses;
  const isLoss = losses > wins;
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold stat-number",
          isWin ? "bg-win/20 text-win" : isLoss ? "bg-loss/20 text-loss" : "bg-muted text-muted-foreground",
        )}
      >
        {isWin ? "W" : isLoss ? "L" : "D"}
      </span>
      <span className="text-xs text-muted-foreground stat-number">
        {wins}W {losses}L{draws > 0 ? ` ${draws}D` : ""}
      </span>
    </div>
  );
}

/** ゲーム戦績（「2W - 1L - 1D」。引き分けは1件以上のときのみ表示） */
export function WinLossRecord({ wins, losses, draws, className }: ResultCounts & { className?: string }) {
  return (
    <span className={className}>
      <span className="text-win font-medium stat-number">{wins}W</span>
      <span className="text-muted-foreground mx-1">-</span>
      <span className="text-loss font-medium stat-number">{losses}L</span>
      {draws > 0 ? (
        <>
          <span className="text-muted-foreground mx-1">-</span>
          <span className="text-primary font-medium stat-number">{draws}D</span>
        </>
      ) : null}
    </span>
  );
}
