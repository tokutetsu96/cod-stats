import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { OpponentList } from "./_components/opponent-list";

export default async function OpponentsPage() {
  const { supabase, profile } = await getProfile();

  const [{ data: opponents }, { data: series }] = await Promise.all([
    supabase.from("opponents").select("*, opponent_players(*)").order("name"),
    supabase.from("series").select("opponent_id, games(mode, result)"),
  ]);

  const opponentStats = (opponents ?? []).map((opp) => {
    const oppSeries = (series ?? []).filter((s) => s.opponent_id === opp.id);
    const allGames = oppSeries.flatMap((s) => s.games ?? []);
    const wins = allGames.filter((g) => g.result === "win").length;
    const total = allGames.length;
    const modeStats = (["hardpoint", "snd", "overload"] as const).map((mode) => {
      const mg = allGames.filter((g) => g.mode === mode);
      const mw = mg.filter((g) => g.result === "win").length;
      return { mode, wins: mw, total: mg.length };
    });
    return {
      ...opp,
      wins,
      total,
      winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : "-",
      modeStats,
      opponent_players: opp.opponent_players ?? [],
    };
  });

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-2xl font-bold">対戦相手管理</h1>
        <Card>
          <CardHeader>
            <CardTitle>対戦相手一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <OpponentList opponents={opponentStats} teamId={profile.team_id} isAdmin={profile.role === "admin"} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
