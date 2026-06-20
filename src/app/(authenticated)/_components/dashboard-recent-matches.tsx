import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Eye } from "lucide-react";
import { formatDate, isValidYoutubeUrl } from "@/lib/utils";

type RecentSeriesRow = {
  id: string;
  series_date: string;
  type: string;
  youtube_url: string | null;
  memo: string | null;
  opponent_id: string;
  opponents: { name: string } | null;
  games: { id: string; result: string }[];
};

export async function DashboardRecentMatches({
  recentSeries,
}: {
  recentSeries: RecentSeriesRow[];
}) {
  const seriesGameSummary = new Map<string, { wins: number; draws: number; losses: number }>();
  for (const s of recentSeries) {
    const entry = { wins: 0, draws: 0, losses: 0 };
    for (const g of s.games ?? []) {
      if (g.result === "win") entry.wins++;
      else if (g.result === "draw") entry.draws++;
      else entry.losses++;
    }
    seriesGameSummary.set(s.id, entry);
  }

  return (
    <Card>
      <CardHeader className="pb-3 px-5 pt-5">
        <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
          直近の対戦
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {recentSeries.length === 0 ? (
          <p className="text-muted-foreground text-sm">対戦データがありません</p>
        ) : (
          <>
            {/* Mobile card layout */}
            <div className="space-y-2 sm:hidden">
              {recentSeries.map((s) => {
                const { wins: w, draws: d, losses: l } =
                  seriesGameSummary.get(s.id) ?? { wins: 0, draws: 0, losses: 0 };
                const isWin = w > l;
                const isLoss = l > w;
                return (
                  <Link
                    key={s.id}
                    href={`/matches/${s.id}`}
                    className="block border-b border-border/50 py-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {s.opponents?.name ?? "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold stat-number"
                          style={{
                            backgroundColor: isWin
                              ? "color-mix(in oklch, var(--win) 20%, transparent)"
                              : isLoss
                                ? "color-mix(in oklch, var(--loss) 20%, transparent)"
                                : "var(--muted)",
                            color: isWin
                              ? "var(--win)"
                              : isLoss
                                ? "var(--loss)"
                                : "var(--muted-foreground)",
                          }}
                        >
                          {isWin ? "W" : isLoss ? "L" : "D"}
                        </span>
                        <span className="text-xs text-muted-foreground stat-number">
                          {w}W {l}L{d > 0 ? ` ${d}D` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(s.series_date)}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.type === "tournament" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                      >
                        {s.type === "tournament" ? "大会" : "Scrim"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop table layout */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-sm data-table">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      日付
                    </th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      タイプ
                    </th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      対戦相手
                    </th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      YouTube
                    </th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      戦績
                    </th>
                    <th className="pb-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentSeries.map((s) => {
                    const { wins: w, draws: d, losses: l } =
                      seriesGameSummary.get(s.id) ?? {
                        wins: 0,
                        draws: 0,
                        losses: 0,
                      };
                    const isWin = w > l;
                    const isLoss = l > w;
                    return (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="py-2.5 text-muted-foreground text-xs">
                          {formatDate(s.series_date)}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.type === "tournament" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                          >
                            {s.type === "tournament" ? "大会" : "Scrim"}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <Link
                            href={`/matches/${s.id}`}
                            className="hover:underline font-medium"
                          >
                            {s.opponents?.name ?? "-"}
                          </Link>
                        </td>
                        <td className="py-2.5 text-xs">
                          {s.youtube_url && isValidYoutubeUrl(s.youtube_url) ? (
                            <a
                              href={s.youtube_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              YouTube URL
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold stat-number"
                              style={{
                                backgroundColor: isWin
                                  ? "color-mix(in oklch, var(--win) 20%, transparent)"
                                  : isLoss
                                    ? "color-mix(in oklch, var(--loss) 20%, transparent)"
                                    : "var(--muted)",
                                color: isWin
                                  ? "var(--win)"
                                  : isLoss
                                    ? "var(--loss)"
                                    : "var(--muted-foreground)",
                              }}
                            >
                              {isWin ? "W" : isLoss ? "L" : "D"}
                            </span>
                            <span className="text-xs text-muted-foreground stat-number">
                              {w}W {l}L{d > 0 ? ` ${d}D` : ""}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right">
                          <Link
                            href={`/matches/${s.id}`}
                            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
