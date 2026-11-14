"use server";

import { FORBIDDEN, getAdmin, revalidateApp } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";

const NAME_REQUIRED = { ok: false, error: "名前を入力してください" } as const;

export async function addOpponent(name: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const trimmed = name.trim();
  if (!trimmed) return NAME_REQUIRED;
  const { error } = await admin.supabase
    .from("opponents")
    .insert({ name: trimmed, team_id: admin.profile.team_id });
  if (error) return { ok: false, error: "追加に失敗しました" };
  revalidateApp();
  return { ok: true };
}

export async function renameOpponent(id: string, name: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const trimmed = name.trim();
  if (!trimmed) return NAME_REQUIRED;
  const { data, error } = await admin.supabase
    .from("opponents")
    .update({ name: trimmed })
    .eq("id", id)
    .eq("team_id", admin.profile.team_id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "更新に失敗しました" };
  revalidateApp();
  return { ok: true };
}

export async function deleteOpponent(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const { data, error } = await admin.supabase
    .from("opponents")
    .delete()
    .eq("id", id)
    .eq("team_id", admin.profile.team_id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "削除に失敗しました" };
  revalidateApp();
  return { ok: true };
}

export async function addOpponentPlayer(opponentId: string, name: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const trimmed = name.trim();
  if (!trimmed) return NAME_REQUIRED;
  const { error } = await admin.supabase
    .from("opponent_players")
    .insert({ name: trimmed, opponent_id: opponentId, team_id: admin.profile.team_id });
  if (error) return { ok: false, error: "選手の追加に失敗しました" };
  revalidateApp();
  return { ok: true };
}

export async function deleteOpponentPlayer(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const { data, error } = await admin.supabase
    .from("opponent_players")
    .delete()
    .eq("id", id)
    .eq("team_id", admin.profile.team_id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "削除に失敗しました" };
  revalidateApp();
  return { ok: true };
}

export async function setOpponentPlayerDefault(id: string, isDefault: boolean): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const { data, error } = await admin.supabase
    .from("opponent_players")
    .update({ is_default: isDefault })
    .eq("id", id)
    .eq("team_id", admin.profile.team_id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "更新に失敗しました" };
  revalidateApp();
  return { ok: true };
}
