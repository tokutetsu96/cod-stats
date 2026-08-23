import { getProfile } from "@/lib/supabase/auth";
import { getCurrentTitle } from "@/lib/supabase/titles";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { SeriesList } from "./_components/series-list";
import type { Opponent } from "@/lib/types";

const PAGE_SIZE = 20;

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; opponent?: string }>;
}) {
  const supabase = await createClient();
  const { profile } = await getProfile();
  const { currentTitle } = await getCurrentTitle();
  const params = await searchParams;

  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));
  const opponentId = params.opponent ?? "";
  const offset = (currentPage - 1) * PAGE_SIZE;

  let seriesQuery = supabase
    .from("series")
    .select("*, opponents(id, name), games(result)", { count: "exact" })
    .eq("team_id", profile.team_id)
    .eq("title_id", currentTitle?.id ?? "")
    .order("series_date", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (opponentId) {
    seriesQuery = seriesQuery.eq("opponent_id", opponentId);
  }

  const [{ data: seriesList, count }, { data: opponents }] = await Promise.all([
    seriesQuery,
    supabase.from("opponents").select("id, name").eq("team_id", profile.team_id).order("name"),
  ]);

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">対戦一覧</h1>
        <Card>
          <CardContent className="pt-6">
            <SeriesList
              seriesList={seriesList ?? []}
              opponents={(opponents ?? []) as Opponent[]}
              isAdmin={profile.role === "admin"}
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              opponentId={opponentId}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
