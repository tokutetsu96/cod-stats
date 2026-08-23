import { getProfile } from "@/lib/supabase/auth";
import { getCurrentTitle } from "@/lib/supabase/titles";
import { Nav } from "@/components/nav";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { profile, teamName } = await getProfile();
  const { titles, currentTitle } = await getCurrentTitle();

  return (
    <>
      <Nav
        teamName={teamName ?? undefined}
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
