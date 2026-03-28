import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";
import type { Game, GameStat, OpponentGameStat } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const modeLabel: Record<string, string> = { hardpoint: "Hardpoint", snd: "S&D", overload: "Overload" };
const typeLabel: Record<string, string> = { scrim: "Scrim", tournament: "大会" };

function calcKD(kills: number, deaths: number) {
  if (deaths === 0) return kills.toFixed(2);
  return (kills / deaths).toFixed(2);
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, teamName } = await getProfile();

  const { data: series } = await supabase
    .from("series")
    .select("*, opponents(*), games(*, maps(*), game_stats(*, players(*)), opponent_game_stats(*, opponent_players(*)))")
    .eq("id", id)
    .single();

  if (!series) notFound();

  const games = ((series.games ?? []) as Game[]).sort((a, b) => a.game_number - b.game_number);
  const wins = games.filter((g) => g.result === "win").length;
  const draws = games.filter((g) => g.result === "draw").length;
  const losses = games.length - wins - draws;

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            vs {series.opponents?.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            {formatDate(series.series_date)} / {typeLabel[series.type]} /
            <span className="text-win font-medium ml-1 stat-number">{wins}W</span>
            {" - "}
            <span className="text-loss font-medium stat-number">{losses}L</span>
            {draws > 0 && <><span> - </span><span className="text-primary font-medium stat-number">{draws}D</span></>}
          </p>
          {series.youtube_url && (
            <p className="text-sm mt-1">
              <a href={series.youtube_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                試合動画
              </a>
            </p>
          )}
          {series.memo && <p className="text-sm mt-1">{series.memo}</p>}
        </div>

        {games.map((game) => {
          const stats = ((game.game_stats ?? []) as GameStat[]).sort((a, b) =>
            (b.kills - b.deaths) - (a.kills - a.deaths)
          );
          const opponentStats = ((game.opponent_game_stats ?? []) as OpponentGameStat[]).sort((a, b) =>
            (b.kills - b.deaths) - (a.kills - a.deaths)
          );

          type StatRow = { id: string; name: string; kills: number; deaths: number; damage: number; hill_time: number | null; plants: number | null; defuses: number | null; first_bloods: number | null; first_deaths: number | null; goals: number | null };

          const statsTable = (rows: StatRow[]) => {
            const totalKills = rows.reduce((sum, r) => sum + r.kills, 0);
            const totalDeaths = rows.reduce((sum, r) => sum + r.deaths, 0);
            return (
            <div className="space-y-2">
              <div className="flex gap-4 text-sm">
                <span>総合K: <span className="font-medium">{totalKills}</span></span>
                <span>総合D: <span className="font-medium">{totalDeaths}</span></span>
                <span>KD: <span className="font-medium">{calcKD(totalKills, totalDeaths)}</span></span>
              </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm data-table">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">プレイヤー</th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">K</th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">D</th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">KD</th>
                    <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Dmg</th>
                    {game.mode === "hardpoint" && <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Hill</th>}
                    {game.mode === "snd" && <><th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">P</th><th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Def</th><th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">FB</th><th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">FD</th></>}
                    {game.mode === "overload" && <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Goals</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/50">
                      <td className="py-2.5 font-medium">{row.name}</td>
                      <td className="py-2.5 stat-number">{row.kills}</td>
                      <td className="py-2.5 stat-number">{row.deaths}</td>
                      <td className="py-2.5 stat-number font-semibold">{calcKD(row.kills, row.deaths)}</td>
                      <td className="py-2.5 stat-number">{row.damage}</td>
                      {game.mode === "hardpoint" && <td className="py-2.5 stat-number">{row.hill_time ?? 0}s</td>}
                      {game.mode === "snd" && <><td className="py-2.5 stat-number">{row.plants ?? 0}</td><td className="py-2.5 stat-number">{row.defuses ?? 0}</td><td className="py-2.5 stat-number">{row.first_bloods ?? 0}</td><td className="py-2.5 stat-number">{row.first_deaths ?? 0}</td></>}
                      {game.mode === "overload" && <td className="py-2.5 stat-number">{row.goals ?? 0}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
            );
          };

          return (
            <Card key={game.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-3">
                  <span>Game {game.game_number}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {modeLabel[game.mode]}
                    {game.maps && ` - ${game.maps.name}`}
                  </span>
                  <span className="text-sm font-medium">
                    {game.score_team} - {game.score_opponent}
                  </span>
                  <span className={`font-bold text-xs px-1.5 py-0.5 rounded stat-number ${game.result === "win" ? "text-win bg-win/10" : game.result === "lose" ? "text-loss bg-loss/10" : "text-primary bg-primary/10"}`}>
                    {game.result === "win" ? "WIN" : game.result === "lose" ? "LOSE" : "DRAW"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{teamName}</p>
                    {stats.length === 0
                      ? <p className="text-sm text-muted-foreground">スタッツなし</p>
                      : statsTable(stats.map((s) => ({ ...s, name: s.players?.name ?? "-" })))
                    }
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{series.opponents?.name}</p>
                    {opponentStats.length === 0
                      ? <p className="text-sm text-muted-foreground">スタッツなし</p>
                      : statsTable(opponentStats.map((s) => ({ ...s, name: s.opponent_players?.name ?? "-" })))
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>
    </>
  );
}
