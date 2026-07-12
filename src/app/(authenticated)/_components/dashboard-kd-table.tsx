import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { GameMode, Player } from "@/lib/types";
import { PlayerKDTabs, type PlayerKDData } from "@/components/player-kd-tabs";
import {
  addStat,
  emptyPlayerAcc,
  toPlayerKDData,
  type PlayerAcc,
} from "@/lib/kd-stats";

// get_dashboard_kd_stats RPC が返す行（(player_id, mode) ごとの集計済み合計）
type KDStatRow = {
  player_id: string;
  mode: string;
  games_count: number;
  kills: number;
  deaths: number;
  damage: number;
  hill_time: number;
  plants: number;
  defuses: number;
  first_bloods: number;
  first_deaths: number;
  goals: number;
};

export async function DashboardKDTable({
  seriesIds,
  mode,
}: {
  seriesIds: string[] | null;
  mode?: GameMode;
}) {
  const supabase = await createClient();
  const { profile } = await getProfile();

  // 集計は get_dashboard_kd_stats RPC でDB側に実施する。
  // (player_id, mode) ごとに集約済みの行のみを返すため、全 game_stats 行を
  // アプリへ転送していた従来方式（limit 5000）の転送量・正確性リスクを排除する。
  // RPC は SECURITY INVOKER で RLS により呼び出し元チームへ自動スコープされる。
  const [{ data: kdData }, { data: playersData }] = await Promise.all([
    supabase.rpc("get_dashboard_kd_stats", { p_series_ids: seriesIds }),
    supabase.from("players").select("id, name").eq("team_id", profile.team_id).eq("is_active", true),
  ]);

  const allKdRows = (kdData ?? []) as KDStatRow[];
  // モードフィルタ選択時は該当モードの行のみ集計（総合タブ＝該当モードの成績になる）
  const kdRows = mode ? allKdRows.filter((r) => r.mode === mode) : allKdRows;
  const players = (playersData ?? []) as Player[];

  // (player_id, mode) ごとの集計行を共有アキュムレータに合算して PlayerKDData を生成。
  // 表示対象はアクティブプレイヤー全員（スタッツ0件でも表示する）
  const accMap = new Map<string, PlayerAcc>();
  const nameById = new Map(players.map((p) => [p.id, p.name]));
  for (const r of kdRows) {
    const name = nameById.get(r.player_id);
    if (name === undefined) continue; // 非アクティブ等、表示対象外
    addStat(accMap, r.player_id, name, r.mode, {
      kills: r.kills,
      deaths: r.deaths,
      damage: r.damage,
      count: r.games_count,
      hillTime: r.hill_time,
      plants: r.plants,
      defuses: r.defuses,
      firstBloods: r.first_bloods,
      firstDeaths: r.first_deaths,
      goals: r.goals,
    });
  }

  const playerKDData: PlayerKDData[] = players.map((player) =>
    toPlayerKDData(accMap.get(player.id) ?? emptyPlayerAcc(player.id, player.name)),
  );

  return (
    <Card>
      <CardHeader className="pb-3 px-5 pt-5">
        <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
          メンバー別 K/D
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {playerKDData.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            プレイヤーが登録されていません
          </p>
        ) : (
          <PlayerKDTabs players={playerKDData} playerLinkPrefix="/players/" />
        )}
      </CardContent>
    </Card>
  );
}
