import { getProfile } from "@/lib/supabase/auth";
import { SeriesForm } from "./series-form";

export default async function NewSeriesPage() {
  const { supabase, profile } = await getProfile();

  const [{ data: opponents }, { data: players }, { data: maps }] = await Promise.all([
    supabase.from("opponents").select("*, opponent_players(*)").order("name"),
    supabase.from("players").select("*").order("name"),
    supabase.from("maps").select("*").order("name"),
  ]);

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-2xl font-bold">対戦登録</h1>
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
