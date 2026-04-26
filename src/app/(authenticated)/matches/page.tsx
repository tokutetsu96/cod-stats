import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { SeriesList } from "./_components/series-list";
import type { Opponent } from "@/lib/types";

export default async function MatchesPage() {
  const supabase = await createClient();
  const { profile } = await getProfile();

  const [{ data: seriesList }, { data: opponents }] = await Promise.all([
    supabase
      .from("series")
      .select("*, opponents(id, name), games(result)")
      .eq("team_id", profile.team_id)
      .order("series_date", { ascending: false })
      .limit(50),
    supabase.from("opponents").select("id, name").eq("team_id", profile.team_id).order("name"),
  ]);

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">対戦一覧</h1>
        <Card>
          <CardContent className="pt-6">
            <SeriesList seriesList={seriesList ?? []} opponents={(opponents ?? []) as Opponent[]} isAdmin={profile.role === "admin"} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
