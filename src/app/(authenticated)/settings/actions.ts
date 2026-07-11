"use server";

import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

async function requireAdmin() {
  const { profile } = await getProfile();
  if (profile.role !== "admin") throw new Error("権限がありません");
  return profile;
}

export async function updateTeamName(teamId: string, name: string) {
  const admin = await requireAdmin();
  if (admin.team_id !== teamId) throw new Error("権限がありません");
  const supabase = await createClient();
  const { error } = await supabase.from("teams").update({ name }).eq("id", teamId);
  if (error) throw new Error("チーム名の変更に失敗しました");
}

export async function toggleUserRole(targetUserId: string, newRole: UserRole) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", targetUserId)
    .single();
  if (!target || target.team_id !== admin.team_id) throw new Error("権限がありません");
  const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", targetUserId);
  // 最終adminガード（DBトリガー）等の理由をそのまま表示する
  if (error) throw new Error(error.message || "権限の変更に失敗しました");
}

export async function kickUser(targetUserId: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", targetUserId)
    .single();
  if (!target || target.team_id !== admin.team_id) throw new Error("権限がありません");
  const { error } = await supabase.from("profiles").delete().eq("id", targetUserId);
  if (error) throw new Error(error.message || "ユーザーの除外に失敗しました");
}
