"use server";

import { cookies } from "next/headers";
import { getProfile } from "@/lib/supabase/auth";
import { CURRENT_TITLE_COOKIE } from "@/lib/supabase/titles";

export async function switchTitle(titleId: string) {
  const { supabase, profile } = await getProfile();
  const { data } = await supabase
    .from("titles")
    .select("id")
    .eq("id", titleId)
    .eq("team_id", profile.team_id)
    .single();
  if (!data) throw new Error("無効な作品です");

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_TITLE_COOKIE, titleId, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
