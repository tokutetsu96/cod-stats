"use server";

import { cookies } from "next/headers";
import { getProfile } from "@/lib/supabase/auth";
import { CURRENT_TITLE_COOKIE } from "@/lib/supabase/titles";
import type { ActionResult } from "@/lib/types";

export async function switchTitle(titleId: string): Promise<ActionResult> {
  const { supabase, profile } = await getProfile();
  const { data } = await supabase
    .from("titles")
    .select("id")
    .eq("id", titleId)
    .eq("team_id", profile.team_id)
    .single();
  if (!data) return { ok: false, error: "無効な作品です" };

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_TITLE_COOKIE, titleId, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return { ok: true };
}
