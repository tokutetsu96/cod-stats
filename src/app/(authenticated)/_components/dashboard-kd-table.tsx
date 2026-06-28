import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Player } from "@/lib/types";
import { PlayerKDTabs, type PlayerKDData, type PlayerModeStats } from "@/components/player-kd-tabs";
import { calcKD } from "@/lib/utils";

type ModeAcc = {
  kills: number;
  deaths: number;
  damage: number;
  count: number;
  hillTime: number;
  plants: number;
  defuses: number;
  firstBloods: number;
  firstDeaths: number;
  goals: number;
};

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

const emptyModeAcc = (): ModeAcc => ({
  kills: 0,
  deaths: 0,
  damage: 0,
  count: 0,
  hillTime: 0,
  plants: 0,
  defuses: 0,
  firstBloods: 0,
  firstDeaths: 0,
  goals: 0,
});

function avg(total: number, count: number) {
  return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
}

function toModeStats(m: ModeAcc): PlayerModeStats {
  const c = m.count;
  return {
    avgKills: avg(m.kills, c),
    avgDeaths: avg(m.deaths, c),
    avgDamage: avg(m.damage, c),
    count: c,
    kd: c > 0 ? calcKD(m.kills, m.deaths) : "-",
    avgHillTime: c > 0 ? avg(m.hillTime, c) : null,
    avgPlants: c > 0 ? avg(m.plants, c) : null,
    avgDefuses: c > 0 ? avg(m.defuses, c) : null,
    avgFirstBloods: c > 0 ? avg(m.firstBloods, c) : null,
    avgFirstDeaths: c > 0 ? avg(m.firstDeaths, c) : null,
    avgGoals: c > 0 ? avg(m.goals, c) : null,
  };
}

export async function DashboardKDTable({
  seriesIds,
}: {
  seriesIds: string[] | null;
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

  const kdRows = (kdData ?? []) as KDStatRow[];
  const players = (playersData ?? []) as Player[];

  const rowsByPlayerId = new Map<string, KDStatRow[]>();
  for (const r of kdRows) {
    const arr = rowsByPlayerId.get(r.player_id) ?? [];
    arr.push(r);
    rowsByPlayerId.set(r.player_id, arr);
  }

  const playerKDData: PlayerKDData[] = players.map((player) => {
    const pRows = rowsByPlayerId.get(player.id) ?? [];
    let totalKills = 0,
      totalDeaths = 0,
      totalDamage = 0,
      totalCount = 0;
    const modes: Record<string, ModeAcc> = {
      hardpoint: emptyModeAcc(),
      snd: emptyModeAcc(),
      overload: emptyModeAcc(),
    };
    for (const r of pRows) {
      totalKills += r.kills;
      totalDeaths += r.deaths;
      totalDamage += r.damage;
      totalCount += r.games_count;
      const m = modes[r.mode];
      if (m) {
        m.kills += r.kills;
        m.deaths += r.deaths;
        m.damage += r.damage;
        m.count += r.games_count;
        m.hillTime += r.hill_time;
        m.plants += r.plants;
        m.defuses += r.defuses;
        m.firstBloods += r.first_bloods;
        m.firstDeaths += r.first_deaths;
        m.goals += r.goals;
      }
    }
    const c = totalCount;
    return {
      id: player.id,
      name: player.name,
      overall: {
        avgKills: avg(totalKills, c),
        avgDeaths: avg(totalDeaths, c),
        avgDamage: avg(totalDamage, c),
        count: c,
        kd: c > 0 ? calcKD(totalKills, totalDeaths) : "-",
        avgHillTime: null,
        avgPlants: null,
        avgDefuses: null,
        avgFirstBloods: null,
        avgFirstDeaths: null,
        avgGoals: null,
      },
      hardpoint: toModeStats(modes.hardpoint),
      snd: toModeStats(modes.snd),
      overload: toModeStats(modes.overload),
    };
  });

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
