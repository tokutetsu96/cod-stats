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

  const { profile } = await getProfile();
  const [{ data: series }, { data: opponents }, { data: players }] = await Promise.all([
    supabase
      .from("series")
      .select("*, games(*, game_stats(*), opponent_game_stats(*))")
      .eq("id", id)
      .eq("team_id", profile.team_id)
      .single(),
    supabase.from("opponents").select("*, opponent_players(*)").eq("team_id", profile.team_id).order("name"),
    supabase.from("players").select("*").eq("team_id", profile.team_id).order("created_at"),
  ]);

  if (!series) notFound();

  // 編集対象の対戦が属する作品のマップ一覧を出す。Navで選択中の作品とは独立に、対戦自身の title_id を使う
  const { data: maps } = await supabase.from("maps").select("*").eq("team_id", profile.team_id).eq("title_id", series.title_id).order("name");

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">対戦編集</h1>
        <EditSeriesForm
          series={series}
          opponents={opponents ?? []}
          players={players ?? []}
          maps={maps ?? []}
        />
      </main>
    </>
  );
}
