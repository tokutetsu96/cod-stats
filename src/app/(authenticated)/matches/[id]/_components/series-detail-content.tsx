import React from "react";
import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";
import type { Game, GameStat, OpponentGameStat, Series, Opponent } from "@/lib/types";
import { cn, countResults, formatDate, calcKD, isValidYoutubeUrl, normalizeHillTimes } from "@/lib/utils";
import { PlayerKDTabs } from "@/components/player-kd-tabs";
import { SeriesTypeBadge } from "@/components/series-badges";
import { ResultBadge, Scoreline, ScoreBar, SideMarker } from "@/components/scoreline";
import { addStat, toPlayerKDData, type PlayerAcc, type PlayerKDData } from "@/lib/kd-stats";
import { getTitleModes, modeLabel, modeShortLabel } from "@/lib/constants";
import { getCurrentTitle } from "@/lib/supabase/titles";
import { resultColor, resultLabel } from "../../_components/series-form-shared";
import { Table, Th, Td } from "@/components/ui/table";

export async function SeriesDetailContent({ id }: { id: string }) {
  const supabase = await createClient();

  type SeriesDetail = Series & { opponents: Opponent | null; games: Game[] };

  const { profile, teamName } = await getProfile();
  const [{ data: series }, { titles }] = await Promise.all([supabase
    .from("series")
    .select("*, opponents(*), games(id, game_number, mode, result, score_team, score_opponent, hill_times, maps(name), game_stats(id, game_id, player_id, kills, deaths, damage, hill_time, plants, defuses, first_bloods, first_deaths, goals, uploads, dunks, remote_plants, players(name, created_at)), opponent_game_stats(id, game_id, kills, deaths, damage, hill_time, plants, defuses, first_bloods, first_deaths, goals, uploads, dunks, remote_plants, opponent_players(name, created_at)))")
    .eq("id", id)
    .eq("team_id", profile.team_id)
    .single<SeriesDetail>(), getCurrentTitle()]);

  if (!series) notFound();

  const games = (series.games ?? []).toSorted((a, b) => a.game_number - b.game_number);
  const record = countResults(games);
  const opponentName = series.opponents?.name ?? "-";
  const seriesResult = record.wins > record.losses ? "win" : record.wins < record.losses ? "lose" : "draw";

  const allStats = games.flatMap((g) => (g.game_stats ?? []) as GameStat[]);
  const gameIdToMode = new Map(games.map((g) => [g.id, g.mode]));

  // 生スタッツ行（1行=1ゲーム分）を共有アキュムレータに合算して PlayerKDData を生成
  const accMap = new Map<string, PlayerAcc>();
  for (const stat of allStats) {
    addStat(accMap, stat.player_id, stat.players?.name ?? "-", gameIdToMode.get(stat.game_id) ?? "", {
      kills: stat.kills,
      deaths: stat.deaths,
      damage: stat.damage,
      count: 1,
      hillTime: stat.hill_time ?? 0,
      plants: stat.plants ?? 0,
      defuses: stat.defuses ?? 0,
      firstBloods: stat.first_bloods ?? 0,
      firstDeaths: stat.first_deaths ?? 0,
      goals: stat.goals ?? 0,
      uploads: stat.uploads ?? 0,
      dunks: stat.dunks ?? 0,
      remotePlants: stat.remote_plants ?? 0,
    });
  }

  const playerKDData: PlayerKDData[] = [...accMap.values()].map(toPlayerKDData);
  // Navで選択中の作品ではなく、この対戦が属する作品のモード一覧を使う
  const modes = getTitleModes(titles.find((t) => t.id === series.title_id));

  return (
    <>
      {/* シリーズのスコアボード。この画面で最初に知りたい「何対何で勝ったか」を最も大きく置く */}
      <header className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
          <time dateTime={series.series_date}>{formatDate(series.series_date)}</time>
          <SeriesTypeBadge type={series.type} />
        </div>
        <h1 className="sr-only">
          vs {opponentName}（{record.wins}勝{record.losses}敗）
        </h1>
        <Scoreline
          size="lg"
          teamName={teamName ?? "自チーム"}
          opponentName={opponentName}
          teamScore={record.wins}
          opponentScore={record.losses}
        />
        <div className="flex justify-center">
          <ResultBadge result={seriesResult} />
        </div>
        {games.length > 0 && (
          <nav aria-label="ゲーム一覧" className="flex flex-wrap justify-center gap-2">
            {games.map((g) => (
              <a
                key={g.id}
                href={`#game-${g.game_number}`}
                className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
              >
                <span className="text-muted-foreground">{modeShortLabel[g.mode]}</span>
                <span className="stat-number text-sm">
                  {g.score_team}-{g.score_opponent}
                </span>
                <span className={cn("stat-number", resultColor[g.result])}>{resultLabel[g.result]}</span>
              </a>
            ))}
          </nav>
        )}
        {series.youtube_url && isValidYoutubeUrl(series.youtube_url) && (
          <p className="text-center text-sm">
            <a href={series.youtube_url} target="_blank" rel="noopener noreferrer" className="link">
              YouTubeで試合を見る
            </a>
          </p>
        )}
        {series.memo && <p className="mx-auto max-w-prose text-sm whitespace-pre-wrap">{series.memo}</p>}
      </header>

      {playerKDData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">メンバー別 K/D</CardTitle>
          </CardHeader>
          <CardContent>
            <PlayerKDTabs players={playerKDData} modes={modes} />
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

        type StatRow = { id: string; name: string; kills: number; deaths: number; damage: number; hill_time: number | null; plants: number | null; defuses: number | null; first_bloods: number | null; first_deaths: number | null; goals: number | null; uploads: number | null; dunks: number | null; remote_plants: number | null };

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
            <Table>
              <thead>
                <tr className="border-b text-left">
                  <Th>プレイヤー</Th>
                  <Th numeric>K</Th>
                  <Th numeric>D</Th>
                  <Th numeric>KD</Th>
                  <Th numeric>Dmg</Th>
                  {game.mode === "hardpoint" && <Th numeric>Hill</Th>}
                  {game.mode === "snd" && <><Th numeric>P</Th><Th numeric>Def</Th><Th numeric>FB</Th><Th numeric>FD</Th></>}
                  {game.mode === "overload" && <Th numeric>Goals</Th>}
                  {game.mode === "hijack" && <><Th numeric>アップロード</Th><Th numeric>設置</Th><Th numeric>ダンク</Th><Th numeric>リモート設置</Th></>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/50">
                    <Td className="font-medium">{row.name}</Td>
                    <Td numeric>{row.kills}</Td>
                    <Td numeric>{row.deaths}</Td>
                    <Td numeric className="font-semibold" style={{ color: row.deaths === 0 ? (row.kills > 0 ? "var(--win)" : undefined) : row.kills / row.deaths >= 1.0 ? "var(--win)" : "var(--loss)" }}>{calcKD(row.kills, row.deaths)}</Td>
                    <Td numeric>{row.damage}</Td>
                    {game.mode === "hardpoint" && <Td numeric>{row.hill_time ?? 0}s</Td>}
                    {game.mode === "snd" && <><Td numeric>{row.plants ?? 0}</Td><Td numeric>{row.defuses ?? 0}</Td><Td numeric>{row.first_bloods ?? 0}</Td><Td numeric>{row.first_deaths ?? 0}</Td></>}
                    {game.mode === "overload" && <Td numeric>{row.goals ?? 0}</Td>}
                    {game.mode === "hijack" && <><Td numeric>{row.uploads ?? 0}</Td><Td numeric>{row.plants ?? 0}</Td><Td numeric>{row.dunks ?? 0}</Td><Td numeric>{row.remote_plants ?? 0}</Td></>}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          </div>
          );
        };

        return (
          <Card key={game.id} id={`game-${game.game_number}`} className="scroll-mt-20">
            <CardHeader className="space-y-4 pb-5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span>Game {game.game_number}</span>
                  <span className="font-normal text-muted-foreground">
                    {modeLabel[game.mode]}
                    {game.maps && ` / ${game.maps.name}`}
                  </span>
                </CardTitle>
                <ResultBadge result={game.result} className="px-1.5 py-0.5 text-xs" />
              </div>
              <Scoreline
                teamName={teamName ?? "自チーム"}
                opponentName={opponentName}
                teamScore={game.score_team}
                opponentScore={game.score_opponent}
              />
              <ScoreBar team={game.score_team} opponent={game.score_opponent} />
            </CardHeader>
            <CardContent className="space-y-4">
              {game.mode === "hardpoint" && game.hill_times && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">地点別 Hill Time</p>
                  <div className="overflow-x-auto">
                    {(() => {
                      // 旧データ互換の変換は normalizeHillTimes に共通化
                      const ht = normalizeHillTimes(game.hill_times);
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
                                <tr>
                                  <td />
                                  {Array.from({ length: hillCount }, (_, h) => {
                                    const w = ht.winner[rIdx]?.[h] ?? null;
                                    if (w === null) return <td key={h} />;
                                    return (
                                      <td key={h} className={`text-center text-sm font-bold ${w === "team" ? "text-win" : "text-loss"}`}>
                                        {w === "team" ? "◯" : "☓"}
                                      </td>
                                    );
                                  })}
                                </tr>
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
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <SideMarker side="team" />
                    {teamName}
                  </p>
                  {stats.length === 0
                    ? <p className="text-sm text-muted-foreground">スタッツなし</p>
                    : statsTable(stats.map((s) => ({ ...s, name: s.players?.name ?? "-" })))
                  }
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <SideMarker side="opponent" />
                    {opponentName}
                  </p>
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
