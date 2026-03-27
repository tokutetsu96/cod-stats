import { getProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await getProfile();
  const { data: team } = await supabase.from("teams").select("name").eq("id", profile.team_id).single();

  return (
    <>
      <Nav teamName={team?.name} username={profile.username} avatar={profile.avatar} />
      {children}
    </>
  );
}
