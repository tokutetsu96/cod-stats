import { createClient } from "./server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";

export async function getProfile(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; profile: Profile }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return { supabase, profile };
}
