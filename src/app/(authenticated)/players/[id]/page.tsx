import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";
import type { GameStat, Game } from "@/lib/types";

function calcKD(kills: number, deaths: number) {
  if (deaths === 0) return kills.toFixed(2);
  return (kills / deaths).toFixed(2);
}

function avg(arr: number[]) {
  if (arr.length === 0) return "0";
  return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
}

const modeLabel: Record<string, string> = { hardpoint: "Hardpoint", snd: "S&D", overload: "Overload" };

export default async function PlayerStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getProfile();

  const [{ data: player }, { data: stats }, { data: games }] = await Promise.all([
    supabase.from("players").select("*").eq("id", id).single(),
    supabase.from("game_stats").select("*").eq("player_id", id),
    supabase.from("games").select("*"),
  ]);

  if (!player) notFound();

  const allStats = (stats ?? []) as GameStat[];
  const allGames = (games ?? []) as Game[];

  // Map game_id to game for mode lookup
  const gameMap = new Map(allGames.map((g) => [g.id, g]));

  // Attach mode info to each stat
  const statsWithMode = allStats.map((s) => ({
    ...s,
    mode: gameMap.get(s.game_id)?.mode ?? "hardpoint",
    result: gameMap.get(s.game_id)?.result ?? "lose",
  }));

  const overallKills = statsWithMode.reduce((s, st) => s + st.kills, 0);
  const overallDeaths = statsWithMode.reduce((s, st) => s + st.deaths, 0);
  const overallWins = statsWithMode.filter((s) => s.result === "win").length;

  const modeData = (["hardpoint", "snd", "overload"] as const).map((mode) => {
    const modeStats = statsWithMode.filter((s) => s.mode === mode);
    const kills = modeStats.reduce((s, st) => s + st.kills, 0);
    const deaths = modeStats.reduce((s, st) => s + st.deaths, 0);
    const wins = modeStats.filter((s) => s.result === "win").length;
    const count = modeStats.length;

    const extra: { label: string; value: string }[] = [];
    if (mode === "hardpoint") {
      extra.push({ label: "平均Hill時間", value: avg(modeStats.map((s) => s.hill_time ?? 0)) + "s" });
    }
    if (mode === "snd") {
      extra.push(
        { label: "平均プラント", value: avg(modeStats.map((s) => s.plants ?? 0)) },
        { label: "平均ディフューズ", value: avg(modeStats.map((s) => s.defuses ?? 0)) },
        { label: "平均FB", value: avg(modeStats.map((s) => s.first_bloods ?? 0)) },
        { label: "平均FD", value: avg(modeStats.map((s) => s.first_deaths ?? 0)) }
      );
    }
    if (mode === "overload") {
      extra.push({ label: "平均ゴール", value: avg(modeStats.map((s) => s.goals ?? 0)) });
    }

    return {
      mode, count, wins,
      winRate: count > 0 ? ((wins / count) * 100).toFixed(1) : "0",
      kd: calcKD(kills, deaths),
      avgKills: avg(modeStats.map((s) => s.kills)),
      avgDamage: avg(modeStats.map((s) => s.damage)),
      extra,
    };
  });

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-2xl font-bold">{player.name} のスタッツ</h1>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">総ゲーム数</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{statsWithMode.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">勝率</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {statsWithMode.length > 0 ? ((overallWins / statsWithMode.length) * 100).toFixed(1) : "0"}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">KD レシオ</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{calcKD(overallKills, overallDeaths)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">平均ダメージ</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{avg(statsWithMode.map((s) => s.damage))}</p></CardContent>
          </Card>
        </div>

        {modeData.map((md) => (
          <Card key={md.mode}>
            <CardHeader><CardTitle>{modeLabel[md.mode]}</CardTitle></CardHeader>
            <CardContent>
              {md.count === 0 ? (
                <p className="text-sm text-muted-foreground">データなし</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                  <div><p className="text-xs text-muted-foreground">ゲーム数</p><p className="text-xl font-bold">{md.count}</p></div>
                  <div><p className="text-xs text-muted-foreground">勝率</p><p className="text-xl font-bold">{md.winRate}%</p></div>
                  <div><p className="text-xs text-muted-foreground">KD</p><p className="text-xl font-bold">{md.kd}</p></div>
                  <div><p className="text-xs text-muted-foreground">平均キル</p><p className="text-xl font-bold">{md.avgKills}</p></div>
                  <div><p className="text-xs text-muted-foreground">平均ダメージ</p><p className="text-xl font-bold">{md.avgDamage}</p></div>
                  {md.extra.map((ex) => (
                    <div key={ex.label}><p className="text-xs text-muted-foreground">{ex.label}</p><p className="text-xl font-bold">{ex.value}</p></div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </>
  );
}
