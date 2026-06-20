import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import type { Opponent } from "@/lib/types";
import { DashboardStats } from "./dashboard-stats";
import { DashboardModeStats } from "./dashboard-mode-stats";
import { DashboardKDTable } from "./dashboard-kd-table";
import { DashboardRecentMatches } from "./dashboard-recent-matches";

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

export async function DashboardContent({ opponentId }: { opponentId?: string }) {
  const supabase = await createClient();
  const { profile } = await getProfile();

  // opponentId が指定された場合、series IDs を先に解決して後続クエリを効率化
  let seriesIds: string[] | null = null;
  if (opponentId) {
    const { data: opponentSeries } = await supabase
      .from("series")
      .select("id")
      .eq("team_id", profile.team_id)
      .eq("opponent_id", opponentId);
    seriesIds = (opponentSeries ?? []).map((s) => s.id);
  }

  // 関心事ごとに分離した並列クエリ
  // - recentSeries: 直近5件の表示用（game_stats不要）
  // - games: 直近100ゲーム（LIMIT で転送データ削減）
  // - gameStats: プレイヤーK/D計算用（game_ids で絞込み）
  // - players: プレイヤー一覧
  const recentSeriesQuery = (() => {
    let q = supabase
      .from("series")
      .select("id, series_date, type, youtube_url, memo, opponent_id, opponents(name), games(id, result)")
      .eq("team_id", profile.team_id)
      .order("series_date", { ascending: false })
      .limit(5);
    if (seriesIds !== null) q = q.in("id", seriesIds);
    return q;
  })();

  const gamesQuery = (() => {
    let q = supabase
      .from("games")
      .select("id, mode, result, series_id")
      .eq("team_id", profile.team_id)
      .order("series_date", { ascending: false })
      .limit(100);  // Phase 3: LIMIT で最近100ゲームのみ取得（転送量50-90%削減）
    if (seriesIds !== null) q = q.in("series_id", seriesIds);
    return q;
  })();

  // opponentId あり: games との inner join でシリーズ単位にフィルタ
  // opponentId なし: team_id のみでフィルタ
  // Phase 3: 全体でも LIMIT(5000) で安全限界を設定
  const gameStatsQuery = (() => {
    if (seriesIds !== null) {
      return supabase
        .from("game_stats")
        .select("player_id, kills, deaths, damage, game_id, hill_time, plants, defuses, first_bloods, first_deaths, goals, games!inner(series_id)")
        .eq("team_id", profile.team_id)
        .in("games.series_id", seriesIds)
        .limit(5000);
    }
    return supabase
      .from("game_stats")
      .select("player_id, kills, deaths, damage, game_id, hill_time, plants, defuses, first_bloods, first_deaths, goals")
      .eq("team_id", profile.team_id)
      .limit(5000);
  })();

  const [
    { data: recentSeriesData },
    { data: gamesData },
    { data: gameStatsData },
    { data: playersData },
  ] = await Promise.all([
    recentSeriesQuery,
    gamesQuery,
    gameStatsQuery,
    supabase.from("players").select("id, name").eq("team_id", profile.team_id),
  ]);

  const allGames = (gamesData ?? []) as { id: string; mode: string; result: string; series_id: string }[];
  const filteredStats = (gameStatsData ?? []) as unknown as any[];
  const allPlayers = (playersData ?? []) as any[];
  const recentSeries = (recentSeriesData ?? []) as unknown as RecentSeriesRow[];

  return (
    <>
      {/* Stats cards - fast aggregation, renders first */}
      <Suspense fallback={
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 bg-muted animate-pulse rounded-xl" />
          <div className="h-28 bg-muted animate-pulse rounded-xl" />
        </div>
      }>
        <DashboardStats games={allGames} />
      </Suspense>

      {/* Mode stats - light aggregation */}
      <Suspense fallback={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="h-28 bg-muted animate-pulse rounded-xl" />
          <div className="h-28 bg-muted animate-pulse rounded-xl" />
          <div className="h-28 bg-muted animate-pulse rounded-xl" />
        </div>
      }>
        <DashboardModeStats games={allGames} />
      </Suspense>

      {/* KD Table - heavy aggregation */}
      <Suspense fallback={
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      }>
        <DashboardKDTable gameStats={filteredStats} players={allPlayers} games={allGames} />
      </Suspense>

      {/* Recent matches - independent query */}
      <Suspense fallback={
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      }>
        <DashboardRecentMatches recentSeries={recentSeries} />
      </Suspense>
    </>
  );
}
