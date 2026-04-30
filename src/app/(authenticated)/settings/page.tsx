import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MapManager } from "./_components/map-manager";
import { TeamManagement } from "./_components/team-management";
import { CopyTeamId } from "./_components/copy-team-id";
import { AvatarSetting } from "./_components/avatar-setting";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { profile } = await getProfile();

  const [{ data: maps }, { data: team }, { data: users }] = await Promise.all([
    supabase.from("maps").select("*").eq("team_id", profile.team_id).order("mode").order("name"),
    supabase.from("teams").select("*").eq("id", profile.team_id).single(),
    supabase.from("profiles").select("*").eq("team_id", profile.team_id).order("created_at"),
  ]);

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">設定</h1>

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
            users={users ?? []}
            currentProfile={profile}
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
          <MapManager maps={maps ?? []} teamId={profile.team_id} isAdmin={profile.role === "admin"} />
        </CardContent>
      </Card>
    </main>
  );
}
