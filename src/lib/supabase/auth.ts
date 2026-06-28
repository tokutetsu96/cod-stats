import { cache } from "react";
import { createClient } from "./server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";

export const getProfile = cache(async () => {
  const supabase = await createClient();
  // getClaims() は非対称JWT署名キーが有効なためローカル検証され、
  // Authサーバーへのネットワーク往復を伴わない（getUser() は毎回往復する）。
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*, teams(name)")
    .eq("id", userId)
    .single();

  if (!profileData) redirect("/login");

  const teamName =
    (profileData as unknown as { teams: { name: string } | null }).teams?.name ?? null;

  return { supabase, profile: profileData as unknown as Profile, teamName };
});
