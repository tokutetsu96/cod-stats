import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PlayerList } from "./_components/player-list";

export default async function PlayersPage() {
  const supabase = await createClient();

  const { profile } = await getProfile();
  const { data: players } = await supabase.from("players").select("*").eq("team_id", profile.team_id).order("created_at");

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">プレイヤー管理</h1>
        <Card>
          <CardHeader>
            <CardTitle>プレイヤー一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <PlayerList players={players ?? []} teamId={profile.team_id} isAdmin={profile.role === "admin"} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
