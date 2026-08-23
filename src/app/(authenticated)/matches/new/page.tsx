import { getProfile } from "@/lib/supabase/auth";
import { getCurrentTitle } from "@/lib/supabase/titles";
import { createClient } from "@/lib/supabase/server";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";

const SeriesForm = dynamic(
  () => import("./_components/series-form").then((m) => m.SeriesForm),
  { loading: () => <div className="flex justify-center p-8"><Spinner className="h-6 w-6" /></div> },
);

export default async function NewSeriesPage() {
  const supabase = await createClient();
  const { profile } = await getProfile();
  const { currentTitle } = await getCurrentTitle();

  const [{ data: opponents }, { data: players }, { data: maps }] = await Promise.all([
    supabase.from("opponents").select("*, opponent_players(*)").eq("team_id", profile.team_id).order("name"),
    supabase.from("players").select("*").eq("team_id", profile.team_id).order("name"),
    supabase.from("maps").select("*").eq("team_id", profile.team_id).eq("title_id", currentTitle?.id ?? "").order("name"),
  ]);

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">対戦登録</h1>
        <SeriesForm
          opponents={opponents ?? []}
          players={players ?? []}
          maps={maps ?? []}
        />
      </main>
    </>
  );
}
