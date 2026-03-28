import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { GameMode, MatchResult } from "@/lib/types";

const modeLabel: Record<string, string> = { hardpoint: "Hardpoint", snd: "S&D", overload: "Overload" };
const resultLabel: Record<string, string> = { win: "勝", lose: "負", draw: "分" };
const resultClass: Record<string, string> = {
  win: "text-win font-bold stat-number",
  lose: "text-loss font-bold stat-number",
  draw: "text-muted-foreground font-bold stat-number",
};

export default async function OpponentStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getProfile();

  const [{ data: opponent }, { data: seriesData }] = await Promise.all([
    supabase.from("opponents").select("*").eq("id", id).single(),
    supabase
      .from("series")
      .select("id, series_date, type, games(id, mode, result, score_team, score_opponent, maps(name))")
      .eq("opponent_id", id)
      .order("series_date", { ascending: false }),
  ]);

  if (!opponent) notFound();

  type GameRow = { id: string; mode: GameMode; result: MatchResult; score_team: number; score_opponent: number; maps: { name: string } | { name: string }[] | null };
  type SeriesRow = { id: string; series_date: string; type: string; games: GameRow[] };

  const series = (seriesData ?? []) as unknown as SeriesRow[];
  const allGames = series.flatMap((s) => s.games ?? []);

  let wins = 0, losses = 0, draws = 0;
  const modeCounts = { hardpoint: { total: 0, wins: 0, losses: 0 }, snd: { total: 0, wins: 0, losses: 0 }, overload: { total: 0, wins: 0, losses: 0 } };
  for (const g of allGames) {
    if (g.result === "win") wins++;
    else if (g.result === "lose") losses++;
    else if (g.result === "draw") draws++;
    const mc = modeCounts[g.mode as keyof typeof modeCounts];
    if (mc) {
      mc.total++;
      if (g.result === "win") mc.wins++;
      else if (g.result === "lose") mc.losses++;
    }
  }
  const total = allGames.length;

  // シリーズ勝敗（ゲーム数が多い方が勝ち）
  let seriesWins = 0, seriesLosses = 0;
  const seriesResults = series.map((s) => {
    let sw = 0, sl = 0;
    for (const g of s.games) {
      if (g.result === "win") sw++;
      else if (g.result === "lose") sl++;
    }
    const r = sw > sl ? "win" : sl > sw ? "lose" : "draw";
    if (r === "win") seriesWins++;
    else if (r === "lose") seriesLosses++;
    return r;
  });

  const modeData = (["hardpoint", "snd", "overload"] as const).map((mode) => {
    const mc = modeCounts[mode];
    return {
      mode,
      total: mc.total,
      wins: mc.wins,
      losses: mc.losses,
      winRate: mc.total > 0 ? ((mc.wins / mc.total) * 100).toFixed(1) : null,
    };
  });

  return (
    <main className="mx-auto max-w-4xl p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/opponents" className="text-sm text-muted-foreground hover:text-foreground">対戦相手</Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold">{opponent.name}</h1>
      </div>
      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-l-2 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">総シリーズ</p>
            <p className="stat-number text-4xl">{series.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{seriesWins}勝 {seriesLosses}敗</p>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">総ゲーム</p>
            <p className="stat-number text-4xl">{total}</p>
            <p className="text-xs text-muted-foreground mt-1">{wins}勝 {losses}敗{draws > 0 ? ` ${draws}分` : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">ゲーム勝率</p>
            <p className="stat-number text-4xl">{total > 0 ? ((wins / total) * 100).toFixed(1) : "-"}<span className="text-lg text-muted-foreground">%</span></p>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">シリーズ勝率</p>
            <p className="stat-number text-4xl">
              {series.length > 0 ? ((seriesWins / series.length) * 100).toFixed(1) : "-"}<span className="text-lg text-muted-foreground">%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* モード別 */}
      <Card>
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">モード別成績</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <table className="w-full text-sm data-table">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">モード</th>
                <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-right">ゲーム数</th>
                <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-right">勝</th>
                <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-right">負</th>
                <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-right">勝率</th>
              </tr>
            </thead>
            <tbody>
              {modeData.map((md) => (
                <tr key={md.mode} className="border-b border-border/50">
                  <td className="py-2.5 font-medium">{modeLabel[md.mode]}</td>
                  <td className="py-2.5 text-right stat-number">{md.total}</td>
                  <td className="py-2.5 text-right text-win stat-number">{md.wins}</td>
                  <td className="py-2.5 text-right text-loss stat-number">{md.losses}</td>
                  <td className="py-2.5 text-right stat-number font-medium">{md.winRate ? `${md.winRate}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 対戦履歴 */}
      <Card>
        <CardHeader><CardTitle>対戦履歴</CardTitle></CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <p className="text-sm text-muted-foreground">対戦記録がありません</p>
          ) : (
            <div className="space-y-2">
              {series.map((s, si) => {
                let sw = 0, sl = 0;
                for (const g of s.games) { if (g.result === "win") sw++; else if (g.result === "lose") sl++; }
                const sr = seriesResults[si];
                return (
                  <Link key={s.id} href={`/matches/${s.id}`} className="block border rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-base w-6 text-center ${resultClass[sr]}`}>{resultLabel[sr]}</span>
                      <span className="text-sm font-medium">{sw} - {sl}</span>
                      <span className="text-xs text-muted-foreground">{s.series_date}</span>
                      <span className="text-xs text-muted-foreground">{s.type === "scrim" ? "Scrim" : "大会"}</span>
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
    </main>
  );
}
