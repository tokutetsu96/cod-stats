import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Eye } from "lucide-react";
import { countResults, formatDate, isValidYoutubeUrl } from "@/lib/utils";
import { SeriesResultSummary, SeriesTypeBadge } from "@/components/series-badges";
import type { Tables } from "@/lib/database.types";
import type { DashboardFilters } from "./dashboard-filters";
import { Table, Th, Td } from "@/components/ui/table";

// 生成型（Tables<>）から読み取りモデルを導出し、スキーマ変更に追従させる
type RecentSeriesRow = Pick<
  Tables<"series">,
  "id" | "series_date" | "type" | "youtube_url"
> & {
  opponents: Pick<Tables<"opponents">, "name"> | null;
  games: Pick<Tables<"games">, "result">[];
};

export async function DashboardRecentMatches({
  titleId,
  filters,
}: {
  titleId: string;
  filters: DashboardFilters;
}) {
  const supabase = await createClient();
  const { profile } = await getProfile();
  const { opponentId, dateFrom, dateTo, mode } = filters;

  // フィルタ条件はクエリへ直接渡す（series id を .in() で列挙すると GET の URL 長上限を超えうるため）。
  // モードフィルタ選択時は !inner + games.mode で「該当モードのゲームを含む series」に絞り、
  // 埋め込み games も該当モードのみ返す（戦績カウントがモード内のW/Lになる）
  let q = supabase
    .from("series")
    .select(
      mode
        ? "id, series_date, type, youtube_url, opponents(name), games!inner(result)"
        : "id, series_date, type, youtube_url, opponents(name), games(result)",
    )
    .eq("team_id", profile.team_id)
    .eq("title_id", titleId)
    .order("series_date", { ascending: false })
    .limit(5);
  if (mode) q = q.eq("games.mode", mode);
  if (opponentId) q = q.eq("opponent_id", opponentId);
  if (dateFrom) q = q.gte("series_date", dateFrom);
  if (dateTo) q = q.lte("series_date", dateTo);
  const { data } = await q.overrideTypes<RecentSeriesRow[], { merge: false }>();
  const recentSeries = (data ?? []).map((s) => ({ ...s, record: countResults(s.games) }));

  return (
    <Card>
      <CardHeader className="pb-3 px-5 pt-5">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
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
                      <SeriesResultSummary {...s.record} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(s.series_date)}
                      </span>
                      <SeriesTypeBadge type={s.type} />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop table layout */}
            <div className="overflow-x-auto hidden sm:block">
              <Table>
                <thead>
                  <tr className="border-b text-left">
                    <Th>
                      日付
                    </Th>
                    <Th>
                      タイプ
                    </Th>
                    <Th>
                      対戦相手
                    </Th>
                    <Th>
                      YouTube
                    </Th>
                    <Th>
                      戦績
                    </Th>
                    <Th className="w-10"></Th>
                  </tr>
                </thead>
                <tbody>
                  {recentSeries.map((s) => {
                    return (
                      <tr key={s.id} className="border-b border-border/50">
                        <Td className="text-muted-foreground text-xs">
                          {formatDate(s.series_date)}
                        </Td>
                        <Td>
                          <SeriesTypeBadge type={s.type} />
                        </Td>
                        <Td>
                          <Link
                            href={`/matches/${s.id}`}
                            className="link font-medium"
                          >
                            {s.opponents?.name ?? "-"}
                          </Link>
                        </Td>
                        <Td className="text-xs">
                          {s.youtube_url && isValidYoutubeUrl(s.youtube_url) ? (
                            <a
                              href={s.youtube_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link"
                            >
                              YouTube URL
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </Td>
                        <Td>
                          <SeriesResultSummary {...s.record} />
                        </Td>
                        <Td className="text-right">
                          <Link
                            href={`/matches/${s.id}`}
                            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
