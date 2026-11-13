"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TITLE_COOKIE } from "@/lib/supabase/titles";

// 作品Cookieはチーム単位のIDのため、チームが変わったら破棄して切替先の既定作品に戻す
async function resetTitleCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(CURRENT_TITLE_COOKIE);
}

// 認可（所属チェック・auth.uid()検証）は全て SECURITY DEFINER の RPC 側で行う
export async function switchTeam(teamId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("switch_team", { p_team_id: teamId });
  if (error) throw new Error(error.message || "チームの切り替えに失敗しました");
  await resetTitleCookie();
}

export async function createTeam(teamName: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_team", { p_team_name: teamName.trim() });
  if (error) throw new Error(error.message || "チームの作成に失敗しました");
  await resetTitleCookie();
}

export async function joinTeam(teamId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_team", { p_team_id: teamId.trim() });
  if (error) throw new Error(error.message || "チームへの参加に失敗しました");
  await resetTitleCookie();
}
