import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MapManager } from "./map-manager";
import { TeamManagement } from "./team-management";
import { CopyTeamId } from "./copy-team-id";
import { AvatarSetting } from "./avatar-setting";

export default async function SettingsPage() {
  const { supabase, profile } = await getProfile();

  const [{ data: maps }, { data: team }, { data: players }] = await Promise.all([
    supabase.from("maps").select("*").order("mode").order("name"),
    supabase.from("teams").select("*").eq("id", profile.team_id).single(),
    supabase.from("players").select("*").order("created_at"),
  ]);

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

      <Card>
        <CardHeader>
          <CardTitle>プロフィール</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarSetting profileId={profile.id} currentAvatar={profile.avatar} username={profile.username} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>チーム管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <TeamManagement
            team={team!}
            players={players ?? []}
            currentProfileId={profile.id}
          />
          <div className="pt-4 border-t border-border">
            <CopyTeamId teamId={profile.team_id} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>マップ管理</CardTitle>
        </CardHeader>
        <CardContent>
          <MapManager maps={maps ?? []} teamId={profile.team_id} />
        </CardContent>
      </Card>
    </main>
  );
}
