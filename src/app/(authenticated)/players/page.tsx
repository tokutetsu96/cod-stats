import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PlayerList } from "./player-list";

export default async function PlayersPage() {
  const { supabase, profile } = await getProfile();

  const { data: players } = await supabase.from("players").select("*").order("created_at");

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-2xl font-bold">プレイヤー管理</h1>
        <Card>
          <CardHeader>
            <CardTitle>プレイヤー一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <PlayerList players={players ?? []} teamId={profile.team_id} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
