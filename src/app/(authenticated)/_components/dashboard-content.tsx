import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { DashboardStats } from "./dashboard-stats";
import { DashboardKDTable } from "./dashboard-kd-table";
import { DashboardRecentMatches } from "./dashboard-recent-matches";
import {
  resolveDashboardFilters,
  type DashboardSearchParams,
} from "./dashboard-filters";

export async function DashboardContent({
  params,
}: {
  params: DashboardSearchParams;
}) {
  const { opponentId, mode, dateFrom, dateTo } = resolveDashboardFilters(params);

  // 対戦相手・期間フィルタは対象 series の id 集合に落とし込み、
  // 既存の集計RPC群（p_series_ids）にそのまま渡す
  let seriesIds: string[] | null = null;
  if (opponentId || dateFrom || dateTo) {
    const supabase = await createClient();
    const { profile } = await getProfile();
    let q = supabase
      .from("series")
      .select("id")
      .eq("team_id", profile.team_id);
    if (opponentId) q = q.eq("opponent_id", opponentId);
    if (dateFrom) q = q.gte("series_date", dateFrom);
    if (dateTo) q = q.lte("series_date", dateTo);
    const { data } = await q;
    seriesIds = (data ?? []).map((s) => s.id);
  }

  return (
    <>
      <Suspense
        fallback={
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-28 bg-muted animate-pulse rounded-xl" />
              <div className="h-28 bg-muted animate-pulse rounded-xl" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="h-28 bg-muted animate-pulse rounded-xl" />
              <div className="h-28 bg-muted animate-pulse rounded-xl" />
              <div className="h-28 bg-muted animate-pulse rounded-xl" />
            </div>
          </div>
        }
      >
        <DashboardStats seriesIds={seriesIds} mode={mode} />
      </Suspense>

      <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-xl" />}>
        <DashboardKDTable seriesIds={seriesIds} mode={mode} />
      </Suspense>

      <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-xl" />}>
        <DashboardRecentMatches seriesIds={seriesIds} mode={mode} />
      </Suspense>
    </>
  );
}
