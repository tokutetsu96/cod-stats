import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import type { Game, GameStat, Player, Series } from "@/lib/types";
import { formatDate, calcKD } from "@/lib/utils";
import { PlayerKDTabs, type PlayerKDData, type PlayerModeStats } from "@/components/player-kd-tabs";

const modeLabel: Record<string, string> = { hardpoint: "Hardpoint", snd: "S&D", overload: "Overload" };

function WinRateBar({ rate }: { rate: string }) {
  const pct = parseFloat(rate);
  const color =
    pct >= 60 ? "var(--win)" : pct >= 45 ? "var(--primary)" : "var(--loss)";
  return (
    <div className="mt-3 space-y-1">
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export async function DashboardContent({ opponentId }: { opponentId?: string }) {
  const { supabase } = await getProfile();

  // Step 1: Get series IDs (filtered by opponent if needed) + players
  let seriesQuery = supabase.from("series").select("*, opponents(*)").order("series_date", { ascending: false }).limit(10);

  let allSeriesIdsQuery = supabase.from("series").select("id");
  if (opponentId) {
    allSeriesIdsQuery = allSeriesIdsQuery.eq("opponent_id", opponentId);
    seriesQuery = seriesQuery.eq("opponent_id", opponentId);
  }

  const [{ data: seriesData }, { data: allSeriesIdsData }, { data: players }] = await Promise.all([
    seriesQuery,
    allSeriesIdsQuery,
    supabase.from("players").select("id, name"),
  ]);

  const allSeries = (seriesData ?? []) as Series[];
  const allPlayers = (players ?? []) as Player[];
  const seriesIds = (allSeriesIdsData ?? []).map((s: { id: string }) => s.id);

  // Step 2: Fetch games with stats in a single joined query
  let allGames: Game[] = [];
  let filteredStats: GameStat[] = [];
  if (seriesIds.length > 0) {
    const { data: gamesData } = await supabase
      .from("games").select("id, mode, result, series_id, game_stats(player_id, kills, deaths, damage, game_id, hill_time, plants, defuses, first_bloods, first_deaths, goals)").in("series_id", seriesIds);
    const games = (gamesData ?? []) as (Game & { game_stats: GameStat[] })[];
    allGames = games.map(({ game_stats, ...g }) => g) as Game[];
    filteredStats = games.flatMap((g) => g.game_stats ?? []);
  }

  const totalGames = allGames.length;
  let totalWins = 0;
  let totalLosses = 0;
  const modeCounts = { hardpoint: { total: 0, wins: 0, losses: 0 }, snd: { total: 0, wins: 0, losses: 0 }, overload: { total: 0, wins: 0, losses: 0 } };
  const gameIdToMode = new Map<string, string>();

  for (const g of allGames) {
    if (g.result === "win") totalWins++;
    else if (g.result === "lose") totalLosses++;
    gameIdToMode.set(g.id, g.mode);
    const mc = modeCounts[g.mode as keyof typeof modeCounts];
    if (mc) {
      mc.total++;
      if (g.result === "win") mc.wins++;
      else if (g.result === "lose") mc.losses++;
    }
  }

  const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0";

  const modeStats = (["hardpoint", "snd", "overload"] as const).map((mode) => {
    const mc = modeCounts[mode];
    const rate = mc.total > 0 ? ((mc.wins / mc.total) * 100).toFixed(1) : "0";
    return { mode, total: mc.total, wins: mc.wins, losses: mc.losses, rate };
  });

  type ModeAcc = { kills: number; deaths: number; damage: number; count: number; hillTime: number; plants: number; defuses: number; firstBloods: number; firstDeaths: number; goals: number };
  const emptyModeAcc = (): ModeAcc => ({ kills: 0, deaths: 0, damage: 0, count: 0, hillTime: 0, plants: 0, defuses: 0, firstBloods: 0, firstDeaths: 0, goals: 0 });

  function toModeStats(m: ModeAcc): PlayerModeStats {
    return {
      kills: m.kills, deaths: m.deaths, damage: m.damage, count: m.count,
      kd: m.count > 0 ? calcKD(m.kills, m.deaths) : "-",
      avgHillTime: m.count > 0 ? Math.round(m.hillTime / m.count) : null,
      totalPlants: m.plants, totalDefuses: m.defuses,
      totalFirstBloods: m.firstBloods, totalFirstDeaths: m.firstDeaths,
      totalGoals: m.goals,
    };
  }

  const playerKDData: PlayerKDData[] = allPlayers.map((player) => {
    const pStats = filteredStats.filter((s) => s.player_id === player.id);
    let totalKills = 0, totalDeaths = 0, totalDamage = 0;
    const modes: Record<string, ModeAcc> = { hardpoint: emptyModeAcc(), snd: emptyModeAcc(), overload: emptyModeAcc() };
    for (const s of pStats) {
      totalKills += s.kills;
      totalDeaths += s.deaths;
      totalDamage += s.damage ?? 0;
      const mode = gameIdToMode.get(s.game_id);
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
    return {
      id: player.id,
      name: player.name,
      overall: { kills: totalKills, deaths: totalDeaths, damage: totalDamage, count: pStats.length, kd: pStats.length > 0 ? calcKD(totalKills, totalDeaths) : "-", avgHillTime: null, totalPlants: null, totalDefuses: null, totalFirstBloods: null, totalFirstDeaths: null, totalGoals: null },
      hardpoint: toModeStats(modes.hardpoint),
      snd: toModeStats(modes.snd),
      overload: toModeStats(modes.overload),
    };
  });

  const recentSeries = opponentId
    ? allSeries.filter((s) => s.opponent_id === opponentId).slice(0, 5)
    : allSeries.slice(0, 5);

  return (
    <>
      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-l-2 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">総ゲーム数</p>
            <p className="stat-number text-3xl sm:text-4xl">{totalGames}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalWins}勝 {totalLosses}敗</p>
          </CardContent>
        </Card>

        <Card className="border-l-2" style={{ borderLeftColor: parseFloat(winRate) >= 50 ? "var(--win)" : "var(--loss)" }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">全体勝率</p>
            <p className="stat-number text-3xl sm:text-4xl">{winRate}<span className="text-lg text-muted-foreground">%</span></p>
            <WinRateBar rate={winRate} />
          </CardContent>
        </Card>
      </div>

      {/* Mode stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {modeStats.map((ms) => (
          <Card key={ms.mode} className="border-l-2 border-l-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{modeLabel[ms.mode]}</p>
              <p className="stat-number text-3xl sm:text-4xl">{ms.rate}<span className="text-lg text-muted-foreground">%</span></p>
              <p className="text-xs text-muted-foreground mt-1">{ms.wins}勝 / {ms.total}試合</p>
              <WinRateBar rate={ms.rate} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KD table */}
      <Card>
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">メンバー別 K/D</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {playerKDData.length === 0 ? (
            <p className="text-muted-foreground text-sm">プレイヤーが登録されていません</p>
          ) : (
            <PlayerKDTabs players={playerKDData} playerLinkPrefix="/players/" />
          )}
        </CardContent>
      </Card>

      {/* Recent matches */}
      <Card>
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">直近の対戦</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {recentSeries.length === 0 ? (
            <p className="text-muted-foreground text-sm">対戦データがありません</p>
          ) : (
            <>
            {/* Mobile card layout */}
            <div className="space-y-2 sm:hidden">
              {recentSeries.map((s) => {
                const sGames = allGames.filter((g) => g.series_id === s.id);
                const w = sGames.filter((g) => g.result === "win").length;
                const d = sGames.filter((g) => g.result === "draw").length;
                const l = sGames.length - w - d;
                const isWin = w > l;
                const isLoss = l > w;
                return (
                  <Link key={s.id} href={`/matches/${s.id}`} className="block border-b border-border/50 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{s.opponents?.name ?? "-"}</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold stat-number"
                          style={{
                            backgroundColor: isWin ? "color-mix(in oklch, var(--win) 20%, transparent)" : isLoss ? "color-mix(in oklch, var(--loss) 20%, transparent)" : "var(--muted)",
                            color: isWin ? "var(--win)" : isLoss ? "var(--loss)" : "var(--muted-foreground)",
                          }}
                        >
                          {isWin ? "W" : isLoss ? "L" : "D"}
                        </span>
                        <span className="text-xs text-muted-foreground stat-number">
                          {w}W {l}L{d > 0 ? ` ${d}D` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{formatDate(s.series_date)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.type === "tournament" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {s.type === "tournament" ? "大会" : "Scrim"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop table layout */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-sm data-table">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">日付</th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">タイプ</th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">対戦相手</th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">YouTube</th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">戦績</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSeries.map((s) => {
                    const sGames = allGames.filter((g) => g.series_id === s.id);
                    const w = sGames.filter((g) => g.result === "win").length;
                    const d = sGames.filter((g) => g.result === "draw").length;
                    const l = sGames.length - w - d;
                    const isWin = w > l;
                    const isLoss = l > w;
                    return (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="py-2.5 text-muted-foreground text-xs">{formatDate(s.series_date)}</td>
                        <td className="py-2.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.type === "tournament" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {s.type === "tournament" ? "大会" : "Scrim"}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <Link href={`/matches/${s.id}`} className="hover:underline font-medium">
                            {s.opponents?.name ?? "-"}
                          </Link>
                        </td>
                        <td className="py-2.5 text-xs">
                          {s.youtube_url ? (
                            <a href={s.youtube_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              YouTube URL
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold stat-number"
                              style={{
                                backgroundColor: isWin ? "color-mix(in oklch, var(--win) 20%, transparent)" : isLoss ? "color-mix(in oklch, var(--loss) 20%, transparent)" : "var(--muted)",
                                color: isWin ? "var(--win)" : isLoss ? "var(--loss)" : "var(--muted-foreground)",
                              }}
                            >
                              {isWin ? "W" : isLoss ? "L" : "D"}
                            </span>
                            <span className="text-xs text-muted-foreground stat-number">
                              {w}W {l}L{d > 0 ? ` ${d}D` : ""}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
