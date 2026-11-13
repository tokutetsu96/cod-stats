import { cache } from "react";
import { createClient } from "./server";
import { redirect } from "next/navigation";
import type { Profile, TeamMembership, UserRole } from "@/lib/types";

/** 所属チームが1つも無い（または選択中チームが無効な）ユーザーの遷移先 */
export const NO_TEAM_PATH = "/join-team";

export const getProfile = cache(async () => {
  const supabase = await createClient();
  // getClaims() は非対称JWT署名キーが有効なためローカル検証され、
  // Authサーバーへのネットワーク往復を伴わない（getUser() は毎回往復する）。
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const [{ data: profileData }, { data: memberRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar, team_id, created_at")
      .eq("id", userId)
      .single(),
    supabase
      .from("team_members")
      .select("team_id, role, teams(name)")
      .eq("user_id", userId)
      .order("created_at")
      .returns<{ team_id: string; role: string; teams: { name: string } | null }[]>(),
  ]);

  if (!profileData) redirect("/login");

  const teams: TeamMembership[] = (memberRows ?? []).map((m) => ({
    team_id: m.team_id,
    team_name: m.teams?.name ?? "",
    role: m.role as UserRole,
  }));

  // profiles.team_id は「選択中チーム」。所属が実在しない場合は未所属扱い
  const current = teams.find((t) => t.team_id === profileData.team_id);
  if (!current) redirect(NO_TEAM_PATH);

  const profile: Profile = {
    id: profileData.id,
    username: profileData.username,
    avatar: profileData.avatar,
    team_id: current.team_id,
    role: current.role,
    created_at: profileData.created_at ?? "",
  };

  return { supabase, profile, teamName: current.team_name, teams };
});
