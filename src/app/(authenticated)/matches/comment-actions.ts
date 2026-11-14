"use server";

import { revalidateApp } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/auth";
import { COMMENT_MAX_LENGTH } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";

// 対戦メモ（コメント）の Server Action。管理者専用の actions.ts と違い、チームメンバー全員が投稿できる。
// 編集は本人のみ、削除は本人または管理者（RLS でも同じ条件を強制している）

function validateBody(body: string): { body: string } | { error: string } {
  const trimmed = body.trim();
  if (!trimmed) return { error: "メモを入力してください" };
  if (trimmed.length > COMMENT_MAX_LENGTH) return { error: `メモは${COMMENT_MAX_LENGTH}文字以内で入力してください` };
  return { body: trimmed };
}

export async function addComment(seriesId: string, body: string, parentId?: string): Promise<ActionResult> {
  const { supabase, profile } = await getProfile();
  const valid = validateBody(body);
  if ("error" in valid) return { ok: false, error: valid.error };
  // 対象の対戦が自チームのものか・返信先が同じ対戦の親メモかは RLS とトリガーが検証する
  const { error } = await supabase.from("series_comments").insert({
    team_id: profile.team_id,
    series_id: seriesId,
    user_id: profile.id,
    parent_id: parentId ?? null,
    body: valid.body,
  });
  if (error) return { ok: false, error: "投稿に失敗しました" };
  revalidateApp();
  return { ok: true };
}

export async function updateComment(id: string, body: string): Promise<ActionResult> {
  const { supabase, profile } = await getProfile();
  const valid = validateBody(body);
  if ("error" in valid) return { ok: false, error: valid.error };
  const { data, error } = await supabase
    .from("series_comments")
    .update({ body: valid.body })
    .eq("id", id)
    .eq("team_id", profile.team_id)
    .eq("user_id", profile.id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "更新に失敗しました" };
  revalidateApp();
  return { ok: true };
}

export async function deleteComment(id: string): Promise<ActionResult> {
  const { supabase, profile } = await getProfile();
  let query = supabase.from("series_comments").delete().eq("id", id).eq("team_id", profile.team_id);
  if (profile.role !== "admin") query = query.eq("user_id", profile.id);
  const { data, error } = await query.select("id");
  if (error || !data?.length) return { ok: false, error: "削除に失敗しました" };
  revalidateApp();
  return { ok: true };
}
