"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TITLE_COOKIE } from "@/lib/supabase/titles";
import type { ActionResult } from "@/lib/types";

// 作品Cookieはチーム単位のIDのため、チームが変わったら破棄して切替先の既定作品に戻す
async function resetTitleCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(CURRENT_TITLE_COOKIE);
}

// 認可（所属チェック・auth.uid()検証）は全て SECURITY DEFINER の RPC 側で行う
export async function switchTeam(teamId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("switch_team", { p_team_id: teamId });
  if (error) return { ok: false, error: error.message || "チームの切り替えに失敗しました" };
  await resetTitleCookie();
  return { ok: true };
}

export async function createTeam(teamName: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_team", { p_team_name: teamName.trim() });
  if (error) return { ok: false, error: error.message || "チームの作成に失敗しました" };
  await resetTitleCookie();
  return { ok: true };
}

export async function joinTeam(inviteCode: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_team_with_invite", { p_code: inviteCode.trim() });
  if (error) return { ok: false, error: error.message || "チームへの参加に失敗しました" };
  await resetTitleCookie();
  return { ok: true };
}
