"use server";

import { cookies } from "next/headers";
import { getProfile } from "@/lib/supabase/auth";
import { CURRENT_TITLE_COOKIE } from "@/lib/supabase/titles";
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

// メンバー操作は選択中チームの team_members 行に限定する（RLSでも同条件を強制）
export async function toggleUserRole(targetUserId: string, newRole: UserRole) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .update({ role: newRole })
    .eq("user_id", targetUserId)
    .eq("team_id", admin.team_id)
    .select("user_id");
  // 最終adminガード（DBトリガー）等の理由をそのまま表示する
  if (error) throw new Error(error.message || "権限の変更に失敗しました");
  if (!data?.length) throw new Error("権限がありません");
}

export async function kickUser(targetUserId: string) {
  const admin = await requireAdmin();
  if (targetUserId === admin.id) throw new Error("自分自身は除外できません");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .delete()
    .eq("user_id", targetUserId)
    .eq("team_id", admin.team_id)
    .select("user_id");
  if (error) throw new Error(error.message || "ユーザーの除外に失敗しました");
  if (!data?.length) throw new Error("権限がありません");
}

/** 選択中チームから脱退する。所属が残っていれば別チームへ自動で切り替わる（DBトリガー） */
export async function leaveCurrentTeam() {
  const { supabase, profile } = await getProfile();
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("user_id", profile.id)
    .eq("team_id", profile.team_id);
  // 最終adminガード（DBトリガー）等の理由をそのまま表示する
  if (error) throw new Error(error.message || "脱退処理に失敗しました");
  const cookieStore = await cookies();
  cookieStore.delete(CURRENT_TITLE_COOKIE);
}
