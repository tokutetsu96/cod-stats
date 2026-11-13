import { getProfile } from "@/lib/supabase/auth";
import { getCurrentTitle } from "@/lib/supabase/titles";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MapManager } from "./_components/map-manager";
import { TeamManagement } from "./_components/team-management";
import { InviteManager } from "./_components/invite-manager";
import { BanList } from "./_components/ban-list";
import { AvatarSetting } from "./_components/avatar-setting";
import { TitleManager } from "./_components/title-manager";
import { getTitleModes } from "@/lib/constants";
import { TeamJoinForm } from "@/components/team-join-form";
import type { TeamBan, TeamInvite, TeamMember, UserRole } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { profile } = await getProfile();
  const { titles, currentTitle } = await getCurrentTitle();

  const isAdmin = profile.role === "admin";
  // 招待コード・除外記録は管理者のみ取得（RLSでも管理者以外は0件になる）
  const empty = Promise.resolve({ data: null });

  const [{ data: maps }, { data: team }, { data: users }, { data: invites }, { data: bans }] = await Promise.all([
    supabase
      .from("maps")
      .select("*")
      .eq("team_id", profile.team_id)
      .eq("title_id", currentTitle?.id ?? "")
      .order("mode")
      .order("name"),
    supabase.from("teams").select("*").eq("id", profile.team_id).single(),
    supabase
      .from("team_members")
      .select("user_id, role, profiles(username)")
      .eq("team_id", profile.team_id)
      .order("created_at")
      .returns<{ user_id: string; role: string; profiles: { username: string } | null }[]>(),
    isAdmin
      ? supabase
          .from("team_invites")
          .select("id, code, expires_at, max_uses, use_count, created_at")
          .eq("team_id", profile.team_id)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .returns<TeamInvite[]>()
      : empty,
    isAdmin
      ? supabase
          .from("team_bans")
          .select("user_id, username, created_at")
          .eq("team_id", profile.team_id)
          .order("created_at", { ascending: false })
          .returns<TeamBan[]>()
      : empty,
  ]);

  // 使用回数の上限に達したコードは参加に使えないため一覧から外す
  const activeInvites = (invites ?? []).filter((i) => i.max_uses === null || i.use_count < i.max_uses);

  const members: TeamMember[] = (users ?? []).map((m) => ({
    user_id: m.user_id,
    username: m.profiles?.username ?? "",
    role: m.role as UserRole,
  }));

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
            users={members}
            currentProfile={profile}
          />
          {isAdmin ? (
            <>
              <div className="pt-4 border-t border-border space-y-2">
                <h3 className="text-sm text-muted-foreground">招待コード</h3>
                <InviteManager invites={activeInvites} />
              </div>
              <div className="pt-4 border-t border-border space-y-2">
                <h3 className="text-sm text-muted-foreground">除外したユーザー</h3>
                <BanList bans={bans ?? []} />
              </div>
            </>
          ) : (
            <p className="pt-4 border-t border-border text-xs text-muted-foreground">
              メンバーを招待するには、管理者に招待コードを発行してもらってください。
            </p>
          )}
        </CardContent>
      </Card>

      <Card id="team-join" className="scroll-mt-20">
        <CardHeader>
          <CardTitle>チームの追加</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamJoinForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>作品管理</CardTitle>
        </CardHeader>
        <CardContent>
          <TitleManager titles={titles} isAdmin={isAdmin} />
        </CardContent>
      </Card>

      {currentTitle && (
        <Card>
          <CardHeader>
            <CardTitle>マップ管理（{currentTitle.name}）</CardTitle>
          </CardHeader>
          <CardContent>
            <MapManager maps={maps ?? []} modes={getTitleModes(currentTitle)} teamId={profile.team_id} titleId={currentTitle.id} isAdmin={isAdmin} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
