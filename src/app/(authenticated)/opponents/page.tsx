import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { OpponentList } from "./_components/opponent-list";

export default async function OpponentsPage() {
  const { supabase, profile } = await getProfile();

  const [{ data: opponents }, { data: series }] = await Promise.all([
    supabase.from("opponents").select("*, opponent_players(*)").order("name"),
    supabase.from("series").select("opponent_id, games(result)"),
  ]);

  const opponentStats = (opponents ?? []).map((opp) => {
    const oppSeries = (series ?? []).filter((s) => s.opponent_id === opp.id);
    const allGames = oppSeries.flatMap((s) => s.games ?? []);
    const wins = allGames.filter((g) => g.result === "win").length;
    const total = allGames.length;
    return {
      ...opp,
      wins,
      total,
      winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : "-",
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
            <OpponentList opponents={opponentStats} teamId={profile.team_id} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
