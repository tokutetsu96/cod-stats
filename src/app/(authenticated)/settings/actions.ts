"use server";

import { cookies } from "next/headers";
import { getProfile } from "@/lib/supabase/auth";
import { CURRENT_TITLE_COOKIE } from "@/lib/supabase/titles";
import type { UserRole } from "@/lib/types";

async function requireAdmin() {
  const { supabase, profile } = await getProfile();
  if (profile.role !== "admin") throw new Error("権限がありません");
  return { supabase, profile };
}

export async function updateTeamName(teamId: string, name: string) {
  const { supabase, profile } = await requireAdmin();
  if (profile.team_id !== teamId) throw new Error("権限がありません");
  const { error } = await supabase.from("teams").update({ name }).eq("id", teamId);
  if (error) throw new Error("チーム名の変更に失敗しました");
}

// メンバー操作は選択中チームの team_members 行に限定する（RLSでも同条件を強制）
export async function toggleUserRole(targetUserId: string, newRole: UserRole) {
  const { supabase, profile } = await requireAdmin();
  const { data, error } = await supabase
    .from("team_members")
    .update({ role: newRole })
    .eq("user_id", targetUserId)
    .eq("team_id", profile.team_id)
    .select("user_id");
  // 最終adminガード（DBトリガー）等の理由をそのまま表示する
  if (error) throw new Error(error.message || "権限の変更に失敗しました");
  if (!data?.length) throw new Error("権限がありません");
}

/** メンバーを除外し、除外記録を残す（招待コードでの再参加を拒否）。RPC内で管理者チェック・最終adminガードを実施 */
export async function kickUser(targetUserId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("remove_team_member", { p_user_id: targetUserId });
  if (error) throw new Error(error.message || "ユーザーの除外に失敗しました");
}

/** 除外を解除する（再び招待コードで参加できるようになる） */
export async function liftBan(targetUserId: string) {
  const { supabase, profile } = await requireAdmin();
  const { data, error } = await supabase
    .from("team_bans")
    .delete()
    .eq("user_id", targetUserId)
    .eq("team_id", profile.team_id)
    .select("user_id");
  if (error) throw new Error(error.message || "除外の解除に失敗しました");
  if (!data?.length) throw new Error("権限がありません");
}

/** 招待コードを発行する。コード生成・期限計算・権限チェックはRPC側で行う */
export async function createInvite(expiresInDays: number, maxUses: number | null) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("create_team_invite", {
    p_expires_in_days: expiresInDays,
    ...(maxUses === null ? {} : { p_max_uses: maxUses }),
  });
  if (error || !data) throw new Error(error?.message || "招待コードの発行に失敗しました");
  return data;
}

/** 招待コードを削除（即時失効）する */
export async function deleteInvite(inviteId: string) {
  const { supabase, profile } = await requireAdmin();
  const { data, error } = await supabase
    .from("team_invites")
    .delete()
    .eq("id", inviteId)
    .eq("team_id", profile.team_id)
    .select("id");
  if (error) throw new Error(error.message || "招待コードの削除に失敗しました");
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
