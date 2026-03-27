import { getProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { profile, teamName } = await getProfile();

  return (
    <>
      <Nav teamName={teamName ?? undefined} username={profile.username} avatar={profile.avatar} />
      {children}
    </>
  );
}
