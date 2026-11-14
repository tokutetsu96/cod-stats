import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { getCurrentTitle } from "@/lib/supabase/titles";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { GameMode, MatchResult, SeriesType } from "@/lib/types";
import { getTitleModes, modeLabel, seriesTypeLabel } from "@/lib/constants";
import { OpponentPlayerStats } from "./opponent-player-stats";
import { Table, Th, Td } from "@/components/ui/table";
const resultLabel: Record<string, string> = { win: "勝", lose: "負", draw: "分" };
const resultClass: Record<string, string> = {
  win: "text-win font-bold stat-number",
  lose: "text-loss font-bold stat-number",
  draw: "text-muted-foreground font-bold stat-number",
};

export async function OpponentDetailContent({ id }: { id: string }) {
  const supabase = await createClient();
  const [{ profile }, { currentTitle }] = await Promise.all([getProfile(), getCurrentTitle()]);

  type GameRow = { id: string; mode: GameMode; result: MatchResult; score_team: number; score_opponent: number };
  type SeriesRow = { id: string; series_date: string; type: SeriesType; games: GameRow[] };

  // 相手プレイヤー別スタッツは get_opponent_player_stats RPC でDB側集計する
  // （SECURITY INVOKER。RLS により呼び出し元チームへ自動スコープされる）
  const [{ data: opponent }, { data: seriesData }, { data: playerStatRows }] = await Promise.all([
    supabase.from("opponents").select("name").eq("id", id).eq("team_id", profile.team_id).single(),
    supabase
      .from("series")
      .select("id, series_date, type, games(id, mode, result, score_team, score_opponent)")
      .eq("opponent_id", id)
      .eq("team_id", profile.team_id)
      .eq("title_id", currentTitle?.id ?? "")
      .order("series_date", { ascending: false })
      .overrideTypes<SeriesRow[], { merge: false }>(),
    currentTitle
      ? supabase.rpc("get_opponent_player_stats", { p_opponent_id: id, p_title_id: currentTitle.id })
      : Promise.resolve({ data: null }),
  ]);

  if (!opponent) notFound();

  const series = seriesData ?? [];
  const allGames = series.flatMap((s) => s.games ?? []);

  let wins = 0, losses = 0, draws = 0;
  const modes = getTitleModes(currentTitle);
  const modeCounts = new Map<string, { total: number; wins: number; losses: number }>(
    modes.map((m) => [m, { total: 0, wins: 0, losses: 0 }]),
  );
  for (const g of allGames) {
    if (g.result === "win") wins++;
    else if (g.result === "lose") losses++;
    else if (g.result === "draw") draws++;
    const mc = modeCounts.get(g.mode);
    if (mc) {
      mc.total++;
      if (g.result === "win") mc.wins++;
      else if (g.result === "lose") mc.losses++;
    }
  }
  const total = allGames.length;

  let seriesWins = 0, seriesLosses = 0;
  const seriesResults = series.map((s) => {
    let sw = 0, sl = 0;
    for (const g of s.games) {
      if (g.result === "win") sw++;
      else if (g.result === "lose") sl++;
    }
    const result: MatchResult = sw > sl ? "win" : sl > sw ? "lose" : "draw";
    if (result === "win") seriesWins++;
    else if (result === "lose") seriesLosses++;
    return { wins: sw, losses: sl, result };
  });

  const modeData = modes.map((mode) => {
    const mc = modeCounts.get(mode)!;
    return {
      mode,
      total: mc.total,
      wins: mc.wins,
      losses: mc.losses,
      winRate: mc.total > 0 ? ((mc.wins / mc.total) * 100).toFixed(1) : null,
    };
  });

  return (
    <>
      <div className="flex items-center gap-2">
        <Link href="/opponents" className="text-sm text-muted-foreground hover:text-foreground">対戦相手</Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl sm:text-2xl font-bold">{opponent.name}</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">総シリーズ</p>
            <p className="stat-number text-3xl sm:text-4xl">{series.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{seriesWins}勝 {seriesLosses}敗</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">総ゲーム</p>
            <p className="stat-number text-3xl sm:text-4xl">{total}</p>
            <p className="text-xs text-muted-foreground mt-1">{wins}勝 {losses}敗{draws > 0 ? ` ${draws}分` : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">ゲーム勝率</p>
            <p className="stat-number text-3xl sm:text-4xl">{total > 0 ? ((wins / total) * 100).toFixed(1) : "-"}<span className="text-lg text-muted-foreground">%</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">シリーズ勝率</p>
            <p className="stat-number text-3xl sm:text-4xl">
              {series.length > 0 ? ((seriesWins / series.length) * 100).toFixed(1) : "-"}<span className="text-lg text-muted-foreground">%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground">モード別成績</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Table>
            <thead>
              <tr className="border-b text-left">
                <Th>モード</Th>
                <Th numeric>ゲーム数</Th>
                <Th numeric>勝</Th>
                <Th numeric>負</Th>
                <Th numeric>勝率</Th>
              </tr>
            </thead>
            <tbody>
              {modeData.map((md) => (
                <tr key={md.mode} className="border-b border-border/50">
                  <Td className="font-medium">{modeLabel[md.mode]}</Td>
                  <Td numeric>{md.total}</Td>
                  <Td numeric className="text-win">{md.wins}</Td>
                  <Td numeric className="text-loss">{md.losses}</Td>
                  <Td numeric className="font-medium">{md.winRate ? `${md.winRate}%` : "-"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <OpponentPlayerStats rows={playerStatRows ?? []} modes={modes} />

      <Card>
        <CardHeader><CardTitle>対戦履歴</CardTitle></CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <p className="text-sm text-muted-foreground">対戦記録がありません</p>
          ) : (
            <div className="space-y-2">
              {series.map((s, si) => {
                const { wins: sw, losses: sl, result: sr } = seriesResults[si];
                return (
                  <Link key={s.id} href={`/matches/${s.id}`} className="block border rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-base w-6 text-center ${resultClass[sr]}`}>{resultLabel[sr]}</span>
                      <span className="text-sm font-medium">{sw} - {sl}</span>
                      <span className="text-xs text-muted-foreground">{s.series_date}</span>
                      <span className="text-xs text-muted-foreground">{seriesTypeLabel[s.type]}</span>
                      <div className="flex gap-1 ml-auto flex-wrap justify-end">
                        {s.games.map((g) => (
                          <span key={g.id} className={`text-xs px-1.5 py-0.5 rounded ${resultClass[g.result]}`}>
                            {modeLabel[g.mode]} {g.score_team}-{g.score_opponent}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
