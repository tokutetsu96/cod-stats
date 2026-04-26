import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { GameStat, GameMode, MatchResult } from "@/lib/types";
import { calcKD } from "@/lib/utils";
import { modeLabel } from "@/lib/constants";

function avg(arr: number[]) {
  if (arr.length === 0) return "0";
  return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
}

const PAGE_SIZE = 100;

export async function PlayerDetailContent({ id, page = 1 }: { id: string; page?: number }) {
  const supabase = await createClient();
  const { profile } = await getProfile();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ data: player }, { data: stats, count }] = await Promise.all([
    supabase.from("players").select("*").eq("id", id).eq("team_id", profile.team_id).single(),
    supabase
      .from("game_stats")
      .select("*, games(mode, result)", { count: "exact" })
      .eq("player_id", id)
      .eq("team_id", profile.team_id)
      .range(from, to),
  ]);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  if (!player) notFound();

  type StatWithGame = GameStat & { games: { mode: GameMode; result: MatchResult } | null };
  const allStats = (stats ?? []) as StatWithGame[];

  const statsWithMode = allStats.map((s) => ({
    ...s,
    mode: s.games?.mode ?? ("hardpoint" as GameMode),
    result: s.games?.result ?? ("lose" as MatchResult),
  }));

  let overallKills = 0, overallDeaths = 0, overallWins = 0;
  const modeAcc = { hardpoint: { kills: 0, deaths: 0, wins: 0, count: 0, stats: [] as typeof statsWithMode }, snd: { kills: 0, deaths: 0, wins: 0, count: 0, stats: [] as typeof statsWithMode }, overload: { kills: 0, deaths: 0, wins: 0, count: 0, stats: [] as typeof statsWithMode } };
  for (const s of statsWithMode) {
    overallKills += s.kills;
    overallDeaths += s.deaths;
    if (s.result === "win") overallWins++;
    const ma = modeAcc[s.mode as keyof typeof modeAcc];
    if (ma) {
      ma.kills += s.kills;
      ma.deaths += s.deaths;
      if (s.result === "win") ma.wins++;
      ma.count++;
      ma.stats.push(s);
    }
  }

  const modeData = (["hardpoint", "snd", "overload"] as const).map((mode) => {
    const { kills, deaths, wins, count, stats: modeStats } = modeAcc[mode];

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
      <h1 className="text-xl sm:text-2xl font-bold">{player.name} のスタッツ</h1>

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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          {page > 1 && (
            <Link href={`/players/${id}?page=${page - 1}`} className="text-sm text-primary hover:underline">
              ← 前のページ
            </Link>
          )}
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/players/${id}?page=${page + 1}`} className="text-sm text-primary hover:underline">
              次のページ →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
