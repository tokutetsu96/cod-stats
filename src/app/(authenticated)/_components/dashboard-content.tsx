import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { getCurrentTitle } from "@/lib/supabase/titles";
import { getTitleModes } from "@/lib/constants";
import type { GameMode } from "@/lib/types";
import { DashboardStats } from "./dashboard-stats";
import { DashboardKDTable } from "./dashboard-kd-table";
import { DashboardRecentMatches } from "./dashboard-recent-matches";
import { DashboardRecentComments } from "./dashboard-recent-comments";
import {
  resolveDashboardFilters,
  type DashboardFilters,
  type DashboardSearchParams,
} from "./dashboard-filters";

const cardSkeleton = <div className="h-64 bg-muted animate-pulse rounded-xl" />;

const statsSkeleton = <div className="h-60 bg-muted animate-pulse rounded-xl" />;

/**
 * 勝率・K/D の集計。対戦相手・期間・作品フィルタを対象 series の id 集合に落とし込み、
 * 集計RPC群（p_series_ids）に渡す。RPC は POST のため id が多くても URL 長の制約を受けない。
 */
async function DashboardAggregates({
  titleId,
  filters,
  modes,
}: {
  titleId: string;
  filters: DashboardFilters;
  modes: GameMode[];
}) {
  const supabase = await createClient();
  const { profile } = await getProfile();
  let q = supabase
    .from("series")
    .select("id")
    .eq("team_id", profile.team_id)
    .eq("title_id", titleId);
  if (filters.opponentId) q = q.eq("opponent_id", filters.opponentId);
  if (filters.dateFrom) q = q.gte("series_date", filters.dateFrom);
  if (filters.dateTo) q = q.lte("series_date", filters.dateTo);
  const { data } = await q;
  const seriesIds: string[] = (data ?? []).map((s) => s.id);

  return (
    <>
      <Suspense fallback={statsSkeleton}>
        <DashboardStats seriesIds={seriesIds} titleId={titleId} filters={filters} modes={modes} />
      </Suspense>
      <Suspense fallback={cardSkeleton}>
        <DashboardKDTable seriesIds={seriesIds} mode={filters.mode} modes={modes} />
      </Suspense>
    </>
  );
}

export async function DashboardContent({
  params,
}: {
  params: DashboardSearchParams;
}) {
  const filters = resolveDashboardFilters(params);
  const { currentTitle } = await getCurrentTitle();
  // 選択中の作品によるスコープは必須。作品が無い場合はどのシリーズにも一致させない
  const titleId = currentTitle?.id ?? "";

  // 直近の対戦は series id 集合に依存しないため、集計とは独立に並列でストリーミングする
  return (
    <>
      <Suspense
        fallback={
          <>
            {statsSkeleton}
            {cardSkeleton}
          </>
        }
      >
        <DashboardAggregates titleId={titleId} filters={filters} modes={getTitleModes(currentTitle)} />
      </Suspense>

      <Suspense fallback={cardSkeleton}>
        <DashboardRecentMatches titleId={titleId} filters={filters} />
      </Suspense>

      {/* メモのフィードは常に最新を見せるため、絞り込み条件には連動させない */}
      <Suspense fallback={cardSkeleton}>
        <DashboardRecentComments titleId={titleId} />
      </Suspense>
    </>
  );
}
