import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { GameStat, Player } from "@/lib/types";
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

  // game_stats に games(mode) を埋め込むことで、各 stat が自身の mode を保持する。
  // これにより別途 games クエリ・gameIdToMode Map が不要になり、
  // games と game_stats の limit 不整合による集計欠落バグも解消する。
  const gameStatsQuery = (() => {
    let q = supabase
      .from("game_stats")
      .select(
        "player_id, kills, deaths, damage, hill_time, plants, defuses, first_bloods, first_deaths, goals, games!inner(mode, series_id)",
      )
      .eq("team_id", profile.team_id)
      .limit(5000);
    if (seriesIds !== null) q = q.in("games.series_id", seriesIds);
    return q;
  })();

  const [{ data: gameStatsData }, { data: playersData }] = await Promise.all([
    gameStatsQuery,
    supabase.from("players").select("id, name").eq("team_id", profile.team_id).eq("is_active", true),
  ]);

  type GameStatWithGame = GameStat & { games: { mode: string; series_id: string } | null };
  const gameStats = (gameStatsData ?? []) as unknown as GameStatWithGame[];
  const players = (playersData ?? []) as Player[];

  const statsByPlayerId = new Map<string, GameStatWithGame[]>();
  for (const s of gameStats) {
    const arr = statsByPlayerId.get(s.player_id) ?? [];
    arr.push(s);
    statsByPlayerId.set(s.player_id, arr);
  }

  const playerKDData: PlayerKDData[] = players.map((player) => {
    const pStats = statsByPlayerId.get(player.id) ?? [];
    let totalKills = 0,
      totalDeaths = 0,
      totalDamage = 0;
    const modes: Record<string, ModeAcc> = {
      hardpoint: emptyModeAcc(),
      snd: emptyModeAcc(),
      overload: emptyModeAcc(),
    };
    for (const s of pStats) {
      totalKills += s.kills;
      totalDeaths += s.deaths;
      totalDamage += s.damage ?? 0;
      const mode = s.games?.mode;
      const m = mode ? modes[mode] : undefined;
      if (m) {
        m.kills += s.kills;
        m.deaths += s.deaths;
        m.damage += s.damage ?? 0;
        m.count++;
        m.hillTime += s.hill_time ?? 0;
        m.plants += s.plants ?? 0;
        m.defuses += s.defuses ?? 0;
        m.firstBloods += s.first_bloods ?? 0;
        m.firstDeaths += s.first_deaths ?? 0;
        m.goals += s.goals ?? 0;
      }
    }
    const c = pStats.length;
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
