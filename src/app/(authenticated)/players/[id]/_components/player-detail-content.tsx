import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { getCurrentTitle } from "@/lib/supabase/titles";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";
import type { Tables } from "@/lib/database.types";
import type { GameMode } from "@/lib/types";
import { calcKD } from "@/lib/utils";
import { getTitleModes, modeLabel } from "@/lib/constants";

// get_player_stats RPC が返す行（mode ごとの集計済み合計）
type PlayerStatRow = {
  mode: string;
  games_count: number;
  wins: number;
  kills: number;
  deaths: number;
  damage: number;
  hill_time: number;
  plants: number;
  defuses: number;
  first_bloods: number;
  first_deaths: number;
  goals: number;
  uploads: number;
  dunks: number;
  remote_plants: number;
};

function avg(total: number, count: number) {
  return count > 0 ? (total / count).toFixed(1) : "0";
}

function winRate(wins: number, count: number) {
  return count > 0 ? ((wins / count) * 100).toFixed(1) : "0";
}

function modeExtras(mode: GameMode, r: PlayerStatRow): { label: string; value: string }[] {
  const c = r.games_count;
  switch (mode) {
    case "hardpoint":
      return [{ label: "平均Hill時間", value: `${avg(r.hill_time, c)}s` }];
    case "snd":
      return [
        { label: "平均プラント", value: avg(r.plants, c) },
        { label: "平均ディフューズ", value: avg(r.defuses, c) },
        { label: "平均FB", value: avg(r.first_bloods, c) },
        { label: "平均FD", value: avg(r.first_deaths, c) },
      ];
    case "overload":
      return [{ label: "平均ゴール", value: avg(r.goals, c) }];
    case "hijack":
      return [
        { label: "平均アップロード完了", value: avg(r.uploads, c) },
        { label: "平均設置", value: avg(r.plants, c) },
        { label: "平均ダンク", value: avg(r.dunks, c) },
        { label: "平均リモート設置", value: avg(r.remote_plants, c) },
      ];
  }
}

export async function PlayerDetailContent({ id }: { id: string }) {
  const supabase = await createClient();
  const [{ profile }, { currentTitle }] = await Promise.all([getProfile(), getCurrentTitle()]);

  // 集計は get_player_stats RPC でDB側に実施する。
  // game_stats を100件ずつ取得してページ内だけで集計していた従来方式
  // （100試合を超えると総ゲーム数・勝率・KDが不正確になる）を排除する。
  // RPC は SECURITY INVOKER で RLS により呼び出し元チームへ自動スコープされる。
  const [{ data: player }, { data: statRows }] = await Promise.all([
    supabase
      .from("players")
      .select("name")
      .eq("id", id)
      .eq("team_id", profile.team_id)
      .single<Pick<Tables<"players">, "name">>(),
    currentTitle
      ? supabase.rpc("get_player_stats", { p_player_id: id, p_title_id: currentTitle.id })
      : Promise.resolve({ data: null }),
  ]);

  if (!player) notFound();

  const rows = (statRows ?? []) as PlayerStatRow[];
  const rowByMode = new Map(rows.map((r) => [r.mode, r]));
  const modeData = getTitleModes(currentTitle).map((mode) => ({ mode, row: rowByMode.get(mode) }));

  let totalGames = 0, totalWins = 0, totalKills = 0, totalDeaths = 0, totalDamage = 0;
  for (const r of rows) {
    totalGames += r.games_count;
    totalWins += r.wins;
    totalKills += r.kills;
    totalDeaths += r.deaths;
    totalDamage += r.damage;
  }

  return (
    <>
      <h1 className="text-xl sm:text-2xl font-bold">{player.name} のスタッツ</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">総ゲーム数</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totalGames}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">勝率</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{winRate(totalWins, totalGames)}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">KD レシオ</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{calcKD(totalKills, totalDeaths)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">平均ダメージ</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{avg(totalDamage, totalGames)}</p></CardContent>
        </Card>
      </div>

      {modeData.map(({ mode, row }) => (
        <Card key={mode}>
          <CardHeader><CardTitle>{modeLabel[mode]}</CardTitle></CardHeader>
          <CardContent>
            {row ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                <div><p className="text-xs text-muted-foreground">ゲーム数</p><p className="text-xl font-bold">{row.games_count}</p></div>
                <div><p className="text-xs text-muted-foreground">勝率</p><p className="text-xl font-bold">{winRate(row.wins, row.games_count)}%</p></div>
                <div><p className="text-xs text-muted-foreground">KD</p><p className="text-xl font-bold">{calcKD(row.kills, row.deaths)}</p></div>
                <div><p className="text-xs text-muted-foreground">平均キル</p><p className="text-xl font-bold">{avg(row.kills, row.games_count)}</p></div>
                <div><p className="text-xs text-muted-foreground">平均ダメージ</p><p className="text-xl font-bold">{avg(row.damage, row.games_count)}</p></div>
                {modeExtras(mode, row).map((ex) => (
                  <div key={ex.label}><p className="text-xs text-muted-foreground">{ex.label}</p><p className="text-xl font-bold">{ex.value}</p></div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">データなし</p>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
