import { getProfile } from "@/lib/supabase/auth";
import { getCurrentTitle } from "@/lib/supabase/titles";
import { Nav } from "@/components/nav";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [{ profile, teams }, { titles, currentTitle }] = await Promise.all([
    getProfile(),
    getCurrentTitle(),
  ]);

  return (
    <>
      <Nav
        teams={teams}
        currentTeamId={profile.team_id}
        username={profile.username}
        avatar={profile.avatar}
        role={profile.role}
        titles={titles}
        currentTitleId={currentTitle?.id}
      />
      {children}
    </>
  );
}
