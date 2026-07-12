import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { GameMode } from "@/lib/types";
import { WinrateChart, type TrendPoint } from "./winrate-chart";

type TrendRow = { bucket_start: string; total: number; wins: number };

function toPoints(rows: TrendRow[]): TrendPoint[] {
  return rows.map((r) => ({
    date: r.bucket_start,
    rate: r.total > 0 ? Math.round((r.wins / r.total) * 1000) / 10 : 0,
    wins: r.wins,
    total: r.total,
  }));
}

export async function DashboardWinrateChart({
  seriesIds,
  mode,
}: {
  seriesIds: string[] | null;
  mode?: GameMode;
}) {
  const supabase = await createClient();
  await getProfile();

  // 週別・月別をDB側で集計（get_team_winrate_trend, SECURITY INVOKER + RLS）。
  // 両方を先読みしてクライアント側のトグルは再フェッチなしで切り替える
  const [{ data: weekData }, { data: monthData }] = await Promise.all([
    supabase.rpc("get_team_winrate_trend", {
      p_series_ids: seriesIds,
      p_mode: mode ?? null,
      p_bucket: "week",
    }),
    supabase.rpc("get_team_winrate_trend", {
      p_series_ids: seriesIds,
      p_mode: mode ?? null,
      p_bucket: "month",
    }),
  ]);

  const weekly = toPoints((weekData ?? []) as TrendRow[]);
  const monthly = toPoints((monthData ?? []) as TrendRow[]);

  return (
    <Card>
      <CardHeader className="pb-3 px-5 pt-5">
        <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
          勝率推移
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {weekly.length === 0 ? (
          <p className="text-muted-foreground text-sm">対戦データがありません</p>
        ) : (
          <WinrateChart weekly={weekly} monthly={monthly} />
        )}
      </CardContent>
    </Card>
  );
}
