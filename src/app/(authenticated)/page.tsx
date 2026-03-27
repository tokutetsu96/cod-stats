import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import type { Game, GameStat, Player, Series } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function calcKD(kills: number, deaths: number) {
  if (deaths === 0) return kills.toFixed(2);
  return (kills / deaths).toFixed(2);
}

const modeLabel: Record<string, string> = { hardpoint: "Hardpoint", snd: "S&D", overload: "Overload" };

export default async function DashboardPage() {
  const { supabase, profile } = await getProfile();

  const [{ data: seriesData }, { data: games }, { data: gameStats }, { data: players }] = await Promise.all([
    supabase.from("series").select("*, opponents(*)").order("series_date", { ascending: false }).limit(10),
    supabase.from("games").select("id, mode, result, series_id"),
    supabase.from("game_stats").select("player_id, kills, deaths, game_id"),
    supabase.from("players").select("id, name"),
  ]);

  const allGames = (games ?? []) as Game[];
  const allStats = (gameStats ?? []) as GameStat[];
  const allPlayers = (players ?? []) as Player[];
  const allSeries = (seriesData ?? []) as Series[];

  const totalGames = allGames.length;
  const totalWins = allGames.filter((g) => g.result === "win").length;
  const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0";

  const modeStats = (["hardpoint", "snd", "overload"] as const).map((mode) => {
    const modeGames = allGames.filter((g) => g.mode === mode);
    const wins = modeGames.filter((g) => g.result === "win").length;
    const rate = modeGames.length > 0 ? ((wins / modeGames.length) * 100).toFixed(1) : "0";
    return { mode, total: modeGames.length, wins, rate };
  });

  const gameIdToMode = new Map(allGames.map((g) => [g.id, g.mode]));

  const playerStats = allPlayers.map((player) => {
    const pStats = allStats.filter((s) => s.player_id === player.id);
    const modeKD = (["hardpoint", "snd", "overload"] as const).map((mode) => {
      const ms = pStats.filter((s) => gameIdToMode.get(s.game_id) === mode);
      const kills = ms.reduce((a, s) => a + s.kills, 0);
      const deaths = ms.reduce((a, s) => a + s.deaths, 0);
      return { mode, count: ms.length, kd: ms.length > 0 ? calcKD(kills, deaths) : "-" };
    });
    return { ...player, modeKD };
  });

  const recentSeries = allSeries.slice(0, 5);

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">総ゲーム数</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalGames}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">全体勝率</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{winRate}%</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {modeStats.map((ms) => (
            <Card key={ms.mode}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{modeLabel[ms.mode]} 勝率</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{ms.rate}%</p>
                <p className="text-xs text-muted-foreground">{ms.wins}勝 / {ms.total}ゲーム</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>メンバー別 KD レシオ</CardTitle>
          </CardHeader>
          <CardContent>
            {playerStats.length === 0 ? (
              <p className="text-muted-foreground text-sm">プレイヤーが登録されていません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">プレイヤー</th>
                      <th className="pb-2 font-medium text-center">Hardpoint</th>
                      <th className="pb-2 font-medium text-center">S&D</th>
                      <th className="pb-2 font-medium text-center">Overload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerStats.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="py-2">
                          <Link href={`/players/${p.id}`} className="text-primary hover:underline">{p.name}</Link>
                        </td>
                        {p.modeKD.map(({ mode, kd }) => (
                          <td key={mode} className="py-2 text-center font-medium">{kd}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>直近の対戦</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSeries.length === 0 ? (
              <p className="text-muted-foreground text-sm">対戦データがありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">日付</th>
                      <th className="pb-2 font-medium">タイプ</th>
                      <th className="pb-2 font-medium">対戦相手</th>
                      <th className="pb-2 font-medium">戦績</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSeries.map((s) => {
                      const sGames = allGames.filter((g) => g.series_id === s.id);
                      const w = sGames.filter((g) => g.result === "win").length;
                      const d = sGames.filter((g) => g.result === "draw").length;
                      const l = sGames.length - w - d;
                      return (
                        <tr key={s.id} className="border-b">
                          <td className="py-2">{formatDate(s.series_date)}</td>
                          <td className="py-2">{s.type === "tournament" ? "大会" : "Scrim"}</td>
                          <td className="py-2">
                            <Link href={`/matches/${s.id}`} className="text-primary hover:underline">
                              {s.opponents?.name ?? "-"}
                            </Link>
                          </td>
                          <td className="py-2">
                            <span className="text-green-500 font-medium">{w}W</span>
                            {" - "}
                            <span className="text-red-500 font-medium">{l}L</span>
                            {d > 0 && <><span> - </span><span className="text-yellow-500 font-medium">{d}D</span></>}
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
    </>
  );
}
