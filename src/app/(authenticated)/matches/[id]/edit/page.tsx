import { getProfile } from "@/lib/supabase/auth";
import { notFound } from "next/navigation";
import { EditSeriesForm } from "./edit-form";

export default async function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getProfile();

  const [{ data: series }, { data: opponents }, { data: players }, { data: maps }] = await Promise.all([
    supabase
      .from("series")
      .select("*, games(*, game_stats(*), opponent_game_stats(*))")
      .eq("id", id)
      .single(),
    supabase.from("opponents").select("*, opponent_players(*)").order("name"),
    supabase.from("players").select("*").order("created_at"),
    supabase.from("maps").select("*").order("name"),
  ]);

  if (!series) notFound();

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-2xl font-bold">対戦編集</h1>
        <EditSeriesForm
          series={series}
          opponents={opponents ?? []}
          players={players ?? []}
          maps={maps ?? []}
          teamId={profile.team_id}
        />
      </main>
    </>
  );
}
