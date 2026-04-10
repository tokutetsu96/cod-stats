import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";

const EditSeriesForm = dynamic(
  () => import("./_components/edit-form").then((m) => m.EditSeriesForm),
  { loading: () => <div className="flex justify-center p-8"><Spinner className="h-6 w-6" /></div> },
);

export default async function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ profile }, { data: series }, { data: opponents }, { data: players }, { data: maps }] = await Promise.all([
    getProfile(),
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
        <h1 className="text-xl sm:text-2xl font-bold">対戦編集</h1>
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
