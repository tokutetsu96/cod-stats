"use server";

import { FORBIDDEN, getAdmin, revalidateApp } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";

const NAME_REQUIRED = { ok: false, error: "名前を入力してください" } as const;

export async function addPlayer(name: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const trimmed = name.trim();
  if (!trimmed) return NAME_REQUIRED;
  const { error } = await admin.supabase
    .from("players")
    .insert({ name: trimmed, team_id: admin.profile.team_id });
  if (error) return { ok: false, error: "追加に失敗しました" };
  revalidateApp();
  return { ok: true };
}

/** 名前・デフォルト・表示フラグの更新（指定した項目のみ） */
export async function updatePlayer(
  id: string,
  updates: { name?: string; is_default?: boolean; is_active?: boolean },
): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  // クライアントから渡された値は許可した列だけを取り出して使う
  const patch: { name?: string; is_default?: boolean; is_active?: boolean } = {};
  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (!trimmed) return NAME_REQUIRED;
    patch.name = trimmed;
  }
  if (typeof updates.is_default === "boolean") patch.is_default = updates.is_default;
  if (typeof updates.is_active === "boolean") patch.is_active = updates.is_active;

  const { data, error } = await admin.supabase
    .from("players")
    .update(patch)
    .eq("id", id)
    .eq("team_id", admin.profile.team_id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "更新に失敗しました" };
  revalidateApp();
  return { ok: true };
}

export async function deletePlayer(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN;
  const { data, error } = await admin.supabase
    .from("players")
    .delete()
    .eq("id", id)
    .eq("team_id", admin.profile.team_id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "削除に失敗しました" };
  revalidateApp();
  return { ok: true };
}
