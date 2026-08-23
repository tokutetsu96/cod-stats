import { getProfile } from "@/lib/supabase/auth";
import { getCurrentTitle } from "@/lib/supabase/titles";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { OpponentList } from "./_components/opponent-list";

// get_opponent_match_stats RPC が返す行（(opponent_id, mode) ごとの集計済み成績）
type OpponentMatchStatRow = {
  opponent_id: string;
  mode: string;
  wins: number;
  total: number;
};

export default async function OpponentsPage() {
  const supabase = await createClient();

  const { profile } = await getProfile();
  const { currentTitle } = await getCurrentTitle();
  // 成績集計は get_opponent_match_stats RPC でDB側に実施する。
  // (opponent_id, mode) ごとの勝利数・総数のみを返すため、series/games の
  // 全行を転送していた従来方式（limit 200 による集計欠落リスク）を排除する。
  // RPC は SECURITY INVOKER で RLS により呼び出し元チームへ自動スコープされる。選択中の作品でも絞り込む。
  const [{ data: opponents }, { data: matchStats }] = await Promise.all([
    supabase.from("opponents").select("id, name, opponent_players(id, name, is_default, created_at, opponent_id, team_id)").eq("team_id", profile.team_id).order("name"),
    supabase.rpc("get_opponent_match_stats", { p_title_id: currentTitle?.id }),
  ]);

  const statRows = (matchStats ?? []) as OpponentMatchStatRow[];
  const statsByOpponent = new Map<string, OpponentMatchStatRow[]>();
  for (const r of statRows) {
    const arr = statsByOpponent.get(r.opponent_id) ?? [];
    arr.push(r);
    statsByOpponent.set(r.opponent_id, arr);
  }

  const opponentStats = (opponents ?? []).map((opp) => {
    const oppRows = statsByOpponent.get(opp.id) ?? [];
    const wins = oppRows.reduce((sum, r) => sum + r.wins, 0);
    const total = oppRows.reduce((sum, r) => sum + r.total, 0);
    const modeStats = (["hardpoint", "snd", "overload"] as const).map((mode) => {
      const mr = oppRows.find((r) => r.mode === mode);
      return { mode, wins: mr?.wins ?? 0, total: mr?.total ?? 0 };
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
        <h1 className="text-xl sm:text-2xl font-bold">対戦相手管理</h1>
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
