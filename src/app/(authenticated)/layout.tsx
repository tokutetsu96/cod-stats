import { getProfile } from "@/lib/supabase/auth";
import { Nav } from "@/components/nav";
import { ProfileProvider } from "@/lib/contexts/profile-context";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { profile, teamName } = await getProfile();

  return (
    <ProfileProvider profile={profile} teamName={teamName}>
      <Nav teamName={teamName ?? undefined} username={profile.username} avatar={profile.avatar} role={profile.role} />
      {children}
    </ProfileProvider>
  );
}
