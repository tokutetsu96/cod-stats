"use server";

import { cookies } from "next/headers";
import { getProfile } from "@/lib/supabase/auth";
import { FORBIDDEN, getAdmin, revalidateApp } from "@/lib/supabase/admin";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { CURRENT_TITLE_COOKIE } from "@/lib/supabase/titles";
import { ALL_MODES } from "@/lib/constants";
import type { ActionResult, GameMode, UserRole } from "@/lib/types";

export async function updateTeamName(teamId: string, name: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin || admin.profile.team_id !== teamId) return FORBIDDEN;
  const { error } = await admin.supabase.from("teams").update({ name }).eq("id", teamId);
  if (error) return { ok: false, error: "チーム名の変更に失敗しました" };
  return { ok: true };
}

// メンバー操作は選択中チームの team_members 行に限定する（RLSでも同条件を強制）
export async function toggleUserRole(targetUserId: string, newRole: UserRole): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const { data, error } = await admin.supabase
    .from("team_members")
    .update({ role: newRole })
    .eq("user_id", targetUserId)
    .eq("team_id", admin.profile.team_id)
    .select("user_id");
  // 最終adminガード（DBトリガー）等の理由をそのまま表示する
  if (error) return { ok: false, error: error.message || "権限の変更に失敗しました" };
  if (!data?.length) return FORBIDDEN;
  return { ok: true };
}

/** メンバーを除外し、除外記録を残す（招待コードでの再参加を拒否）。RPC内で管理者チェック・最終adminガードを実施 */
export async function kickUser(targetUserId: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const { error } = await admin.supabase.rpc("remove_team_member", { p_user_id: targetUserId });
  if (error) return { ok: false, error: error.message || "ユーザーの除外に失敗しました" };
  return { ok: true };
}

/** 除外を解除する（再び招待コードで参加できるようになる） */
export async function liftBan(targetUserId: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const { data, error } = await admin.supabase
    .from("team_bans")
    .delete()
    .eq("user_id", targetUserId)
    .eq("team_id", admin.profile.team_id)
    .select("user_id");
  if (error) return { ok: false, error: error.message || "除外の解除に失敗しました" };
  if (!data?.length) return FORBIDDEN;
  return { ok: true };
}

/** 招待コードを発行する。コード生成・期限計算・権限チェックはRPC側で行う */
export async function createInvite(
  expiresInDays: number,
  maxUses: number | null,
): Promise<ActionResult<string>> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const { data, error } = await admin.supabase.rpc("create_team_invite", {
    p_expires_in_days: expiresInDays,
    ...(maxUses === null ? {} : { p_max_uses: maxUses }),
  });
  if (error || !data) return { ok: false, error: error?.message || "招待コードの発行に失敗しました" };
  return { ok: true, data };
}

/** 招待コードを削除（即時失効）する */
export async function deleteInvite(inviteId: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const { data, error } = await admin.supabase
    .from("team_invites")
    .delete()
    .eq("id", inviteId)
    .eq("team_id", admin.profile.team_id)
    .select("id");
  if (error) return { ok: false, error: error.message || "招待コードの削除に失敗しました" };
  if (!data?.length) return FORBIDDEN;
  return { ok: true };
}

/** 選択中チームから脱退する。所属が残っていれば別チームへ自動で切り替わる（DBトリガー） */
export async function leaveCurrentTeam(): Promise<ActionResult> {
  const { supabase, profile } = await getProfile();
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("user_id", profile.id)
    .eq("team_id", profile.team_id);
  // 最終adminガード（DBトリガー）等の理由をそのまま表示する
  if (error) return { ok: false, error: error.message || "脱退処理に失敗しました" };
  const cookieStore = await cookies();
  cookieStore.delete(CURRENT_TITLE_COOKIE);
  return { ok: true };
}

// ---- プロフィール（本人のみ） ----

export async function updateUsername(name: string): Promise<ActionResult> {
  const { supabase, profile } = await getProfile();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "名前を入力してください" };
  const { error } = await supabase.from("profiles").update({ username: trimmed }).eq("id", profile.id);
  if (error) return { ok: false, error: "名前の変更に失敗しました" };
  revalidateApp();
  return { ok: true };
}

/**
 * アバターURLを更新する（null で削除）。画像本体はクライアントから Storage へ直接アップロードし、
 * ここでは本人の avatars フォルダ配下のURLであることだけを検証して保存する。
 */
export async function updateAvatar(avatarUrl: string | null): Promise<ActionResult> {
  const { supabase, profile } = await getProfile();
  if (avatarUrl !== null) {
    const ownPrefix = `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile.id}/`;
    if (!avatarUrl.startsWith(ownPrefix)) return { ok: false, error: "不正な画像URLです" };
  }
  const { error } = await supabase.from("profiles").update({ avatar: avatarUrl }).eq("id", profile.id);
  if (error) return { ok: false, error: "アバターの更新に失敗しました" };
  revalidateApp();
  return { ok: true };
}

// ---- 作品・マップ（管理者のみ） ----

/** 既定の作品を切り替える。set_default_title RPC が「既存デフォルトの解除→対象をON」を原子的に処理する */
export async function setDefaultTitle(titleId: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const { error } = await admin.supabase.rpc("set_default_title", { p_title_id: titleId });
  if (error) return { ok: false, error: "既定の設定に失敗しました" };
  revalidateApp();
  return { ok: true };
}

/** hill_count は Hardpoint のみ保持する（1〜20。未入力・範囲外は null） */
function parseHillCount(mode: string, value: string): number | null {
  if (mode !== "hardpoint") return null;
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n >= 1 && n <= 20 ? n : null;
}

export async function addMap(
  titleId: string,
  mode: GameMode,
  name: string,
  hillCount: string,
): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const trimmed = name.trim();
  if (!trimmed || !ALL_MODES.includes(mode)) return { ok: false, error: "マップ名を入力してください" };
  // 他チームの作品にマップを紐付けられないよう、作品が選択中チームのものか確認する
  const { data: title } = await admin.supabase
    .from("titles")
    .select("id")
    .eq("id", titleId)
    .eq("team_id", admin.profile.team_id)
    .single();
  if (!title) return FORBIDDEN;
  const { error } = await admin.supabase.from("maps").insert({
    name: trimmed,
    mode,
    team_id: admin.profile.team_id,
    title_id: titleId,
    hill_count: parseHillCount(mode, hillCount),
  });
  if (error) return { ok: false, error: "追加に失敗しました" };
  revalidateApp();
  return { ok: true };
}

export async function updateMap(
  id: string,
  mode: GameMode,
  name: string,
  hillCount: string,
): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "マップ名を入力してください" };
  // mode 自体は変更しない（hill_count を持てるモードかの判定と、対象行の絞り込みにのみ使う）
  const { data, error } = await admin.supabase
    .from("maps")
    .update({ name: trimmed, hill_count: parseHillCount(mode, hillCount) })
    .eq("id", id)
    .eq("mode", mode)
    .eq("team_id", admin.profile.team_id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "更新に失敗しました" };
  revalidateApp();
  return { ok: true };
}

export async function deleteMap(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const { data, error } = await admin.supabase
    .from("maps")
    .delete()
    .eq("id", id)
    .eq("team_id", admin.profile.team_id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "削除に失敗しました" };
  revalidateApp();
  return { ok: true };
}
