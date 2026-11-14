import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTitle } from "@/lib/supabase/titles";
import { getTitleModes } from "@/lib/constants";
import { seriesToFormValues } from "../../_components/series-form-shared";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";

const SeriesForm = dynamic(
  () => import("../../_components/series-form").then((m) => m.SeriesForm),
  { loading: () => <div className="flex justify-center p-8"><Spinner className="h-6 w-6" /></div> },
);

export default async function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { profile } = await getProfile();
  // maps は対戦の title_id が分かる前に取得したいので、チームの全作品分を並列取得して後で絞り込む
  const [{ data: series }, { data: opponents }, { data: players }, { data: allMaps }, { titles }] = await Promise.all([
    supabase
      .from("series")
      .select("*, games(*, game_stats(*), opponent_game_stats(*))")
      .eq("id", id)
      .eq("team_id", profile.team_id)
      .single(),
    supabase.from("opponents").select("*, opponent_players(*)").eq("team_id", profile.team_id).order("name"),
    supabase.from("players").select("*").eq("team_id", profile.team_id).order("created_at"),
    supabase.from("maps").select("*").eq("team_id", profile.team_id).order("name"),
    getCurrentTitle(),
  ]);

  if (!series) notFound();

  // 編集対象の対戦が属する作品のモード一覧（Navで選択中の作品ではない）
  const modes = getTitleModes(titles.find((t) => t.id === series.title_id));

  // 編集対象の対戦が属する作品のマップ一覧を出す。Navで選択中の作品とは独立に、対戦自身の title_id を使う
  const maps = (allMaps ?? []).filter((m) => m.title_id === series.title_id);

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">対戦編集</h1>
      <SeriesForm
        initial={seriesToFormValues(series)}
        opponents={opponents ?? []}
        players={players ?? []}
        maps={maps}
        modes={modes}
      />
    </main>
  );
}
