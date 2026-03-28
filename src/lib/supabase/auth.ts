import { cache } from "react";
import { createClient } from "./server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";

export const getProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*, teams(name)")
    .eq("id", user.id)
    .single();

  if (!profileData) redirect("/login");

  const teamName =
    (profileData as unknown as { teams: { name: string } | null }).teams?.name ?? null;

  return { supabase, profile: profileData as unknown as Profile, teamName };
});
