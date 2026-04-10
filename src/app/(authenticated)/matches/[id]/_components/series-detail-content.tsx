import React from "react";
import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";
import type { Game, GameStat, OpponentGameStat } from "@/lib/types";
import { formatDate, calcKD } from "@/lib/utils";
import { PlayerKDTabs, type PlayerKDData, type PlayerModeStats } from "@/components/player-kd-tabs";

const modeLabel: Record<string, string> = { hardpoint: "Hardpoint", snd: "S&D", overload: "Overload" };
const typeLabel: Record<string, string> = { scrim: "Scrim", tournament: "大会" };

export async function SeriesDetailContent({ id }: { id: string }) {
  const supabase = await createClient();

  const [{ teamName }, { data: series }] = await Promise.all([
    getProfile(),
    supabase
      .from("series")
      .select("*, opponents(*), games(id, game_number, mode, result, score_team, score_opponent, hill_times, maps(name), game_stats(id, game_id, player_id, kills, deaths, damage, hill_time, plants, defuses, first_bloods, first_deaths, goals, players(name, created_at)), opponent_game_stats(id, game_id, kills, deaths, damage, hill_time, plants, defuses, first_bloods, first_deaths, goals, opponent_players(name, created_at)))")
      .eq("id", id)
      .single(),
  ]);

  if (!series) notFound();

  const games = ((series.games ?? []) as unknown as Game[]).sort((a, b) => a.game_number - b.game_number);
  const wins = games.filter((g) => g.result === "win").length;
  const draws = games.filter((g) => g.result === "draw").length;
  const losses = games.length - wins - draws;

  const allStats = games.flatMap((g) => (g.game_stats ?? []) as GameStat[]);
  const gameIdToMode = new Map(games.map((g) => [g.id, g.mode]));

  type ModeAcc = { kills: number; deaths: number; damage: number; count: number; hillTime: number; plants: number; defuses: number; firstBloods: number; firstDeaths: number; goals: number };
  const emptyModeAcc = (): ModeAcc => ({ kills: 0, deaths: 0, damage: 0, count: 0, hillTime: 0, plants: 0, defuses: 0, firstBloods: 0, firstDeaths: 0, goals: 0 });

  const playerMap = new Map<string, { id: string; name: string; kills: number; deaths: number; damage: number; modes: Record<string, ModeAcc> }>();
  for (const stat of allStats) {
    const pid = stat.player_id;
    const mode = gameIdToMode.get(stat.game_id) ?? "";
    if (!playerMap.has(pid)) {
      playerMap.set(pid, { id: pid, name: stat.players?.name ?? "-", kills: 0, deaths: 0, damage: 0, modes: { hardpoint: emptyModeAcc(), snd: emptyModeAcc(), overload: emptyModeAcc() } });
    }
    const p = playerMap.get(pid)!;
    p.kills += stat.kills;
    p.deaths += stat.deaths;
    p.damage += stat.damage;
    const m = p.modes[mode];
    if (m) {
      m.kills += stat.kills;
      m.deaths += stat.deaths;
      m.damage += stat.damage;
      m.count++;
      m.hillTime += stat.hill_time ?? 0;
      m.plants += stat.plants ?? 0;
      m.defuses += stat.defuses ?? 0;
      m.firstBloods += stat.first_bloods ?? 0;
      m.firstDeaths += stat.first_deaths ?? 0;
      m.goals += stat.goals ?? 0;
    }
  }

  function avg(total: number, count: number) {
    return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
  }

  function toModeStats(m: ModeAcc): PlayerModeStats {
    const c = m.count;
    return {
      avgKills: avg(m.kills, c), avgDeaths: avg(m.deaths, c), avgDamage: avg(m.damage, c), count: c,
      kd: c > 0 ? calcKD(m.kills, m.deaths) : "-",
      avgHillTime: c > 0 ? avg(m.hillTime, c) : null,
      avgPlants: c > 0 ? avg(m.plants, c) : null, avgDefuses: c > 0 ? avg(m.defuses, c) : null,
      avgFirstBloods: c > 0 ? avg(m.firstBloods, c) : null, avgFirstDeaths: c > 0 ? avg(m.firstDeaths, c) : null,
      avgGoals: c > 0 ? avg(m.goals, c) : null,
    };
  }

  const playerKDData: PlayerKDData[] = [...playerMap.values()].map((p) => {
    const c = allStats.filter((s) => s.player_id === p.id).length;
    return {
    id: p.id,
    name: p.name,
    overall: { avgKills: avg(p.kills, c), avgDeaths: avg(p.deaths, c), avgDamage: avg(p.damage, c), count: c, kd: calcKD(p.kills, p.deaths), avgHillTime: null, avgPlants: null, avgDefuses: null, avgFirstBloods: null, avgFirstDeaths: null, avgGoals: null },
    hardpoint: toModeStats(p.modes.hardpoint),
    snd: toModeStats(p.modes.snd),
    overload: toModeStats(p.modes.overload),
  };
  });

  return (
    <>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">
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
              YouTube URL
            </a>
          </p>
        )}
        {series.memo && <p className="text-sm mt-1">{series.memo}</p>}
      </div>

      {playerKDData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">メンバー別 K/D</CardTitle>
          </CardHeader>
          <CardContent>
            <PlayerKDTabs players={playerKDData} />
          </CardContent>
        </Card>
      )}

      {games.map((game) => {
        const stats = ((game.game_stats ?? []) as GameStat[]).sort((a, b) =>
          (a.players?.created_at ?? "").localeCompare(b.players?.created_at ?? "")
        );
        const opponentStats = ((game.opponent_game_stats ?? []) as OpponentGameStat[]).sort((a, b) =>
          (a.opponent_players?.created_at ?? "").localeCompare(b.opponent_players?.created_at ?? "")
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
                    <td className="py-2.5 stat-number font-semibold" style={{ color: row.deaths === 0 ? (row.kills > 0 ? "var(--win)" : undefined) : row.kills / row.deaths >= 1.0 ? "var(--win)" : "var(--loss)" }}>{calcKD(row.kills, row.deaths)}</td>
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
              <CardTitle className="text-base sm:text-lg flex flex-wrap items-center gap-2 sm:gap-3">
                <span>Game {game.game_number}</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                  {modeLabel[game.mode]}
                  {game.maps && ` - ${game.maps.name}`}
                </span>
                <span className="text-xs sm:text-sm font-medium">
                  {game.score_team} - {game.score_opponent}
                </span>
                <span className={`font-bold text-xs px-1.5 py-0.5 rounded stat-number ${game.result === "win" ? "text-win bg-win/10" : game.result === "lose" ? "text-loss bg-loss/10" : "text-primary bg-primary/10"}`}>
                  {game.result === "win" ? "WIN" : game.result === "lose" ? "LOSE" : "DRAW"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {game.mode === "hardpoint" && game.hill_times && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">地点別 Hill Time</p>
                  <div className="overflow-x-auto">
                    {(() => {
                      const raw = game.hill_times!;
                      // 旧データ互換: フラット配列 → Round1扱い、1次元オブジェクト → 2次元に変換
                      let ht: { team: number[][]; opponent: number[][]; winner?: ("team" | "opponent" | null)[][] };
                      if (Array.isArray(raw)) {
                        ht = { team: [raw as unknown as number[]], opponent: [[]], winner: [[]] };
                      } else if (Array.isArray(raw.team) && raw.team.length > 0 && !Array.isArray(raw.team[0])) {
                        ht = { team: [raw.team as unknown as number[]], opponent: [raw.opponent as unknown as number[]], winner: [[]] };
                      } else {
                        ht = raw as { team: number[][]; opponent: number[][]; winner?: ("team" | "opponent" | null)[][] };
                      }
                      const hasData = ht.team.flat().some((v) => v > 0) || ht.opponent.flat().some((v) => v > 0);
                      if (!hasData) return null;

                      const hillCount = Math.max(
                        ...ht.team.map((r) => r.length),
                        ...ht.opponent.map((r) => r.length),
                        0
                      );
                      const roundCount = Math.max(ht.team.length, ht.opponent.length, 1);
                      return (
                        <table className="text-sm border-separate border-spacing-x-4 border-spacing-y-0.5">
                          <thead>
                            <tr>
                              <th className="text-xs text-muted-foreground font-medium text-left min-w-[90px]"></th>
                              {Array.from({ length: hillCount }, (_, h) => (
                                <th key={h} className="text-xs text-muted-foreground font-medium text-center">Hill {h + 1}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: roundCount }, (_, rIdx) => (
                              <React.Fragment key={rIdx}>
                                {rIdx > 0 && (
                                  <tr><td colSpan={hillCount + 1} className="pt-2" /></tr>
                                )}
                                <tr>
                                  <td className="text-xs text-muted-foreground pr-2 whitespace-nowrap font-medium">{rIdx + 1}周目</td>
                                  <td colSpan={hillCount} />
                                </tr>
                                <tr>
                                  <td className="text-xs text-muted-foreground pr-2 whitespace-nowrap pl-2">{teamName}</td>
                                  {Array.from({ length: hillCount }, (_, h) => {
                                    const tv = ht.team[rIdx]?.[h] ?? 0;
                                    const ov = ht.opponent[rIdx]?.[h] ?? 0;
                                    const color = tv > ov ? "text-win" : tv < ov ? "text-loss" : "";
                                    return (
                                      <td key={h} className={`text-center stat-number text-sm font-medium ${color}`}>
                                        {(tv > 0 || ov > 0) ? `${tv}s` : ""}
                                      </td>
                                    );
                                  })}
                                </tr>
                                <tr>
                                  <td className="text-xs text-muted-foreground pr-2 whitespace-nowrap pl-2">{series.opponents?.name}</td>
                                  {Array.from({ length: hillCount }, (_, h) => {
                                    const tv = ht.team[rIdx]?.[h] ?? 0;
                                    const ov = ht.opponent[rIdx]?.[h] ?? 0;
                                    const color = ov > tv ? "text-win" : ov < tv ? "text-loss" : "";
                                    return (
                                      <td key={h} className={`text-center stat-number text-sm font-medium ${color}`}>
                                        {(tv > 0 || ov > 0) ? `${ov}s` : ""}
                                      </td>
                                    );
                                  })}
                                </tr>
                                {ht.winner && (
                                  <tr>
                                    <td />
                                    {Array.from({ length: hillCount }, (_, h) => {
                                      const w = ht.winner?.[rIdx]?.[h] ?? null;
                                      if (w === null) return <td key={h} />;
                                      return (
                                        <td key={h} className={`text-center text-sm font-bold ${w === "team" ? "text-win" : "text-loss"}`}>
                                          {w === "team" ? "◯" : "☓"}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </div>
              )}
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
    </>
  );
}
