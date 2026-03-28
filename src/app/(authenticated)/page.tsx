import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import type { Game, GameStat, Player, Series, Opponent } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { DashboardFilter } from "./_components/dashboard-filter";

function calcKD(kills: number, deaths: number) {
  if (deaths === 0) return kills.toFixed(2);
  return (kills / deaths).toFixed(2);
}

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ opponent?: string }>;
}) {
  const { opponent: opponentId } = await searchParams;
  const { supabase } = await getProfile();

  const [{ data: seriesData }, { data: allGamesData }, { data: gameStats }, { data: players }, { data: opponents }] = await Promise.all([
    supabase.from("series").select("*, opponents(*)").order("series_date", { ascending: false }).limit(10),
    supabase.from("games").select("id, mode, result, series_id"),
    supabase.from("game_stats").select("player_id, kills, deaths, game_id"),
    supabase.from("players").select("id, name"),
    supabase.from("opponents").select("id, name").order("name"),
  ]);

  const allSeries = (seriesData ?? []) as Series[];
  const allGamesRaw = (allGamesData ?? []) as Game[];
  const allStats = (gameStats ?? []) as GameStat[];
  const allPlayers = (players ?? []) as Player[];
  const allOpponents = (opponents ?? []) as Opponent[];

  // Filter by opponent if selected
  const filteredSeriesIds = opponentId
    ? new Set(allSeries.filter((s) => s.opponent_id === opponentId).map((s) => s.id))
    : null;

  // For games, we need series_id -> opponent mapping for games not in the recent 10 series
  // Fetch all series IDs for the opponent if filtering
  let allOpponentSeriesIds: Set<string> | null = null;
  if (opponentId) {
    const { data: opponentSeries } = await supabase
      .from("series")
      .select("id")
      .eq("opponent_id", opponentId);
    allOpponentSeriesIds = new Set((opponentSeries ?? []).map((s: { id: string }) => s.id));
  }

  const allGames = allOpponentSeriesIds
    ? allGamesRaw.filter((g) => allOpponentSeriesIds!.has(g.series_id))
    : allGamesRaw;

  const gameIds = new Set(allGames.map((g) => g.id));
  const filteredStats = allOpponentSeriesIds
    ? allStats.filter((s) => gameIds.has(s.game_id))
    : allStats;

  const totalGames = allGames.length;
  const totalWins = allGames.filter((g) => g.result === "win").length;
  const totalLosses = allGames.filter((g) => g.result === "lose").length;
  const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0";

  const modeStats = (["hardpoint", "snd", "overload"] as const).map((mode) => {
    const modeGames = allGames.filter((g) => g.mode === mode);
    const wins = modeGames.filter((g) => g.result === "win").length;
    const losses = modeGames.filter((g) => g.result === "lose").length;
    const rate = modeGames.length > 0 ? ((wins / modeGames.length) * 100).toFixed(1) : "0";
    return { mode, total: modeGames.length, wins, losses, rate };
  });

  const gameIdToMode = new Map(allGames.map((g) => [g.id, g.mode]));

  const playerStats = allPlayers.map((player) => {
    const pStats = filteredStats.filter((s) => s.player_id === player.id);
    const modeKD = (["hardpoint", "snd", "overload"] as const).map((mode) => {
      const ms = pStats.filter((s) => gameIdToMode.get(s.game_id) === mode);
      const kills = ms.reduce((a, s) => a + s.kills, 0);
      const deaths = ms.reduce((a, s) => a + s.deaths, 0);
      return { mode, count: ms.length, kd: ms.length > 0 ? calcKD(kills, deaths) : "-" };
    });
    const totalKills = pStats.reduce((a, s) => a + s.kills, 0);
    const totalDeaths = pStats.reduce((a, s) => a + s.deaths, 0);
    const overallKD = pStats.length > 0 ? calcKD(totalKills, totalDeaths) : "-";
    return { ...player, modeKD, overallKD };
  }).sort((a, b) => parseFloat(b.overallKD === "-" ? "0" : b.overallKD) - parseFloat(a.overallKD === "-" ? "0" : a.overallKD));

  const recentSeries = opponentId
    ? allSeries.filter((s) => s.opponent_id === opponentId).slice(0, 5)
    : allSeries.slice(0, 5);

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6 pt-6">
      {/* Filter */}
      <div className="flex justify-end">
        <DashboardFilter opponents={allOpponents} />
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-l-2 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">総ゲーム数</p>
            <p className="stat-number text-4xl">{totalGames}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalWins}勝 {totalLosses}敗</p>
          </CardContent>
        </Card>

        <Card className="border-l-2" style={{ borderLeftColor: parseFloat(winRate) >= 50 ? "var(--win)" : "var(--loss)" }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">全体勝率</p>
            <p className="stat-number text-4xl">{winRate}<span className="text-lg text-muted-foreground">%</span></p>
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
              <p className="stat-number text-4xl">{ms.rate}<span className="text-lg text-muted-foreground">%</span></p>
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
          {playerStats.length === 0 ? (
            <p className="text-muted-foreground text-sm">プレイヤーが登録されていません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm data-table">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">プレイヤー</th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">総合</th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">HP</th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">S&D</th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">OL</th>
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map((p) => {
                    const kd = parseFloat(p.overallKD);
                    const kdColor = !isNaN(kd) && kd >= 1.0 ? "var(--win)" : !isNaN(kd) ? "var(--loss)" : undefined;
                    return (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-2.5">
                          <Link href={`/players/${p.id}`} className="text-primary hover:underline font-medium">
                            {p.name}
                          </Link>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="stat-number text-base font-semibold" style={{ color: kdColor }}>
                            {p.overallKD}
                          </span>
                        </td>
                        {p.modeKD.map(({ mode, kd: mkd }) => (
                          <td key={mode} className="py-2.5 text-center">
                            <span className="stat-number text-base text-muted-foreground">{mkd}</span>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
            <div className="overflow-x-auto">
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
                              試合動画
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
          )}
        </CardContent>
      </Card>
    </main>
  );
}
