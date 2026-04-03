import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { SeriesForm } from "./_components/series-form";

export default async function NewSeriesPage() {
  const supabase = await createClient();

  const [{ profile }, { data: opponents }, { data: players }, { data: maps }] = await Promise.all([
    getProfile(),
    supabase.from("opponents").select("*, opponent_players(*)").order("name"),
    supabase.from("players").select("*").order("name"),
    supabase.from("maps").select("*").order("name"),
  ]);

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">対戦登録</h1>
        <SeriesForm
          opponents={opponents ?? []}
          players={players ?? []}
          maps={maps ?? []}
          teamId={profile.team_id}
        />
      </main>
    </>
  );
}
