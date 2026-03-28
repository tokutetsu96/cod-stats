import { getProfile } from "@/lib/supabase/auth";
import { Card, CardContent } from "@/components/ui/card";
import { SeriesList } from "./_components/series-list";

export default async function MatchesPage() {
  const { supabase, profile } = await getProfile();

  const { data: seriesList } = await supabase
    .from("series")
    .select("*, opponents(*), games(*, maps(*))")
    .order("series_date", { ascending: false });

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-2xl font-bold">対戦一覧</h1>
        <Card>
          <CardContent className="pt-6">
            <SeriesList seriesList={seriesList ?? []} isAdmin={profile.role === "admin"} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
