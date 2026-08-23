import { cache } from "react";
import { cookies } from "next/headers";
import { getProfile } from "./auth";
import type { Title } from "@/lib/types";

export const CURRENT_TITLE_COOKIE = "current_title_id";

export const getCurrentTitle = cache(async () => {
  const { supabase, profile } = await getProfile();
  const cookieStore = await cookies();
  const cookieTitleId = cookieStore.get(CURRENT_TITLE_COOKIE)?.value;

  const { data } = await supabase
    .from("titles")
    .select("*")
    .eq("team_id", profile.team_id)
    .order("created_at")
    .returns<Title[]>();

  const titles = data ?? [];
  const currentTitle =
    titles.find((t) => t.id === cookieTitleId) ??
    titles.find((t) => t.is_default) ??
    titles[0] ??
    null;

  return { titles, currentTitle };
});
